package main

import (
	"io"
	"net"
	"os"
	"os/signal"
	"syscall"

	pb "github.com/suryavamsivaggu/sre-platform/api/v1"
	"github.com/suryavamsivaggu/sre-platform/pkg/kafka"
	"github.com/suryavamsivaggu/sre-platform/pkg/logger"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

type server struct {
	pb.UnimplementedCollectorServiceServer
	producer *kafka.Producer
}

// StreamMetrics handles incoming streams of metrics from agents.
func (s *server) StreamMetrics(stream pb.CollectorService_StreamMetricsServer) error {
	for {
		metric, err := stream.Recv()
		if err == io.EOF {
			return stream.SendAndClose(&pb.MetricStreamResponse{
				Success: true,
				Message: "Stream closed successfully",
			})
		}
		if err != nil {
			logger.Log.Error("Error reading metric stream", zap.Error(err))
			return err
		}

		logger.Log.Info("Received metric", zap.String("service", metric.ServiceName))

		// Push to Kafka for analysis
		err = s.producer.SendMessage(stream.Context(), []byte(metric.ServiceName), metric)
		if err != nil {
			logger.Log.Error("Failed to push to Kafka", zap.Error(err))
		}
	}
}

// SubscribeAlerts would be implemented for bi-directional or server-to-client stream.
func (s *server) SubscribeAlerts(req *pb.SubscribeRequest, stream pb.CollectorService_SubscribeAlertsServer) error {
	// Dummy implementation for now - frontend gateway will use this
	<-stream.Context().Done()
	return nil
}

func main() {
	logger.Init()
	defer logger.Sync()

	kafkaBrokers := []string{os.Getenv("KAFKA_BROKERS")}
	if kafkaBrokers[0] == "" {
		kafkaBrokers = []string{"localhost:9092"}
	}

	producer := kafka.NewProducer(kafkaBrokers, "metrics-topic")
	defer producer.Close()

	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		logger.Log.Fatal("Failed to listen", zap.Error(err))
	}

	grpcServer := grpc.NewServer()
	pb.RegisterCollectorServiceServer(grpcServer, &server{producer: producer})
	reflection.Register(grpcServer)

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		logger.Log.Info("Starting Collector Service on :50051")
		if err := grpcServer.Serve(lis); err != nil {
			logger.Log.Fatal("Failed to serve frontend", zap.Error(err))
		}
	}()

	<-sigCh
	logger.Log.Info("Shutting down gracefully...")
	grpcServer.GracefulStop()
}

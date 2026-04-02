package main

import (
	"context"
	"encoding/json"
	"os"
	"os/signal"
	"syscall"
	"time"

	pb "github.com/suryavamsivaggu/sre-platform/api/v1"
	"github.com/suryavamsivaggu/sre-platform/pkg/kafka"
	"github.com/suryavamsivaggu/sre-platform/pkg/logger"
	"go.uber.org/zap"
)

func main() {
	logger.Init()
	defer logger.Sync()

	kafkaBrokers := []string{os.Getenv("KAFKA_BROKERS")}
	if kafkaBrokers[0] == "" {
		kafkaBrokers = []string{"localhost:9092"}
	}

	consumer := kafka.NewConsumer(kafkaBrokers, "metrics-topic", "analysis-group")
	producer := kafka.NewProducer(kafkaBrokers, "alerts-topic")
	defer consumer.Close()
	defer producer.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		logger.Log.Info("Starting Analysis Service")
		consumer.Consume(ctx, func(key, value []byte) error {
			var metric pb.Metric
			if err := json.Unmarshal(value, &metric); err != nil {
				return err
			}

			// Real-time Anomaly Detection Policies
			var alert *pb.Alert

			memPercent := (metric.MemoryUsage / metric.TotalMemory) * 100

			if metric.CpuUsage > 90.0 {
				alert = &pb.Alert{
					AlertId:     "cpu-spike-" + metric.ServiceName,
					ServiceName: metric.ServiceName,
					Severity:    pb.Severity_SEVERITY_CRITICAL,
					Message:     "High CPU load detected",
					Timestamp:   time.Now().Unix(),
				}
			} else if memPercent > 85.0 {
				alert = &pb.Alert{
					AlertId:     "mem-leak-" + metric.ServiceName,
					ServiceName: metric.ServiceName,
					Severity:    pb.Severity_SEVERITY_WARNING,
					Message:     "Memory usage exceeding 85%",
					Timestamp:   time.Now().Unix(),
				}
			} else if metric.CpuPower > 80.0 { // Average laptop throttle point
				alert = &pb.Alert{
					AlertId:     "pwr-spike-" + metric.ServiceName,
					ServiceName: metric.ServiceName,
					Severity:    pb.Severity_SEVERITY_WARNING,
					Message:     "CPU Power Consumption Surge",
					Timestamp:   time.Now().Unix(),
				}
			} else if metric.ActiveConnections > 5000 {
				alert = &pb.Alert{
					AlertId:     "conn-surge-" + metric.ServiceName,
					ServiceName: metric.ServiceName,
					Severity:    pb.Severity_SEVERITY_WARNING,
					Message:     "Network connections surging",
					Timestamp:   time.Now().Unix(),
				}
			}

			if alert != nil {
				logger.Log.Warn("Anomaly detected", zap.String("service", alert.ServiceName), zap.String("reason", alert.Message))

				err := producer.SendMessage(ctx, []byte(alert.ServiceName), alert)
				if err != nil {
					logger.Log.Error("Failed to emit alert", zap.Error(err))
				}
			}

			return nil
		})
	}()

	<-sigCh
	logger.Log.Info("Shutting down gracefully...")
}

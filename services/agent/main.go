package main

import (
	"context"
	"math/rand"
	"os"
	"os/signal"
	"syscall"
	"time"

	pb "github.com/suryavamsivaggu/sre-platform/api/v1"
	"github.com/suryavamsivaggu/sre-platform/pkg/logger"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	logger.Init()
	defer logger.Sync()

	collectorAddr := os.Getenv("COLLECTOR_ADDR")
	if collectorAddr == "" {
		collectorAddr = "localhost:50051"
	}

	conn, err := grpc.Dial(collectorAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		logger.Log.Fatal("Failed to dial collector", zap.Error(err))
	}
	defer conn.Close()

	client := pb.NewCollectorServiceClient(conn)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	stream, err := client.StreamMetrics(ctx)
	if err != nil {
		logger.Log.Fatal("Failed to open stream", zap.Error(err))
	}

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				totalMem := 16384.0 // 16GB
				usedMem := rand.Float64() * totalMem

				// CPU granular modeling
				cpuTotal := rand.Float64() * 100
				cpuUser := cpuTotal * 0.6               // 60% of usage is User space
				cpuSystem := cpuTotal * 0.25            // 25% of usage is System space
				cpuIOWait := cpuTotal * 0.15            // 15% is mapped to I/O Wait states
				
				metric := &pb.Metric{
					ServiceName:       "frontend-service",
					InstanceId:        "frontend-1",
					CpuUsage:          cpuTotal,
					CpuUser:           cpuUser,
					CpuSystem:         cpuSystem,
					CpuIowait:         cpuIOWait,
					MemoryUsage:       usedMem,
					TotalMemory:       totalMem,
					FreeMemory:        totalMem - usedMem,
					AvailableMemory:   (totalMem - usedMem) * 0.9,
					ActiveConnections: int64(rand.Intn(1000)),
					Timestamp:         time.Now().Unix(),
				}
				if err := stream.Send(metric); err != nil {
					logger.Log.Error("Failed to send metric", zap.Error(err))
				}
				logger.Log.Info("Sent metric", zap.Float64("cpu", metric.CpuUsage))
			}
		}
	}()

	<-sigCh
	logger.Log.Info("Shutting down agent...")
	
	resp, err := stream.CloseAndRecv()
	if err != nil {
		logger.Log.Error("Error closing stream", zap.Error(err))
	} else {
		logger.Log.Info("Stream closed", zap.Bool("success", resp.Success), zap.String("msg", resp.Message))
	}
}

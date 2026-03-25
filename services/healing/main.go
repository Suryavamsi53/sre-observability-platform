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

	consumer := kafka.NewConsumer(kafkaBrokers, "alerts-topic", "healing-group")
	defer consumer.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		logger.Log.Info("Starting Auto-Healing Service")
		consumer.Consume(ctx, func(key, value []byte) error {
			var alert pb.Alert
			if err := json.Unmarshal(value, &alert); err != nil {
				logger.Log.Error("Could not parse alert", zap.Error(err))
				return err
			}

			// Simulate Remediation
			if alert.Severity == pb.Severity_SEVERITY_CRITICAL {
				logger.Log.Warn("Initiating Auto-Remediation", zap.String("service", alert.ServiceName), zap.String("alert_id", alert.AlertId))
				time.Sleep(2 * time.Second) // Simulated Kubernetes action (restart pod)
				logger.Log.Info("Auto-Remediation completed: Restarted service instances", zap.String("service", alert.ServiceName))
			}
			return nil
		})
	}()

	<-sigCh
	logger.Log.Info("Shutting down Healing Service gracefully...")
}

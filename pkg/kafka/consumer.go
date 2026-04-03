package kafka

import (
	"context"

	"github.com/segmentio/kafka-go"
	"github.com/suryavamsivaggu/sre-platform/pkg/logger"
	"go.uber.org/zap"
)

type Consumer struct {
	reader *kafka.Reader
}

func NewConsumer(brokers []string, topic, groupID string) *Consumer {
	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  brokers,
		GroupID:  groupID,
		Topic:    topic,
		MinBytes: 1, // 1 byte to ensure real-time streaming
		MaxBytes: 10e6, // 10MB
	})
	return &Consumer{reader: r}
}

func (c *Consumer) Consume(ctx context.Context, handler func(key, value []byte) error) {
	for {
		m, err := c.reader.FetchMessage(ctx)
		if err != nil {
			if err == context.Canceled {
				break
			}
			logger.Log.Error("Could not fetch message", zap.Error(err))
			continue
		}

		err = handler(m.Key, m.Value)
		if err != nil {
			logger.Log.Error("Failed to handle message", zap.Error(err), zap.ByteString("key", m.Key))
			// Decide if you want to commit on error or not in a real system
		} else {
			if err := c.reader.CommitMessages(ctx, m); err != nil {
				logger.Log.Error("Failed to commit message", zap.Error(err))
			}
		}
	}
}

func (c *Consumer) Close() error {
	return c.reader.Close()
}

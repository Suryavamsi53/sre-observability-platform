package main

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	pb "github.com/suryavamsivaggu/sre-platform/api/v1"
	"github.com/suryavamsivaggu/sre-platform/pkg/kafka"
	"github.com/suryavamsivaggu/sre-platform/pkg/logger"
	"go.uber.org/zap"
)

type Broker struct {
	Notifier       chan []byte
	newClients     chan chan []byte
	closingClients chan chan []byte
	clients        map[chan []byte]bool
}

func NewBroker() *Broker {
	broker := &Broker{
		Notifier:       make(chan []byte, 1),
		newClients:     make(chan chan []byte),
		closingClients: make(chan chan []byte),
		clients:        make(map[chan []byte]bool),
	}
	go broker.listen()
	return broker
}

func (broker *Broker) listen() {
	for {
		select {
		case s := <-broker.newClients:
			broker.clients[s] = true
		case s := <-broker.closingClients:
			delete(broker.clients, s)
		case event := <-broker.Notifier:
			for clientMessageChan, active := range broker.clients {
				if active {
					select {
					case clientMessageChan <- event:
					default:
					}
				}
			}
		}
	}
}

func sseHandler(broker *Broker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
			return
		}

		messageChan := make(chan []byte, 10)
		broker.newClients <- messageChan

		ctx := r.Context()
		logger.Log.Info("Client connected to SSE stream")

		defer func() {
			broker.closingClients <- messageChan
			logger.Log.Info("Client disconnected from SSE stream")
		}()

		for {
			select {
			case <-ctx.Done():
				return
			case msg := <-messageChan:
				w.Write([]byte("data: "))
				w.Write(msg)
				w.Write([]byte("\n\n"))
				flusher.Flush()
			}
		}
	}
}

func main() {
	logger.Init()
	defer logger.Sync()

	kafkaBrokers := []string{os.Getenv("KAFKA_BROKERS")}
	if kafkaBrokers[0] == "" {
		kafkaBrokers = []string{"localhost:9092"}
	}

	alertsConsumer := kafka.NewConsumer(kafkaBrokers, "alerts-topic", "gateway-alerts-group")
	defer alertsConsumer.Close()

	metricsConsumer := kafka.NewConsumer(kafkaBrokers, "metrics-topic", "gateway-metrics-group")
	defer metricsConsumer.Close()

	alertsBroker := NewBroker()
	metricsBroker := NewBroker()

	go alertsConsumer.Consume(context.Background(), func(key, value []byte) error {
		var alert pb.Alert
		if err := json.Unmarshal(value, &alert); err == nil {
			respData, _ := json.Marshal(&alert)
			alertsBroker.Notifier <- respData
		}
		return nil
	})

	go metricsConsumer.Consume(context.Background(), func(key, value []byte) error {
		var metric pb.Metric
		if err := json.Unmarshal(value, &metric); err == nil {
			respData, _ := json.Marshal(&metric)
			metricsBroker.Notifier <- respData
		}
		return nil
	})

	http.HandleFunc("/api/alerts/stream", sseHandler(alertsBroker))
	http.HandleFunc("/api/metrics/stream", sseHandler(metricsBroker))

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"up"}`))
	})

	srv := &http.Server{Addr: ":8080"}

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		logger.Log.Info("Starting API Gateway (REST to Kafka/gRPC) on :8080")
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			logger.Log.Fatal("Listen and serve error", zap.Error(err))
		}
	}()

	<-sigCh
	logger.Log.Info("Shutting down API Gateway gracefully...")
	srv.Shutdown(context.Background())
}

package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	MessagesReceived = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "sre_messages_received_total",
			Help: "Total number of messages received",
		},
		[]string{"service", "topic"},
	)
	MessagesProcessed = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "sre_messages_processed_total",
			Help: "Total number of messages processed successfully",
		},
		[]string{"service", "topic"},
	)
	ProcessingTime = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "sre_message_processing_duration_seconds",
			Help:    "Time taken to process messages",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"service"},
	)
)

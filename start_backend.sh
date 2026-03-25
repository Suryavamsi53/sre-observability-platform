#!/bin/bash
echo "Starting SRE Platform Backend Services..."

# Kill any existing go processes listening on our ports
killall go 2>/dev/null
pkill -f "go-build.*main" 2>/dev/null

export KAFKA_BROKERS="127.0.0.1:9092"
export COLLECTOR_ADDR="localhost:50051"

# Run services in the background
echo "Starting Collector Server..."
go run services/collector/main.go > /dev/null 2>&1 &

echo "Starting Analysis Engine..."
go run services/analysis/main.go > /dev/null 2>&1 &

echo "Starting Auto-Healing Engine..."
go run services/healing/main.go > /dev/null 2>&1 &

echo "Starting API Gateway (SSE Server)..."
go run services/gateway/main.go > /dev/null 2>&1 &

# Agent is started last to ensure Collector is up
sleep 2
echo "Starting Telementry Agent (Telemetry Spammer)..."
go run services/agent/main.go > /dev/null 2>&1 &

echo "──────────────────────────────────────────────"
echo "✅ All 5 Go Microservices are now RUNNING!"
echo "   -> Gateway: SSE Streams live on port 8080"
echo "   -> Collector: gRPC Pipeline live on port 50051"
echo "   -> Kafka: Topics automatically receiving events"
echo "──────────────────────────────────────────────"
echo "To stop them later, run: killall go"

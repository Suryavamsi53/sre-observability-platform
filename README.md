# Realtime Incident Monitoring & Auto-Healing Platform (SRE System)

A production-grade, event-driven microservices architecture built with Go, gRPC, Protobuf, Kafka, Next.js, and Kubernetes. The project demonstrates real-world software engineering practices mimicking high-scale environments similar to Uber/Google.

## 🏗 Architecture Overview

The platform collects real-time telemetry from application instances, routes it through an event bus (Kafka), analyzes the streams for anomalies, and asynchronously performs auto-remediation while live-streaming alerts to a centralized frontend dashboard.

**Key Components:**
1. **Agent Service**: Attached to end-user applications. Collects process metrics (CPU/Mem/Connections) and uses **gRPC Client Streaming** to push to the centralized collector.
2. **Collector Service**: The gRPC server receiver. Ingests dense streams, provides connection management, unmarshals Protobufs, and publishes validated metrics to the `metrics-topic` in Kafka.
3. **Analysis Service**: A constant consumer group pulling from `metrics-topic`. Simulates sliding window heuristics or threshold anomalies (e.g. CPU > 90%). Fires structured `Alert` events to `alerts-topic`.
4. **Auto-Healing Service**: Subscribes to `alerts-topic`. Runs isolated remediation workflows (e.g., restarts Kubernetes pods via API) when `CRITICAL` severity events are found.
5. **API Gateway**: Provides REST boundaries and manages external client connections. Subscribes to `alerts-topic` and fans out live actionable telemetry to Next.js clients via **Server-Sent Events (SSE)**.
6. **Frontend Dashboard**: Minimal Next.js + Tailwind React application providing real-time data visualization.

---

## 📂 Project Structure

```text
/sre-platform
├── api/
│   └── v1/
│       └── sre.proto                # Versioned Protobuf Definitions
│       └── sre.pb.go                # Generated Code (run protoc)
│       └── sre_grpc.pb.go           # Generated Code
├── services/
│   ├── agent/main.go                # Telemetry scraper / gRPC Client
│   ├── collector/main.go            # gRPC Server / Kafka Producer
│   ├── analysis/main.go             # Kafka Consumer / Logic / Producer
│   ├── healing/main.go              # Kafka Consumer / Action dispatcher
│   └── gateway/main.go              # HTTP/SSE Gateway / Kafka Consumer
├── pkg/
│   ├── logger/logger.go             # Centralized structured logging (Zap)
│   ├── kafka/producer.go            # Generic idempotent producers
│   ├── kafka/consumer.go            # Fault-tolerant consumers
│   └── metrics/metrics.go           # Prometheus integration (Internal Telemetry)
├── frontend/                        # Next.js Application Source
│   ├── package.json
│   └── src/app/page.tsx             # Real-time Alert Dashboard (React)
├── k8s/
│   └── deployments.yaml             # K8s Deployment and Service specs
├── docker-compose.yml               # Backing infrastructure (Kafka/Postgres/Prometheus)
├── Dockerfile                       # Multi-stage scalable build file
└── go.mod                           # Go dependencies
```

---

## 🚀 Setup & Execution 

### 1. Requirements
* Go 1.22+
* Docker + Docker Compose
* Protobuf Compiler (`protoc`)
* Node.js / NPM (For frontend)

### 2. Generate Protobuf (Skip if already generated)
```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.28
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.2
export PATH="$PATH:$(go env GOPATH)/bin"

protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    api/v1/sre.proto
```

### 3. Start Infrastructure (Kafka, Zookeeper, DB, Observability)
Ensure that Docker is running locally.

```bash
docker-compose up -d
```

### 4. Run Microservices

Start the services sequentially or through the provided utility script. For a one-click automated start in the background, you can simply run:
```bash
./start_backend.sh
```

**Alternative - Manual Start (Parallel terminals):**

**Terminal 1: Gateway Server (REST/SSE)**
```bash
KAFKA_BROKERS="127.0.0.1:9092" go run services/gateway/main.go
```

**Terminal 2: Collector Server (gRPC)**
```bash
KAFKA_BROKERS="127.0.0.1:9092" go run services/collector/main.go
```

**Terminal 3: Analysis Engine**
```bash
KAFKA_BROKERS="127.0.0.1:9092" go run services/analysis/main.go
```

**Terminal 4: Auto-Healing Worker**
```bash
KAFKA_BROKERS="127.0.0.1:9092" go run services/healing/main.go
```

**Terminal 5: Agent Service (Telemetry Spammer)**
```bash
COLLECTOR_ADDR="localhost:50051" go run services/agent/main.go
```

### 5. Start the Real-Time Dashboard
The dashboard allows visual consumption of the generated faults simulated in real-time.

```bash
cd frontend
npm install
npm run dev
```
Access the application at: `http://localhost:3000`

---

## 🛠 Advanced Features Developed

* **gRPC Streaming**: Instead of unary RPCs which carry strict request-response paradigms, the agent streams large batches of local telemetry smoothly to alleviate GC pausing on Collector.
* **Event-Driven Fault Tolerance**: Analysis and Healing do not block UI execution or pipeline workflows; decoupled via Kafka for ultimate replayability or asynchronous bursts handling.
* **Graceful Degradation**: Built-in channel signals (`os.Signal`) bound to waitgroups or context tree cancellations ensuring in-flight messages are flushed/processed to Kafka on deployment restarts.
* **Centralized Observability Tools**: PromAuto metrics wrappers embedded into package utilities; unified zap logging.
* **Multi-stage Docker strategy**: Designed `Dockerfile` using `ARG SERVICE_NAME` variable allowing a single declarative instruction source for all internal golang deployments. 

---

## 💻 Tech Stack

* **Backend:** Go (Golang)
* **Internal Communication:** gRPC, Protocol Buffers (Protobuf)
* **API Gateway:** REST/SSE streaming bridge 
* **Frontend:** Next.js (React), Tailwind CSS, Recharts
* **Observability:** Prometheus, Grafana
* **Containerization:** Docker, Docker Compose
* **Orchestration:** Kubernetes (Optional local deployment)

---

## 🔮 Future Improvements / Roadmap

* Integrate strict OpenTelemetry tracing across all inter-service boundaries.
* Persist historical metrics and incidents in PostgreSQL/TimescaleDB.
* Build a rules-engine UI to dynamically update anomaly detection thresholds.
* Provide Helm charts for full Kubernetes orchestration.
* Add user authentication and Role-Based Access Control (RBAC).

---

## 🧠 Learning Outcomes

This project was built to deepen practical knowledge in modern infrastructure engineering:
* **Distributed Systems:** Gained experience handling asynchronous communication, fault tolerance, and eventual consistency between independent components.
* **gRPC Usage:** Implemented bi-directional and server-side streaming using strongly-typed Protocol Buffers over HTTP/2.
* **Observability Concepts:** Modeled structured telemetry generation, metrics aggregation, and actionable alerting workflows.
* **Backend System Design:** Understood the trade-offs of microservices orchestration, decoupled message passing, and real-time client propagation.

---

## 📝 Disclaimer

*This project was initially scaffolded with AI-assisted tools (Gemini / Antigravity) and further refined, extended, and understood as part of hands-on learning in backend systems and SRE practices.*

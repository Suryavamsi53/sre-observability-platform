# SRE Nexus: Detailed Technical Documentation

## 1. System Architecture Deep-Dive

SRE Nexus is a distributed observability platform designed for sub-second telemetry propagation and automated incident remediation.

### 1.1 The Telemetry Lifecycle
1. **Scraping (Agent)**: The Go-based Agent runs as a daemon/sidecar. It uses `gopsutil` to scrape hardware counters (`/sys/class/hwmon`), network IO, and the OS process tree.
2. **Ingestion (Collector)**: Metrics are pushed via **gRPC Client-Side Streaming**. This allows the Agent to maintain a single persistent HTTP/2 connection per session, reducing handshake overhead.
3. **Buffering (Kafka)**: The Collector acts as a producer to the `metrics-topic`. Kafka decouples high-ingestion bursts from downstream processing.
4. **Analysis**: The Analysis Engine consumes from Kafka, running sliding-window logic. If thresholds (e.g., CPU > 90% for 5 seconds) are breached, an `Alert` is produced to the `alerts-topic`.
5. **Auto-Healing**: Subscribes to the `alerts-topic`. When a `CRITICAL` alert is detected, it triggers standard remediation scripts (simulated pod restarts, resource flushes).
6. **Propagation (Gateway)**: The API Gateway translates internal Kafka events into **Server-Sent Events (SSE)** for web clients.
7. **Visualization (Dashboard)**: A Next.js 14 frontend renders data using `Recharts`, providing a glassmorphic real-time HUD.

---

---

## 2. Fundamental Monitoring Modules

### 2.1 Internet Tracer (Network Diagnostics)
Unlike standard metrics, SRE Nexus implements a high-definition "tracer" module:
- **TX/RX Throughput**: Real-time bits-per-second monitoring using byte deltas from network interfaces.
- **Latency Jitter**: Tracking millisecond-level fluctuations in real-time connectivity.
- **Visual Hop Graph**: A traceroute implementation that maps the path from host to target, visualizing each node and its relative latency.

### 2.2 Deep Processor Analytics
Tailored for sub-process monitoring and thread-level optimization:
- **Thread Count**: Real-time tracking of active OS instruction threads.
- **Process HUD**: A live "Top Consumers" list sorting the process tree by CPU and Memory utilization.
- **Load Optimization**: Context-aware SRE advice mapping core count vs. current thread load.

### 2.3 Search & Filtering Engine
The dashboard includes a real-time, case-insensitive logic engine:
- **Incident Feed Filter**: Near-instant filtering of historical and live events by service or message.
- **Audit Log Search**: High-speed lookup within the runtime terminal logs for specific diagnostic patterns.

---

## 3. SRE Strategic Studios

### 3.1 Strategic Topology (Service Mesh Studio)
The platform implements a real-time, interactive dependency graph:
- **Correlation Mesh**: Automatically maps inbound streams to downstream SQL queries and gRPC calls.
- **Mesh Stability Index**: A high-fidelity metric calculating the health of all inter-service links.
- **Dynamic Orbital Layout**: Visualizes directional data intensity and latency using particle physics.

### 3.2 SRE Automation Engine (Lifecycle Jobs)
Integrated background worker tracking for operational transparency:
- **Resource Tracing**: Monitors CPU/Memory consumption per-job (e.g., Log Rotation, SSL).
- **Execution Logs**: Real-time bubbling of lower-level automation steps to the UI.
- **Status Sync**: Maintains consistent job states (RUNNING, COMPLETED, FAILED) across the event bus.

### 3.3 Chaos Engineering Module (The Laboratory)
A mission-control interface for validating system resilience:
- **Fault Types**: Supports injection of Network Jitter, Latency Spikes, and Service Termination.
- **Gated RBAC**: Restricts destructive experiments to authorized SRE Administrators.
- **Analytical Diagnosis**: Post-experiment heuristics evaluation for recovery performance.

### 3.4 Financial Observability (Cost HUD)
Integrates infrastructure metrics with operational budgeting:
- **Burn Projection**: Estimates monthly expenditure (₹) based on actual power and resource draws.
- **Overspend Detection**: Automatic alerting when consumption trends exceed budget thresholds.
- **1-Click Optimizer**: Provides deterministic resizing recommendations to eliminate cloud waste.

---

## 4. Reliability SLIs & SLOs
Real-time monitoring of critical SRE service indicators:
- **System Uptime**: Continuous calculation of overall cluster availability.
- **Error Budgeting**: Dynamic monitoring of remaining quotas based on ingress failure rates.
- **MTTR Analysis**: Precise tracking of the detection-to-restoration timeline.

---

## 5. Performance Engineering

### 5.1 Eliminating "UI Lag"
To achieve the 10 FPS real-time feel:
- **SSE propagation**: Lower protocol overhead for unidirectional telemetry streams.
- **Kafka Optimization**: Consumers configured with `MinBytes: 1` for zero-latency flushes.
- **React Buffer Control**: Rolling data point management to prevent DOM bloat.

### 5.2 Protobuf & gRPC Contract
Enforces strict schema versioning via `api/v1/sre.proto`, ensuring cross-language compatibility.

---

## 6. Theming & UX Strategy
The platform supports a 100% responsive **Dark/Light Theme System**:
- **Space-Theme**: High-contrast neon accents for NOC environments.
- **Clean-Theme**: Optimized for daylight reporting and stakeholder presentations.

---

## 7. Commands & Reference

### 7.1 Backend Management
- `./start_backend.sh`: Launches the full microservice suite.
- `killall go`: Full stop of active platform binaries.
- `docker-compose up -d`: Boots infrastructure dependencies.

### 7.2 Developer Tooling
- `protoc --go_out=. ...`: Regenerates communication logic from `.proto` definitions.

---

*Documentation Version 2.5.0 - April 2026*

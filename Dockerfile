FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
ARG SERVICE_NAME
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/$SERVICE_NAME ./services/$SERVICE_NAME

FROM alpine:latest
WORKDIR /root/
ARG SERVICE_NAME
COPY --from=builder /app/bin/$SERVICE_NAME ./service
CMD ["./service"]

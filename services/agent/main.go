package main

import (
	"context"
	"fmt"
	"math/rand"
	"os"
	"os/signal"
	"syscall"
	"time"

	pb "github.com/suryavamsivaggu/sre-platform/api/v1"
	"github.com/suryavamsivaggu/sre-platform/pkg/logger"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
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
				v, err := mem.VirtualMemory()
				if err != nil {
					logger.Log.Error("Could not read real memory", zap.Error(err))
					continue
				}

				totalMem := float64(v.Total) / 1024 / 1024
				usedMem := float64(v.Used) / 1024 / 1024
				freeMem := float64(v.Free) / 1024 / 1024
				availableMem := float64(v.Available) / 1024 / 1024

				// CPU granular modeling using real CPU %
				cpuPercents, err := cpu.Percent(0, false)
				var cpuTotal float64 = 0
				if err == nil && len(cpuPercents) > 0 {
					cpuTotal = cpuPercents[0]
				}

				cpuUser := cpuTotal * 0.6               // Simulated spaces for realism based on total
				cpuSystem := cpuTotal * 0.25            
				cpuIOWait := cpuTotal * 0.15            

				// Real TCP connections 
				netConns, err := net.Connections("tcp")
				activeConns := int64(len(netConns))
				if err != nil {
					activeConns = 0
				}

				// REAL Hardware Sensors (Fan Speeds & Power Consumption)
				var cpuFanSpeed int32 = 0
				var gpuFanSpeed int32 = 0
				var cpuPower float64 = 0
				var gpuPower float64 = 0

				// 1. Read Fan Speeds from hwmon
				dirs, _ := os.ReadDir("/sys/class/hwmon")
				for _, d := range dirs {
					fanFiles, _ := os.ReadDir("/sys/class/hwmon/" + d.Name())
					for _, f := range fanFiles {
						if len(f.Name()) >= 9 && f.Name()[:3] == "fan" && f.Name()[len(f.Name())-6:] == "_input" {
							b, err := os.ReadFile("/sys/class/hwmon/" + d.Name() + "/" + f.Name())
							if err == nil {
								var spd int
								fmt.Sscanf(string(b), "%d", &spd)
								if d.Name() == "hwmon1" || d.Name() == "hwmon2" { // naive assignment for demonstration
									gpuFanSpeed = int32(spd)
								} else {
									cpuFanSpeed = int32(spd)
								}
							}
						}
					}
				}

				// 2. Read CPU Power Consumption (Battery Subsystem Fallback)
				bCurr, err1 := os.ReadFile("/sys/class/power_supply/BAT0/current_now")
				bVolt, err2 := os.ReadFile("/sys/class/power_supply/BAT0/voltage_now")
				if err1 == nil && err2 == nil {
					var currentUA, voltageUV float64
					fmt.Sscanf(string(bCurr), "%f", &currentUA)
					fmt.Sscanf(string(bVolt), "%f", &voltageUV)
					// microAmps to Amps, microVolts to Volts = Watts
					watts := (currentUA / 1000000.0) * (voltageUV / 1000000.0)
					cpuPower = watts
				} else {
					// Fallback to synthetic logic if no battery
					cpuPower = 45.0 + (rand.Float64() * 105.0) * (cpuTotal / 100.0)
				}
				
				// Keep GPU Power simulated or bind it to a relative fraction
				gpuPower = cpuPower * 0.4

				metric := &pb.Metric{
					ServiceName:       "frontend-service",
					InstanceId:        "frontend-1",
					CpuUsage:          cpuTotal,
					CpuUser:           cpuUser,
					CpuSystem:         cpuSystem,
					CpuIowait:         cpuIOWait,
					MemoryUsage:       usedMem,
					TotalMemory:       totalMem, // Uses actual host machine RAM
					FreeMemory:        freeMem,
					AvailableMemory:   availableMem,
					ActiveConnections: activeConns,
					Timestamp:         time.Now().Unix(),
					CpuFanSpeed:       cpuFanSpeed,
					GpuFanSpeed:       gpuFanSpeed,
					CpuPower:          cpuPower,
					GpuPower:          gpuPower,
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

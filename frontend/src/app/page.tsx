"use client";

import { useEffect, useState, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  Legend,
} from "recharts";
import {
  Activity,
  AlertOctagon,
  ShieldCheck,
  Server,
  Terminal,
  HardDrive,
  Cpu,
  BellRing,
  Settings as SettingsIcon,
  Search,
  X,
  Fan,
  Zap,
} from "lucide-react";

interface Metric {
  service_name: string;
  instance_id: string;
  cpu_usage: number;
  cpu_user: number;
  cpu_system: number;
  cpu_iowait: number;
  memory_usage: number;
  total_memory: number;
  free_memory: number;
  available_memory: number;
  active_connections: number;
  timestamp: number;
  cpu_fan_speed: number;
  gpu_fan_speed: number;
  cpu_power: number;
  gpu_power: number;
}

interface Alert {
  alert_id: string;
  service_name: string;
  severity: number;
  message: string;
  timestamp: number;
}

interface Log {
  type: "info" | "warn" | "error" | "action";
  message: string;
  time: string;
}

interface AppSettings {
  maxDataPoints: number;
  showLogs: boolean;
  muteAlerts: boolean;
  simulatedDelay: number;
  themeColor: "indigo" | "emerald" | "rose" | "purple";
  powerWarningThreshold: number;
}

export default function Dashboard() {
  const [metricsHistory, setMetricsHistory] = useState<Metric[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [healthStatus, setHealthStatus] = useState<"HEALTHY" | "WARNING" | "CRITICAL">("HEALTHY");

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    maxDataPoints: 30,
    showLogs: true,
    muteAlerts: false,
    simulatedDelay: 0,
    themeColor: "indigo",
    powerWarningThreshold: 300,
  });

  const appendLog = (type: Log["type"], message: string) => {
    if (!settings.showLogs) return;
    setLogs((prev) => [{ type, message, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    const metricsSource = new EventSource("http://localhost:8080/api/metrics/stream");
    metricsSource.onmessage = (event) => {
      setTimeout(() => {
        const data: Metric = JSON.parse(event.data);
        setMetricsHistory((prev) => {
          const newHistory = [...prev, data];
          if (newHistory.length > settings.maxDataPoints) return newHistory.slice(newHistory.length - settings.maxDataPoints);
          return newHistory;
        });
        if (Math.random() > 0.95) appendLog("info", `Metric batch received from ${data.instance_id}`);
      }, settings.simulatedDelay);
    };

    const alertsSource = new EventSource("http://localhost:8080/api/alerts/stream");
    alertsSource.onmessage = (event) => {
      setTimeout(() => {
        const data: Alert = JSON.parse(event.data);
        setAlerts((prev) => {
          if (prev.find((a) => a.alert_id === data.alert_id)) return prev;
          return [data, ...prev].slice(0, 8);
        });

        if (data.severity === 4) setHealthStatus("CRITICAL");
        else if (healthStatus !== "CRITICAL") setHealthStatus("WARNING");

        if (!settings.muteAlerts) {
          appendLog("warn", `Anomaly: ${data.message} (${data.service_name})`);
        }

        if (data.severity === 4) {
          setTimeout(() => {
            appendLog("action", `Auto-healing initiated: Rebooting ${data.service_name}`);
            setTimeout(() => {
              appendLog("info", `System recovery successful: ${data.service_name} online`);
              setHealthStatus("HEALTHY");
              setAlerts((prev) => prev.filter((a) => a.alert_id !== data.alert_id));
            }, 3500);
          }, 1500);
        }
      }, settings.simulatedDelay);
    };

    return () => {
      metricsSource.close();
      alertsSource.close();
    };
  }, [settings.maxDataPoints, settings.simulatedDelay, settings.muteAlerts, settings.showLogs]);

  const latestMetric = metricsHistory[metricsHistory.length - 1] || {
    cpu_usage: 0,
    memory_usage: 0,
    active_connections: 0,
    cpu_fan_speed: 0,
    gpu_fan_speed: 0,
    cpu_power: 0,
    gpu_power: 0,
    total_memory: 0,
    free_memory: 0,
  };

  return (
    <div className={`min-h-screen bg-[#050505] text-zinc-100 font-sans relative overflow-hidden flex flex-col selection:bg-${settings.themeColor}-500/30`}>
      {/* Background Ambience */}
      <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${settings.themeColor === 'indigo' ? 'bg-indigo-900/20' : settings.themeColor === 'emerald' ? 'bg-emerald-900/20' : settings.themeColor === 'rose' ? 'bg-rose-900/20' : 'bg-purple-900/20'}`} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/10 blur-[120px] pointer-events-none" />
      {healthStatus === "CRITICAL" && (
        <div className="absolute inset-0 bg-red-900/5 blur-[150px] pointer-events-none transition-all duration-1000" />
      )}

      {/* Navigation Layer */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 p-2 rounded-lg border border-indigo-500/30">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              SRE Nexus
            </h1>
          </div>
          
          <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-1.5 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
            <Search className="w-4 h-4 text-zinc-500 mr-2" />
            <input 
              type="text" 
              placeholder="Search resources, metrics..." 
              className="bg-transparent border-none outline-none text-sm text-zinc-200 placeholder:text-zinc-600 w-64"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase border transition-colors duration-500 ${
                healthStatus === "HEALTHY" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                healthStatus === "WARNING" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : 
                "bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse"
              }`}>
              {healthStatus === "HEALTHY" && <ShieldCheck className="w-3 h-3" />}
              {healthStatus === "WARNING" && <AlertOctagon className="w-3 h-3" />}
              {healthStatus === "CRITICAL" && <AlertOctagon className="w-3 h-3" />}
              {healthStatus}
            </div>
            <button className="text-zinc-400 hover:text-white transition-colors relative">
              <BellRing className="w-5 h-5" />
              {alerts.length > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping" />}
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="text-zinc-400 hover:text-white transition-colors hover:rotate-90 duration-300"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border border-white/10 ml-2" />
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-6 flex flex-col gap-6 relative z-10 w-full flex-1">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden group hover:border-indigo-500/30 transition-all">
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-500/20 p-1.5 rounded-md text-indigo-400"><Cpu className="w-4 h-4" /></div>
                <h3 className="text-sm font-medium text-zinc-400">CPU Compute</h3>
              </div>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${latestMetric.cpu_usage > 85 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {latestMetric.cpu_usage.toFixed(1)}%
              </span>
            </div>
            <div className="h-20 w-full mt-4 -ml-2 -mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsHistory}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="cpu_usage" stroke="#818cf8" strokeWidth={2} fill="url(#cpuGrad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden group hover:border-purple-500/30 transition-all">
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className="bg-purple-500/20 p-1.5 rounded-md text-purple-400"><HardDrive className="w-4 h-4" /></div>
                <h3 className="text-sm font-medium text-zinc-400">Memory Cluster</h3>
              </div>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${latestMetric.memory_usage > 14000 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {latestMetric.memory_usage.toFixed(0)} MB Used
              </span>
            </div>
            
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono mt-1 relative z-10 px-1">
              <span>Tot: {(latestMetric.total_memory || 16384).toFixed(0)} MB</span>
              <span>Free: {(latestMetric.free_memory || (16384 - latestMetric.memory_usage)).toFixed(0)} MB</span>
            </div>

            <div className="h-20 w-full mt-2 -ml-2 -mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsHistory}>
                  <defs>
                    <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c084fc" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#c084fc" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="memory_usage" stroke="#c084fc" strokeWidth={2} fill="url(#memGrad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden group hover:border-cyan-500/30 transition-all">
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className="bg-cyan-500/20 p-1.5 rounded-md text-cyan-400"><Server className="w-4 h-4" /></div>
                <h3 className="text-sm font-medium text-zinc-400">TCP Connections</h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                {latestMetric.active_connections}
              </span>
            </div>
            <div className="h-20 w-full mt-4 -ml-2 -mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsHistory}>
                  <defs>
                    <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="step" dataKey="active_connections" stroke="#2dd4bf" strokeWidth={2} fill="url(#netGrad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* New Fan Cards */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className="bg-blue-500/20 p-1.5 rounded-md text-blue-400"><Fan className="w-4 h-4" /></div>
                <h3 className="text-sm font-medium text-zinc-400">Cooling (RPM)</h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                {latestMetric.cpu_fan_speed}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono mt-1 relative z-10 px-1">
              <span>CPU: {latestMetric.cpu_fan_speed}</span>
              <span>GPU: {latestMetric.gpu_fan_speed}</span>
            </div>

            <div className="h-20 w-full mt-2 -ml-2 -mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsHistory}>
                  <defs>
                    <linearGradient id="fanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="cpu_fan_speed" stroke="#3b82f6" strokeWidth={2} fill="url(#fanGrad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden group hover:border-yellow-500/30 transition-all">
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className="bg-yellow-500/20 p-1.5 rounded-md text-yellow-400"><Zap className="w-4 h-4" /></div>
                <h3 className="text-sm font-medium text-zinc-400">Power (Watts)</h3>
              </div>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${(latestMetric.cpu_power + latestMetric.gpu_power) > settings.powerWarningThreshold ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {((latestMetric.cpu_power || 0) + (latestMetric.gpu_power || 0)).toFixed(1)}W
              </span>
            </div>

            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono mt-1 relative z-10 px-1 border-b border-white/5 pb-1">
              <span>CPU: {(latestMetric.cpu_power || 0).toFixed(1)}W</span>
              <span>GPU: {(latestMetric.gpu_power || 0).toFixed(1)}W</span>
            </div>

            <div className="flex justify-between items-center text-[9px] text-zinc-600 font-mono mt-1 relative z-10 px-1">
              <span title="Projected Energy per Minute">1m: {(((latestMetric.cpu_power || 0) + (latestMetric.gpu_power || 0)) / 60).toFixed(2)}Wh</span>
              <span title="Projected Energy per Hour">1h: {((latestMetric.cpu_power || 0) + (latestMetric.gpu_power || 0)).toFixed(1)}Wh</span>
              <span title="Projected Energy per Day">24h: {(((latestMetric.cpu_power || 0) + (latestMetric.gpu_power || 0)) * 24).toFixed(0)}Wh</span>
            </div>

            <div className="h-20 w-full mt-2 -ml-2 -mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsHistory}>
                  <defs>
                    <linearGradient id="pwrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="gpu_power" stroke="#eab308" strokeWidth={2} fill="url(#pwrGrad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts and Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white/[0.02] border border-white/5 rounded-2xl p-6 shadow-2xl flex flex-col h-[450px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-semibold text-zinc-200">System Telemetry Matrix</h2>
            </div>
            <div className="flex-1 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={metricsHistory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="timestamp" hide />
                  <YAxis yAxisId="left" stroke="#52525b" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#52525b" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(9,9,11,0.9)", borderColor: "#27272a", borderRadius: "12px", backdropFilter: "blur(10px)", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}
                    itemStyle={{ color: "#e4e4e7", fontSize: '13px' }}
                    labelStyle={{ color: "#a1a1aa", fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}
                    labelFormatter={(label) => new Date(label * 1000).toLocaleTimeString()}
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', color: '#a1a1aa' }} />

                  {/* Detailed Interactive CPU Stacked Layers */}
                  <Area yAxisId="left" stackId="cpu" type="monotone" dataKey="cpu_iowait" name="I/O Wait (%)" stroke="#2dd4bf" strokeWidth={1} fill="#2dd4bf" fillOpacity={0.7} isAnimationActive={false} />
                  <Area yAxisId="left" stackId="cpu" type="monotone" dataKey="cpu_system" name="System (%)" stroke="#c084fc" strokeWidth={1} fill="#c084fc" fillOpacity={0.6} isAnimationActive={false} />
                  <Area yAxisId="left" stackId="cpu" type="monotone" dataKey="cpu_user" name="User (%)" stroke="#818cf8" strokeWidth={2} fill="url(#cpuGrad)" fillOpacity={1} isAnimationActive={false} />
                  
                  <Bar yAxisId="right" dataKey="memory_usage" name="Memory (MB)" fill="#a855f7" opacity={0.2} radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={30} />
                  <Line yAxisId="right" type="stepAfter" dataKey="active_connections" name="Connections" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col overflow-hidden h-[450px]">
            <div className="px-5 py-4 border-b border-white/5 bg-black/20 flex justify-between items-center z-10 relative">
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <AlertOctagon className={`w-4 h-4 ${alerts.length > 0 ? "text-red-400 animate-pulse" : "text-zinc-500"}`} /> 
                Incident Feed
              </h2>
              {alerts.length > 0 && <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{alerts.length}</span>}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative">
              {alerts.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
                  <ShieldCheck className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-xs">No active incidents</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={`${alert.alert_id}-${alert.timestamp}`} className="bg-red-500/5 hover:bg-red-500/10 transition-colors border-l-2 border-red-500 p-3 rounded-r-xl group cursor-pointer animate-in fade-in slide-in-from-right duration-300">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-zinc-200 text-xs tracking-wide">{alert.service_name}</h4>
                      <span className="text-[10px] text-zinc-500 font-mono">{new Date(alert.timestamp * 1000).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-red-300/80 leading-relaxed font-medium">{alert.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Terminal logs */}
        {settings.showLogs && (
          <div className="bg-[#030303] border border-zinc-800/80 shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)] rounded-2xl p-5 h-64 flex flex-col font-mono relative">
            <div className="flex items-center gap-3 mb-4 text-zinc-500 text-xs uppercase tracking-widest font-semibold pb-3 border-b border-zinc-900">
              <Terminal className="w-4 h-4" /> Runtime Audit Log
              <div className="ml-auto flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-4 space-y-2 text-[13px] custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-4 items-start leading-relaxed animate-in fade-in duration-300 hover:bg-white/5 px-2 py-0.5 rounded transition-colors -mx-2">
                  <span className="text-zinc-600 shrink-0 select-none">{log.time}</span>
                  <span className={`font-bold shrink-0 uppercase w-16 text-[10px] tracking-wider mt-0.5 ${
                    log.type === "info" ? "text-blue-400" :
                    log.type === "warn" ? "text-amber-400" :
                    log.type === "action" ? "text-emerald-400 animate-pulse" : "text-red-400"
                  }`}>
                    [{log.type}]
                  </span>
                  <span className={`break-words flex-1 ${log.type === 'action' ? 'text-emerald-100 font-medium' : 'text-zinc-400'}`}>
                    {log.message}
                  </span>
                </div>
              ))}
              {logs.length === 0 && <span className="text-zinc-700 italic px-2">Awaiting telemetry...</span>}
            </div>
            <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-[#030303] to-transparent pointer-events-none rounded-b-2xl" />
          </div>
        )}
      </main>

      {/* SETTINGS SIDE DRAWER MODAL */}
      {isSettingsOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" 
            onClick={() => setIsSettingsOpen(false)} 
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#09090b] border-l border-white/10 z-50 p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
              <h2 className="text-lg font-bold flex items-center gap-2"><SettingsIcon className="w-5 h-5 text-indigo-400" /> Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            
            <div className="flex flex-col gap-6 flex-1 overflow-y-auto px-1 custom-scrollbar">
              
              <div className="space-y-3">
                <label className="text-sm font-semibold text-zinc-300">Data Point Retention (Sliding Window)</label>
                <div className="flex items-center gap-4">
                  <input 
                    title="Data Points Window Size"
                    type="range" 
                    min="10" 
                    max="100" 
                    step="5"
                    value={settings.maxDataPoints}
                    onChange={(e) => setSettings({...settings, maxDataPoints: parseInt(e.target.value)})}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <span className="text-xs font-mono bg-zinc-800 px-3 py-1.5 rounded-md min-w-[50px] text-center">{settings.maxDataPoints}</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">Adjust how many seconds of telemetry history the matrix retains before discarding.</p>
              </div>

              <div className="w-full h-[1px] bg-white/5 my-2" />

              <div className="space-y-4">
                <label className="text-sm font-semibold text-zinc-300 flex items-center justify-between">
                  Log Audit Terminal
                  <button 
                    onClick={() => setSettings({...settings, showLogs: !settings.showLogs})}
                    className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${settings.showLogs ? 'bg-indigo-500' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${settings.showLogs ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </label>
                <p className="text-xs text-zinc-500">Enable or disable the bottom runtime terminal rendering. Can save browser memory over extended monitoring sessions.</p>
              </div>

              <div className="w-full h-[1px] bg-white/5 my-2" />

              <div className="space-y-4">
                <label className="text-sm font-semibold text-zinc-300 flex items-center justify-between">
                  Mute Anomaly Feed
                  <button 
                    onClick={() => setSettings({...settings, muteAlerts: !settings.muteAlerts})}
                    className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${settings.muteAlerts ? 'bg-red-500' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${settings.muteAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </label>
                <p className="text-xs text-zinc-500">Silence the anomaly push notifications entering your priority feed box if testing network loads.</p>
              </div>

              <div className="w-full h-[1px] bg-white/5 my-2" />

              <div className="space-y-3">
                <label className="text-sm font-semibold text-zinc-300">Artificial Network Delay (ms)</label>
                <div className="flex items-center gap-4">
                  <input 
                    title="Artificial Delay in MS"
                    type="range" 
                    min="0" 
                    max="3000" 
                    step="100"
                    value={settings.simulatedDelay}
                    onChange={(e) => setSettings({...settings, simulatedDelay: parseInt(e.target.value)})}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-xs font-mono bg-zinc-800 px-3 py-1.5 rounded-md min-w-[60px] text-center">{settings.simulatedDelay}ms</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">Simulate severe network latency buffering your UI ingestion from Gateway SSE paths.</p>
              </div>

            </div>

              <div className="w-full h-[1px] bg-white/5 my-2" />

              <div className="space-y-3">
                <label className="text-sm font-semibold text-zinc-300">Ambient Theme Glow</label>
                <div className="flex gap-3">
                  {['indigo', 'emerald', 'rose', 'purple'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setSettings({...settings, themeColor: color as AppSettings['themeColor']})}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${settings.themeColor === color ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'} ${color === 'indigo' ? 'bg-indigo-500' : color === 'emerald' ? 'bg-emerald-500' : color === 'rose' ? 'bg-rose-500' : 'bg-purple-500'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="w-full h-[1px] bg-white/5 my-2" />

              <div className="space-y-3">
                <label className="text-sm font-semibold text-zinc-300">Power Warning Threshold (Watts)</label>
                <div className="flex items-center gap-4">
                  <input 
                    title="Power Warning Threshold"
                    type="range" 
                    min="50" 
                    max="1000" 
                    step="50"
                    value={settings.powerWarningThreshold}
                    onChange={(e) => setSettings({...settings, powerWarningThreshold: parseInt(e.target.value)})}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-xs font-mono bg-zinc-800 px-3 py-1.5 rounded-md min-w-[60px] text-center">{settings.powerWarningThreshold}W</span>
                </div>
              </div>

            <div className="mt-auto pt-6 border-t border-white/5">
              <button 
                onClick={() => setSettings({maxDataPoints: 30, showLogs: true, muteAlerts: false, simulatedDelay: 0, themeColor: "indigo", powerWarningThreshold: 300})}
                className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors border border-white/10"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{__html:`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}} />
    </div>
  );
}

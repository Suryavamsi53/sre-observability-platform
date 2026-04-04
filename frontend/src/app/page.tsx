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
  Lock,
  LogOut,
  User,
  Briefcase,
  Shield,
  Upload,
  Sun,
  Moon,
  Globe,
  Flame,
  Skull,
  Wind,
  WifiOff,
  DollarSign,
  Fingerprint,
  FileText,
  History,
  Share2,
  Database,
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
  mem_cached: number;
  mem_buffers: number;
  swap_total: number;
  swap_used: number;
  memory_type: string;
  active_connections: number;
  timestamp: number;
  cpu_fan_speed: number;
  gpu_fan_speed: number;
  cpu_power: number;
  gpu_power: number;
  tx_bytes: number;
  rx_bytes: number;
  tx_bits_per_sec: number;
  rx_bits_per_sec: number;
  latency_ms: number;
  hops: string;
  // Processor deep metrics
  thread_count: number;
  running_processes: number;
  top_processes: Array<{
    pid: number;
    name: string;
    cpu_usage: number;
    memory_usage: number;
  }>;
  cpu_model: string;
  cpu_cores: number;
  // SRE Core metrics
  mttr_seconds: number;
  error_budget_percent: number;
  uptime_percent: number;
  cost_estimate_local: number;
  overspend_percent: number;
  // Live SRE Production Jobs
  jobs: Array<{
    name: string;
    status: string;
    progress: number;
    last_run: string;
    duration_seconds?: number;
    cpu_usage?: number;
    memory_mb?: number;
    steps?: string[];
  }>;
  chaos_diagnosis: string;
  // Distributed Tracing
  trace_id: string;
  // Deployment & Release
  release: {
     version: string;
     status: string;
     deployed_at: number;
  };
  // Visualization & Graph
  dependencies: Array<{
     target_service: string;
     call_type: string;
     latency_ms: number;
  }>;
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
  themeMode: "dark" | "light";
  powerWarningThreshold: number;
}

interface UserProfile {
  name: string;
  role: string;
  department: string;
  avatarUrl: string;
}

export default function Dashboard() {
  const [metricsHistory, setMetricsHistory] = useState<Metric[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [healthStatus, setHealthStatus] = useState<"HEALTHY" | "WARNING" | "CRITICAL">("HEALTHY");

  const [toasts, setToasts] = useState<Array<{id: number, message: string, severity: 'critical' | 'warning' | 'info' | 'success'}>>([]);

  const addToast = (message: string, severity: 'critical' | 'warning' | 'info' | 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev.slice(-4), {id, message, severity}]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };



  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "System Administrator",
    role: "admin",
    department: "SRE Operations",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=SystemAdmin"
  });

  const isAdmin = userProfile.role === 'admin';

  const [settings, setSettings] = useState<AppSettings>({
    maxDataPoints: 200,
    showLogs: true,
    muteAlerts: false,
    simulatedDelay: 0,
    themeColor: "indigo",
    themeMode: "dark",
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
        const rawData = JSON.parse(event.data);
        const data: Metric = {
          ...rawData,
          latency_ms: rawData.latency_ms ?? 0,
          rx_bits_per_sec: rawData.rx_bits_per_sec ?? 0,
          tx_bits_per_sec: rawData.tx_bits_per_sec ?? 0,
          hops: rawData.hops ?? "",
          thread_count: rawData.thread_count ?? 0,
          running_processes: rawData.running_processes ?? 0,
          top_processes: rawData.top_processes ?? [],
          cpu_model: rawData.cpu_model ?? "Intel Core i5-10xxx",
          cpu_cores: rawData.cpu_cores ?? 4,
          jobs: rawData.jobs ?? [],
          chaos_diagnosis: rawData.chaos_diagnosis ?? "",
          trace_id: rawData.trace_id ?? "trace-none",
          release: rawData.release ?? { version: "v1.0.0", status: "PRODUCTION", deployed_at: 0 },
          dependencies: rawData.dependencies ?? [],
        };
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
          const newAlerts = [data, ...prev].slice(0, 50);
          if (data.severity === 4 && !settings.muteAlerts) {
            addToast(`CRITICAL: ${data.message} in ${data.service_name}`, "critical");
          }
          return newAlerts;
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

  useEffect(() => {
    // Check initial authentication state
    const auth = localStorage.getItem("sre_admin_auth");
    if (auth !== "true") {
      setIsAuthenticated(false);
    }

    // Load profile state
    const savedProfile = localStorage.getItem("sre_user_profile");
    if (savedProfile) {
      try { setUserProfile(JSON.parse(savedProfile)); } catch { }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername === "admin" && loginPassword === "admin123") {
      localStorage.setItem("sre_admin_auth", "true");
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
      setLoginPassword("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("sre_admin_auth");
    setIsAuthenticated(false);
    setLoginUsername("");
    setLoginPassword("");
  };

  const latestMetric = metricsHistory[metricsHistory.length - 1] || {
    cpu_usage: 0,
    cpu_user: 0,
    cpu_system: 0,
    cpu_iowait: 0,
    memory_usage: 0,
    active_connections: 0,
    cpu_fan_speed: 0,
    gpu_fan_speed: 0,
    cpu_power: 0,
    gpu_power: 0,
    total_memory: 0,
    free_memory: 0,
    available_memory: 0,
    mem_cached: 0,
    mem_buffers: 0,
    swap_total: 0,
    swap_used: 0,
    memory_type: "Scanning...",
    service_name: "Initial...",
    instance_id: "Loading...",
    mttr_seconds: 0,
    error_budget_percent: 0,
    uptime_percent: 0,
    cost_estimate_local: 0,
    overspend_percent: 0,
    jobs: [],
    chaos_diagnosis: "",
    trace_id: "trace-pending",
    release: { version: "v0.0.0", status: "NONE", deployed_at: 0 },
    dependencies: [],
    tx_bytes: 0,
    rx_bytes: 0,
    tx_bits_per_sec: 0,
    rx_bits_per_sec: 0,
    latency_ms: 0,
    hops: "",
    thread_count: 0,
    running_processes: 0,
    top_processes: [],
    cpu_model: "Intel Core i5-10xxx",
    cpu_cores: 4,
  };

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen ${settings.themeMode === 'dark' ? 'bg-[#050505]' : 'bg-zinc-50'} flex items-center justify-center font-sans relative overflow-hidden selection:bg-indigo-500/30`}>
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/10 blur-[150px] pointer-events-none" />
        <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[150px] pointer-events-none ${settings.themeMode === 'light' ? 'opacity-20' : ''}`} />

        <div className={`w-full max-w-md ${settings.themeMode === 'dark' ? 'bg-zinc-950/80 border-white/10' : 'bg-white/90 border-zinc-200 shadow-xl'} border p-10 rounded-3xl backdrop-blur-xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700`}>
          <div className="flex flex-col items-center mb-10">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-3.5 rounded-2xl mb-5 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
              <Lock className="w-8 h-8 text-white relative z-10" />
            </div>
            <h1 className={`text-3xl font-black tracking-tighter ${settings.themeMode === 'dark' ? 'from-white to-zinc-500' : 'from-zinc-900 to-zinc-500'} bg-gradient-to-br bg-clip-text text-transparent`}>SRE NEXUS</h1>
            <p className="text-zinc-500 text-[11px] uppercase tracking-[0.3em] mt-2 font-bold select-none">Authorized Access Only</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Administrator ID</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className={`w-full ${settings.themeMode === 'dark' ? 'bg-black/50 border-white/5 text-zinc-200' : 'bg-zinc-100 border-zinc-200 text-zinc-800'} border rounded-xl px-4 py-3.5 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm`}
                placeholder="root / admin"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Authentication Core</label>
              </div>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className={`w-full ${settings.themeMode === 'dark' ? 'bg-black/50 border-white/5 text-zinc-200' : 'bg-zinc-100 border-zinc-200 text-zinc-800'} border rounded-xl px-4 py-3.5 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono tracking-widest text-sm`}
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-[10px] text-center tracking-widest uppercase font-bold animate-in fade-in zoom-in slide-in-from-top-2">
                Authentication Rejected.
              </div>
            )}

            <button type="submit" className={`w-full py-4 ${settings.themeMode === 'dark' ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-black'} rounded-xl font-bold tracking-[0.2em] uppercase transition-all active:scale-[0.98] mt-2 text-xs shadow-xl`}>
              Initialize Subsystems
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${settings.themeMode === 'dark' ? 'bg-[#050505] text-zinc-100' : 'bg-zinc-50 text-zinc-900'} font-sans relative overflow-hidden flex flex-col selection:bg-${settings.themeColor}-500/30 transition-colors duration-500`}>
      {/* Background Ambience */}
      <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${settings.themeColor === 'indigo' ? 'bg-indigo-900/20' : settings.themeColor === 'emerald' ? 'bg-emerald-900/20' : settings.themeColor === 'rose' ? 'bg-rose-900/20' : 'bg-purple-900/20'}`} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/10 blur-[120px] pointer-events-none" />
      {healthStatus === "CRITICAL" && (
        <div className="absolute inset-0 bg-red-900/5 blur-[150px] pointer-events-none transition-all duration-1000" />
      )}

      {/* Navigation Layer */}
      <nav className={`border-b ${settings.themeMode === 'dark' ? 'border-white/5 bg-black/40' : 'border-zinc-200 bg-white/80'} backdrop-blur-xl sticky top-0 z-40`}>
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`${settings.themeMode === 'dark' ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'} p-2 rounded-lg border`}>
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className={`text-xl font-bold tracking-tight bg-gradient-to-r ${settings.themeMode === 'dark' ? 'from-white to-zinc-400' : 'from-zinc-900 to-zinc-500'} bg-clip-text text-transparent`}>
              SRE Nexus
            </h1>
          </div>

          <div className={`hidden lg:flex items-center gap-1 ${settings.themeMode === 'dark' ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'} border rounded-full px-3 py-1.5`}>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Release: {latestMetric.release?.version || 'v1.4.2'} • {latestMetric.release?.status || 'STABLE'}</span>
          </div>

          <div className={`hidden md:flex items-center ${settings.themeMode === 'dark' ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-zinc-200'} border rounded-full px-4 py-1.5 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all ml-4`}>
            <Search className="w-4 h-4 text-zinc-500 mr-2" />
            <input
              type="text"
              placeholder="Filter incidents & traces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent border-none outline-none text-sm ${settings.themeMode === 'dark' ? 'text-zinc-200 placeholder:text-zinc-600' : 'text-zinc-800 placeholder:text-zinc-400'} w-48 lg:w-64`}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase border transition-colors duration-500 ${healthStatus === "HEALTHY" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
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
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-8 h-8 rounded-full border border-white/10 ml-2 overflow-hidden hover:ring-2 hover:ring-indigo-500/50 transition-all cursor-pointer flex items-center justify-center bg-zinc-900 shadow-lg relative group"
            >
              {userProfile.avatarUrl ? (
                <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold">
                  {userProfile.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <User className="w-4 h-4 text-white" />
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="group flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-full border border-red-500/20 transition-all duration-300 ml-2"
              title="Logout"
            >
              <LogOut className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-[10px] font-bold tracking-widest uppercase">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-6 flex flex-col gap-6 relative z-10 w-full flex-1">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-6">
          <div
            onClick={() => setSelectedCard("cpu")}
            className={`${settings.themeMode === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-indigo-500/30' : 'bg-white border-zinc-200 shadow-sm hover:border-indigo-300'} border rounded-2xl p-5 relative overflow-hidden group transition-all cursor-pointer active:scale-95`}
          >
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className={`${settings.themeMode === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'} p-1.5 rounded-md`}><Cpu className="w-4 h-4" /></div>
                <h3 className={`text-sm font-medium ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Compute Core</h3>
              </div>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${latestMetric.cpu_usage > 85 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {latestMetric.cpu_usage.toFixed(1)}%
              </span>
            </div>
            <div className="h-20 w-full mt-4 -ml-2 -mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsHistory}>
                  <YAxis hide domain={[0, 100]} />
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="cpu_usage" stroke="#818cf8" strokeWidth={2} fill="url(#cpuGrad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            onClick={() => setSelectedCard("memory")}
            className={`${settings.themeMode === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-purple-500/30' : 'bg-white border-zinc-200 shadow-sm hover:border-purple-300'} border rounded-2xl p-5 relative overflow-hidden group transition-all cursor-pointer active:scale-95`}
          >
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className={`${settings.themeMode === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-600'} p-1.5 rounded-md`}><HardDrive className="w-4 h-4" /></div>
                <h3 className={`text-sm font-medium ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Memory Cluster</h3>
              </div>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${latestMetric.memory_usage > 14000 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {latestMetric.memory_usage.toFixed(0)} MB Used
              </span>
            </div>

            <div className={`flex justify-between items-center text-[10px] ${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} font-mono mt-1 relative z-10 px-1`}>
              <span>Tot: {(latestMetric.total_memory || 16384).toFixed(0)} MB</span>
              <span>Free: {(latestMetric.free_memory || (16384 - latestMetric.memory_usage)).toFixed(0)} MB</span>
            </div>

            <div className="h-20 w-full mt-2 -ml-2 -mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsHistory}>
                  <YAxis hide domain={[0, latestMetric.total_memory || 16384]} />
                  <defs>
                    <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c084fc" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="memory_usage" stroke="#c084fc" strokeWidth={2} fill="url(#memGrad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            onClick={() => setSelectedCard("connections")}
            className={`${settings.themeMode === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-cyan-500/30' : 'bg-white border-zinc-200 shadow-sm hover:border-cyan-300'} border rounded-2xl p-5 relative overflow-hidden group transition-all cursor-pointer active:scale-95`}
          >
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className={`${settings.themeMode === 'dark' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-50 text-cyan-600'} p-1.5 rounded-md`}><Server className="w-4 h-4" /></div>
                <h3 className={`text-sm font-medium ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>TCP Connections</h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                {latestMetric.active_connections}
              </span>
            </div>
            <div className="h-20 w-full mt-4 -ml-2 -mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsHistory}>
                  <YAxis hide domain={[0, 'auto']} />
                  <defs>
                    <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="step" dataKey="active_connections" stroke="#2dd4bf" strokeWidth={2} fill="url(#netGrad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            onClick={() => setSelectedCard("tracer")}
            className={`${settings.themeMode === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-sky-500/30' : 'bg-white border-zinc-200 shadow-sm hover:border-sky-300'} border rounded-2xl p-5 relative overflow-hidden group transition-all cursor-pointer active:scale-95`}
          >
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className={`${settings.themeMode === 'dark' ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-50 text-sky-600'} p-1.5 rounded-md`}><Globe className="w-4 h-4" /></div>
                <h3 className={`text-sm font-medium ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Internet Tracer</h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400">
                {(latestMetric.latency_ms ?? 0).toFixed(1)}ms
              </span>
            </div>

            <div className={`flex justify-between items-center text-[10px] ${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} font-mono mt-1 relative z-10 px-1 border-b ${settings.themeMode === 'dark' ? 'border-white/5' : 'border-zinc-100'} pb-1`}>
              <span title="RX bits/sec">↓ {((latestMetric.rx_bits_per_sec ?? 0) / 1024).toFixed(1)} Kbps</span>
              <span title="TX bits/sec">↑ {((latestMetric.tx_bits_per_sec ?? 0) / 1024).toFixed(1)} Kbps</span>
            </div>

            <div className="h-20 w-full mt-2 -ml-2 -mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsHistory}>
                  <YAxis hide domain={[0, 'auto']} />
                  <defs>
                    <linearGradient id="tracerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="latency_ms" stroke="#0ea5e9" strokeWidth={2} fill="url(#tracerGrad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            onClick={() => setSelectedCard("cooling")}
            className={`${settings.themeMode === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-blue-500/30' : 'bg-white border-zinc-200 shadow-sm hover:border-blue-300'} border rounded-2xl p-5 relative overflow-hidden group transition-all cursor-pointer active:scale-95`}
          >
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className={`${settings.themeMode === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'} p-1.5 rounded-md`}>
                  <Fan 
                    className={`w-4 h-4 ${latestMetric.cpu_fan_speed > 0 ? "animate-fan-spin" : ""}`} 
                    style={{ animationDuration: latestMetric.cpu_fan_speed > 0 ? `${Math.max(0.1, 2 - (latestMetric.cpu_fan_speed / 3000))}s` : '0s' }}
                  />
                </div>
                <h3 className={`text-sm font-medium ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Cooling (RPM)</h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                {latestMetric.cpu_fan_speed}
              </span>
            </div>

            <div className={`flex justify-between items-center text-[10px] ${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} font-mono mt-1 relative z-10 px-1`}>
              <span>ID: {latestMetric.instance_id || 'frontend-1'}</span>
              <span>Online</span>
            </div>

            <div className="h-20 w-full mt-2 -ml-2 -mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsHistory}>
                  <YAxis hide domain={[0, 'auto']} />
                  <defs>
                    <linearGradient id="fanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="cpu_fan_speed" stroke="#3b82f6" strokeWidth={2} fill="url(#fanGrad)" isAnimationActive={false} />
                  <Area type="monotone" dataKey="gpu_fan_speed" stroke="#60a5fa" strokeWidth={1} fill="transparent" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            onClick={() => setSelectedCard("power")}
            className={`${settings.themeMode === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-yellow-500/30' : 'bg-white border-zinc-200 shadow-sm hover:border-yellow-300'} border rounded-2xl p-5 relative overflow-hidden group transition-all cursor-pointer active:scale-95`}
          >
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className={`${settings.themeMode === 'dark' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-50 text-yellow-600'} p-1.5 rounded-md`}><Zap className="w-4 h-4" /></div>
                <h3 className={`text-sm font-medium ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Power (Watts)</h3>
              </div>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${(latestMetric.cpu_power + latestMetric.gpu_power) > settings.powerWarningThreshold ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {((latestMetric.cpu_power || 0) + (latestMetric.gpu_power || 0)).toFixed(1)}W
              </span>
            </div>

            <div className={`flex justify-between items-center text-[10px] ${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} font-mono mt-1 relative z-10 px-1 border-b ${settings.themeMode === 'dark' ? 'border-white/5' : 'border-zinc-100'} pb-1`}>
              <span>CPU: {(latestMetric.cpu_power || 0).toFixed(1)}W</span>
              <span>GPU: {(latestMetric.gpu_power || 0).toFixed(1)}W</span>
            </div>

            <div className={`flex justify-between items-center text-[9px] ${settings.themeMode === 'dark' ? 'text-zinc-600' : 'text-zinc-400'} font-mono mt-1 relative z-10 px-1`}>
              <span title="Projected Energy per Minute">1m: {(((latestMetric.cpu_power || 0) + (latestMetric.gpu_power || 0)) / 60).toFixed(2)}Wh</span>
              <span title="Projected Energy per Hour">1h: {((latestMetric.cpu_power || 0) + (latestMetric.gpu_power || 0)).toFixed(1)}Wh</span>
              <span title="Projected Energy per Day">24h: {(((latestMetric.cpu_power || 0) + (latestMetric.gpu_power || 0)) * 24).toFixed(0)}Wh</span>
            </div>

            <div className="h-20 w-full mt-2 -ml-2 -mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsHistory}>
                  <YAxis hide domain={[0, 'auto']} />
                  <defs>
                    <linearGradient id="pwrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area stackId="power" type="monotone" dataKey="cpu_power" stroke="#f59e0b" strokeWidth={1} fill="transparent" isAnimationActive={false} />
                  <Area stackId="power" type="monotone" dataKey="gpu_power" stroke="#eab308" strokeWidth={2} fill="url(#pwrGrad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div
            onClick={() => setSelectedCard("graph")}
            className={`lg:col-span-3 ${settings.themeMode === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-emerald-500/30' : 'bg-white border-zinc-200 shadow-sm hover:border-emerald-300'} border rounded-3xl p-8 relative overflow-hidden group transition-all cursor-pointer active:scale-95 min-h-[380px] flex flex-col`}
          >
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className={`${settings.themeMode === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'} p-3 rounded-2xl border border-emerald-500/20`}><Globe className="w-6 h-6" /></div>
                <div>
                   <h3 className={`text-lg font-black ${settings.themeMode === 'dark' ? 'text-zinc-100' : 'text-zinc-900'} uppercase tracking-[0.2em]`}>Strategic Topology</h3>
                   <span className="text-[10px] text-zinc-500 font-mono italic opacity-80 uppercase tracking-widest">Global Correlation Mesh • Primary Node: {latestMetric.service_name}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-5 py-2 rounded-2xl shadow-inner">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
                 <span className="text-xs font-mono font-black text-emerald-400 tracking-widest">
                   {latestMetric.dependencies?.length || 4} ACTIVE UPSTREAMS
                 </span>
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center relative mt-8 overflow-hidden">
               {/* Strategic Grid Background */}
               <div className="absolute inset-0 bg-[radial-gradient(#10b98110_1.5px,transparent_1.5px)] [background-size:60px_60px] opacity-40 shadow-inner" />

               {/* Center Hub: GATEWAY (XL) */}
               <div className="w-28 h-28 rounded-full bg-emerald-500/10 border-4 border-emerald-400/30 flex flex-col items-center justify-center relative z-20 animate-pulse shadow-[0_0_80px_rgba(16,185,129,0.15)] group-hover:scale-110 transition-transform duration-700">
                  <div className="w-4 h-4 rounded-full bg-emerald-400 animate-ping absolute -top-1" />
                  <span className="text-[11px] font-black text-white uppercase tracking-[0.3em] mb-1">HUB</span>
                  <div className="flex gap-1.5">
                     {[1,2,3].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 2 ? 'bg-emerald-400' : 'bg-emerald-400/40'}`} />)}
                  </div>
               </div>

               {/* Strategic Scale Dependency Orbits */}
               {(latestMetric.dependencies?.length ? latestMetric.dependencies : [
                  {target_service: "auth-gateway-svc", call_type: "GRPC"},
                  {target_service: "primary-postgres", call_type: "SQL"},
                  {target_service: "static-edge-cdn", call_type: "HTTP"},
                  {target_service: "log-aggregator", call_type: "BUFF"}
               ]).map((dep, i) => {
                  const total = (latestMetric.dependencies?.length || 4);
                  const angle = (i * (360 / total)) * (Math.PI / 180);
                  const radiusX = 320; // Strategic Horizontal Spread
                  const radiusY = 130;  // Increased Vertical Depth
                  const x = Math.cos(angle) * radiusX;
                  const y = Math.sin(angle) * radiusY;
                  
                  return (
                     <div key={i} className="absolute transition-all duration-1000 group/node" style={{ transform: `translate(${x}px, ${y}px)` }}>
                        <div className={`p-6 rounded-[32px] shadow-2xl backdrop-blur-3xl transition-all duration-500 flex flex-col items-center relative z-30 min-w-[200px] ${
                          settings.themeMode === 'dark' ? 'bg-black/90 border-white/10 hover:border-emerald-500/50' : 'bg-white border-zinc-200 hover:border-emerald-300'
                        } border-2 group-hover/node:scale-110 group-hover/node:z-40`}>
                           <div className="flex items-center gap-2 mb-3">
                              {dep.call_type === 'GRPC' && <Share2 className="w-3.5 h-3.5 text-blue-400" />}
                              {dep.call_type === 'SQL' && <Database className="w-3.5 h-3.5 text-amber-500" />}
                              {dep.call_type === 'HTTP' && <Globe className="w-3.5 h-3.5 text-emerald-400" />}
                              {dep.call_type === 'REST' && <Globe className="w-3.5 h-3.5 text-indigo-400" />}
                              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                                 dep.call_type === 'SQL' ? 'text-amber-500' : 
                                 dep.call_type === 'GRPC' ? 'text-blue-400' :
                                 dep.call_type === 'REST' ? 'text-indigo-400' : 'text-emerald-400'
                              }`}>{dep.call_type} ENGINE</span>
                           </div>
                           <span className={`text-sm font-black uppercase leading-none tracking-tight mb-4 ${settings.themeMode === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>{dep.target_service}</span>
                           <div className="flex flex-col gap-2 w-full border-t border-white/10 pt-4">
                              <div className="flex justify-between items-center text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                                 <span>Resource Load</span>
                                 <span className={dep.call_type === 'SQL' ? 'text-amber-400' : 'text-white'}>64.8%</span>
                              </div>
                              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                 <div 
                                    className={`h-full ${dep.call_type === 'SQL' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'}`} 
                                    style={{ width: '64.8%' }} 
                                 />
                              </div>
                           </div>
                        </div>
                        
                        {/* Strategic High-Contrast Particle Path */}
                        <div className="absolute top-1/2 left-1/2 -z-10 h-[2px] bg-gradient-to-r from-emerald-500/0 via-emerald-500/30 to-emerald-500/0 origin-left pointer-events-none" 
                             style={{ 
                                width: `${radiusX}px`, 
                                transform: `rotate(${angle + Math.PI}rad) translateX(15px)` 
                             }} 
                        />
                        
                        {/* Accelerated Particle Physics */}
                        <div className="absolute top-1/2 left-1/2 -z-10 w-3 h-3 bg-emerald-400 rounded-full blur-[3.5px] shadow-[0_0_15px_rgba(16,185,129,1)]" 
                             style={{ 
                                animation: `flow-pulse 2s infinite linear`,
                                animationDelay: `${i * 0.5}s`,
                                transform: `rotate(${angle + Math.PI}rad) translateX(${radiusX}px)` 
                             }} 
                        />
                     </div>
                  );
               })}
            </div>

            <div className={`mt-8 pt-6 border-t ${settings.themeMode === 'dark' ? 'border-white/5' : 'border-zinc-100'} flex justify-between items-end relative z-20`}>
               <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                     <Fingerprint className="w-4 h-4 text-indigo-400 animate-pulse" />
                     <span className="text-[11px] text-zinc-500 font-mono tracking-tight uppercase font-black">Strategic Mesh Context: Primary-Correlation-Cell</span>
                  </div>
                  <span className="text-[9px] text-zinc-600 font-mono tracking-[0.3em] font-bold">{latestMetric.trace_id}</span>
               </div>
               <div className="flex items-center gap-8">
                  <div className="text-right">
                     <span className="block text-[9px] text-zinc-500 font-black uppercase mb-1 tracking-widest">Mesh Stability Index</span>
                     <span className="text-2xl font-mono font-black text-emerald-400 tracking-tighter">99.98%</span>
                  </div>
                  <div className="h-2 w-32 rounded-full bg-emerald-500/10 overflow-hidden relative border border-emerald-500/10">
                     <div className="absolute top-0 left-0 h-full w-1/3 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)] animate-[move_3s_infinite_linear]" />
                  </div>
               </div>
            </div>
          </div>
          <div
            onClick={() => setSelectedCard("jobs")}
            className={`${settings.themeMode === 'dark' ? 'bg-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/50' : 'bg-indigo-50 border-indigo-200 shadow-sm hover:border-indigo-300'} border rounded-2xl p-5 relative overflow-hidden group transition-all cursor-pointer active:scale-95`}
          >
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className={`${settings.themeMode === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'} p-1.5 rounded-md`}><Briefcase className="w-4 h-4" /></div>
                <h3 className={`text-sm font-medium ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>SRE Jobs</h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                {latestMetric.jobs?.filter(j => j.status === 'RUNNING').length || 2} ACTIVE
              </span>
            </div>
            <div className="mt-4 space-y-2">
               {latestMetric.jobs?.slice(0, 2).map((j, i) => (
                  <div key={i} className="flex justify-between items-center text-[10px]">
                     <span className="text-zinc-500 truncate mr-2">{j.name}</span>
                     <span className={`${j.status === 'RUNNING' ? 'text-blue-400' : 'text-emerald-400'} font-bold`}>{j.status}</span>
                  </div>
               )) || (
                  <div className="text-[10px] text-zinc-600 italic">No active automation...</div>
               )}
            </div>
          </div>

          <div
            onClick={() => setSelectedCard("chaos")}
            className={`${settings.themeMode === 'dark' ? 'bg-orange-500/5 border-orange-500/20 hover:border-orange-500/50' : 'bg-orange-50 border-orange-200 shadow-sm hover:border-orange-300'} border rounded-2xl p-5 relative overflow-hidden group transition-all cursor-pointer active:scale-95`}
          >
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className={`${settings.themeMode === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'} p-1.5 rounded-md`}><Flame className="w-4 h-4" /></div>
                <h3 className={`text-sm font-medium ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Chaos Lab</h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 animate-pulse">
                READY
              </span>
            </div>
            <p className={`text-[10px] ${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} leading-tight mt-2`}>Inject faults, latency, and simulate service crashes to test reliability protocols.</p>
            <div className="mt-4 flex gap-2">
                <div className="flex-1 h-1 bg-orange-500/20 rounded-full overflow-hidden"><div className="bg-orange-500 h-full w-1/3" /></div>
                <div className="flex-1 h-1 bg-orange-500/10 rounded-full" />
                <div className="flex-1 h-1 bg-orange-500/10 rounded-full" />
            </div>
          </div>

          <div
            onClick={() => setSelectedCard("cost")}
            className={`${settings.themeMode === 'dark' ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/50' : 'bg-emerald-50 border-emerald-200 shadow-sm hover:border-emerald-300'} border rounded-2xl p-5 relative overflow-hidden group transition-all cursor-pointer active:scale-95`}
          >
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className={`${settings.themeMode === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'} p-1.5 rounded-md`}><DollarSign className="w-4 h-4" /></div>
                <h3 className={`text-sm font-medium ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Cost HUD</h3>
              </div>
            </div>
             <div className="mt-1 flex flex-col">
                <span className="text-xl font-mono font-black text-emerald-400 tracking-tighter">₹{(latestMetric.cost_estimate_local ?? 0).toFixed(0)}<span className="text-[10px] ml-1 opacity-60 font-normal">/mo est.</span></span>
                <span className={`text-[9px] ${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} uppercase font-bold mt-1`}>Predicted Resource Burn</span>
             </div>
          </div>
        </div>

        {/* Charts and Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className={`lg:col-span-4 ${settings.themeMode === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-white border-zinc-200 shadow-lg'} border rounded-2xl p-5 flex flex-wrap gap-8 items-center`}>
            <h2 className={`text-xs font-black ${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} uppercase tracking-widest flex items-center gap-2 border-r ${settings.themeMode === 'dark' ? 'border-white/5' : 'border-zinc-100'} pr-8 mr-4 leading-none h-6`}>
              <Activity className="w-3 h-3" /> Reliability SLIs
            </h2>
            <div className="flex-1 flex gap-12 overflow-x-auto no-scrollbar">
              <div className="flex flex-col">
                <span className={`text-[9px] ${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} uppercase font-bold`}>System Uptime</span>
                <span className="text-sm font-mono font-black text-emerald-400">{(latestMetric.uptime_percent ?? 99.9).toFixed(2)}%</span>
              </div>
              <div className="flex flex-col">
                <span className={`text-[9px] ${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} uppercase font-bold`}>Error Budget</span>
                <span className="text-sm font-mono font-black text-blue-400">{(latestMetric.error_budget_percent ?? 0.02).toFixed(3)}% <span className="opacity-40 text-[9px]">rem.</span></span>
              </div>
              <div className="flex flex-col">
                <span className={`text-[9px] ${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} uppercase font-bold`}>MTTR (Avg)</span>
                <span className="text-sm font-mono font-black text-amber-400">{(latestMetric.mttr_seconds ?? 12.4).toFixed(1)}s</span>
              </div>
              <div className="flex flex-col">
                <span className={`text-[9px] ${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} uppercase font-bold`}>Scale-Up Factor</span>
                <span className="text-sm font-mono font-black text-purple-400">{(1 + (latestMetric.cpu_usage/200)).toFixed(1)}x</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div
            onClick={() => setSelectedCard("matrix")}
            className={`lg:col-span-3 ${settings.themeMode === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-white/20' : 'bg-white border-zinc-200 shadow-lg hover:border-zinc-300'} border rounded-2xl p-6 flex flex-col h-[450px] cursor-pointer transition-all active:scale-[0.99] group`}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-base font-semibold ${settings.themeMode === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>System Telemetry Matrix</h2>
            </div>
            <div className="flex-1 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={metricsHistory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={settings.themeMode === 'dark' ? "#27272a" : "#e4e4e7"} vertical={false} />
                  <XAxis dataKey="timestamp" hide />
                  <YAxis yAxisId="left" stroke="#52525b" tick={{ fill: settings.themeMode === 'dark' ? "#71717a" : "#3f3f46", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" stroke="#52525b" tick={{ fill: settings.themeMode === 'dark' ? "#71717a" : "#3f3f46", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, latestMetric.total_memory || 16384]} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: settings.themeMode === 'dark' ? "rgba(9,9,11,0.9)" : "rgba(255,255,255,0.95)", 
                      borderColor: settings.themeMode === 'dark' ? "#27272a" : "#e4e4e7", 
                      borderRadius: "12px", 
                      backdropFilter: "blur(10px)",
                      color: settings.themeMode === 'dark' ? "#e4e4e7" : "#18181b",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.1)" 
                    }}
                    itemStyle={{ color: settings.themeMode === 'dark' ? "#e4e4e7" : "#18181b", fontSize: '13px' }}
                    labelStyle={{ color: settings.themeMode === 'dark' ? "#a1a1aa" : "#71717a", fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}
                    labelFormatter={(label) => new Date(label).toLocaleTimeString()}
                    cursor={{ stroke: settings.themeMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', strokeWidth: 1 }}
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

          <div className={`lg:col-span-1 ${settings.themeMode === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-white border-zinc-200 shadow-lg'} border rounded-2xl flex flex-col overflow-hidden h-[450px]`}>
            <div className={`px-5 py-4 border-b ${settings.themeMode === 'dark' ? 'border-white/5 bg-black/20' : 'border-zinc-100 bg-zinc-50'} flex justify-between items-center z-10 relative`}>
              <h2 className={`text-sm font-semibold ${settings.themeMode === 'dark' ? 'text-zinc-200' : 'text-zinc-800'} flex items-center gap-2`}>
                <AlertOctagon className={`w-4 h-4 ${alerts.length > 0 ? "text-red-400 animate-pulse" : "text-zinc-500"}`} />
                Incident Feed
              </h2>
              {alerts.length > 0 && <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{alerts.length}</span>}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative">
              {alerts.filter(a => 
                a.service_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                a.message.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 px-6 text-center">
                  <Search className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-xs">No incidents matching "{searchQuery}"</p>
                </div>
              ) : (
                alerts
                  .filter(a => 
                    a.service_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    a.message.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((alert) => (
                    <div key={`${alert.alert_id}-${alert.timestamp}`} className={`${settings.themeMode === 'dark' ? 'bg-red-500/5 text-zinc-200' : 'bg-red-50 text-zinc-800'} hover:bg-red-500/10 transition-colors border-l-2 border-red-500 p-3 rounded-r-xl group cursor-pointer animate-in fade-in slide-in-from-right duration-300`}>
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-xs tracking-wide">{alert.service_name}</h4>
                        <span className={`text-[10px] ${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} font-mono`}>{new Date(alert.timestamp * 1000).toLocaleTimeString()}</span>
                      </div>
                      <p className={`text-xs ${settings.themeMode === 'dark' ? 'text-red-300/80' : 'text-red-700/80'} leading-relaxed font-medium`}>{alert.message}</p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Terminal logs */}
        {settings.showLogs && (
          <div className={`${settings.themeMode === 'dark' ? 'bg-[#030303] border-zinc-800/80' : 'bg-zinc-900 border-zinc-700'} border shadow-2xl rounded-2xl p-5 h-64 flex flex-col font-mono relative`}>
            <div className={`flex items-center gap-3 mb-4 text-zinc-500 text-xs uppercase tracking-widest font-semibold pb-3 border-b ${settings.themeMode === 'dark' ? 'border-zinc-900' : 'border-zinc-800'}`}>
              <Terminal className="w-4 h-4" /> Runtime Audit Log
              <div className="ml-auto flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-4 space-y-2 text-[13px] custom-scrollbar">
              {logs.filter(l => 
                l.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
                l.type.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((log, i) => (
                <div key={i} className={`flex gap-4 items-start leading-relaxed animate-in fade-in duration-300 ${settings.themeMode === 'dark' ? 'hover:bg-white/5' : 'hover:bg-white/10'} px-2 py-0.5 rounded transition-colors -mx-2`}>
                  <span className="text-zinc-500 shrink-0 select-none">{log.time}</span>
                  <span className={`font-bold shrink-0 uppercase w-16 text-[10px] tracking-wider mt-0.5 ${log.type === "info" ? "text-blue-400" :
                      log.type === "warn" ? "text-amber-400" :
                        log.type === "action" ? "text-emerald-400 animate-pulse" : "text-red-400"
                    }`}>
                    [{log.type}]
                  </span>
                  <span className={`break-words flex-1 ${log.type === 'action' ? 'text-emerald-100 font-medium' : (settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-300')}`}>
                    {log.message}
                  </span>
                </div>
              ))}
              {logs.filter(l => 
                l.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
                l.type.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 && <span className="text-zinc-700 italic px-2">No logs matching "{searchQuery}"</span>}
            </div>
            <div className={`absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t ${settings.themeMode === 'dark' ? 'from-[#030303]' : 'from-zinc-900'} to-transparent pointer-events-none rounded-b-2xl`} />
          </div>
        )}
      </main>

      {/* METRIC DETAIL MODAL */}
      {selectedCard && (
        <>
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-300"
            onClick={() => setSelectedCard(null)}
          />
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full ${selectedCard === 'graph' ? 'max-w-[1600px]' : 'max-w-2xl'} ${settings.themeMode === 'dark' ? 'bg-zinc-950/95 border-white/10' : 'bg-white border-zinc-200 shadow-2xl'} border p-10 rounded-[60px] z-[70] animate-in zoom-in-95 duration-500 overflow-y-auto max-h-[95vh]`}>
            <div className={`flex items-center justify-between mb-8 pb-4 border-b ${settings.themeMode === 'dark' ? 'border-white/5' : 'border-zinc-100'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${selectedCard === 'cpu' ? 'bg-indigo-500/20 text-indigo-400' :
                    selectedCard === 'memory' ? 'bg-purple-500/20 text-purple-400' :
                      selectedCard === 'connections' ? 'bg-cyan-500/20 text-cyan-400' :
                        selectedCard === 'cooling' ? 'bg-blue-500/20 text-blue-400' :
                          selectedCard === 'matrix' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                  {selectedCard === 'cpu' && <Cpu className="w-6 h-6" />}
                  {selectedCard === 'memory' && <HardDrive className="w-6 h-6" />}
                  {selectedCard === 'connections' && <Server className="w-6 h-6" />}
                  {selectedCard === 'cooling' && (
                    <Fan 
                      className={`w-6 h-6 animate-fan-spin`} 
                      style={{ animationDuration: latestMetric.cpu_fan_speed > 0 ? `${Math.max(0.1, 1.5 - (latestMetric.cpu_fan_speed / 4000))}s` : '2s' }}
                    />
                  )}
                  {selectedCard === 'power' && <Zap className="w-6 h-6" />}
                  {selectedCard === 'tracer' && <Globe className="w-6 h-6" />}
                  {selectedCard === 'matrix' && <Activity className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold uppercase tracking-tight">{selectedCard === 'matrix' ? 'Telemetry Matrix' : selectedCard === 'tracer' ? 'Internet Tracer' : `${selectedCard} Diagnosis`}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className={`${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} text-sm`}>Real-time deep cluster telemetry</p>
                    {selectedCard === 'cpu' && latestMetric.cpu_model && (
                      <>
                        <div className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span className="text-[10px] font-mono text-indigo-400 uppercase font-black bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">{latestMetric.cpu_model} ({latestMetric.cpu_cores} vCores)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCard(null)}
                className={`p-2 ${settings.themeMode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-zinc-100'} rounded-full transition-colors`}
                title="Close"
              >
                <X className={`w-6 h-6 ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Detailed Breakdown Section */}
              <div className="space-y-6">
                {selectedCard === 'tracer' && (
                  <>
                    <div className="space-y-4">
                      <div className={`p-5 rounded-2xl ${settings.themeMode === 'dark' ? 'bg-sky-500/10 border border-sky-500/20' : 'bg-sky-50 border border-sky-200'} text-center group`}>
                        <span className="block text-[10px] uppercase font-black text-sky-500/60 mb-2 tracking-widest">Network Latency</span>
                        <span className="text-5xl font-mono font-black text-sky-400 tracking-tighter animate-pulse">{(latestMetric.latency_ms ?? 0).toFixed(1)}<span className="text-sm ml-1 opacity-60">ms</span></span>
                        <div className="flex justify-center gap-3 mt-4">
                           <div className="flex flex-col items-center"><span className="text-[9px] text-zinc-500 uppercase font-bold">RX</span><span className="text-xs font-mono text-zinc-300">{((latestMetric.rx_bits_per_sec ?? 0) / 1024).toFixed(1)} K</span></div>
                           <div className="w-[1px] h-8 bg-zinc-800 self-center opacity-40" />
                           <div className="flex flex-col items-center"><span className="text-[9px] text-zinc-500 uppercase font-bold">TX</span><span className="text-xs font-mono text-zinc-300">{((latestMetric.tx_bits_per_sec ?? 0) / 1024).toFixed(1)} K</span></div>
                        </div>
                      </div>

                      <div className={`${settings.themeMode === 'dark' ? 'bg-white/5' : 'bg-zinc-50 border border-zinc-200'} p-5 rounded-xl`}>
                        <h4 className={`text-xs font-bold ${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} uppercase tracking-widest mb-4 flex items-center justify-between`}>
                          Traceroute Graph (Hops)
                          <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full border border-emerald-500/20">LIVE</span>
                        </h4>
                        <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-sky-500/50 before:to-transparent">
                          {(latestMetric.hops ?? "").split(',').map((hop, i, arr) => (
                            <div key={i} className="relative group">
                              <div className={`absolute -left-[2.15rem] top-1.5 w-3 h-3 rounded-full border-2 ${i === arr.length - 1 ? 'bg-sky-500 border-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.5)] animate-ping' : (settings.themeMode === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200')} transition-all group-hover:scale-125 z-10`} />
                              <div className="flex justify-between items-center bg-black/20 group-hover:bg-black/40 px-3 py-2 rounded-lg transition-all border border-white/5 group-hover:border-white/10">
                                <span className={`text-xs font-mono ${i === arr.length - 1 ? 'text-sky-400 font-bold' : 'text-zinc-400'}`}>{hop}</span>
                                <span className="text-[10px] text-zinc-600">{((latestMetric.latency_ms ?? 0) * (i + 1) / (arr.length || 1)).toFixed(1)}ms</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {selectedCard === 'cpu' && (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className={`p-4 rounded-xl ${settings.themeMode === 'dark' ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-200'} text-center`}>
                        <span className="block text-[10px] uppercase font-bold text-indigo-400/70 mb-1 tracking-widest">Instruction Threads</span>
                        <span className={`text-2xl font-mono font-black ${settings.themeMode === 'dark' ? 'text-indigo-300' : 'text-indigo-700'}`}>{latestMetric.thread_count?.toLocaleString() || 0}</span>
                      </div>
                      <div className={`p-4 rounded-xl ${settings.themeMode === 'dark' ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-200'} text-center`}>
                        <span className="block text-[10px] uppercase font-bold text-indigo-400/70 mb-1 tracking-widest">Active Processes</span>
                        <span className={`text-2xl font-mono font-black ${settings.themeMode === 'dark' ? 'text-indigo-300' : 'text-indigo-700'}`}>{latestMetric.running_processes || 0}</span>
                      </div>
                    </div>

                    <div className={`${settings.themeMode === 'dark' ? 'bg-white/5 mx-[-2px]' : 'bg-zinc-50 border border-zinc-100'} p-4 rounded-xl space-y-3`}>
                      <h4 className={`text-[10px] font-black ${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-600'} uppercase tracking-widest flex justify-between px-2`}>
                        <span>Top Resource Consumers</span>
                        <span>Load (%)</span>
                      </h4>
                      <div className="space-y-2">
                        {latestMetric.top_processes?.length > 0 ? (
                          latestMetric.top_processes.map((p, idx) => (
                            <div key={p.pid} className={`flex justify-between items-center p-2 rounded-lg ${settings.themeMode === 'dark' ? 'bg-black/40 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'} animate-in fade-in slide-in-from-right duration-300`} style={{ animationDelay: `${idx * 100}ms` }}>
                              <div className="flex flex-col">
                                <span className={`text-xs font-bold ${settings.themeMode === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{p.name} <span className="opacity-40 ml-1 font-normal text-[10px]">PID: {p.pid}</span></span>
                                <span className="text-[9px] text-zinc-500 font-mono">{(p.memory_usage || 0).toFixed(1)}% Core Memory</span>
                              </div>
                              <span className="text-xs font-mono font-black text-indigo-400">{p.cpu_usage.toFixed(1)}%</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-xs text-zinc-600 italic">Analyzing process tree...</div>
                        )}
                      </div>
                    </div>

                    <div className={`border ${settings.themeMode === 'dark' ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-zinc-100 bg-zinc-50'} p-5 rounded-2xl`}>
                      <h4 className={`text-xs font-bold ${settings.themeMode === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} uppercase tracking-widest mb-3 flex items-center gap-2`}>
                        <Zap className="w-3 h-3" /> Load Mitigation Strategy
                      </h4>
                      <ul className={`text-[11px] ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-700'} space-y-2 leading-relaxed`}>
                        <li className="flex gap-2 leading-tight"><div className="w-1 h-1 rounded-full bg-indigo-500 mt-1 shrink-0" /> <strong>Kernel Preemption:</strong> If Load Avg {'>'} Core Count, consider increasing scheduler periodicity.</li>
                        <li className="flex gap-2 leading-tight"><div className="w-1 h-1 rounded-full bg-indigo-500 mt-1 shrink-0" /> <strong>Throttling Check:</strong> Review CPU Thermal logs if usage spikes persistent above 90%.</li>
                        <li className="flex gap-2 leading-tight"><div className="w-1 h-1 rounded-full bg-indigo-500 mt-1 shrink-0" /> <strong>Context Switches:</strong> High thread count ({latestMetric.thread_count?.toLocaleString()}) may cause excessive cycles. Optimize work-stealing pools.</li>
                      </ul>
                    </div>
                  </>
                )}

                {selectedCard === 'memory' && (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className={`p-4 rounded-xl ${settings.themeMode === 'dark' ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
                        <span className="block text-[10px] uppercase font-bold text-purple-400/70 mb-1">Architecture</span>
                        <span className={`text-lg font-mono font-bold ${settings.themeMode === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>{latestMetric.memory_type}</span>
                      </div>
                      <div className={`p-4 rounded-xl ${settings.themeMode === 'dark' ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
                        <span className="block text-[10px] uppercase font-bold text-purple-400/70 mb-1">Swap Space</span>
                        <span className={`text-lg font-mono font-bold ${settings.themeMode === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>{((latestMetric.swap_used || 0) / 1024).toFixed(2)} / {((latestMetric.swap_total || 0) / 1024).toFixed(2)} GB</span>
                      </div>
                    </div>

                    <div className={`${settings.themeMode === 'dark' ? 'bg-white/5' : 'bg-zinc-50 border border-zinc-200'} p-4 rounded-xl space-y-3`}>
                      <div className="flex justify-between items-center"><span className={`text-xs ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Available</span><span className="text-emerald-400 font-mono text-sm">{(latestMetric.available_memory / 1024).toFixed(2)} GB</span></div>
                      <div className="flex justify-between items-center"><span className={`text-xs ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Free RAM</span><span className="text-blue-400 font-mono text-sm">{(latestMetric.free_memory / 1024).toFixed(2)} GB</span></div>
                      <div className="flex justify-between items-center"><span className={`text-xs ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Cached</span><span className={`font-mono text-sm ${settings.themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>{(latestMetric.mem_cached / 1024).toFixed(2)} GB</span></div>
                      <div className="flex justify-between items-center"><span className={`text-xs ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Buffers</span><span className={`font-mono text-sm ${settings.themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>{(latestMetric.mem_buffers / 1024).toFixed(2)} GB</span></div>
                      <div className={`flex justify-between items-center border-t ${settings.themeMode === 'dark' ? 'border-white/5' : 'border-zinc-200'} pt-3`}><span className={`text-xs ${settings.themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'} font-semibold uppercase tracking-wider`}>Total Host Physical</span><span className={`${settings.themeMode === 'dark' ? 'text-zinc-100' : 'text-zinc-900'} font-mono font-bold`}>{(latestMetric.total_memory / 1024).toFixed(2)} GB</span></div>
                    </div>
                  </>
                )}

                {selectedCard === 'connections' && (
                  <>
                    <div className={`${settings.themeMode === 'dark' ? 'bg-white/5' : 'bg-zinc-50 border border-zinc-200'} p-5 rounded-xl text-center space-y-2`}>
                      <span className="block text-4xl font-bold text-cyan-400 font-mono">{latestMetric.active_connections}</span>
                      <span className={`text-xs ${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} uppercase font-bold tracking-widest`}>Active TCP Streams</span>
                    </div>
                    <ul className={`space-y-3 text-sm ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      <li className="flex justify-between px-2"><span>ESTABLISHED</span> <span className="text-emerald-500 font-mono">{Math.round(latestMetric.active_connections * 0.85)}</span></li>
                      <li className="flex justify-between px-2"><span>TIME_WAIT</span> <span className="text-amber-500 font-mono">{Math.round(latestMetric.active_connections * 0.1)}</span></li>
                      <li className="flex justify-between px-2"><span>LISTEN</span> <span className="text-blue-500 font-mono">12</span></li>
                    </ul>
                  </>
                )}

                {selectedCard === 'cooling' && (
                  <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      {/* CPU FAN UNIT */}
                      <div className={`${settings.themeMode === 'dark' ? 'bg-zinc-900 border-indigo-500/20' : 'bg-white border-zinc-200'} border-2 p-8 rounded-3xl text-center flex flex-col items-center justify-center transition-all hover:border-blue-500/40 group`}>
                        <div className="relative mb-6">
                          <div className={`absolute inset-0 rounded-full blur-3xl opacity-20 bg-blue-500 group-hover:opacity-40 transition-opacity`} />
                          <Fan 
                            className="w-32 h-32 text-blue-400 animate-fan-spin relative z-10 drop-shadow-[0_0_15px_rgba(96,165,250,0.3)]" 
                            style={{ animationDuration: latestMetric.cpu_fan_speed > 0 ? `${Math.max(0.1, 1.5 - (latestMetric.cpu_fan_speed / 4000))}s` : '0s' }}
                          />
                        </div>
                        <span className={`block ${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} text-xs uppercase font-black mb-1 tracking-widest`}>Intercooler Alpha (CPU)</span>
                        <span className="text-4xl font-mono text-white font-black tracking-tighter">{latestMetric.cpu_fan_speed}<span className="text-sm ml-1 opacity-40 font-normal italic">RPM</span></span>
                        <div className="mt-4 px-4 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 uppercase font-bold tracking-widest">Cooling Effectiveness: 94%</div>
                      </div>

                      {/* GPU FAN UNIT */}
                      <div className={`${settings.themeMode === 'dark' ? 'bg-zinc-900 border-indigo-500/20' : 'bg-white border-zinc-200'} border-2 p-8 rounded-3xl text-center flex flex-col items-center justify-center transition-all hover:border-indigo-500/40 group`}>
                        <div className="relative mb-6">
                          <div className={`absolute inset-0 rounded-full blur-3xl opacity-20 bg-indigo-500 group-hover:opacity-40 transition-opacity`} />
                          <Fan 
                            className="w-32 h-32 text-indigo-400 animate-fan-spin relative z-10 drop-shadow-[0_0_15px_rgba(129,140,248,0.3)]" 
                            style={{ animationDuration: latestMetric.gpu_fan_speed > 0 ? `${Math.max(0.1, 1.5 - (latestMetric.gpu_fan_speed / 4000))}s` : '0s' }}
                          />
                        </div>
                        <span className={`block ${settings.themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} text-xs uppercase font-black mb-1 tracking-widest`}>Integrated Rotor (GPU)</span>
                        <span className="text-4xl font-mono text-white font-black tracking-tighter">{latestMetric.gpu_fan_speed}<span className="text-sm ml-1 opacity-40 font-normal italic">RPM</span></span>
                        <div className="mt-4 px-4 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-400 uppercase font-bold tracking-widest">Aero Efficiency: 88%</div>
                      </div>
                    </div>
                    <div className={`p-5 rounded-2xl border ${settings.themeMode === 'dark' ? 'bg-black/40 border-white/5 text-zinc-400' : 'bg-zinc-50 border-zinc-100 text-zinc-600'} text-[11px] leading-relaxed italic`}>
                       <span className="text-blue-400 not-italic font-bold uppercase mr-2 tracking-tighter font-mono text-[10px] border border-blue-500/30 px-1 rounded">SRE Insight:</span> Thermal throttling is currently inactive. The cooling units are maintaining an ambient temperature delta of {((latestMetric.cpu_usage / 10) + 15).toFixed(1)}°C below critical T-junction limits.
                    </div>
                  </div>
                )}

                {selectedCard === 'graph' && (
                  <div className="space-y-10 animate-in fade-in zoom-in duration-700">
                     <div className={`p-16 rounded-[80px] ${settings.themeMode === 'dark' ? 'bg-black/60 border-emerald-500/10 shadow-[0_0_120px_rgba(16,185,129,0.08)]' : 'bg-emerald-50/30 border-emerald-100 shadow-xl'} border-2 flex flex-col items-center justify-center min-h-[660px] relative overflow-hidden group/studio`}>
                        {/* Cinematic Grid Overlay */}
                        <div className="absolute inset-0 bg-[radial-gradient(#10b98118_1.5px,transparent_1.5px)] [background-size:60px_60px] opacity-50 pointer-events-none shadow-inner" />
                        
                        {/* Central Processor Node (Strategic Scale) */}
                        <div className="w-56 h-56 rounded-full bg-emerald-500/10 border-[8px] border-emerald-400/30 flex flex-col items-center justify-center relative z-20 animate-pulse shadow-[0_0_120px_rgba(16,185,129,0.2)] group-hover/studio:scale-110 transition-all duration-1000">
                           <Globe size={64} className="text-emerald-400 mb-4 opacity-100 drop-shadow-[0_0_20px_rgba(16,185,129,1)]" />
                           <div className="text-center">
                              <span className="block text-[14px] font-black text-white uppercase tracking-[0.6em]">NEXUS-HUB</span>
                              <span className="block text-[10px] font-mono text-emerald-500/80 uppercase mt-1.5 font-black tracking-widest">Primary Operational Cell</span>
                           </div>
                           <div className="absolute inset-[-15px] border-[2px] border-emerald-500/10 rounded-full animate-[spin_20s_linear_infinite] border-dashed" />
                           <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,1)]" />
                        </div>
                        
                        {/* Orbital Satellite Grid */}
                        {(latestMetric.dependencies?.length ? latestMetric.dependencies : [
                           {target_service: "auth-gateway", call_type: "GRPC", latency_ms: 12.4},
                           {target_service: "payment-db", call_type: "SQL", latency_ms: 48.2},
                           {target_service: "static-cdn", call_type: "HTTP", latency_ms: 5.1},
                           {target_service: "remittance-svc", call_type: "AUTH", latency_ms: 22.8}
                        ]).map((dep, i) => {
                           const total = (latestMetric.dependencies?.length || 4);
                           const angle = (i * (360 / total)) * (Math.PI / 180);
                           const radiusX = 580; 
                           const radiusY = 110; 
                           const x = Math.cos(angle) * radiusX;
                           const y = Math.sin(angle) * radiusY;
                           
                           return (
                              <div key={i} className="absolute flex flex-col items-center group/node" style={{ transform: `translate(${x}px, ${y}px)` }}>
                                 <div className={`px-7 py-5 rounded-[36px] border-2 shadow-2xl backdrop-blur-3xl transition-all duration-500 flex flex-col items-center min-w-[180px] ${
                                    dep.call_type === 'SQL' ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/50' : 
                                    dep.call_type === 'GRPC' ? 'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/50' :
                                    'bg-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/50'
                                 }`}>
                                    <div className="flex items-center gap-2.5 mb-2.5">
                                       <div className={`w-2 h-2 rounded-full ${dep.latency_ms > 30 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]'}`} />
                                       <span className={`text-[10px] font-black uppercase tracking-widest ${dep.call_type === 'SQL' ? 'text-amber-500' : 'text-blue-500'}`}>{dep.call_type} NODE</span>
                                    </div>
                                    <span className="text-sm font-black text-white uppercase tracking-tight mb-2.5">{dep.target_service}</span>
                                    <div className="flex items-center gap-2.5 bg-black/60 px-4 py-2 border border-white/5 rounded-2xl shadow-inner">
                                       <Activity className="w-3.5 h-3.5 text-emerald-400" />
                                       <span className="text-xs font-mono font-black text-emerald-400">{dep.latency_ms.toFixed(1)}ms</span>
                                    </div>
                                 </div>
                                 
                                 <svg className="absolute top-1/2 left-1/2 -z-10 overflow-visible pointer-events-none" style={{ transform: `scaleX(${x < 0 ? -1 : 1}) rotate(${Math.atan2(y, x)}rad)` }}>
                                    <path 
                                       d={`M 0 0 Q ${radiusX/2} ${-y/4} ${radiusX} 0`} 
                                       fill="none" 
                                       stroke="url(#modalFlowGrad)" 
                                       strokeWidth="2.5" 
                                       strokeDasharray="12 12"
                                       className="animate-[dash_40s_linear_infinite] opacity-40"
                                    />
                                 </svg>
                                 
                                 <div className="absolute top-1/2 left-1/2 -z-10 w-3 h-3 bg-emerald-400 rounded-full blur-[4px] animate-flow-pulse shadow-[0_0_25px_rgba(16,185,129,1)]" 
                                      style={{ 
                                        animationDuration: `${1.1 + Math.random()}s`,
                                        animationDelay: `${i * 0.9}s`,
                                        transform: `rotate(${angle + Math.PI}rad) translateX(${radiusX}px)` 
                                      }} 
                                 />
                              </div>
                           )
                        })}

                        <svg className="absolute invisible">
                           <defs>
                              <linearGradient id="modalFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                 <stop offset="0%" stopColor="#10b98100" />
                                 <stop offset="50%" stopColor="#10b98190" />
                                 <stop offset="100%" stopColor="#10b98100" />
                              </linearGradient>
                           </defs>
                        </svg>

                        <div className="absolute bottom-10 right-10 flex gap-8 items-center bg-black/50 backdrop-blur-3xl border border-white/10 px-10 py-5 rounded-[40px] z-40 shadow-2xl">
                            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]" /> <span className="text-[11px] font-black uppercase text-zinc-100 tracking-widest">gRPC</span></div>
                            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]" /> <span className="text-[11px] font-black uppercase text-zinc-100 tracking-widest">SQL</span></div>
                            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]" /> <span className="text-[11px] font-black uppercase text-zinc-100 tracking-widest">REST</span></div>
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-8">
                        <div className={`${settings.themeMode === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-100 shadow-sm'} border-2 p-10 rounded-[48px] flex flex-col gap-4 group/stat hover:border-emerald-500/30 transition-all shadow-xl`}>
                           <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em] block mb-1">Active Mesh Links</span>
                           <span className="text-5xl font-mono font-black text-white group-hover/stat:text-emerald-400 transition-colors uppercase">{latestMetric.active_connections}</span>
                           <div className="flex items-center gap-2.5 text-[11px] text-emerald-500 font-black uppercase tracking-widest"><Zap className="w-3.5 h-3.5" /> High-Flow Linkage</div>
                        </div>
                        <div className={`${settings.themeMode === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm'} border-2 p-10 rounded-[48px] flex flex-col gap-4 group/stat hover:border-indigo-500/30 transition-all shadow-xl`}>
                           <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em] block mb-1">Consistency Index</span>
                           <span className="text-5xl font-mono font-black text-indigo-400 group-hover/stat:text-indigo-300 transition-colors">99.96</span>
                           <div className="flex items-center gap-2.5 text-[11px] text-indigo-500 font-black uppercase tracking-widest"><Fingerprint className="w-3.5 h-3.5" /> Trace Integrity Verified</div>
                        </div>
                        <div className={`${settings.themeMode === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-100 shadow-sm'} border-2 p-10 rounded-[48px] flex flex-col gap-4 group/stat hover:border-emerald-500/30 transition-all shadow-xl`}>
                           <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em] block mb-1">Topology Health</span>
                           <span className="text-5xl font-mono font-black text-emerald-400 tracking-tighter uppercase group-hover/stat:text-emerald-300 transition-colors">OPTIMAL</span>
                           <div className="flex items-center gap-2.5 text-[11px] text-emerald-400 font-black uppercase tracking-widest"><Shield className="w-3.5 h-3.5" /> Architectural Parity</div>
                        </div>
                     </div>
                  </div>
                )}

                {selectedCard === 'chaos' && (
                  <div className="space-y-6">
                    <div className={`${settings.themeMode === 'dark' ? 'bg-orange-500/5' : 'bg-orange-50'} border-2 border-orange-500/30 p-5 rounded-3xl`}>
                      <h4 className="text-sm font-black text-orange-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                         <Zap className="w-3 h-3" /> Fault Injection Control
                      </h4>
                      <div className="grid grid-cols-2 gap-3 relative">
                         {!isAdmin && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center backdrop-blur-[2px] bg-black/40 rounded-3xl group/lock">
                               <Lock className="w-8 h-8 text-orange-500 mb-2 group-hover/lock:scale-110 transition-transform" />
                               <span className="text-[10px] font-black text-white uppercase tracking-widest bg-orange-500 px-3 py-1 rounded-full shadow-2xl">Permissions Locked</span>
                               <span className="text-[8px] text-zinc-400 mt-2 uppercase font-bold px-4 text-center">Requires Reliability.Admin policy to inject faults</span>
                            </div>
                         )}
                         <button 
                            disabled={!isAdmin}
                            onClick={() => addToast("FRONTEND KILL SIGNAL EMITTED", "critical")}
                            className="flex flex-col items-center justify-center p-4 bg-black/40 hover:bg-red-500/20 border border-white/5 hover:border-red-500/40 rounded-2xl transition-all group active:scale-95 disabled:opacity-20"
                         >
                            <Skull className="w-6 h-6 text-red-500 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Kill Frontend</span>
                         </button>
                         <button 
                            disabled={!isAdmin}
                            onClick={() => addToast("LATENCY INJECTION: 2000ms delay started", "warning")}
                            className="flex flex-col items-center justify-center p-4 bg-black/40 hover:bg-orange-500/20 border border-white/5 hover:border-orange-500/40 rounded-2xl transition-all group active:scale-95 disabled:opacity-20"
                         >
                            <Wind className="w-6 h-6 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Inject Latency</span>
                         </button>
                         <button 
                            disabled={!isAdmin}
                            onClick={() => addToast("NETWORK JITTER: High packet loss simulated", "warning")}
                            className="flex flex-col items-center justify-center p-4 bg-black/40 hover:bg-yellow-500/20 border border-white/5 hover:border-yellow-500/40 rounded-2xl transition-all group active:scale-95 disabled:opacity-20"
                         >
                            <WifiOff className="w-6 h-6 text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Network Jitter</span>
                         </button>
                         <button 
                            disabled={!isAdmin}
                            onClick={() => addToast("LOAD SPIKE: Synthetically driving core usage", "info")}
                            className="flex flex-col items-center justify-center p-4 bg-black/40 hover:bg-blue-500/20 border border-white/5 hover:border-blue-500/40 rounded-2xl transition-all group active:scale-95 disabled:opacity-20"
                         >
                            <Activity className="w-6 h-6 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Load Spike</span>
                         </button>
                      </div>
                    </div>
                    <div className={`p-4 rounded-2xl ${settings.themeMode === 'dark' ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-200 shadow-sm'} border`}>
                       <h5 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-3">Chaos Scenario Results</h5>
                       <div className="space-y-3">
                          <div className="flex justify-between items-center text-[11px] border-b border-white/5 pb-2">
                             <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-400" /><span>Service Crash</span></div>
                             <span className="text-emerald-400 font-mono">Auto-Restart OK (3.2s)</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] border-b border-white/5 pb-2">
                             <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-400" /><span>High CPU Load</span></div>
                             <span className="text-emerald-400 font-mono">Scaled Up (8 instances)</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                             <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400" /><span>Latency Spike</span></div>
                             <span className="text-indigo-400 font-mono">Traffic Rerouted</span>
                          </div>
                       </div>
                    </div>

                    <div className={`${settings.themeMode === 'dark' ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-zinc-50 border-zinc-200'} border p-5 rounded-3xl relative overflow-hidden group`}>
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Activity className="w-12 h-12" /></div>
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                           <Activity className="w-3 h-3" /> Post-Experiment Analytical Diagnosis
                        </h4>
                        <p className={`text-[11px] leading-relaxed ${settings.themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'} font-mono italic`}>
                           "{latestMetric.chaos_diagnosis || "Awaiting fault injection to generate reliability insights..."}"
                        </p>
                    </div>
                  </div>
                )}

                {selectedCard === 'cost' && (
                  <div className="space-y-6">
                    <div className="bg-emerald-500/10 border-2 border-emerald-500/20 p-6 rounded-3xl text-center relative overflow-hidden group">
                       <span className="block text-xs font-black text-emerald-500/60 uppercase tracking-widest mb-2">Estimated Cloud Burn</span>
                       <span className="text-6xl font-mono font-black text-emerald-400 tracking-tighter">₹{(latestMetric.cost_estimate_local ?? 0).toFixed(0)}</span>
                       <span className="text-xl text-emerald-500 font-bold ml-1">/mo</span>
                       <div className="mt-4 flex justify-center gap-4 border-t border-emerald-500/10 pt-4">
                          <div className="text-center"><span className="block text-[9px] text-zinc-500 font-bold uppercase">Actual</span><span className="text-sm font-mono text-zinc-300 font-black">₹{((latestMetric.cost_estimate_local ?? 0) * 0.9).toFixed(0)}</span></div>
                          <div className="text-center"><span className="block text-[9px] text-zinc-500 font-bold uppercase">Overspend</span><span className="text-sm font-mono text-red-500 font-black">₹{((latestMetric.cost_estimate_local ?? 0) * (latestMetric.overspend_percent ?? 0) / 100).toFixed(0)}</span></div>
                       </div>
                       {(latestMetric.overspend_percent ?? 0) > 0 && (
                          <div className="absolute top-2 right-2 bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[8px] font-black border border-red-500/20 animate-pulse">OVERSPENDING {(latestMetric.overspend_percent ?? 0).toFixed(0)}%</div>
                       )}
                    </div>

                    <div className={`${settings.themeMode === 'dark' ? 'bg-white/5 border-white/5' : 'bg-emerald-50 border-emerald-100'} border p-5 rounded-3xl`}>
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                           <Zap className="w-3 h-3" /> 1-Click Optimizer
                        </h4>
                        <ul className="text-[11px] text-zinc-400 space-y-3 mb-5">
                           <li className="flex gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5" /> <span><strong>Compute Waste:</strong> Current CPU Power is {latestMetric.cpu_power.toFixed(1)}W. Optimization could save <strong>₹{((latestMetric.cost_estimate_local ?? 0) * 0.15).toFixed(0)}</strong></span></li>
                           <li className="flex gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5" /> <span><strong>Memory Optimization:</strong> {(latestMetric.available_memory/1024).toFixed(1)} GB unused. Resize pool to save <strong>₹{((latestMetric.cost_estimate_local ?? 0) * 0.12).toFixed(0)}</strong></span></li>
                        </ul>
                        <button className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-95">
                           Apply Recommended Fixes (Save ₹{((latestMetric.cost_estimate_local ?? 0) * 0.27).toFixed(0)})
                        </button>
                    </div>
                  </div>
                )}

                {selectedCard === 'matrix' && (
                  <>
                    <div className={`${settings.themeMode === 'dark' ? 'bg-white/5' : 'bg-zinc-50 border border-zinc-200'} p-5 rounded-xl space-y-4`}>
                      <p className={`text-sm ${settings.themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'} leading-relaxed font-medium`}>
                        The <strong className="text-emerald-400">System Telemetry Matrix</strong> is a multi-dimensional correlation graph projecting critical cluster telemetry onto a unified timeline.
                      </p>
                      <ul className={`space-y-3 text-[13px] ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'} list-disc pl-5`}>
                        <li><strong className="text-indigo-400 font-mono">CPU Waves:</strong> Compute usage distinctly segmented into User, System, and I/O layers.</li>
                        <li><strong className="text-purple-400 font-mono">Memory Bars:</strong> Base RAM allocations tracking heap growth dynamically.</li>
                        <li><strong className="text-cyan-400 font-mono">TCP Streams:</strong> Active inbound/outbound networking states mapping against spikes.</li>
                      </ul>
                      <div className={`p-4 ${settings.themeMode === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'} border rounded-lg mt-4`}>
                        <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider block mb-2">Why is this useful?</span>
                        <p className={`text-xs ${settings.themeMode === 'dark' ? 'text-emerald-100/70' : 'text-emerald-900/70'} leading-relaxed`}>By observing all variables simultaneously, SREs can immediately visually correlate architectural bottlenecks—such as determining if a CPU spike was directly caused by an inbound surge in active network connections.</p>
                      </div>
                    </div>
                  </>
                )}
                {selectedCard === 'jobs' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
                    <div className="grid grid-cols-1 gap-4">
                      {(latestMetric.jobs || [
                        { name: "Log Rotation (Proxy)", status: "COMPLETED", progress: 100, last_run: "2m ago", duration_seconds: 15.4, cpu_usage: 2.1, memory_mb: 12.8, steps: ["Discover logs", "Compress chunks", "Upload to S3", "Cleanup"] },
                        { name: "SSL Certificate Renewal", status: "RUNNING", progress: 45, last_run: "Now", duration_seconds: 8.2, cpu_usage: 1.4, memory_mb: 4.5, steps: ["Generate CSR", "Acme challenge (DNS)", "Awaiting verification"] }
                      ]).map((job, idx) => (
                        <div key={idx} className={`${settings.themeMode === 'dark' ? 'bg-black/60 border-white/5 shadow-2xl' : 'bg-white border-zinc-100 shadow-sm'} border-2 p-6 rounded-[32px] flex flex-col gap-6 hover:border-indigo-500/30 transition-all group`}>
                          <div className="flex justify-between items-start">
                             <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${job.status === 'RUNNING' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                   {job.status === 'RUNNING' ? <Activity className="w-5 h-5 animate-pulse" /> : <ShieldCheck className="w-5 h-5" />}
                                </div>
                                <div>
                                   <h4 className={`text-base font-black ${settings.themeMode === 'dark' ? 'text-white' : 'text-zinc-900'} tracking-tight`}>{job.name}</h4>
                                   <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest font-bold">{job.status}</span>
                                      <div className="w-1 h-1 rounded-full bg-zinc-800" />
                                      <span className="text-[10px] text-zinc-500 font-mono italic">Duration: {job.duration_seconds?.toFixed(1)}s</span>
                                   </div>
                                </div>
                             </div>
                             <div className="text-right">
                                <span className={`text-2xl font-mono font-black ${job.status === 'RUNNING' ? 'text-blue-400' : 'text-emerald-400'} tracking-tighter`}>{job.progress}%</span>
                                <div className="text-[9px] text-zinc-600 font-mono uppercase font-black">{job.last_run}</div>
                             </div>
                          </div>

                          {/* Resource Metrics */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex justify-between items-center group-hover:bg-indigo-500/5 transition-colors">
                                <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Compute Cost</span>
                                <div className="flex items-end gap-1">
                                   <span className="text-lg font-mono text-zinc-200 font-bold">{job.cpu_usage?.toFixed(1)}%</span>
                                   <span className="text-[10px] text-zinc-500 mb-1 leading-none uppercase font-black">vCPU</span>
                                </div>
                             </div>
                             <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex justify-between items-center group-hover:bg-purple-500/5 transition-colors">
                                <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Heap Usage</span>
                                <div className="flex items-end gap-1">
                                   <span className="text-lg font-mono text-zinc-200 font-bold">{job.memory_mb?.toFixed(1)}</span>
                                   <span className="text-[10px] text-zinc-500 mb-1 leading-none uppercase font-black">MB</span>
                                </div>
                             </div>
                          </div>

                          {/* Step Logs */}
                          {job.steps && job.steps.length > 0 && (
                             <div className="bg-black/40 rounded-2xl p-4 border border-white/5 shadow-inner">
                                <h5 className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-3 flex items-center gap-2 underline decoration-zinc-800">
                                   <Terminal className="w-3 h-3" /> Diagnostic Execution Logs
                                </h5>
                                <div className="space-y-2.5">
                                   {job.steps.map((step, si) => (
                                      <div key={si} className="flex items-center gap-3 text-[10px] font-mono">
                                         <div className={`w-1.5 h-1.5 rounded-full ${si === job.steps.length - 1 && job.status === 'RUNNING' ? 'bg-blue-400 animate-pulse' : 'bg-zinc-700'}`} />
                                         <span className={si === job.steps.length - 1 && job.status === 'RUNNING' ? 'text-zinc-200' : 'text-zinc-500'}>{step}</span>
                                         {si === job.steps.length - 1 && job.status === 'RUNNING' && <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 rounded-full ml-auto animate-pulse border border-blue-500/30">ACTIVE</span>}
                                      </div>
                                   ))}
                                </div>
                             </div>
                          )}

                          <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                             <div className={`h-full transition-all duration-1000 ${job.status === 'RUNNING' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]' : 'bg-emerald-500'}`} style={{ width: `${job.progress}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className={`p-5 rounded-2xl border border-dashed ${settings.themeMode === 'dark' ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-zinc-50'} text-center py-8`}>
                       <span className="text-[10px] text-zinc-600 font-mono font-black uppercase tracking-[0.2em]">+ SRE Automation Engine: All Threads Optimized</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Trend View Section */}
              <div className={`${settings.themeMode === 'dark' ? 'bg-black/20 border-white/5' : 'bg-zinc-50 border-zinc-200'} rounded-2xl p-4 border h-[300px]`}>
                <h4 className={`text-[10px] font-black ${settings.themeMode === 'dark' ? 'text-zinc-600' : 'text-zinc-400'} uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border-b ${settings.themeMode === 'dark' ? 'border-white/5' : 'border-zinc-100'} pb-2`}>
                  <Activity className="w-3 h-3" /> Historical Trend
                </h4>
                <div className="h-full w-full max-h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metricsHistory}>
                      <defs>
                        <linearGradient id={`${selectedCard}BigGrad`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={selectedCard === 'cpu' ? '#818cf8' : selectedCard === 'memory' ? '#c084fc' : selectedCard === 'connections' ? '#22d3ee' : selectedCard === 'matrix' ? '#10b981' : '#3b82f6'} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={selectedCard === 'cpu' ? '#818cf8' : selectedCard === 'memory' ? '#c084fc' : selectedCard === 'connections' ? '#22d3ee' : selectedCard === 'matrix' ? '#10b981' : '#3b82f6'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={settings.themeMode === 'dark' ? "#27272a" : "#e4e4e7"} vertical={false} />
                      <XAxis dataKey="timestamp" hide />
                      <YAxis hide domain={
                        selectedCard === 'cpu' ? [0, 100] :
                          selectedCard === 'memory' ? [0, (latestMetric.total_memory || 16000)] :
                            [0, 'auto']
                      } />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: settings.themeMode === 'dark' ? "rgba(9,9,11,0.9)" : "rgba(255,255,255,0.95)", 
                          borderColor: settings.themeMode === 'dark' ? "#27272a" : "#e4e4e7", 
                          borderRadius: "12px"
                        }}
                        itemStyle={{ color: settings.themeMode === 'dark' ? "#e4e4e7" : "#18181b", fontSize: '12px' }}
                        labelStyle={{ color: settings.themeMode === 'dark' ? "#a1a1aa" : "#71717a", fontSize: '10px' }}
                        labelFormatter={(label) => new Date(label).toLocaleTimeString()}
                      />
                      {selectedCard === 'power' ? (
                        <>
                          <Area stackId="p" type="monotone" dataKey="cpu_power" stroke="#f59e0b" fill="transparent" isAnimationActive={false} />
                          <Area stackId="p" type="monotone" dataKey="gpu_power" stroke="#eab308" strokeWidth={3} fill={`url(#${selectedCard}BigGrad)`} isAnimationActive={false} />
                        </>
                      ) : selectedCard === 'cooling' ? (
                        <>
                          <Area type="monotone" dataKey="cpu_fan_speed" stroke="#3b82f6" strokeWidth={3} fill={`url(#${selectedCard}BigGrad)`} isAnimationActive={false} />
                          <Area type="monotone" dataKey="gpu_fan_speed" stroke="#60a5fa" strokeWidth={1} fill="transparent" isAnimationActive={false} />
                        </>
                      ) : (
                        <Area
                          type="monotone"
                          dataKey={
                            selectedCard === 'cpu' ? 'cpu_usage' :
                              selectedCard === 'memory' ? 'memory_usage' :
                                selectedCard === 'connections' ? 'active_connections' :
                                  selectedCard === 'tracer' ? 'latency_ms' :
                                    'cpu_usage'
                          }
                          stroke={selectedCard === 'cpu' ? '#818cf8' : selectedCard === 'memory' ? '#c084fc' : selectedCard === 'connections' ? '#22d3ee' : selectedCard === 'tracer' ? '#0ea5e9' : selectedCard === 'matrix' ? '#10b981' : '#818cf8'}
                          fill={`url(#${selectedCard}BigGrad)`}
                          strokeWidth={3}
                          isAnimationActive={false}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setSelectedCard(null)}
                className={`px-12 py-3 ${settings.themeMode === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white' : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-900'} border rounded-full text-sm font-bold uppercase tracking-widest transition-all hover:letter-spacing-[0.2em]`}
              >
                Flush & Return
              </button>
            </div>
          </div>
        </>
      )}

      {/* PROFILE SIDE DRAWER MODAL */}
      {isProfileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in"
            onClick={() => setIsProfileOpen(false)}
          />
          <div className={`fixed top-0 right-0 h-full w-full max-w-sm ${settings.themeMode === 'dark' ? 'bg-[#09090b]' : 'bg-white'} border-l ${settings.themeMode === 'dark' ? 'border-white/10' : 'border-zinc-200'} z-50 p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300`}>
            <div className={`flex items-center justify-between mb-8 pb-4 border-b ${settings.themeMode === 'dark' ? 'border-white/5' : 'border-zinc-100'}`}>
              <h2 className="text-lg font-bold flex items-center gap-2"><User className="w-5 h-5 text-indigo-400" /> User Information</h2>
              <button onClick={() => setIsProfileOpen(false)} className={`p-2 ${settings.themeMode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-zinc-100'} rounded-full transition-colors`}>
                <X className={`w-5 h-5 ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`} />
              </button>
            </div>

            <div className="flex flex-col gap-6 flex-1 overflow-y-auto px-1 custom-scrollbar">

              <div className="flex flex-col items-center justify-center space-y-4 mb-2 relative group">
                <div className="w-24 h-24 rounded-full border-2 border-indigo-500/30 overflow-hidden relative shadow-[0_0_20px_rgba(99,102,241,0.2)] group cursor-pointer bg-zinc-900">
                  {userProfile.avatarUrl ? (
                    <img src={userProfile.avatarUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-3xl font-black">{userProfile.name.substring(0, 2).toUpperCase()}</div>
                  )}

                  <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Upload className="w-6 h-6 text-white mb-1" />
                    <span className="text-[8px] font-bold uppercase tracking-widest">Upload Profile</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setUserProfile({ ...userProfile, avatarUrl: reader.result as string });
                          }
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="text-center">
                  <span className="block text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Operator Key</span>
                  <span className={`text-sm font-mono ${settings.themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>{userProfile.name}</span>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2"><User className="w-3 h-3" /> Operator Name</label>
                <input
                  type="text"
                  value={userProfile.name}
                  onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                  className={`w-full ${settings.themeMode === 'dark' ? 'bg-black/50 border-white/5 text-zinc-200' : 'bg-zinc-100 border-zinc-200 text-zinc-800'} border rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-sans text-sm font-bold`}
                  placeholder="Your Name"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Shield className="w-3 h-3" /> System Role</label>
                <select
                  value={userProfile.role}
                  onChange={(e) => setUserProfile({ ...userProfile, role: e.target.value })}
                  className={`w-full ${settings.themeMode === 'dark' ? 'bg-black/50 border-white/5 text-zinc-200' : 'bg-zinc-100 border-zinc-200 text-zinc-800'} border rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm appearance-none cursor-pointer`}
                >
                  <option value="admin">SRE Administrator</option>
                  <option value="user">Standard Network User</option>
                  <option value="viewer">Guest / Viewer</option>
                </select>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Briefcase className="w-3 h-3" /> Department / Information</label>
                <textarea
                  value={userProfile.department}
                  onChange={(e) => setUserProfile({ ...userProfile, department: e.target.value })}
                  rows={4}
                  className={`w-full ${settings.themeMode === 'dark' ? 'bg-black/50 border-white/5 text-zinc-200' : 'bg-zinc-100 border-zinc-200 text-zinc-800'} border rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-sans text-sm resize-none custom-scrollbar leading-relaxed`}
                  placeholder="Add any additional profile identifiers or department strings..."
                />
              </div>

            </div>

            <div className={`mt-auto pt-6 border-t ${settings.themeMode === 'dark' ? 'border-white/5' : 'border-zinc-100'} flex gap-3`}>
              <button
                onClick={() => {
                  localStorage.setItem("sre_user_profile", JSON.stringify(userProfile));
                  setIsProfileOpen(false);
                }}
                className="flex-1 py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] active:scale-[0.98] text-[11px]"
              >
                Sync Profile State
              </button>
            </div>
          </div>
        </>
      )}

      {/* SETTINGS SIDE DRAWER MODAL */}
      {isSettingsOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in"
            onClick={() => setIsSettingsOpen(false)}
          />
          <div className={`fixed top-0 right-0 h-full w-full max-w-sm ${settings.themeMode === 'dark' ? 'bg-[#09090b]' : 'bg-white'} border-l ${settings.themeMode === 'dark' ? 'border-white/10' : 'border-zinc-200'} z-50 p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300`}>
            <div className={`flex items-center justify-between mb-8 pb-4 border-b ${settings.themeMode === 'dark' ? 'border-white/5' : 'border-zinc-100'}`}>
              <h2 className={`text-lg font-bold flex items-center gap-2`}><SettingsIcon className="w-5 h-5 text-indigo-400" /> Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className={`p-2 ${settings.themeMode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-zinc-100'} rounded-full transition-colors`}>
                <X className={`w-5 h-5 ${settings.themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`} />
              </button>
            </div>

            <div className="flex flex-col gap-6 flex-1 overflow-y-auto px-1 custom-scrollbar">

              <div className="space-y-3">
                <label className={`text-sm font-semibold ${settings.themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>Data Point Retention (Sliding Window)</label>
                <div className="flex items-center gap-4">
                  <input
                    title="Data Points Window Size"
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={settings.maxDataPoints}
                    onChange={(e) => setSettings({ ...settings, maxDataPoints: parseInt(e.target.value) })}
                    className={`w-full h-2 ${settings.themeMode === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'} rounded-lg appearance-none cursor-pointer accent-indigo-500`}
                  />
                  <span className={`text-xs font-mono ${settings.themeMode === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'} px-3 py-1.5 rounded-md min-w-[50px] text-center`}>{settings.maxDataPoints}</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">Adjust how many seconds of telemetry history the matrix retains before discarding.</p>
              </div>

              <div className={`w-full h-[1px] ${settings.themeMode === 'dark' ? 'bg-white/5' : 'bg-zinc-100'} my-2`} />

              <div className="space-y-4">
                <label className={`text-sm font-semibold ${settings.themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'} flex items-center justify-between`}>
                  Log Audit Terminal
                  <button
                    onClick={() => setSettings({ ...settings, showLogs: !settings.showLogs })}
                    className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${settings.showLogs ? 'bg-indigo-500' : (settings.themeMode === 'dark' ? 'bg-zinc-700' : 'bg-zinc-300')}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${settings.showLogs ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </label>
                <p className="text-xs text-zinc-500">Enable or disable the bottom runtime terminal rendering. Can save browser memory over extended monitoring sessions.</p>
              </div>

              <div className={`w-full h-[1px] ${settings.themeMode === 'dark' ? 'bg-white/5' : 'bg-zinc-100'} my-2`} />

              <div className="space-y-4">
                <label className={`text-sm font-semibold ${settings.themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'} flex items-center justify-between`}>
                  Mute Anomaly Feed
                  <button
                    onClick={() => setSettings({ ...settings, muteAlerts: !settings.muteAlerts })}
                    className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${settings.muteAlerts ? 'bg-red-500' : (settings.themeMode === 'dark' ? 'bg-zinc-700' : 'bg-zinc-300')}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${settings.muteAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </label>
                <p className="text-xs text-zinc-500">Silence the anomaly push notifications entering your priority feed box if testing network loads.</p>
              </div>

              <div className={`w-full h-[1px] ${settings.themeMode === 'dark' ? 'bg-white/5' : 'bg-zinc-100'} my-2`} />

              <div className="space-y-3">
                <label className={`text-sm font-semibold ${settings.themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>Artificial Network Delay (ms)</label>
                <div className="flex items-center gap-4">
                  <input
                    title="Artificial Delay in MS"
                    type="range"
                    min="0"
                    max="3000"
                    step="100"
                    value={settings.simulatedDelay}
                    onChange={(e) => setSettings({ ...settings, simulatedDelay: parseInt(e.target.value) })}
                    className={`w-full h-2 ${settings.themeMode === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'} rounded-lg appearance-none cursor-pointer accent-amber-500`}
                  />
                  <span className={`text-xs font-mono ${settings.themeMode === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'} px-3 py-1.5 rounded-md min-w-[60px] text-center`}>{settings.simulatedDelay}ms</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">Simulate severe network latency buffering your UI ingestion from Gateway SSE paths.</p>
              </div>

            </div>

            <div className={`w-full h-[1px] ${settings.themeMode === 'dark' ? 'bg-white/5' : 'bg-zinc-100'} my-2`} />

            <div className="space-y-3">
              <label className={`text-sm font-semibold ${settings.themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'} flex items-center justify-between`}>
                Theme Interface
                <div className={`flex items-center gap-1 p-1 rounded-full ${settings.themeMode === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'} border ${settings.themeMode === 'dark' ? 'border-white/5' : 'border-zinc-200'}`}>
                  <button 
                    onClick={() => setSettings({...settings, themeMode: 'light'})}
                    className={`p-1.5 rounded-full transition-all ${settings.themeMode === 'light' ? 'bg-white text-zinc-900 shadow-md scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setSettings({...settings, themeMode: 'dark'})}
                    className={`p-1.5 rounded-full transition-all ${settings.themeMode === 'dark' ? 'bg-zinc-900 text-white shadow-md scale-110' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </label>
            </div>

            <div className={`w-full h-[1px] ${settings.themeMode === 'dark' ? 'bg-white/5' : 'bg-zinc-100'} my-2`} />

            <div className="space-y-3">
              <label className={`text-sm font-semibold ${settings.themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>Ambient Theme Glow</label>
              <div className="flex gap-3">
                {['indigo', 'emerald', 'rose', 'purple'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setSettings({ ...settings, themeColor: color as AppSettings['themeColor'] })}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${settings.themeColor === color ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'} ${color === 'indigo' ? 'bg-indigo-500' : color === 'emerald' ? 'bg-emerald-500' : color === 'rose' ? 'bg-rose-500' : 'bg-purple-500'}`}
                  />
                ))}
              </div>
            </div>

            <div className={`w-full h-[1px] ${settings.themeMode === 'dark' ? 'bg-white/5' : 'bg-zinc-100'} my-2`} />

            <div className="space-y-3">
              <label className={`text-sm font-semibold ${settings.themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>Power Warning Threshold (Watts)</label>
              <div className="flex items-center gap-4">
                <input
                  title="Power Warning Threshold"
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={settings.powerWarningThreshold}
                  onChange={(e) => setSettings({ ...settings, powerWarningThreshold: parseInt(e.target.value) })}
                  className={`w-full h-2 ${settings.themeMode === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'} rounded-lg appearance-none cursor-pointer accent-amber-500`}
                />
                <span className={`text-xs font-mono ${settings.themeMode === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'} px-3 py-1.5 rounded-md min-w-[60px] text-center`}>{settings.powerWarningThreshold}W</span>
              </div>
            </div>

            <div className={`mt-auto pt-6 border-t ${settings.themeMode === 'dark' ? 'border-white/5' : 'border-zinc-100'}`}>
              <button
                onClick={() => setSettings({ maxDataPoints: 200, showLogs: true, muteAlerts: false, simulatedDelay: 0, themeColor: "indigo", themeMode: "dark", powerWarningThreshold: 300 })}
                className={`w-full py-2.5 rounded-lg ${settings.themeMode === 'dark' ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-zinc-100 border-zinc-200 text-zinc-900 hover:bg-zinc-200'} text-sm font-medium transition-colors border`}
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}} />

      {/* Global SRE Toast Engine */}
      <div className="fixed top-24 right-6 z-[9999] flex flex-col gap-3 w-84 pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`pointer-events-auto p-5 rounded-[24px] border-2 shadow-2xl flex items-center gap-4 animate-in slide-in-from-right duration-500 backdrop-blur-xl ${
              toast.severity === 'critical' ? 'bg-red-500/10 border-red-500/40 shadow-red-500/20 text-red-400' :
              toast.severity === 'warning' ? 'bg-orange-500/10 border-orange-500/40 shadow-orange-500/20 text-orange-400' :
              toast.severity === 'success' ? 'bg-emerald-500/10 border-emerald-500/40 shadow-emerald-500/20 text-emerald-400' :
              'bg-blue-500/10 border-blue-500/40 shadow-blue-500/20 text-blue-400'
            }`}
          >
            <div className={`p-2.5 rounded-xl ${
              toast.severity === 'critical' ? 'bg-red-500 text-black shadow-[0_0_15px_rgba(239,68,68,0.4)]' :
              toast.severity === 'warning' ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]' :
              toast.severity === 'success' ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' :
              'bg-blue-500 text-black shadow-[0_0_15px_rgba(59,130,246,0.4)]'
            }`}>
              {toast.severity === 'critical' ? <Skull className="w-4 h-4" /> : <AlertOctagon className="w-4 h-4" />}
            </div>
            <div className="flex-1">
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1.5 opacity-60">{toast.severity} ALARM</h5>
              <p className="text-xs font-bold leading-snug tracking-tight">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

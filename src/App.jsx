import { startTransition, useEffect, useState } from "react";
import {
  Activity,
  Car,
  Download,
  Gauge,
  Network,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import Navbar from "./components/Navbar";
import KpiCard from "./components/KpiCard";
import ChartCard from "./components/ChartCard";
import EmergencyRealtimePanel from "./components/EmergencyRealtimePanel";
import AiDecisionPanel from "./components/AiDecisionPanel";
import ParkingAvailabilityPanel from "./components/ParkingAvailabilityPanel";
import LoadingSkeleton from "./components/LoadingSkeleton";
import { analyticsByRange, navigationItems, rangeOptions } from "./data/analytics";
import { useTrafficSocket } from "./hooks/useTrafficSocket";
import {
  fetchDashboardData,
  fetchAiDecisions,
  fetchParkingAvailability,
  fetchLiveTrafficOverview,
  fetchTrafficIncidents,
} from "./services/trafficApi";

const kpiIcons = [Car, Gauge, Sparkles, Network];

const tooltipStyle = {
  borderRadius: "16px",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
};

function buildFallbackDashboard(rangeKey) {
  const analytics = analyticsByRange[rangeKey] || analyticsByRange["7d"];

  return {
    titleSuffix: analytics.titleSuffix,
    kpis: analytics.kpis,
    trafficTrend: analytics.trafficTrend,
    waitTimes: analytics.waitTimes,
    waitLeaderboard: [],
    exportPayload: {
      range: rangeKey,
      exportedAt: new Date().toISOString(),
      source: "mock",
      analytics,
    },
  };
}

function App() {
  const [selectedRange, setSelectedRange] = useState("7d");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(() => buildFallbackDashboard("7d"));
  const [dashboardError, setDashboardError] = useState("");
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [liveTraffic, setLiveTraffic] = useState(null);
  const [trafficIncidents, setTrafficIncidents] = useState([]);
  const [liveError, setLiveError] = useState("");
  const [aiDecisionData, setAiDecisionData] = useState(null);
  const [aiDecisionError, setAiDecisionError] = useState("");
  const [parkingData, setParkingData] = useState(null);
  const [parkingError, setParkingError] = useState("");
  const realtimeState = useTrafficSocket();

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("traffic-theme");
    const shouldUseDark =
      storedTheme === "dark" ||
      (!storedTheme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    setIsDarkMode(shouldUseDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    window.localStorage.setItem("traffic-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setDashboardError("");

      try {
        const nextData = await fetchDashboardData(selectedRange);
        if (!isMounted) {
          return;
        }

        setDashboardData(nextData);
        setIsApiConnected(true);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setDashboardData(buildFallbackDashboard(selectedRange));
        setIsApiConnected(false);
        setDashboardError(error.message || "Could not load backend analytics. Showing fallback data.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [selectedRange]);

  useEffect(() => {
    let isMounted = true;

    async function loadLiveOperations() {
      try {
        const [overview, incidents, aiDecisions, parkingAvailability] = await Promise.all([
          fetchLiveTrafficOverview(),
          fetchTrafficIncidents(),
          fetchAiDecisions(),
          fetchParkingAvailability(),
        ]);

        if (!isMounted) {
          return;
        }

        setLiveTraffic(overview);
        setTrafficIncidents(incidents.incidents ?? []);
        setAiDecisionData(aiDecisions);
        setParkingData(parkingAvailability);
        setLiveError("");
        setAiDecisionError("");
        setParkingError("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = error.message || "Unable to fetch live operations state.";
        setLiveError(message);
        setAiDecisionError(message);
        setParkingError(message);
      }
    }

    void loadLiveOperations();
    const intervalId = window.setInterval(() => {
      void loadLiveOperations();
    }, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const handleRangeChange = (event) => {
    const nextRange = event.target.value;
    startTransition(() => {
      setSelectedRange(nextRange);
    });
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(dashboardData.exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `traffic-analytics-${selectedRange}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const liveIntersection =
    realtimeState.latestUpdate ?? liveTraffic?.intersections?.[0] ?? null;
  const liveStatusTitle = realtimeState.connected
    ? "Connected to live traffic feed"
    : liveTraffic
      ? "Live REST traffic active"
      : isApiConnected
        ? "REST analytics active"
        : "Mock mode active";
  const activeIncidents =
    trafficIncidents.length > 0
      ? trafficIncidents.slice(0, 5)
      : realtimeState.congestionAlerts;

  return (
    <div className="min-h-screen bg-grid bg-[length:18px_18px]">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <Navbar
          items={navigationItems}
          activeItem="Analytics"
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode((current) => !current)}
        />

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <main className="space-y-8">
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="glass-panel overflow-hidden px-6 py-6 lg:px-8"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                    <Activity size={16} />
                    {isApiConnected ? "Backend analytics connected" : "Fallback analytics mode"}
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    Traffic Analytics Dashboard
                  </h2>
                  <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
                    City-wide traffic insights and performance metrics
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <select
                    value={selectedRange}
                    onChange={handleRangeChange}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    aria-label="Select date range"
                  >
                    {rangeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleExport}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    <Download size={16} />
                    Export Report
                  </button>
                </div>
              </div>
            </motion.section>

            {dashboardError ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                {dashboardError}
              </section>
            ) : null}

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {dashboardData.kpis.map((kpi, index) => (
                <KpiCard
                  key={kpi.title}
                  title={kpi.title}
                  value={kpi.value}
                  detail={kpi.detail}
                  tone={kpi.tone}
                  icon={kpiIcons[index]}
                />
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <motion.article
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="glass-panel p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Realtime stream
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
                      {liveStatusTitle}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                      realtimeState.connected || liveTraffic
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {realtimeState.connected ? "Live socket" : liveTraffic ? "Live REST" : "Offline"}
                  </span>
                </div>

                {!realtimeState.connected && realtimeState.error ? (
                  <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                    Socket status: {realtimeState.error}
                  </p>
                ) : null}

                {!liveTraffic && liveError ? (
                  <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                    Live API status: {liveError}
                  </p>
                ) : null}

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Latest intersection</p>
                    <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                      {liveIntersection?.intersectionName || "Waiting for stream"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Live congestion</p>
                    <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                      {liveIntersection ? `${liveIntersection.congestionLevel}%` : "No live reading"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Optimized wait</p>
                    <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                      {liveIntersection ? `${liveIntersection.avgWaitTime}s` : "No live reading"}
                    </p>
                  </div>
                </div>

                {liveTraffic?.source ? (
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                    Source: {liveTraffic.source} | Updated:{" "}
                    {liveTraffic.lastUpdated
                      ? new Date(liveTraffic.lastUpdated).toLocaleTimeString()
                      : "--"}
                  </p>
                ) : null}
              </motion.article>

              <motion.article
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="glass-panel p-5"
              >
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Recent incidents
                </p>
                <div className="mt-4 space-y-3">
                  {(activeIncidents.length
                    ? activeIncidents
                    : [
                        {
                          description: "No active incidents",
                          from: "Delhi network",
                          magnitudeOfDelay: "--",
                          startTime: new Date().toISOString(),
                        },
                      ]
                  ).map((incident) => (
                    <div
                      key={`${incident.id || incident.intersectionName}-${incident.startTime || incident.timestamp}`}
                      className="rounded-2xl border border-slate-200/80 p-3 dark:border-slate-800"
                    >
                      <p className="font-medium text-slate-900 dark:text-white">
                        {incident.description || incident.intersectionName}
                      </p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {incident.from || incident.intersectionName || "Traffic network"} | Delay:{" "}
                        {incident.magnitudeOfDelay ?? incident.congestionLevel}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="mt-6 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Highest wait intersections
                </p>
                <div className="mt-4 space-y-3">
                  {(dashboardData.waitLeaderboard.length
                    ? dashboardData.waitLeaderboard
                    : [
                        {
                          name: "No wait-time data yet",
                          avgWaitTime: "--",
                          congestionLevel: "--",
                          timestamp: new Date().toISOString(),
                        },
                      ]
                  ).map((item) => (
                    <div
                      key={`${item.name}-${item.timestamp}`}
                      className="rounded-2xl border border-slate-200/80 p-3 dark:border-slate-800"
                    >
                      <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Wait: {item.avgWaitTime}
                        {item.avgWaitTime !== "--" ? "s" : ""} - Congestion: {item.congestionLevel}
                        {item.congestionLevel !== "--" ? "%" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.article>
            </section>

            <EmergencyRealtimePanel />

            <section className="grid gap-5 xl:grid-cols-2">
              <AiDecisionPanel data={aiDecisionData} error={aiDecisionError} />
              <ParkingAvailabilityPanel data={parkingData} error={parkingError} />
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <ChartCard
                title={`Traffic Trends - ${dashboardData.titleSuffix}`}
                subtitle="Vehicles and congestion patterns across the day"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardData.trafficTrend}>
                    <defs>
                      <linearGradient id="vehiclesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.04} />
                      </linearGradient>
                      <linearGradient id="congestionFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                    <XAxis dataKey="time" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="vehicles"
                      stroke="#2563eb"
                      fill="url(#vehiclesFill)"
                      strokeWidth={3}
                      name="Vehicles"
                    />
                    <Area
                      type="monotone"
                      dataKey="congestion"
                      stroke="#f59e0b"
                      fill="url(#congestionFill)"
                      strokeWidth={3}
                      name="Congestion %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Average Wait Time (seconds)"
                subtitle="Signal cycle wait times across monitored corridors"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData.waitTimes}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                    <XAxis dataKey="time" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="wait"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 0, fill: "#f59e0b" }}
                      activeDot={{ r: 6 }}
                      name="Wait Time"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}

export default App;

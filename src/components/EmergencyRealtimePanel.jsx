import { useEffect, useMemo, useState } from "react";
import { Ambulance, Flame, Shield, Siren, TimerReset } from "lucide-react";
import { motion } from "framer-motion";
import { useEmergencyTrafficFeed } from "../hooks/useEmergencyTrafficFeed";
import {
  fetchActiveEmergencies,
  fetchEmergencyHistory,
  startEmergency,
} from "../services/trafficApi";

const emergencyPresets = [
  {
    type: "AMBULANCE",
    label: "Ambulance",
    icon: Ambulance,
    currentLocation: { lat: 28.6328, lng: 77.2197, label: "Connaught Place" },
    destination: { lat: 28.5672, lng: 77.21, label: "AIIMS Trauma Centre" },
  },
  {
    type: "POLICE",
    label: "Police",
    icon: Shield,
    currentLocation: { lat: 28.6439, lng: 77.2507, label: "ITO Control Room" },
    destination: { lat: 28.6562, lng: 77.241, label: "Kashmere Gate" },
  },
  {
    type: "FIRE",
    label: "Fire",
    icon: Flame,
    currentLocation: { lat: 28.5494, lng: 77.2516, label: "Nehru Place" },
    destination: { lat: 28.5562, lng: 77.1, label: "Dhaula Kuan" },
  },
];

function formatEmergencyType(type) {
  if (!type) {
    return "Emergency";
  }

  return `${type.charAt(0)}${type.slice(1).toLowerCase()}`;
}

function formatLocationLabel(location, fallback = "Delhi network") {
  if (!location) {
    return fallback;
  }

  if (typeof location === "string") {
    return location;
  }

  if (location.label) {
    return location.label;
  }

  if (typeof location.lat === "number" && typeof location.lng === "number") {
    return `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`;
  }

  return fallback;
}

function EmergencyRealtimePanel() {
  const socketState = useEmergencyTrafficFeed();
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [panelError, setPanelError] = useState("");
  const [isStarting, setIsStarting] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadEmergencyState() {
      try {
        const [activeVehicles, recentHistory] = await Promise.all([
          fetchActiveEmergencies(),
          fetchEmergencyHistory(4),
        ]);

        if (!isMounted) {
          return;
        }

        setActiveEmergency(activeVehicles[0] ?? null);
        setHistory(recentHistory);
        setPanelError("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPanelError(error.message || "Unable to load emergency operations.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadEmergencyState();
    const intervalId = window.setInterval(() => {
      void loadEmergencyState();
    }, 8000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (socketState.activeEmergency) {
      setActiveEmergency((current) => ({
        ...current,
        ...socketState.activeEmergency,
      }));
    }
  }, [socketState.activeEmergency]);

  const signalOverrides = useMemo(() => {
    if (socketState.signalOverrides.length) {
      return socketState.signalOverrides;
    }

    return activeEmergency?.recentOverrides ?? [];
  }, [activeEmergency?.recentOverrides, socketState.signalOverrides]);

  async function handleStartEmergency(preset) {
    try {
      setIsStarting(preset.type);
      setPanelError("");
      const payload = await startEmergency({
        type: preset.type,
        currentLocation: preset.currentLocation,
        destination: preset.destination,
        speed: 20,
      });

      setActiveEmergency(payload);
      const recentHistory = await fetchEmergencyHistory(4);
      setHistory(recentHistory);
    } catch (error) {
      setPanelError(error.message || "Unable to start emergency route.");
    } finally {
      setIsStarting("");
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-panel p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Emergency operations
          </p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
            Green corridor and response tracking
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Start a Delhi emergency route, monitor ETA, and watch signal overrides update in
            real time.
          </p>
        </div>

        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            socketState.connected
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
          }`}
        >
          {socketState.connected ? "Socket live" : "REST fallback active"}
        </span>
      </div>

      {(panelError || socketState.error) && !isLoading ? (
        <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
          {panelError || socketState.error}
        </p>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            {emergencyPresets.map((preset) => {
              const Icon = preset.icon;

              return (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => void handleStartEmergency(preset)}
                  disabled={Boolean(isStarting)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="rounded-2xl bg-white p-3 text-slate-800 shadow-sm dark:bg-slate-900 dark:text-white">
                      <Icon size={18} />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {isStarting === preset.type ? "Starting" : "Dispatch"}
                    </span>
                  </div>
                  <p className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                    {preset.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {preset.currentLocation.label} to {preset.destination.label}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="text-sm text-slate-500 dark:text-slate-400">Active response</p>
              <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                {activeEmergency ? formatEmergencyType(activeEmergency.type) : "Idle"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="text-sm text-slate-500 dark:text-slate-400">Current ETA</p>
              <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                {activeEmergency ? `${activeEmergency.eta}s` : "--"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="text-sm text-slate-500 dark:text-slate-400">Route progress</p>
              <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                {activeEmergency ? `${Math.round((activeEmergency.progress ?? 0) * 100)}%` : "--"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="text-sm text-slate-500 dark:text-slate-400">Signal overrides</p>
              <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                {signalOverrides.length}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Siren size={18} />
              <p className="font-semibold">Active route</p>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Current location</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">
                  {formatLocationLabel(activeEmergency?.currentLocation, "Dispatch pending")}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Destination</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">
                  {formatLocationLabel(activeEmergency?.destination, "Select a route above")}
                </p>
              </div>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-blue-600 transition-all duration-500"
                style={{ width: `${activeEmergency ? Math.max(8, Math.round((activeEmergency.progress ?? 0) * 100)) : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200/80 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <TimerReset size={18} />
              <p className="font-semibold">Recent signal actions</p>
            </div>

            <div className="mt-4 space-y-3">
              {(signalOverrides.length
                ? signalOverrides
                : [
                    {
                      intersectionName: "No active overrides",
                      reason: "Start an emergency route to trigger green corridor updates.",
                      createdAt: new Date().toISOString(),
                    },
                  ]
              ).map((item) => (
                <div
                  key={`${item.id || item.intersectionName}-${item.createdAt}`}
                  className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60"
                >
                  <p className="font-medium text-slate-900 dark:text-white">
                    {item.intersectionName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 p-4 dark:border-slate-800">
            <p className="font-semibold text-slate-900 dark:text-white">Completed responses</p>
            <div className="mt-4 space-y-3">
              {(history.length
                ? history
                : [
                    {
                      id: "empty-history",
                      type: "SYSTEM",
                      destination: { label: "No completed emergency routes yet" },
                      completedAt: null,
                    },
                  ]
              ).map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60"
                >
                  <p className="font-medium text-slate-900 dark:text-white">
                    {formatEmergencyType(item.type)} to{" "}
                    {formatLocationLabel(item.destination, "Delhi")}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {item.completedAt
                      ? `Completed at ${new Date(item.completedAt).toLocaleTimeString()}`
                      : "Awaiting first completed route"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default EmergencyRealtimePanel;

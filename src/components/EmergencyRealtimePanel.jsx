import { useEmergencyTrafficFeed } from "../hooks/useEmergencyTrafficFeed";

function EmergencyRealtimePanel() {
  const { connected, activeEmergency, signalOverrides, error } = useEmergencyTrafficFeed();

  return (
    <section className="glass-panel space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Emergency Operations Feed
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
            {connected ? "Live emergency stream connected" : "Emergency stream offline"}
          </h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            connected
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {connected ? "Live" : "Offline"}
        </span>
      </div>

      {error ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
      ) : null}

      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
        <p className="text-sm text-slate-500 dark:text-slate-400">Active emergency</p>
        <p className="mt-2 font-semibold text-slate-900 dark:text-white">
          {activeEmergency ? `${activeEmergency.type} en route` : "No active emergency"}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ETA: {activeEmergency ? `${activeEmergency.eta}s` : "--"} | Progress:{" "}
          {activeEmergency ? `${Math.round(activeEmergency.progress * 100)}%` : "--"}
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Signal actions
        </p>
        {(signalOverrides.length
          ? signalOverrides
          : [{ intersectionName: "No signal overrides", reason: "Waiting for emergency route", createdAt: new Date().toISOString() }]
        ).map((item) => (
          <div
            key={`${item.intersectionName}-${item.createdAt}`}
            className="rounded-2xl border border-slate-200/80 p-3 dark:border-slate-800"
          >
            <p className="font-medium text-slate-900 dark:text-white">{item.intersectionName}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.reason}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default EmergencyRealtimePanel;

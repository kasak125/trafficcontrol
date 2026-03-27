import { BrainCircuit, ChevronRight, Radar } from "lucide-react";
import { motion } from "framer-motion";

const severityClasses = {
  critical: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  high: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  medium: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  low: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

function AiDecisionPanel({ data, error }) {
  const summary = data?.summary;
  const decisions = data?.decisions ?? [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-panel p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">AI decision</p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
            Decision support engine
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Recommendations blend live congestion, incidents, emergency status, and parking load
            to guide signal and corridor actions.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <BrainCircuit size={16} />
          {data?.source ? `${data.source} intelligence` : "Awaiting live model input"}
        </span>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">{error}</p>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="text-sm text-slate-500 dark:text-slate-400">Recommendations</p>
          <p className="mt-2 font-semibold text-slate-900 dark:text-white">
            {summary?.recommendations ?? decisions.length}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="text-sm text-slate-500 dark:text-slate-400">Active emergencies</p>
          <p className="mt-2 font-semibold text-slate-900 dark:text-white">
            {summary?.activeEmergencies ?? 0}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="text-sm text-slate-500 dark:text-slate-400">Live intersections</p>
          <p className="mt-2 font-semibold text-slate-900 dark:text-white">
            {summary?.liveIntersections ?? 0}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="text-sm text-slate-500 dark:text-slate-400">Incidents</p>
          <p className="mt-2 font-semibold text-slate-900 dark:text-white">
            {summary?.incidents ?? 0}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {(decisions.length
          ? decisions
          : [
              {
                id: "empty-ai",
                title: "No AI recommendations yet",
                severity: "low",
                rationale: "Waiting for live traffic state to generate actions.",
                recommendation: "Keep monitoring incoming telemetry.",
                confidence: 0,
                intersections: [],
                updatedAt: new Date().toISOString(),
              },
            ]
        ).map((decision) => (
          <div
            key={decision.id}
            className="rounded-3xl border border-slate-200/80 p-4 dark:border-slate-800"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900 dark:text-white">{decision.title}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                      severityClasses[decision.severity] ?? severityClasses.low
                    }`}
                  >
                    {decision.severity}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {decision.rationale}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                Confidence {decision.confidence}%
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <Radar size={18} className="mt-0.5 text-sky-600 dark:text-sky-300" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Recommended action
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {decision.recommendation}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 text-sm text-slate-500 dark:text-slate-400 lg:flex-row lg:items-center lg:justify-between">
              <span>
                {(decision.intersections?.length
                  ? decision.intersections.join(", ")
                  : "City-wide decision window")}
              </span>
              <span className="inline-flex items-center gap-1">
                Updated {new Date(decision.updatedAt).toLocaleTimeString()}
                <ChevronRight size={14} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

export default AiDecisionPanel;

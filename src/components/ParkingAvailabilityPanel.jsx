import { CarFront, CircleParking, MapPinned } from "lucide-react";
import { motion } from "framer-motion";

const statusClasses = {
  critical: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  busy: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  moderate: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  available: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

function ParkingAvailabilityPanel({ data, error }) {
  const summary = data?.summary;
  const lots = data?.lots ?? [];

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
            Parking availability
          </p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
            Delhi parking slot monitor
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Lot occupancy is adjusted from live corridor pressure so operators can reroute drivers
            before hotspots lock up.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <CircleParking size={16} />
          {data?.source ? `${data.source} occupancy` : "Awaiting live parking state"}
        </span>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">{error}</p>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="text-sm text-slate-500 dark:text-slate-400">Tracked lots</p>
          <p className="mt-2 font-semibold text-slate-900 dark:text-white">
            {summary?.totalLots ?? lots.length}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="text-sm text-slate-500 dark:text-slate-400">Available slots</p>
          <p className="mt-2 font-semibold text-slate-900 dark:text-white">
            {summary?.availableSlots ?? 0}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="text-sm text-slate-500 dark:text-slate-400">Average occupancy</p>
          <p className="mt-2 font-semibold text-slate-900 dark:text-white">
            {summary?.averageOccupancy ?? 0}%
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {(lots.length
          ? lots
          : [
              {
                id: "empty-lot",
                name: "No parking feed yet",
                area: "Delhi network",
                availableSlots: 0,
                capacity: 0,
                occupancyRate: 0,
                trend: "Awaiting data",
                status: "moderate",
                linkedIntersection: "No linked intersection",
              },
            ]
        ).map((lot) => (
          <div
            key={lot.id}
            className="rounded-3xl border border-slate-200/80 p-4 dark:border-slate-800"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{lot.name}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                  <MapPinned size={14} />
                  {lot.area}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                  statusClasses[lot.status] ?? statusClasses.moderate
                }`}
              >
                {lot.status}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400">Available</p>
                <p className="mt-2 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <CarFront size={16} />
                  {lot.availableSlots}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400">Capacity</p>
                <p className="mt-2 font-semibold text-slate-900 dark:text-white">{lot.capacity}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400">Occupancy</p>
                <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                  {lot.occupancyRate}%
                </p>
              </div>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500"
                style={{ width: `${lot.occupancyRate}%` }}
              />
            </div>

            <div className="mt-4 flex flex-col gap-2 text-sm text-slate-500 dark:text-slate-400 lg:flex-row lg:items-center lg:justify-between">
              <span>{lot.trend}</span>
              <span>{lot.linkedIntersection}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

export default ParkingAvailabilityPanel;

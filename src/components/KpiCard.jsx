import { motion } from "framer-motion";

const toneClasses = {
  positive: "text-emerald-600 dark:text-emerald-400",
  neutral: "text-slate-500 dark:text-slate-400",
};

function KpiCard({ title, value, detail, tone, icon: Icon }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-panel card-hover p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {value}
          </h3>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Icon size={20} />
        </div>
      </div>
      <p className={`text-sm font-medium ${toneClasses[tone]}`}>{detail}</p>
    </motion.article>
  );
}

export default KpiCard;

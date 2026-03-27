import { Bell, Settings } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

function Navbar({ items, activeItem, isDarkMode, onToggleTheme }) {
  return (
    <nav className="glass-panel sticky top-4 z-20 mb-8 flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-soft">
          <span className="text-lg font-bold">ST</span>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Smart Traffic Management
          </p>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            Analytics Workspace
          </h1>
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-center">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            className={`nav-chip ${item === activeItem ? "nav-chip-active" : ""}`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 self-end lg:self-auto">
        <ThemeToggle isDarkMode={isDarkMode} onToggle={onToggleTheme} />
        <button
          type="button"
          className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
        <button
          type="button"
          className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </nav>
  );
}

export default Navbar;

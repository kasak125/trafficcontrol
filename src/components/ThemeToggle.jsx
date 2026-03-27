import { MoonStar, SunMedium } from "lucide-react";

function ThemeToggle({ isDarkMode, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
      aria-label="Toggle dark mode"
    >
      {isDarkMode ? <SunMedium size={16} /> : <MoonStar size={16} />}
      <span>{isDarkMode ? "Light" : "Dark"}</span>
    </button>
  );
}

export default ThemeToggle;

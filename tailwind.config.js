/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        card: "0 12px 32px rgba(15, 23, 42, 0.08)",
        soft: "0 8px 24px rgba(15, 23, 42, 0.06)",
      },
      colors: {
        slateBrand: "#0f172a",
        accentBlue: "#2563eb",
        accentOrange: "#f59e0b",
      },
      backgroundImage: {
        grid: "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.18) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};

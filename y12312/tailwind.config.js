/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        spectrum: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          cyan: "#06b6d4",
          purple: "#8b5cf6",
          pink: "#ec4899",
        },
        surface: {
          DEFAULT: "#0f172a",
          lighter: "#1e293b",
          lightest: "#334155",
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      backgroundImage: {
        "spectrum-gradient":
          "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)",
        "spectrum-gradient-soft":
          "linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(139,92,246,0.1) 50%, rgba(236,72,153,0.1) 100%)",
        "grid-pattern":
          "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-pattern": "20px 20px",
      },
      boxShadow: {
        "spectrum-glow": "0 0 30px rgba(6,182,212,0.3), 0 0 60px rgba(139,92,246,0.2)",
        "inner-glow": "inset 0 0 20px rgba(6,182,212,0.1)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

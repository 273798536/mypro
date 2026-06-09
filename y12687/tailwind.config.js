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
        metro: {
          bg: "#0a0f1a",
          panel: "#121a2b",
          border: "#1e2d4a",
          primary: "#0ea5e9",
          accent: "#f59e0b",
          danger: "#ef4444",
          success: "#10b981",
          warning: "#f59e0b",
          text: "#e2e8f0",
          muted: "#64748b",
          grid: "#1e2d4a",
          profile: "#38bdf8",
          anomaly: "#fb923c",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["Noto Sans SC", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan": "scan 2s linear infinite",
        "blink": "blink 1s ease-in-out infinite",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
      boxShadow: {
        "glow-primary": "0 0 20px rgba(14, 165, 233, 0.4)",
        "glow-danger": "0 0 20px rgba(239, 68, 68, 0.4)",
        "glow-anomaly": "0 0 16px rgba(251, 146, 60, 0.6)",
      },
    },
  },
  plugins: [],
};

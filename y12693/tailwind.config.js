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
        bg: {
          primary: "#0E1116",
          secondary: "#1A1F29",
          tertiary: "#242B38",
        },
        border: {
          DEFAULT: "#2A3140",
          light: "#3A4356",
        },
        accent: {
          DEFAULT: "#F59E0B",
          hover: "#FBBF24",
          dim: "#92400E",
        },
        danger: {
          DEFAULT: "#EF4444",
          dim: "#7F1D1D",
          bg: "#450A0A",
        },
        warning: {
          DEFAULT: "#EAB308",
          dim: "#854D0E",
          bg: "#422006",
        },
        success: {
          DEFAULT: "#10B981",
          dim: "#065F46",
        },
        text: {
          primary: "#F1F5F9",
          secondary: "#94A3B8",
          muted: "#64748B",
          inverse: "#0E1116",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 12px rgba(245, 158, 11, 0.35)",
        "glow-danger": "0 0 12px rgba(239, 68, 68, 0.35)",
        "glow-soft": "0 0 20px rgba(245, 158, 11, 0.15)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "border-pulse": "borderPulse 2s ease-in-out infinite",
      },
      keyframes: {
        borderPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(239, 68, 68, 0.4)" },
          "50%": { boxShadow: "0 0 0 4px rgba(239, 68, 68, 0)" },
        },
      },
    },
  },
  plugins: [],
};

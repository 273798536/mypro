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
          DEFAULT: "#0B1120",
          soft: "#0F172A",
          card: "#1E293B",
          hover: "#334155",
        },
        border: {
          DEFAULT: "#334155",
          soft: "#475569",
        },
        text: {
          DEFAULT: "#F1F5F9",
          muted: "#94A3B8",
          dim: "#64748B",
        },
        accent: {
          abnormal: "#EF4444",
          pending: "#F59E0B",
          normal: "#10B981",
          merged: "#3B82F6",
          caliber: "#8B5CF6",
          export: "#06B6D4",
        },
      },
      fontFamily: {
        sans: ["Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Menlo", "Monaco", "monospace"],
      },
      animation: {
        "pulse-red": "pulse-red 2s ease-in-out infinite",
        "breath-yellow": "breath-yellow 2.5s ease-in-out infinite",
        "fade-in": "fade-in 0.5s ease-out both",
        "slide-up": "slide-up 0.3s ease-out both",
        "blink-hl": "blink-hl 0.8s ease-in-out 3",
      },
      keyframes: {
        "pulse-red": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(239,68,68,0.6)" },
          "50%": { boxShadow: "0 0 0 12px rgba(239,68,68,0)" },
        },
        "breath-yellow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245,158,11,0.5)" },
          "50%": { boxShadow: "0 0 0 8px rgba(245,158,11,0)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "blink-hl": {
          "0%, 100%": { background: "rgba(139,92,246,0.0)" },
          "50%": { background: "rgba(139,92,246,0.35)" },
        },
      },
      backgroundImage: {
        "grad-abnormal": "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.02))",
        "grad-pending": "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.02))",
        "grad-normal": "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.02))",
        "grad-total": "linear-gradient(135deg, rgba(148,163,184,0.18), rgba(148,163,184,0.02))",
        "grid-soft": "linear-gradient(rgba(71,85,105,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(71,85,105,0.08) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

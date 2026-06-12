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
        background: "#0F1419",
        surface: "#1A1F26",
        "surface-hover": "#242B33",
        border: "#2A3139",
        primary: "#00D4AA",
        "primary-hover": "#00B895",
        warning: "#FFB020",
        success: "#00C48C",
        danger: "#FF4757",
        muted: "#8A94A6",
        text: "#E6E8EB",
        "text-secondary": "#B0B6BD",
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(0, 212, 170, 0.4)",
        "glow-soft": "0 0 12px rgba(0, 212, 170, 0.25)",
        card: "0 4px 24px rgba(0, 0, 0, 0.4)",
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.3s ease-out",
      },
      keyframes: {
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(0, 212, 170, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(0, 212, 170, 0.6)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

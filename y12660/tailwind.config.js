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
        hall: {
          bg: "#0B1B2E",
          bg2: "#0F2238",
          bg3: "#13294B",
          border: "#1E3A5F",
          border2: "#2A4A73",
          text: "#E2E8F0",
          textDim: "#94A3B8",
          textMute: "#64748B",
          accent: "#38BDF8",
        },
        status: {
          usable: "#10B981",
          review: "#64748B",
          unusable: "#F43F5E",
        },
        anomaly: {
          warn: "#F59E0B",
          error: "#F43F5E",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        body: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(56, 189, 248, 0.25), 0 8px 32px rgba(56, 189, 248, 0.08)",
        card: "0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2)",
      },
      animation: {
        "pulse-border": "pulse-border 2s ease-in-out infinite",
        "flash-yellow": "flash-yellow 1.2s ease-out",
      },
      keyframes: {
        "pulse-border": {
          "0%, 100%": { "box-shadow": "0 0 0 0 rgba(244, 63, 94, 0.6)" },
          "50%": { "box-shadow": "0 0 0 6px rgba(244, 63, 94, 0)" },
        },
        "flash-yellow": {
          "0%": { "background-color": "rgba(245, 158, 11, 0.45)" },
          "100%": { "background-color": "rgba(245, 158, 11, 0)" },
        },
      },
    },
  },
  plugins: [],
};

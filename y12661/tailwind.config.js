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
        eng: {
          bg: "#0f172a",
          panel: "#1e293b",
          card: "#273449",
          border: "#334155",
          muted: "#64748b",
          text: "#e2e8f0",
          dim: "#94a3b8",
          primary: "#1e40af",
          primaryHover: "#2563eb",
          warn: "#ea580c",
          warnSoft: "#7c2d12",
          pass: "#16a34a",
          passSoft: "#14532d",
          danger: "#dc2626",
          dangerSoft: "#450a0a",
          accent: "#0891b2",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', "ui-monospace", "monospace"],
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["10px", "14px"],
        xs: ["12px", "16px"],
        sm: ["14px", "20px"],
        base: ["16px", "24px"],
        lg: ["18px", "28px"],
        xl: ["20px", "28px"],
        "2xl": ["28px", "36px"],
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "104": "26rem",
        "128": "32rem",
      },
      boxShadow: {
        eng: "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
        glow: "0 0 16px rgba(30,64,175,0.5)",
      },
      backgroundImage: {
        "grid-eng":
          "linear-gradient(rgba(100,116,139,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.08) 1px, transparent 1px)",
        "scanline":
          "repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(30,64,175,0.03) 2px, rgba(30,64,175,0.03) 4px)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "blink": "blink 1.2s ease-in-out infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
    },
  },
  plugins: [],
};

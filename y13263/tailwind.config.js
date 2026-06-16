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
        municipal: {
          50: "#f0f4f9",
          100: "#d9e2ed",
          200: "#b3c5db",
          300: "#809fc2",
          400: "#4d77a8",
          500: "#2a568a",
          600: "#1e3a5f",
          700: "#19304e",
          800: "#162841",
          900: "#122136",
          950: "#0b1523",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        success: {
          50: "#ecfdf5",
          100: "#d1fae5",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          400: "#f87171",
          500: "#dc2626",
          600: "#b91c1c",
        },
      },
      fontFamily: {
        sans: [
          '"Source Han Sans SC"',
          '"Noto Sans SC"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          "system-ui",
          "sans-serif",
        ],
        serif: [
          '"Source Han Serif SC"',
          '"Noto Serif SC"',
          '"SimSun"',
          "Georgia",
          "serif",
        ],
        mono: ['"JetBrains Mono"', '"SF Mono"', "Consolas", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(30, 58, 95, 0.08), 0 1px 2px rgba(30, 58, 95, 0.06)",
        "card-hover":
          "0 4px 12px rgba(30, 58, 95, 0.12), 0 2px 4px rgba(30, 58, 95, 0.08)",
      },
      animation: {
        "pulse-border": "pulse-border 2s ease-in-out infinite",
      },
      keyframes: {
        "pulse-border": {
          "0%, 100%": { "box-shadow": "0 0 0 0 rgba(220, 38, 38, 0.4)" },
          "50%": { "box-shadow": "0 0 0 6px rgba(220, 38, 38, 0)" },
        },
      },
    },
  },
  plugins: [],
};

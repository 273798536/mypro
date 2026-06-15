/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "24px",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#1e3a8a",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        status: {
          resolved: "#059669",
          resolvedBg: "#ecfdf5",
          evidence: "#d97706",
          evidenceBg: "#fffbeb",
          confirm: "#dc2626",
          confirmBg: "#fef2f2",
        },
        paper: {
          50: "#faf8f5",
          100: "#f5f2ec",
          200: "#ebe5d8",
        },
      },
      fontFamily: {
        sans: [
          '"Noto Sans SC"',
          '"PingFang SC"',
          '"Source Han Sans SC"',
          '"Microsoft YaHei"',
          "system-ui",
          "sans-serif",
        ],
        serif: [
          '"Noto Serif SC"',
          '"Source Han Serif SC"',
          '"SimSun"',
          "Georgia",
          "serif",
        ],
        mono: ['"JetBrains Mono"', '"Fira Code"', '"SF Mono"', "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 2px 8px -2px rgba(30, 58, 138, 0.08), 0 8px 24px -8px rgba(30, 58, 138, 0.12)",
        paper: "0 1px 3px rgba(0,0,0,0.04), 0 12px 32px -12px rgba(30, 58, 138, 0.16)",
      },
      keyframes: {
        "flash-red": {
          "0%, 100%": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "#fecaca" },
        },
        "count-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "ripple": {
          "0%": { transform: "scale(0)", opacity: "0.6" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
      },
      animation: {
        "flash-red": "flash-red 0.8s ease-in-out 2",
        "count-up": "count-up 0.5s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "ripple": "ripple 0.6s ease-out",
      },
    },
  },
  plugins: [],
};

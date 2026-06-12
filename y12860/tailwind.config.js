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
        ocean: {
          950: "#051324",
          900: "#0A2342",
          800: "#0E2F56",
          700: "#123D72",
          600: "#194C91",
          500: "#2361B5",
          400: "#3A7BD5",
          300: "#65A0E8",
          200: "#96BFF0",
          100: "#C5DDF7",
        },
        seafoam: {
          500: "#2CA6A4",
          400: "#3FBDBB",
          300: "#5FD4D2",
          200: "#8FE6E5",
        },
        coral: {
          500: "#E84855",
          400: "#F06A75",
          300: "#F48E97",
        },
        seaweed: {
          500: "#3CB371",
          400: "#55C88A",
          300: "#7FDBA8",
        },
        sand: {
          500: "#F4B942",
          400: "#F7CB6A",
          300: "#FADB94",
        },
      },
      fontFamily: {
        display: ['"ZCOOL XiaoWei"', "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ['"PingFang SC"', '"Microsoft YaHei"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        nautical: "0 4px 20px rgba(10, 35, 66, 0.4)",
        card: "0 2px 12px rgba(5, 19, 36, 0.3)",
        glow: "0 0 20px rgba(44, 166, 164, 0.3)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "border-pulse": "borderPulse 2s ease-in-out 1",
        "float-up": "floatUp 0.3s ease-out",
        "compass-spin": "compassSpin 0.8s ease-out",
      },
      keyframes: {
        borderPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(232, 72, 85, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(232, 72, 85, 0)" },
        },
        floatUp: {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        compassSpin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
    },
  },
  plugins: [],
};

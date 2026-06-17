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
        primary: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#165DFF",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        accent: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F97316",
          600: "#FF7D00",
          700: "#C2410C",
          800: "#9A3412",
          900: "#7C2D12",
        },
      },
      fontFamily: {
        sans: ["Source Han Sans CN", "Noto Sans SC", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Monaco", "Consolas", "monospace"],
      },
      animation: {
        "fade-in-up": "fadeInUp 0.5s ease-out",
        "pulse-once": "pulse-once 2s ease-out",
        "breathe": "breathe 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

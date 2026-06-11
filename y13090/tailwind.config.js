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
        industrial: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#1E40AF",
          700: "#1E3A8A",
          800: "#1E3A8A",
          900: "#172554",
        },
        warning: {
          400: "#FB923C",
          500: "#F97316",
          600: "#EA580C",
        },
        danger: {
          400: "#F87171",
          500: "#DC2626",
          600: "#B91C1C",
        },
        steel: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
      },
      fontFamily: {
        sans: ['"Source Han Sans CN"', '"Noto Sans SC"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(30,64,175,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(30,64,175,0.05) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-20": "20px 20px",
        "grid-40": "40px 40px",
      },
      boxShadow: {
        "industrial": "0 2px 8px rgba(30, 64, 175, 0.15), 0 1px 2px rgba(15, 23, 42, 0.08)",
        "industrial-lg": "0 8px 24px rgba(30, 64, 175, 0.2), 0 2px 6px rgba(15, 23, 42, 0.1)",
      },
    },
  },
  plugins: [],
};

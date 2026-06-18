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
        slate: {
          950: "#0f172a",
        },
        brand: {
          DEFAULT: "#1e293b",
          light: "#334155",
          dark: "#0f172a",
        },
        anomaly: {
          critical: "#ef4444",
          warning: "#f59e0b",
          info: "#3b82f6",
          success: "#10b981",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

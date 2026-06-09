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
        lab: {
          blue: "#1E40AF",
          "blue-light": "#3B82F6",
          orange: "#D97706",
          "orange-light": "#F59E0B",
          red: "#DC2626",
          "red-light": "#EF4444",
          green: "#059669",
          "green-light": "#10B981",
          paper: "#F5F0E1",
          "paper-dark": "#E8DFC8",
          ink: "#1F2937",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', '"SimSun"', "serif"],
        sans: ['"Noto Sans SC"', '"Source Han Sans SC"', '"PingFang SC"', "sans-serif"],
      },
      boxShadow: {
        paper: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)",
        card: "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)",
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "2px",
      },
    },
  },
  plugins: [],
};

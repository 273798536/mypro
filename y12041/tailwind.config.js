/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./shared/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1a1f36",
        secondary: "#252b45",
        amber: "#f59e0b",
        emerald: "#10b981",
        rose: "#ef4444",
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

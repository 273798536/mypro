/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          50: "#f0f9f9",
          100: "#ccecec",
          200: "#99d9d9",
          300: "#66c6c6",
          400: "#33b3b3",
          500: "#00a0a0",
          600: "#0d8080",
          700: "#0d4F4F",
          800: "#0a3d3d",
          900: "#072a2a",
          950: "#051818",
        },
        amber: {
          500: "#d97706",
          600: "#b45309",
        },
        slate: {
          950: "#0f172a",
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

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
        navy: {
          50: "#f0f4f8",
          100: "#d9e2ec",
          200: "#bcccdc",
          300: "#9fb3c8",
          400: "#829ab1",
          500: "#627d98",
          600: "#486581",
          700: "#334e68",
          800: "#243b53",
          900: "#1e3a5f",
          950: "#102a43",
        },
        amber: {
          400: "#d4a843",
          500: "#c49a32",
          600: "#a6831e",
        },
        danger: {
          400: "#e74c3c",
          500: "#c0392b",
        },
      },
      fontFamily: {
        mono: ['"SF Mono"', '"Monaco"', '"Inconsolata"', '"Roboto Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

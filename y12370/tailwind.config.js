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
          50: "#f0f4f8",
          100: "#d9e2ec",
          200: "#bcccdc",
          300: "#9fb3c8",
          400: "#829ab1",
          500: "#627d98",
          600: "#486581",
          700: "#334e68",
          800: "#1e3a5f",
          900: "#102a43",
        },
        conflict: {
          light: "#fdecea",
          DEFAULT: "#e74c3c",
          dark: "#c0392b",
        },
        success: {
          light: "#e8f5e9",
          DEFAULT: "#27ae60",
          dark: "#229954",
        },
        warning: {
          light: "#fef9e7",
          DEFAULT: "#f39c12",
          dark: "#d68910",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "serif"],
        sans: ['"Noto Sans SC"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

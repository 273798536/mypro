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
        surface: {
          900: "#0F0F1A",
          800: "#1A1A2E",
          700: "#252540",
          600: "#2F2F4A",
          500: "#3A3A55",
        },
        amber: {
          DEFAULT: "#F59E0B",
          light: "#FCD34D",
          dark: "#D97706",
        },
        emerald: {
          DEFAULT: "#10B981",
          light: "#6EE7B7",
          dark: "#059669",
        },
        danger: {
          DEFAULT: "#EF4444",
          light: "#FCA5A5",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "monospace"],
        sans: ['"Noto Sans SC"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

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
        base: {
          DEFAULT: "#1A1D23",
          50: "#22262E",
          100: "#2D3139",
          200: "#3A3F4B",
          300: "#4A5060",
        },
        steel: {
          DEFAULT: "#4A90D9",
          light: "#6AA8E8",
          dark: "#3A78B8",
        },
        amber: {
          DEFAULT: "#E8A838",
          light: "#F0C060",
          dark: "#C88820",
        },
        emerald: {
          DEFAULT: "#34C759",
          light: "#5DD87A",
          dark: "#28A745",
        },
        danger: {
          DEFAULT: "#FF3B30",
          light: "#FF6B60",
          dark: "#D32F2F",
        },
        text: {
          primary: "#F5F5F7",
          secondary: "#8E8E93",
          muted: "#636366",
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

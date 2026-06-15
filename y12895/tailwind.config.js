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
        ocean: {
          950: "#061525",
          900: "#0A2540",
          800: "#0F3460",
          700: "#164B80",
          600: "#1B6CA0",
          500: "#208DC0",
        },
        ice: {
          DEFAULT: "#00D4FF",
          light: "#66E5FF",
          dark: "#00A8CC",
        },
        amber: {
          DEFAULT: "#F59E0B",
          light: "#FCD34D",
        },
        reef: {
          DEFAULT: "#10B981",
          light: "#6EE7B7",
        },
        coral: {
          DEFAULT: "#EF4444",
          light: "#FCA5A5",
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

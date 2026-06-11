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
          50: '#E8F4F8',
          100: '#C5E4ED',
          200: '#8FC9DB',
          300: '#5AAEC9',
          400: '#2593B7',
          500: '#0F7B9E',
          600: '#0C6280',
          700: '#0A4A60',
          800: '#073140',
          900: '#0F2B46',
          950: '#081B2E',
        },
        teal: {
          DEFAULT: '#00B4A0',
          light: '#33C7B6',
          dark: '#008F80',
        },
        warn: {
          DEFAULT: '#FF8C42',
          light: '#FFB380',
          dark: '#E67520',
        },
        danger: {
          DEFAULT: '#E63946',
          light: '#FF6B76',
          dark: '#C62828',
        },
        watch: {
          DEFAULT: '#F4D35E',
          light: '#F8E08A',
          dark: '#D4B240',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Noto Sans SC', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

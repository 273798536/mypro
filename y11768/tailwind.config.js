/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        display: ['"DM Serif Display"', 'serif'],
      },
      colors: {
        space: '#0A1628',
        gold: {
          50: '#FFF8E1',
          100: '#FFECB3',
          400: '#FFD54F',
          500: '#F0B429',
          600: '#FF8F00',
        },
        ice: {
          400: '#4FC3F7',
          500: '#29B6F6',
          600: '#0288D1',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

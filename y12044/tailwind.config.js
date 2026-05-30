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
        space: {
          900: '#0A1628',
          800: '#0F1F38',
          700: '#162A47',
          600: '#1E3A5F',
        },
        mars: {
          500: '#D1462A',
          400: '#E05A3E',
        },
        tech: {
          400: '#2DD4BF',
          500: '#14B8A6',
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow': 'flow 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        flow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor' },
          '100%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
        },
      },
    },
  },
  plugins: [],
};

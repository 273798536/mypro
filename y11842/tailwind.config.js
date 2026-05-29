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
        slate: {
          950: '#0A192F',
        },
        cyan: {
          400: '#64FFDA',
          500: '#2DD4BF',
        },
        emerald: {
          400: '#34D399',
          500: '#10B981',
        },
        amber: {
          400: '#FFD93D',
          500: '#F59E0B',
        },
        red: {
          400: '#FF6B6B',
          500: '#EF4444',
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        dataFlow: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(100, 255, 218, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(100, 255, 218, 0.6)' },
        },
      },
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'dataFlow': 'dataFlow 1.5s infinite',
        'pulseGlow': 'pulseGlow 2s infinite',
      },
    },
  },
  plugins: [],
};

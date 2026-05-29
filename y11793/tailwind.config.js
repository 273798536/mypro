/** @type {import('tailwindcss').Config} */

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a1a2e',
          dark: '#16162a',
          light: '#2a2a4e',
        },
        accent: {
          blue: '#00d4ff',
          'blue-dark': '#0099cc',
          orange: '#ff8c00',
          'orange-dark': '#cc7000',
        },
        alert: {
          'warning-yellow': '#fbbf24',
          'severe-orange': '#f97316',
          'fatal-red': '#ef4444',
        },
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(0, 212, 255, 0.3)',
        'glow-orange': '0 0 20px rgba(255, 140, 0, 0.3)',
      },
    },
  },
  plugins: [],
};

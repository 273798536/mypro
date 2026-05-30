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
        'deep-sea': '#0A1628',
        'tide-cyan': '#00D4AA',
        'warn-amber': '#FF8C00',
        'dock-gray': '#4A5568',
        'fuel-red': '#E53E3E',
        'lock-gold': '#D69E2E',
        'ocean-dark': '#0D1F3C',
        'ocean-mid': '#132B50',
        'ocean-light': '#1A3A6B',
      },
      fontFamily: {
        'serif-sc': ['"Noto Serif SC"', 'serif'],
        'sans-sc': ['"Noto Sans SC"', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        'blink-amber': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'blink-red': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.2' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'blink-amber': 'blink-amber 1.2s ease-in-out infinite',
        'blink-red': 'blink-red 0.8s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
      },
    },
  },
  plugins: [],
};

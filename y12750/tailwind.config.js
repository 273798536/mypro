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
        lab: {
          blue: '#1E3A5F',
          'blue-light': '#2D4F7A',
          green: '#2E7D5B',
          'green-light': '#3D9B72',
          yellow: '#D4A017',
          'yellow-light': '#E8B830',
          red: '#C0392B',
          'red-light': '#D65A4C',
        },
        paper: {
          DEFAULT: '#F7F5F0',
          dark: '#EDE9E0',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['"Source Sans 3"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        'sm-plus': '6px',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'draw-line': 'drawLine 1.2s ease-out forwards',
        'pulse-once': 'pulseOnce 0.8s ease-out',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        drawLine: {
          '0%': { strokeDashoffset: '2000' },
          '100%': { strokeDashoffset: '0' },
        },
        pulseOnce: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.4)', opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};

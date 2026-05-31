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
        navy: {
          950: '#0A1628',
          900: '#0F1F3A',
          800: '#162D50',
          700: '#1E3A5F',
          600: '#2A4A73',
          500: '#3B5F8A',
        },
        amber: {
          DEFAULT: '#D4A017',
          light: '#F0C850',
          dark: '#A67C00',
        },
        risk: {
          red: '#E53935',
          orange: '#FF6D00',
          yellow: '#FFC107',
        },
        safe: {
          green: '#43A047',
        },
        neutral: {
          slate: '#78909C',
        },
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
        sans: ['Noto Sans SC', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(212, 160, 23, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(212, 160, 23, 0.6)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

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
        'deep-blue': {
          50: '#e6f0f8',
          100: '#b3d1e8',
          200: '#80b3d8',
          300: '#4d94c8',
          400: '#2679b8',
          500: '#0F2B46',
          600: '#0c2339',
          700: '#091b2c',
          800: '#06121f',
          900: '#030a12',
          950: '#010509',
        },
        'teal-glow': {
          400: '#33ddbf',
          500: '#00D4AA',
          600: '#00b38f',
        },
        'orange-alert': {
          400: '#ff8f5c',
          500: '#FF6B35',
          600: '#e55a2b',
        },
        'amber-warn': {
          400: '#ffc35c',
          500: '#FFB020',
          600: '#e59915',
        },
        'purple-verbal': {
          400: '#b57aff',
          500: '#9D4EDD',
          600: '#853dbf',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['"Noto Sans SC"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'breathe': 'breathe 2.5s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 212, 170, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 212, 170, 0.6)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.02)', opacity: '0.95' },
        },
      },
    },
  },
  plugins: [],
};

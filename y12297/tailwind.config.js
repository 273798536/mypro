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
        'space': {
          900: '#0A1628',
          800: '#0F1E36',
          700: '#162A4A',
          600: '#1E3A5F',
        },
        'cyber': {
          500: '#00D4FF',
          400: '#33DDFF',
          300: '#66E5FF',
        },
        'risk': {
          500: '#FF4757',
          400: '#FF6B7A',
          300: '#FF8F9A',
        },
        'trust': {
          500: '#2ED573',
          400: '#55E08F',
          300: '#7CEBAB',
        },
        'warning': {
          500: '#FFA502',
          400: '#FFB733',
          300: '#FFC966',
        },
      },
      fontFamily: {
        'display': ['Space Grotesk', 'sans-serif'],
        'mono': ['Inter Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 3s linear infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 212, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.8)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

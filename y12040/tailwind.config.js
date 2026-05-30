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
        snow: {
          50: '#f8f9fa',
          100: '#e9ecef',
          200: '#dee2e6',
          300: '#ced4da',
          400: '#adb5bd',
          500: '#6c757d',
        },
        mountain: {
          50: '#e8f4fc',
          100: '#c7e2f5',
          200: '#9ccced',
          300: '#6bb0e2',
          400: '#4298d8',
          500: '#1e3a5f',
          600: '#1a3150',
          700: '#152840',
          800: '#101e30',
          900: '#0a1420',
        },
        ski: {
          50: '#ffe5e7',
          100: '#ffb3b8',
          200: '#ff8089',
          300: '#ff4d5a',
          400: '#e63946',
          500: '#cc2f3c',
          600: '#b32632',
        },
        curve: {
          400: '#2a9d8f',
          500: '#21867a',
          600: '#1a6b61',
        },
        warning: {
          400: '#f4a261',
          500: '#e76f51',
        },
        success: {
          400: '#52b788',
          500: '#40916c',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

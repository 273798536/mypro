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
        primary: {
          50: '#f0f5fa',
          100: '#d9e6f2',
          200: '#b3cde6',
          300: '#8db3d9',
          400: '#669acc',
          500: '#4080bf',
          600: '#336699',
          700: '#264d73',
          800: '#1a334d',
          900: '#0d1a26',
        },
        accent: {
          50: '#fff4ed',
          100: '#ffe4d4',
          200: '#ffc9a8',
          300: '#ffaf7d',
          400: '#ff9451',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide': 'slide 0.5s ease-in-out',
        'fade-in': 'fadeIn 0.3s ease-in',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

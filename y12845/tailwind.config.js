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
        'abyss': {
          50: '#f0f6f8',
          100: '#d9e9ed',
          200: '#b3d3dc',
          300: '#85b7c5',
          400: '#5293a6',
          500: '#327589',
          600: '#265d6e',
          700: '#1f4a59',
          800: '#0F4C5C',
          900: '#0d3440',
          950: '#072029',
        },
        'ember': {
          50: '#fef4ee',
          100: '#fde6d6',
          200: '#fac7aa',
          300: '#f6a072',
          400: '#f0783d',
          500: '#E36414',
          600: '#c84e0b',
          700: '#a63c0c',
          800: '#853112',
          900: '#6b2b12',
        },
        'moss': {
          50: '#f1f8ee',
          100: '#deefd7',
          200: '#bfdfb0',
          300: '#95c87e',
          400: '#6eac55',
          500: '#5FAD41',
          600: '#3f802c',
          700: '#326525',
          800: '#2a5122',
          900: '#23431e',
        },
        'crimson': {
          50: '#fdf2f3',
          100: '#fce2e5',
          200: '#f9c9cf',
          300: '#f4a3ad',
          400: '#ec7080',
          500: '#e0455a',
          600: '#cc2743',
          700: '#ab1d36',
          800: '#9A031E',
          900: '#7a051b',
        },
        'ivory': {
          50: '#fefdfa',
          100: '#fcf9f0',
          200: '#f8f1e0',
          300: '#f0e4c7',
          400: '#e5d3a7',
          500: '#d9c086',
        },
      },
      fontFamily: {
        'serif-cn': ['"Source Han Serif SC"', '"Noto Serif SC"', 'SimSun', 'serif'],
        'sans-cn': ['"Source Han Sans SC"', '"Noto Sans SC"', '"PingFang SC"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(15, 76, 92, 0.06)',
        'soft-lg': '0 8px 24px rgba(15, 76, 92, 0.08)',
        'ember-glow': '0 4px 16px rgba(227, 100, 20, 0.2)',
      },
    },
  },
  plugins: [],
};

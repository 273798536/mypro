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
          DEFAULT: '#0F2B4D',
          light: '#1a3a5c',
          dark: '#0a1f38',
        },
        accent: {
          DEFAULT: '#D4A853',
          light: '#e0bb6e',
          dark: '#b8913d',
        },
        surface: {
          DEFAULT: '#F5F2EB',
          card: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'system-ui', 'sans-serif'],
        serif: ['Noto Serif SC', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
    },
  },
  plugins: [],
};

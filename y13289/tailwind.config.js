/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f5fa',
          100: '#d9e4f0',
          200: '#b3c9e1',
          300: '#86a9cd',
          400: '#5684b7',
          500: '#2e5f9a',
          600: '#1E3A5F',
          700: '#1a3151',
          800: '#162944',
          900: '#101e32',
        },
        warning: {
          50: '#fef7ee',
          100: '#fdead3',
          200: '#fad2a5',
          300: '#f6b46d',
          400: '#f08d33',
          500: '#E67E22',
          600: '#d66316',
          700: '#b14b14',
          800: '#8d3c18',
          900: '#723316',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-left': 'fadeInLeft 0.3s ease-out',
        'flash': 'flash 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        flash: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
    },
  },
  plugins: [],
}

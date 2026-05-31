/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
      },
    },
    extend: {
      colors: {
        primary: {
          50: '#f0f5fa',
          100: '#d9e4f0',
          200: '#b3c9e1',
          300: '#84a6cb',
          400: '#4f7db0',
          500: '#1e3a5f',
          600: '#1a3354',
          700: '#162b47',
          800: '#12243b',
          900: '#0e1d2f',
        },
        accent: {
          warning: '#f59e0b',
          success: '#10b981',
          danger: '#ef4444',
          info: '#3b82f6',
        }
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        serif: ['"Noto Serif SC"', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'stagger-1': 'slideUp 0.4s ease-out 0.1s both',
        'stagger-2': 'slideUp 0.4s ease-out 0.2s both',
        'stagger-3': 'slideUp 0.4s ease-out 0.3s both',
        'stagger-4': 'slideUp 0.4s ease-out 0.4s both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};

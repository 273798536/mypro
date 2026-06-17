/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      screens: {
        'xl': '1280px',
      },
    },
    extend: {
      colors: {
        primary: {
          50: '#f0f5fa',
          100: '#d9e4ef',
          200: '#b3c9df',
          300: '#7e9fc7',
          400: '#4f74aa',
          500: '#1e3a5f',
          600: '#19304f',
          700: '#142740',
          800: '#0f1d30',
          900: '#0a1420',
        },
        brand: {
          amber: '#f59e0b',
          emerald: '#10b981',
          red: '#ef4444',
          violet: '#8b5cf6',
          sky: '#0ea5e9',
        }
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Source Han Sans CN"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

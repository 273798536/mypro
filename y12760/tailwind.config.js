/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
    },
    extend: {
      colors: {
        lab: {
          50: '#f0f5fa',
          100: '#d9e6f2',
          200: '#b3cce5',
          300: '#7fa8d2',
          400: '#4f82bb',
          500: '#2f639f',
          600: '#1e4d82',
          700: '#1e3a5f',
          800: '#17304e',
          900: '#0f2138',
          950: '#0a1728',
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        info: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
        },
      },
      fontFamily: {
        sans: ['"Source Han Sans SC"', '"Noto Sans SC"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['"Source Han Serif SC"', '"Noto Serif SC"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'slide-in': 'slideIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(30, 58, 95, 0.08), 0 1px 4px -2px rgba(30, 58, 95, 0.06)',
        'card': '0 4px 16px -4px rgba(30, 58, 95, 0.1), 0 2px 8px -4px rgba(30, 58, 95, 0.08)',
        'card-hover': '0 8px 24px -6px rgba(30, 58, 95, 0.15), 0 4px 12px -4px rgba(30, 58, 95, 0.1)',
      },
    },
  },
  plugins: [],
};

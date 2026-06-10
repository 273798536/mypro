/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./api/**/*.{js,ts}"],
  theme: {
    container: {
      center: true,
      padding: '24px',
    },
    extend: {
      colors: {
        navy: {
          50: '#f0f4f9',
          100: '#d9e2ee',
          200: '#b3c6dd',
          300: '#80a0c5',
          400: '#4c77a8',
          500: '#2d578a',
          600: '#1e3a5f',
          700: '#18304f',
          800: '#142740',
          900: '#0f1d30',
          950: '#0a1320',
        },
        accent: {
          50: '#fef5ee',
          100: '#fce6d3',
          200: '#f8c8a0',
          300: '#f3a56b',
          400: '#ed8842',
          500: '#e8743b',
          600: '#d15a22',
          700: '#ad451c',
          800: '#8a381b',
          900: '#702f1a',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        status: {
          pending: '#d97706',
          passed: '#059669',
          rejected: '#dc2626',
          error: '#dc2626',
          anomaly: '#e8743b',
          attention: '#f59e0b',
          normal: '#059669',
        }
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'card-hover': '0 4px 12px 0 rgba(15, 23, 42, 0.12), 0 2px 4px 0 rgba(15, 23, 42, 0.06)',
        'inset-l': 'inset 4px 0 0 0 var(--tw-shadow-color)',
      },
      borderRadius: {
        'sm': '2px',
        DEFAULT: '2px',
        'md': '3px',
        'lg': '4px',
      },
      keyframes: {
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'draw-line': {
          '0%': { strokeDashoffset: '100%' },
          '100%': { strokeDashoffset: '0' },
        },
        'expand-l': {
          '0%': { boxShadow: 'inset 0 0 0 0 transparent' },
          '100%': { boxShadow: 'inset 4px 0 0 0 var(--tw-shadow-color)' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'draw-line': 'draw-line 800ms ease-out forwards',
        'expand-l': 'expand-l 300ms ease-out forwards',
        'count-up': 'count-up 300ms ease-out forwards',
      },
    },
  },
  plugins: [],
};

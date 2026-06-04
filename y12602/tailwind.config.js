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
          DEFAULT: '#0F2C4A',
          light: '#1E3A5F',
          dark: '#0A1F35',
        },
        accent: {
          DEFAULT: '#FF6B35',
          light: '#FF8C5A',
          dark: '#E55A2B',
        },
        success: {
          DEFAULT: '#2ECC71',
          light: '#58D68D',
          dark: '#27AE60',
        },
        warning: {
          DEFAULT: '#F39C12',
          light: '#F5B041',
          dark: '#D68910',
        },
        danger: {
          DEFAULT: '#E74C3C',
          light: '#EC7063',
          dark: '#C0392B',
        },
        neutral: {
          50: '#F8FAFC',
          100: '#E8F1F8',
          200: '#CFDCE5',
          300: '#94A3B8',
          400: '#64748B',
          500: '#475569',
          600: '#334155',
          700: '#2C3E50',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        display: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'medium': '0 8px 30px rgba(0, 0, 0, 0.12)',
        'hard': '0 16px 50px rgba(0, 0, 0, 0.18)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'bounce-soft': 'bounce-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

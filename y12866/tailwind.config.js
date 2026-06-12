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
        ocean: {
          50: '#EFF8FF',
          100: '#DBEFFE',
          200: '#BFE3FE',
          300: '#93D1FD',
          400: '#60B5FA',
          500: '#3B91F6',
          600: '#2570EB',
          700: '#1D5BD8',
          800: '#0A3D6B',
          900: '#0C2D50',
          950: '#081D36',
        },
        aqua: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        risk: {
          high: '#EF4444',
          medium: '#F97316',
          low: '#EAB308',
          safe: '#22C55E',
        },
        slate: {
          850: '#1E293B',
        }
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-border': 'pulse-border 1.6s ease-in-out infinite',
        'stagger-in': 'stagger-in 0.4s ease-out forwards',
        'flash-photo': 'flash-photo 0.3s ease-out',
        'flip-in': 'flip-in 0.6s ease-out',
      },
      keyframes: {
        'pulse-border': {
          '0%, 100%': { borderColor: 'rgba(239, 68, 68, 0.4)' },
          '50%': { borderColor: 'rgba(239, 68, 68, 1)' },
        },
        'stagger-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'flash-photo': {
          '0%': { opacity: '1' },
          '30%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'flip-in': {
          from: { transform: 'rotateY(90deg)', opacity: '0' },
          to: { transform: 'rotateY(0deg)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

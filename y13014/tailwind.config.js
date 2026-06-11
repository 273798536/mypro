/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'deep-sea': {
          50: '#f0f5fa',
          100: '#dce8f3',
          200: '#b9d1e6',
          300: '#8ab3d4',
          400: '#558ebd',
          500: '#3570a2',
          600: '#275986',
          700: '#1e3a5f',
          800: '#1a3251',
          900: '#172a44',
        },
      },
      fontFamily: {
        sans: ['"Source Han Sans SC"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      keyframes: {
        'breathing-red': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.4)' },
          '50%': { boxShadow: '0 0 0 6px rgba(220, 38, 38, 0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'highlight-flash': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
        },
      },
      animation: {
        'breathing-red': 'breathing-red 2s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.4s ease-out both',
        'highlight-flash': 'highlight-flash 1s ease-in-out',
      },
    },
  },
  plugins: [],
};

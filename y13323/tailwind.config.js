/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-blue': {
          50: '#e8f0fe',
          100: '#c7d9fe',
          200: '#90b3fc',
          300: '#5a8dfa',
          400: '#2d6cf8',
          500: '#0F2A4A',
          600: '#0c2240',
          700: '#0a1c35',
          800: '#071529',
          900: '#050e1e',
        },
        'accent-blue': {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#2196F3',
          600: '#1e88e5',
          700: '#1976d2',
          800: '#1565c0',
          900: '#0d47a1',
        },
        'status': {
          warning: '#FF9800',
          success: '#4CAF50',
          error: '#F44336',
          info: '#607D8B',
        }
      },
      fontFamily: {
        'serif-sc': ['"Noto Serif SC"', 'serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
        'sans-sc': ['"Noto Sans SC"', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
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
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}

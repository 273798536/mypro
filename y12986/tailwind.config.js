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
          100: '#dce7f1',
          200: '#b8cfe2',
          300: '#87adc9',
          400: '#5086ab',
          500: '#2f6890',
          600: '#1E3A5F',
          700: '#1a3352',
          800: '#182c45',
          900: '#17263a',
        },
        accent: {
          amber: '#D97706',
          emerald: '#059669',
          crimson: '#DC2626',
        },
        terminal: {
          bg: '#0d1117',
          text: '#3fb950',
          warn: '#d29922',
          error: '#f85149',
          info: '#58a6ff',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Noto Sans SC', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1s step-end infinite',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}

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
          DEFAULT: '#0A2463',
          light: '#1E3A8A',
          dark: '#061A40',
        },
        accent: {
          success: '#2A9D8F',
          warning: '#F4A261',
          danger: '#E63946',
        },
        neutral: {
          ivory: '#F8F9FA',
          dark: '#212529',
        }
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-danger': 'pulse-danger 1s ease-in-out infinite',
        'flash-border': 'flash-border 0.5s ease-in-out 3',
      },
      keyframes: {
        'pulse-danger': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(230, 57, 70, 0.4)' },
          '50%': { boxShadow: '0 0 0 10px rgba(230, 57, 70, 0)' },
        },
        'flash-border': {
          '0%, 100%': { borderColor: 'transparent' },
          '50%': { borderColor: '#E63946' },
        },
      },
    },
  },
  plugins: [],
}

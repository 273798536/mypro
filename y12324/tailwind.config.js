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
        'sudoku': {
          primary: '#1a365d',
          secondary: '#3182ce',
          success: '#38a169',
          warning: '#ed8936',
          danger: '#e53e3e',
          light: '#ebf8ff',
          dark: '#2a4365',
        }
      },
      fontFamily: {
        'serif-sc': ['"Noto Serif SC"', 'serif'],
        'sans-sc': ['"Noto Sans SC"', 'sans-serif'],
        'mono-num': ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
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

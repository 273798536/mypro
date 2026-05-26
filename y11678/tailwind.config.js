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
          50: '#e6f7ff',
          100: '#b3e6ff',
          200: '#80d4ff',
          300: '#4dc3ff',
          400: '#1ab1ff',
          500: '#00d4ff',
          600: '#00a8cc',
          700: '#007c99',
          800: '#005066',
          900: '#0a1628',
          950: '#07101a',
        },
        space: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#8a9aba',
          400: '#616e8f',
          500: '#3a4a6a',
          600: '#2d3a5a',
          700: '#1a2a4a',
          800: '#122040',
          900: '#0a1628',
        },
        warning: {
          500: '#ff9500',
          600: '#e68600',
        },
        error: {
          500: '#ff3b30',
          600: '#d63027',
        },
        success: {
          500: '#34c759',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 212, 255, 0.3)',
        'glow-lg': '0 0 40px rgba(0, 212, 255, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(0, 212, 255, 0.1)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
};

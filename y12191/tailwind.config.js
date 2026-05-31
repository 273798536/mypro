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
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
        },
        wine: {
          50: '#fbe9e9',
          100: '#f5c7c7',
          200: '#eb9d9d',
          300: '#dd6b6b',
          400: '#cc4545',
          500: '#b42a2a',
          600: '#9e2b25',
          700: '#8a2621',
          800: '#6f1f1c',
          900: '#4a1513',
        },
        forest: {
          50: '#e8f5ee',
          100: '#c7e8d5',
          200: '#9fd9b8',
          300: '#70c498',
          400: '#4cae7e',
          500: '#3e885b',
          600: '#336b49',
          700: '#275238',
          800: '#1a3a27',
          900: '#0f2317',
        },
        amber: {
          50: '#fef3e8',
          100: '#fcdcc0',
          200: '#fac290',
          300: '#f7a45d',
          400: '#f48c34',
          500: '#f4a261',
          600: '#e07f2d',
          700: '#b86322',
          800: '#7d4317',
          900: '#4a280d',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Lato', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-once': 'pulse 0.6s ease-in-out 1',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

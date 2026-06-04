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
        industrial: {
          50: '#f0f5fa',
          100: '#dae5f2',
          200: '#b7cbe6',
          300: '#87aad4',
          400: '#5284bd',
          500: '#3367a4',
          600: '#285285',
          700: '#1e3a5f',
          800: '#1a3251',
          900: '#182a43',
          950: '#0f1a2b',
        },
        mining: {
          50: '#fef7ee',
          100: '#fdecd7',
          200: '#fad5ae',
          300: '#f6b87b',
          400: '#f19145',
          500: '#e67e22',
          600: '#d35f18',
          700: '#af4715',
          800: '#8c3918',
          900: '#723017',
          950: '#3e1609',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
    },
  },
  plugins: [],
};

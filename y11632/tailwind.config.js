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
        brand: {
          50: '#fef7e8',
          100: '#fdebc7',
          200: '#fcd588',
          300: '#f9be49',
          400: '#f7a91f',
          500: '#D4A843',
          600: '#b8861c',
          700: '#996815',
          800: '#7a5010',
          900: '#5c3c0c',
        },
        success: {
          500: '#2ECC71',
          600: '#27AE60',
        },
        error: {
          500: '#FF6B6B',
          600: '#E74C3C',
        },
        info: {
          500: '#4ECDC4',
          600: '#26A69A',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

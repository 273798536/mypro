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
        jazz: {
          burgundy: {
            50: '#fdf2f4',
            100: '#fce7eb',
            200: '#f8d0d8',
            300: '#f3aebc',
            400: '#eb7e95',
            500: '#de5471',
            600: '#c93355',
            700: '#a82544',
            800: '#8B2635',
            900: '#75222f',
            950: '#400d17',
          },
          gold: {
            50: '#fefce8',
            100: '#fef9c3',
            200: '#fef08a',
            300: '#fde047',
            400: '#facc15',
            500: '#eab308',
            600: '#D4AF37',
            700: '#a16207',
            800: '#854d0e',
            900: '#713f12',
          },
          ink: {
            50: '#f7f7f7',
            100: '#e3e3e3',
            200: '#c8c8c8',
            300: '#a4a4a4',
            400: '#818181',
            500: '#666666',
            600: '#515151',
            700: '#434343',
            800: '#383838',
            900: '#1A1A1A',
            950: '#0a0a0a',
          },
          blue: {
            400: '#60a5fa',
            500: '#4A90D9',
            600: '#2563eb',
          }
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        mono: ['"Source Code Pro"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

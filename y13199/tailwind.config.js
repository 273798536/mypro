/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        sans: ['Noto Sans SC', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        steel: {
          50: '#F4F7FA',
          100: '#E8EDF3',
          200: '#C8D6E5',
          300: '#8BA3BF',
          400: '#5A7A9A',
          500: '#3A5A7A',
          600: '#1B3A5C',
          700: '#0F2640',
          800: '#0A1A2E',
        },
        teal: {
          DEFAULT: '#2D9B83',
        },
        amber: {
          DEFAULT: '#E8A838',
        },
        rust: {
          DEFAULT: '#C44D3F',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
};

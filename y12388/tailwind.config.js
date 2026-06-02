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
          50: '#F0F4F8',
          100: '#D9E2EC',
          200: '#BCCCDC',
          300: '#9FB3C8',
          400: '#627D98',
          500: '#486581',
          600: '#334E68',
          700: '#243B53',
          800: '#1E3A5F',
          900: '#102A43',
        },
        accent: {
          orange: '#FF7A45',
          green: '#2D5A4C',
          red: '#C53030',
          amber: '#D69E2E',
        },
        note: {
          bg: '#FFFBEB',
          border: '#F6E05E',
        }
      },
      fontFamily: {
        display: ['"Noto Serif SC"', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-soft': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
};

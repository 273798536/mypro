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
        ocean: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#bae0ff',
          300: '#7cc7ff',
          400: '#36a6ff',
          500: '#0b85e6',
          600: '#3E92CC',
          700: '#005aaa',
          800: '#0A2463',
          900: '#071835',
          950: '#040e1f',
        },
        data: {
          available: '#2ECC71',
          suspended: '#F39C12',
          recollect: '#E74C3C',
          pending: '#3E92CC',
        }
      },
      fontFamily: {
        display: ['"Noto Serif SC"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'ocean-gradient': 'linear-gradient(180deg, #071835 0%, #0A2463 50%, #005aaa 100%)',
        'grid-pattern': 'linear-gradient(rgba(62, 146, 204, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(62, 146, 204, 0.1) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '50px 50px',
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
      }
    },
  },
  plugins: [],
};

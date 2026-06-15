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
          50: '#E8F3FF',
          100: '#B9D8FF',
          200: '#8ABEFF',
          300: '#5CA3FF',
          400: '#2D89FF',
          500: '#165DFF',
          600: '#0E42D2',
          700: '#0A2BA6',
          800: '#06197A',
          900: '#030D4E',
        },
        warning: {
          50: '#FFF7E8',
          100: '#FFE7B9',
          200: '#FFD68A',
          300: '#FFC65C',
          400: '#FFB52D',
          500: '#FF7D00',
          600: '#D26500',
          700: '#A64D00',
          800: '#7A3700',
          900: '#4E2200',
        },
        success: {
          50: '#E8FFEE',
          100: '#B9F7CC',
          200: '#8BEEAA',
          300: '#5CE688',
          400: '#2DDE66',
          500: '#00B42A',
          600: '#008F1F',
          700: '#006A17',
          800: '#00450E',
          900: '#002007',
        },
        steel: {
          50: '#F2F3F5',
          100: '#E5E6EB',
          200: '#C9CDD4',
          300: '#AEB4C0',
          400: '#929BA9',
          500: '#4E5969',
          600: '#3C4454',
          700: '#2C303D',
          800: '#1D2029',
          900: '#0E1014',
        },
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.1)',
        panel: '0 1px 4px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
      },
      animation: {
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
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

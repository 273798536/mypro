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
          50: '#E8EEF5',
          100: '#C7D4E5',
          200: '#9AB4D0',
          300: '#6D93BA',
          400: '#4673A5',
          500: '#1E3A5F',
          600: '#193050',
          700: '#132640',
          800: '#0D1B30',
          900: '#071120',
        },
        accent: {
          50: '#FFF0EA',
          100: '#FFD4C0',
          200: '#FFB692',
          300: '#FF9864',
          400: '#FF7A3E',
          500: '#FF6B35',
          600: '#E85A2B',
          700: '#CC4A20',
          800: '#A83A16',
          900: '#7A2A0E',
        },
        success: {
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#4CAF50',
          600: '#43A047',
          700: '#388E3C',
          800: '#2E7D32',
          900: '#1B5E20',
        },
        warning: {
          50: '#FFF8E1',
          100: '#FFECB3',
          200: '#FFE082',
          300: '#FFD54F',
          400: '#FFCA28',
          500: '#FFC107',
          600: '#FFB300',
          700: '#FFA000',
          800: '#FF8F00',
          900: '#FF6F00',
        },
        danger: {
          50: '#FFEBEE',
          100: '#FFCDD2',
          200: '#EF9A9A',
          300: '#E57373',
          400: '#EF5350',
          500: '#F44336',
          600: '#E53935',
          700: '#D32F2F',
          800: '#C62828',
          900: '#B71C1C',
        },
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', '"Monaco"', 'monospace'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(30, 58, 95, 0.06)',
        'card': '0 4px 16px rgba(30, 58, 95, 0.08)',
        'hover': '0 8px 24px rgba(30, 58, 95, 0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,vue}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          50: '#f0f5fa',
          100: '#d9e4f0',
          200: '#b3c9e1',
          300: '#8daed2',
          400: '#6793c3',
          500: '#4178b4',
          600: '#346090',
          700: '#27486c',
          800: '#1e3a5f',
          900: '#152842',
        },
        success: {
          50: '#f0faf4',
          100: '#d4f5e0',
          500: '#27ae60',
          600: '#229954',
          700: '#1e8449',
        },
        warning: {
          50: '#fef9f0',
          100: '#feefd6',
          500: '#f39c12',
          600: '#e67e22',
          700: '#d35400',
        },
        danger: {
          50: '#fdf2f2',
          100: '#fae0e0',
          500: '#e74c3c',
          600: '#c0392b',
          700: '#a93226',
        },
        info: {
          50: '#f0f8ff',
          100: '#d6eaf8',
          500: '#3498db',
          600: '#2980b9',
          700: '#1f618d',
        },
      },
      fontFamily: {
        display: ['Charter', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
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
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};

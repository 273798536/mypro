/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      colors: {
        forest: {
          50: '#f0f7f4',
          100: '#d9ebe3',
          200: '#b3d7c7',
          300: '#83bda5',
          400: '#529d7f',
          500: '#318261',
          600: '#23684d',
          700: '#1d5440',
          800: '#0F3D3E',
          900: '#0a2a2b',
        },
        mint: {
          50: '#f0f7f5',
          100: '#d9ece7',
          200: '#b3d9cf',
          300: '#93B1A6',
          400: '#6f998b',
          500: '#558072',
          600: '#42665b',
          700: '#365149',
          800: '#2d413b',
          900: '#273632',
        },
        burnt: {
          50: '#fdf5ef',
          100: '#fbe8d8',
          200: '#f6cfb0',
          300: '#f0ad7d',
          400: '#E2703A',
          500: '#d65a22',
          600: '#bb441a',
          700: '#9a3618',
          800: '#7d2f1a',
          900: '#672918',
        },
        carbon: {
          50: '#f6f6f6',
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4f4f4f',
          800: '#454545',
          900: '#1a1a1a',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shake': 'shake 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(145, 177, 166, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(145, 177, 166, 0.8)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
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

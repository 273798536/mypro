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
        'bg-primary': '#0A1628',
        'bg-secondary': '#0F2847',
        'bg-tertiary': '#1A3A5C',
        'ice-blue': '#4A90A4',
        'ice-light': '#7AB8C9',
        'ice-white': '#F0F7FF',
        'danger': '#FF6B6B',
        'warning': '#FFE66D',
        'success': '#4ECDC4',
        'info': '#5C9CE6',
        'outlier': '#FF4757',
        'normal': '#2ED573',
        'modified': '#FFA502',
        'text-primary': '#FFFFFF',
        'text-secondary': '#A0AEC0',
        'text-muted': '#718096',
      },
      fontFamily: {
        'display': ['"Playfair Display"', 'serif'],
        'body': ['"Lato"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'value-change': 'valueChange 0.5s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'gradient-shift': 'gradientShift 3s ease infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        valueChange: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '50%': { transform: 'translateY(-5px)', opacity: '0.8' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          'from': { transform: 'translateX(20px)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundSize: {
        '300%': '300% 300%',
      },
    },
  },
  plugins: [],
};

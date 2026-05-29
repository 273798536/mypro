/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF8C42',
        'primary-dark': '#E67A30',
        success: '#2ECC71',
        danger: '#E74C3C',
        warning: '#F39C12',
        info: '#3498DB',
        cafeteria: {
          bg: '#FFF8F0',
          card: '#FFFFFF',
          border: '#F0E0D0',
          warm: '#FFE4C4',
        }
      },
      fontFamily: {
        display: ['ZCOOL KuaiLe', 'cursive'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
      animation: {
        'pulse-red': 'pulseRed 1s ease-in-out infinite',
        'flash-yellow': 'flashYellow 0.5s ease-in-out infinite',
        'float-up': 'floatUp 1s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'bounce-in': 'bounceIn 0.4s ease-out',
      },
      keyframes: {
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(231, 76, 60, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(231, 76, 60, 0)' },
        },
        flashYellow: {
          '0%, 100%': { backgroundColor: 'rgba(243, 156, 18, 0.1)' },
          '50%': { backgroundColor: 'rgba(243, 156, 18, 0.3)' },
        },
        floatUp: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-40px)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

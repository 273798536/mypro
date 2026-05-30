/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4f9',
          100: '#d9e3f0',
          200: '#b3c7e1',
          300: '#8caad2',
          400: '#668ec3',
          500: '#3f71b4',
          600: '#2E5A8C',
          700: '#1E3A5F',
          800: '#152942',
          900: '#0c1826',
        },
        accent: {
          gold: '#D4AF37',
          amber: '#F59E0B',
        },
        success: {
          DEFAULT: '#2E7D32',
          light: '#4CAF50',
        },
        error: {
          DEFAULT: '#B33A3A',
          light: '#E57373',
        },
        parchment: {
          50: '#FDF8F0',
          100: '#F5E6D3',
          200: '#E8D5B7',
          300: '#D4C4A8',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'parchment': "linear-gradient(135deg, #FDF8F0 0%, #F5E6D3 50%, #E8D5B7 100%)",
        'parchment-dark': "linear-gradient(135deg, #E8D5B7 0%, #D4C4A8 100%)",
      },
      boxShadow: {
        'card': '0 4px 20px rgba(30, 58, 95, 0.15)',
        'card-hover': '0 8px 30px rgba(30, 58, 95, 0.25)',
        'inner-glow': 'inset 0 2px 4px rgba(212, 175, 55, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-gold': 'pulseGold 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 175, 55, 0.4)' },
          '50%': { boxShadow: '0 0 0 10px rgba(212, 175, 55, 0)' },
        },
      },
    },
  },
  plugins: [],
}

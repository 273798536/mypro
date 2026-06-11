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
        museum: {
          bg: '#1A1A2E',
          surface: '#16213E',
          card: '#1E2A45',
          border: '#2A3A5C',
          amber: '#D4A574',
          amberLight: '#E8C9A0',
          amberDark: '#B8895A',
          red: '#E74C3C',
          orange: '#F39C12',
          green: '#27AE60',
          purple: '#8E44AD',
          purpleBg: '#3D2066',
          text: '#E8E0D8',
          textMuted: '#8B9DC3',
          textDim: '#5A6F8E',
        }
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};

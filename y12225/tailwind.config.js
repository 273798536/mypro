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
        port: {
          50: '#EEF4FB',
          100: '#D4E4F5',
          200: '#A9C9EB',
          300: '#7EADE1',
          400: '#5392D7',
          500: '#1E3A5F',
          600: '#1A3355',
          700: '#152B48',
          800: '#10223A',
          900: '#0B192D',
        },
        accent: {
          amber: '#F59E0B',
          emerald: '#10B981',
          rose: '#EF4444',
          sky: '#0EA5E9',
          violet: '#8B5CF6',
        }
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
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

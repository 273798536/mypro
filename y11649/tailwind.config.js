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
        'snow-blue': {
          50: '#F5FAFF',
          100: '#E3F2FD',
          500: '#1E88E5',
          600: '#1976D2',
          700: '#1565C0',
        },
        'alert-red': {
          500: '#E53935',
          600: '#D32F2F',
        },
        'success-green': {
          500: '#43A047',
          600: '#388E3C',
        },
        'slope-green': '#81C784',
        'slope-blue': '#64B5F6',
        'slope-black': '#424242',
        'slope-double-black': '#212121',
      },
      fontFamily: {
        'display': ['Montserrat', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'snowfall': 'snowfall 10s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        snowfall: {
          '0%': { transform: 'translateY(-10px) translateX(0)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) translateX(20px)', opacity: '0.3' },
        },
      },
    },
  },
  plugins: [],
};

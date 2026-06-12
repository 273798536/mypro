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
        ocean: {
          50: '#E8F4F8',
          100: '#C5E1EC',
          200: '#8FC7DC',
          300: '#5AADCB',
          400: '#2E8FB4',
          500: '#1B6B8E',
          600: '#154E69',
          700: '#1B4965',
          800: '#0F2F44',
          900: '#0A1628',
          950: '#060E18',
        },
        cyan: {
          glow: '#00D4AA',
          deep: '#00A88A',
        },
        amber: {
          risk: '#FF9F1C',
        },
        crimson: {
          risk: '#E63946',
        }
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 212, 170, 0.3)',
        'glow-amber': '0 0 20px rgba(255, 159, 28, 0.3)',
        'glow-red': '0 0 20px rgba(230, 57, 70, 0.3)',
        'inner-ocean': 'inset 0 0 30px rgba(10, 22, 40, 0.5)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'drift': 'drift 20s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        drift: {
          '0%': { transform: 'translateX(0) translateY(0)' },
          '50%': { transform: 'translateX(20px) translateY(-10px)' },
          '100%': { transform: 'translateX(0) translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

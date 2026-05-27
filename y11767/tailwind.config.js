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
        'space': {
          950: '#0A1628',
          900: '#0F1F35',
          800: '#152A45',
          700: '#1E3A5F',
        },
        'cyber': {
          500: '#00D4FF',
          400: '#33DFFF',
          600: '#00A8CC',
        },
        'alert': {
          orange: '#FF6B35',
          green: '#00FF88',
          red: '#FF3333',
        }
      },
      fontFamily: {
        'display': ['Space Grotesk', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00D4FF, 0 0 10px #00D4FF' },
          '100%': { boxShadow: '0 0 10px #00D4FF, 0 0 20px #00D4FF, 0 0 30px #00D4FF' },
        }
      }
    },
  },
  plugins: [],
};

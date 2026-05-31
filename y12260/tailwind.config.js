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
        neon: {
          purple: '#a855f7',
          orange: '#f97316',
          green: '#22c55e',
          cyan: '#06b6d4',
          yellow: '#eab308',
          red: '#ef4444',
          pink: '#ec4899'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shake': 'shake 0.5s ease-in-out',
        'conflict-pulse': 'conflict-pulse 1.5s ease-in-out infinite'
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '100%': { boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor' }
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' }
        },
        'conflict-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.2)', opacity: '0.8' }
        }
      },
      boxShadow: {
        'neon-purple': '0 0 10px #a855f7, 0 0 20px #a855f7, 0 0 30px #a855f7',
        'neon-orange': '0 0 10px #f97316, 0 0 20px #f97316, 0 0 30px #f97316',
        'neon-green': '0 0 10px #22c55e, 0 0 20px #22c55e, 0 0 30px #22c55e',
        'neon-red': '0 0 10px #ef4444, 0 0 20px #ef4444, 0 0 30px #ef4444'
      }
    },
  },
  plugins: [],
};

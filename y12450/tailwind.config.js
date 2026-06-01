/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rail: {
          bg: '#1a1a2e',
          card: '#16213e',
          accent: '#0f3460',
          success: '#00d4aa',
          warning: '#ffd166',
          danger: '#ef476f',
          info: '#118ab2'
        }
      },
      animation: {
        'train-move': 'trainMove 2s ease-in-out',
        'pulse-glow': 'pulseGlow 2s infinite'
      },
      keyframes: {
        trainMove: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' }
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px currentColor' },
          '50%': { boxShadow: '0 0 20px currentColor' }
        }
      }
    },
  },
  plugins: [],
}

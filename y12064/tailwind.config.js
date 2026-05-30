/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-blue': '#0A1628',
        'electro-blue': '#00D4FF',
        'warning-orange': '#FF6B35',
        'success-green': '#00FF88',
        'error-red': '#FF3366',
      },
      fontFamily: {
        'orbitron': ['Orbitron', 'monospace'],
        'roboto-mono': ['Roboto Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'electric': 'electric 1.5s ease-in-out infinite',
        'trail': 'trail 0.5s ease-out forwards',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '50%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
        },
        'electric': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'trail': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.5)' },
        },
      },
    },
  },
  plugins: [],
}

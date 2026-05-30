/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lab-bg': '#0a1628',
        'lab-panel': '#132238',
        'lab-border': '#1e3a5f',
        'neon-green': '#39ff14',
        'neon-red': '#ff3b30',
        'neon-orange': '#ff9500',
        'neon-blue': '#00d4ff',
        'ore-gold': '#ffd700',
        'ore-copper': '#b87333',
        'ore-iron': '#a19d94',
      },
      fontFamily: {
        'pixel': ['"Press Start 2P"', 'cursive'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-red': 'pulse-red 1s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'glow': 'glow 2s ease-in-out infinite',
        'scanline': 'scanline 3s linear infinite',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 5px #ff3b30, 0 0 10px #ff3b30' },
          '50%': { boxShadow: '0 0 20px #ff3b30, 0 0 30px #ff3b30' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 5px #39ff14' },
          '50%': { boxShadow: '0 0 20px #39ff14, 0 0 30px #39ff14' },
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
}

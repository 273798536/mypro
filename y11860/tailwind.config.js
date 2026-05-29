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
        'space-bg': '#0a0e1a',
        'space-panel': 'rgba(15, 23, 42, 0.85)',
        'space-border': 'rgba(0, 240, 255, 0.3)',
        'neon-cyan': '#00f0ff',
        'neon-cyan-dim': 'rgba(0, 240, 255, 0.5)',
        'warning-orange': '#ff9500',
        'error-red': '#ff3b30',
        'singularity-purple': '#af52de',
        'success-green': '#34c759',
        'diff-added': '#30d158',
        'diff-removed': '#ff453a',
        'diff-changed': '#ffd60a',
      },
      fontFamily: {
        'display': ['Orbitron', 'monospace'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'blink': 'blink 1s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 240, 255, 0.5), 0 0 20px rgba(0, 240, 255, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.8), 0 0 40px rgba(0, 240, 255, 0.5)' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
    },
  },
  plugins: [],
};

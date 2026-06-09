/** @type {import('tailwindcss').Config} */

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'vent-deep': '#040810',
        'vent-dark': '#0A1628',
        'vent-orange': '#FF6B35',
        'vent-cyan': '#00D4AA',
        'vent-gold': '#FFD93D',
        'vent-red': '#FF4757',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(255,107,53,0.4)' },
          '50%': { boxShadow: '0 0 25px rgba(255,107,53,0.7)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};

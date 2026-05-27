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
          900: '#0a0e27',
          800: '#12183d',
          700: '#1a2255',
        },
        'neon': {
          cyan: '#00f5d4',
          purple: '#7b2cbf',
          pink: '#ff006e',
          yellow: '#ffbe0b',
        },
        'warning': {
          red: '#ff006e',
          orange: '#fb5607',
        },
        'success': {
          green: '#06d6a0',
        },
      },
      fontFamily: {
        'display': ['Orbitron', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.7', filter: 'brightness(1.3)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0, 245, 212, 0.5), 0 0 40px rgba(0, 245, 212, 0.3)',
        'neon-purple': '0 0 20px rgba(123, 44, 191, 0.5), 0 0 40px rgba(123, 44, 191, 0.3)',
        'neon-pink': '0 0 20px rgba(255, 0, 110, 0.5), 0 0 40px rgba(255, 0, 110, 0.3)',
        'neon-yellow': '0 0 20px rgba(255, 190, 11, 0.5), 0 0 40px rgba(255, 190, 11, 0.3)',
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(0, 245, 212, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 245, 212, 0.1) 1px, transparent 1px)",
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

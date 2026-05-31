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
        'defi-bg': '#0B1220',
        'defi-bg-light': '#121a2e',
        'defi-card': '#1a2540',
        'defi-border': '#2a3a5c',
        'defi-success': '#2EC4B6',
        'defi-warning': '#FF9F1C',
        'defi-danger': '#E63946',
        'defi-accent': '#00FF88',
        'defi-purple': '#9D4EDD',
        'defi-text': '#E8EDF5',
        'defi-text-muted': '#8892B0',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Noto Sans SC', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'ripple': 'ripple 0.6s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 255, 136, 0.6)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'ripple': {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      },
      boxShadow: {
        'glow-success': '0 0 20px rgba(46, 196, 182, 0.4)',
        'glow-warning': '0 0 20px rgba(255, 159, 28, 0.4)',
        'glow-danger': '0 0 20px rgba(230, 57, 70, 0.4)',
        'glow-accent': '0 0 20px rgba(0, 255, 136, 0.4)',
      },
    },
  },
  plugins: [],
};

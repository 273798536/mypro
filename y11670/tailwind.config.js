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
        'space-black': '#0a0a1a',
        'space-dark': '#0d0d20',
        'space-blue': '#1a1a3a',
        'neon-cyan': '#00f5ff',
        'neon-purple': '#9933ff',
        'neon-green': '#00ff88',
        'neon-red': '#ff3366',
        'neon-yellow': '#ffcc00',
        'glass-bg': 'rgba(10, 10, 26, 0.8)',
        'glass-border': 'rgba(0, 245, 255, 0.2)',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'monospace'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(0, 245, 255, 0.5), 0 0 20px rgba(0, 245, 255, 0.3)',
        'neon-purple': '0 0 10px rgba(153, 51, 255, 0.5), 0 0 20px rgba(153, 51, 255, 0.3)',
        'neon-red': '0 0 10px rgba(255, 51, 102, 0.5), 0 0 20px rgba(255, 51, 102, 0.3)',
        'neon-green': '0 0 10px rgba(0, 255, 136, 0.5), 0 0 20px rgba(0, 255, 136, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 245, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 245, 255, 0.8), 0 0 30px rgba(0, 245, 255, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};

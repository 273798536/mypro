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
        space: {
          950: '#050a14',
          900: '#0a1628',
          800: '#0f1f3a',
          700: '#1a2d50',
          600: '#2a3d66',
        },
        neon: {
          cyan: '#00f5ff',
          red: '#ff3366',
          green: '#00ff88',
          yellow: '#ffaa00',
          purple: '#aa66ff',
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(0, 245, 255, 0.5), 0 0 20px rgba(0, 245, 255, 0.3)',
        'neon-red': '0 0 10px rgba(255, 51, 102, 0.5), 0 0 20px rgba(255, 51, 102, 0.3)',
        'neon-green': '0 0 10px rgba(0, 255, 136, 0.5), 0 0 20px rgba(0, 255, 136, 0.3)',
        'neon-yellow': '0 0 10px rgba(255, 170, 0, 0.5), 0 0 20px rgba(255, 170, 0, 0.3)',
        'neon-purple': '0 0 10px rgba(170, 102, 255, 0.5), 0 0 20px rgba(170, 102, 255, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor' },
          '100%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
};

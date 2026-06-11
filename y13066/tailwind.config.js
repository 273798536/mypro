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
        'bg-deep': '#0a0e17',
        'bg-card': 'rgba(20, 28, 43, 0.7)',
        'bg-card-hover': 'rgba(30, 40, 60, 0.8)',
        'border-glow': 'rgba(0, 212, 255, 0.3)',
        'tech-blue': '#00d4ff',
        'tech-blue-dim': '#0099cc',
        'alert-red': '#ff4757',
        'alert-red-dim': '#c0392b',
        'success-green': '#2ed573',
        'warning-yellow': '#ffa502',
        'info-purple': '#a55eea',
        'text-primary': '#e8f0ff',
        'text-secondary': '#8892b0',
        'text-muted': '#5a6478',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(0, 212, 255, 0.3)',
        'glow-red': '0 0 15px rgba(255, 71, 87, 0.4)',
        'glow-yellow': '0 0 15px rgba(255, 165, 2, 0.4)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 71, 87, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(255, 71, 87, 0.8)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

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
        gacha: {
          bg: '#0a0e1a',
          card: '#111827',
          border: '#1e293b',
          gold: '#f5c542',
          purple: '#8b5cf6',
          ssr: '#f59e0b',
          sr: '#a855f7',
          r: '#3b82f6',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(245, 197, 66, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(245, 197, 66, 0.6)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'card-reveal': {
          '0%': { transform: 'scale(0.5) rotateY(180deg)', opacity: '0' },
          '60%': { transform: 'scale(1.1) rotateY(0deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotateY(0deg)', opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'card-reveal': 'card-reveal 0.6s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};

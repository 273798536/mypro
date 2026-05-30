/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#1a1a2e',
        surface: '#16213e',
        surfaceLight: '#0f3460',
        accent: '#00f5d4',
        warning: '#ff4757',
        rest: '#ffa502',
        early: '#3b82f6',
        late: '#f97316',
        perfect: '#22c55e',
        miss: '#ef4444',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 1.5s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0,245,212,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0,245,212,0.6)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

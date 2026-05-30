/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          900: '#0a0e1a',
          800: '#0f1629',
          700: '#1a2340',
          600: '#1e3a5f',
        },
        orbit: {
          gold: '#f0c040',
          goldDark: '#c89e30',
        },
        fuel: {
          green: '#22c55e',
          yellow: '#eab308',
          red: '#ef4444',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fuel-flash': 'fuelFlash 1s ease-in-out infinite',
      },
      keyframes: {
        fuelFlash: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
}

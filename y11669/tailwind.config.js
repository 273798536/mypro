/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dc-bg': '#0A1628',
        'dc-panel': 'rgba(15, 28, 50, 0.85)',
        'dc-primary': '#2196F3',
        'dc-success': '#4CAF50',
        'dc-warning': '#FF9800',
        'dc-danger': '#F44336',
        'dc-accent': '#00E5FF',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(33, 150, 243, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(33, 150, 243, 0.8)' },
        }
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lab-bg': '#0F172A',
        'lab-panel': '#1E293B',
        'lab-border': '#334155',
        'lab-accent': '#06B6D4',
        'lab-accent-dark': '#0891B2',
        'lab-warning': '#F59E0B',
        'lab-warning-dark': '#D97706',
        'lab-success': '#10B981',
        'lab-error': '#EF4444',
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
          '0%': { boxShadow: '0 0 5px #06B6D4, 0 0 10px #06B6D4' },
          '100%': { boxShadow: '0 0 10px #06B6D4, 0 0 20px #06B6D4, 0 0 30px #06B6D4' },
        }
      }
    },
  },
  plugins: [],
}

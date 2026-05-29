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
        'deep-space': '#0a0e1a',
        'deep-space-2': '#0f172a',
        'glass': 'rgba(15, 23, 42, 0.7)',
        'glass-border': 'rgba(148, 163, 184, 0.15)',
        'neon-blue': '#00d4ff',
        'neon-purple': '#a855f7',
        'neon-green': '#22c55e',
        'neon-orange': '#f97316',
        'neon-red': '#ef4444',
        'risk-low': '#22c55e',
        'risk-medium': '#eab308',
        'risk-high': '#ef4444',
        'risk-pending': '#f97316',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Space Mono"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 212, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.8)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

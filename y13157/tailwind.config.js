/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        industrial: {
          blue: '#1E40AF',
          'blue-dark': '#1E3A8A',
          orange: '#F97316',
          red: '#DC2626',
          green: '#16A34A',
          panel: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          text: '#E2E8F0',
          muted: '#94A3B8',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['"Source Han Sans CN"', '"PingFang SC"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'pulse-ring': {
          '0%, 100%': { 'box-shadow': '0 0 0 0 rgba(220,38,38,0.6)' },
          '50%': { 'box-shadow': '0 0 0 12px rgba(220,38,38,0)' },
        },
        'diff-highlight': {
          '0%, 100%': { 'background-color': 'rgba(249,115,22,0.15)' },
          '50%': { 'background-color': 'rgba(249,115,22,0.35)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'diff-highlight': 'diff-highlight 1.5s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.4s ease-out',
      },
      backgroundImage: {
        'grid-texture':
          "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
        'retract-stripe':
          'repeating-linear-gradient(45deg, rgba(220,38,38,0.1), rgba(220,38,38,0.1) 6px, transparent 6px, transparent 12px)',
      },
    },
  },
  plugins: [],
}

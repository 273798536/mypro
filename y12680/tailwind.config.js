/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'pocket-bg': '#0a0f1a',
        'pocket-card': '#111827',
        'pocket-border': '#1e293b',
        'pocket-text': '#e2e8f0',
        'pocket-muted': '#94a3b8',
        'pocket-accent': '#38bdf8',
        'pocket-green': '#22c55e',
        'pocket-yellow': '#eab308',
        'pocket-red': '#ef4444',
      },
      fontFamily: {
        sans: ['SF Mono', 'JetBrains Mono', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

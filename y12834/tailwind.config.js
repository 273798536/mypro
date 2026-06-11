/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-ocean': '#1e3a5f',
        'deep-ocean-light': '#2a4d7a',
        'deep-ocean-dark': '#152a45',
        'life-green': '#2d5a4a',
        'life-green-light': '#3d7a66',
        'amber-warn': '#d4a017',
        'amber-warn-light': '#e8b830',
        'corral-severe': '#c75b5b',
        'corral-severe-light': '#d97777',
        'paper': '#f8f6f1',
        'paper-dark': '#ece8df',
      },
      fontFamily: {
        'serif': ['"IBM Plex Serif"', 'Georgia', 'serif'],
        'sans': ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(30, 58, 95, 0.08)',
        'card': '0 4px 16px rgba(30, 58, 95, 0.1)',
        'lift': '0 6px 24px rgba(30, 58, 95, 0.12)',
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}

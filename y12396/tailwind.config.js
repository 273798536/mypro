/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        display: ['DM Sans', 'sans-serif'],
        body: ['Source Sans 3', 'sans-serif'],
      },
      colors: {
        'amber-primary': '#d97706',
        'amber-hover': '#f59e0b',
        'amber-dim': '#92400e',
        'dark-primary': '#0f0f0f',
        'dark-secondary': '#1a1a1a',
        'dark-tertiary': '#252525',
        'dark-card': '#1e1e1e',
        'dark-border': '#333333',
        'text-primary': '#f5f5f5',
        'text-secondary': '#a0a0a0',
        'text-muted': '#666666',
        'conflict-red': '#ef4444',
        'correction-green': '#22c55e',
        'pending-yellow': '#eab308',
      },
    },
  },
  plugins: [],
};

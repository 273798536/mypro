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
        bg: '#1a1f36',
        'bg-card': '#232946',
        'bg-hover': '#2d3561',
        accent: '#00d4aa',
        'accent-dim': '#00a888',
        warn: '#f59e0b',
        danger: '#ef4444',
        muted: '#8b95b0',
        'border-dim': '#2d3561',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

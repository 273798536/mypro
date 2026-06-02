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
        'ink-blue': {
          DEFAULT: '#1a1f36',
          light: '#232947',
          lighter: '#2d345a',
        },
        'amber-gold': {
          DEFAULT: '#d4a853',
          light: '#e0be7a',
        },
        'cool-gray': {
          DEFAULT: '#6b7280',
          light: '#9ca3af',
        },
        'emerald': {
          DEFAULT: '#10b981',
        },
        'coral': {
          DEFAULT: '#ef4444',
        },
        'bg-primary': '#0f1225',
        'bg-card': '#1e2340',
        'bg-card-hover': '#252b4a',
        'border-subtle': '#2d345a',
        'text-primary': '#f1f5f9',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
      },
      fontFamily: {
        'serif-sc': ['"Noto Serif SC"', 'serif'],
        'sans-sc': ['"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

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
        'space-deep': '#0f172a',
        'panel-blue': '#1e293b',
        'amber-warn': '#f59e0b',
        'cyan-glow': '#22d3ee',
        'green-ok': '#10b981',
        'red-reject': '#ef4444',
        'purple-merge': '#a855f7',
      },
      fontFamily: {
        mono: ['monospace'],
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.08)',
      },
      boxShadow: {
        'panel': '0 2px 8px rgba(0,0,0,0.3)',
      },
      borderRadius: {
        'sm': '2px',
      },
    },
  },
  plugins: [],
};

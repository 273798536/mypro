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
        orbitron: ['Orbitron', 'monospace'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
      colors: {
        quantum: {
          bg: '#0a0e1a',
          blue: '#00d4ff',
          green: '#00ff88',
          orange: '#ff6b35',
          red: '#ff2d55',
          purple: '#c084fc',
        },
      },
      animation: {
        'glow': 'glow-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

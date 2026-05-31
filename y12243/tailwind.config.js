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
        'space-panel': '#111827',
        'space-border': '#1e293b',
        'star-blue': '#4fc3f7',
        'engine-orange': '#ff6d00',
        'orbit-green': '#00e676',
        'warning-red': '#ff1744',
        'late-blue': '#42a5f5',
        'note-yellow': '#ffd600',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'monospace'],
        noto: ['Noto Sans SC', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'pulse-warning': 'pulse-warning 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

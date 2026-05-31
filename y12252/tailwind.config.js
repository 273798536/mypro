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
        court: {
          brown: '#2a1810',
          'brown-light': '#3d2b1f',
          'brown-dark': '#1a0f0a',
          gold: '#c9a84c',
          'gold-light': '#e8d48b',
          'gold-dim': '#8a7234',
          parchment: '#f5e6c8',
          border: '#5a3a28',
          'border-light': '#7a5a48',
          red: '#c0392b',
          green: '#27ae60',
          blue: '#2980b9',
          orange: '#e67e22',
          yellow: '#f39c12',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'stamp': 'stamp 0.5s ease-out',
        'gold-pulse': 'goldPulse 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
    },
  },
  plugins: [],
};

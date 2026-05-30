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
        orbitron: ['Orbitron', 'Courier New', 'monospace'],
      },
      colors: {
        nuclear: {
          dark: '#0a1420',
          panel: '#0f1a2e',
          card: '#1a2640',
          border: '#1e3050',
          accent: '#FF6B35',
          warning: '#FFD700',
          danger: '#E74C3C',
          safe: '#2ECC71',
        },
      },
    },
  },
  plugins: [],
};

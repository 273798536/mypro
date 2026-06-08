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
        primary: { DEFAULT: '#0B1F2A', 50:'#E6EEF3', 100:'#C8D6E5', 200:'#95B3CB', 500:'#2C5364', 700:'#1A3545', 900:'#0B1F2A' },
        accent: { orange:'#FF8A3D', green:'#2ECC71', red:'#E74C3C', yellow:'#F1C40F' },
        steel: { 100:'#C8D6E5', 300:'#6B7C8C', 500:'#3A4A5A', 700:'#22303C' }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace']
      },
      borderRadius: {
        md: '6px'
      }
    },
  },
  plugins: [],
};

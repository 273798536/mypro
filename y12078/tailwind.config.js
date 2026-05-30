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
        med: {
          blue: '#165DFF',
          'blue-light': '#4080FF',
          'blue-dim': '#0E42D2',
          dark: '#1D2129',
          'dark-2': '#2A2F3B',
          'dark-3': '#353B48',
          orange: '#FF7D00',
          purple: '#722ED1',
          red: '#F53F3F',
          green: '#00B42A',
          'green-dim': '#0FC16E',
          text: '#C9CDD4',
          'text-dim': '#86909C',
          border: '#3D4350',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

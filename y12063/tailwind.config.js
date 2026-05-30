/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: '#1a2332',
        'midnight-light': '#243044',
        'midnight-lighter': '#2d3d56',
        amber: '#d4a853',
        'amber-dark': '#b8922f',
        'amber-light': '#e8c97a',
        emerald: '#10b981',
        coral: '#ef4444',
        'coral-dark': '#dc2626',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

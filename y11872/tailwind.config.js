/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theater: {
          dark: '#1a1a2e',
          darker: '#0f0f1a',
          red: '#e94560',
          gold: '#d4af37',
          success: '#2ecc71',
          warning: '#f39c12',
          error: '#e74c3c',
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        mono: ['Source Code Pro', 'monospace'],
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'industrial': {
          'blue': '#165DFF',
          'green': '#00B42A',
          'yellow': '#FF7D00',
          'red': '#F53F3F',
          'dark': '#1D2129',
          'darker': '#0F1218',
          'gray': '#4E5969',
          'light': '#C9CDD4',
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1s ease-in-out infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        }
      }
    },
  },
  plugins: [],
}


/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#1e3a5f',
          DEFAULT: '#2563eb',
          light: '#00d4aa'
        },
        accent: {
          error: '#ff6b35',
          success: '#2ecc71',
          warning: '#f39c12'
        }
      },
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        mono: ['JetBrains Mono', 'monospace']
      },
      animation: {
        'pulse-border': 'pulse-border 2s ease-in-out infinite',
        'glow': 'glow 1.5s ease-in-out infinite alternate'
      },
      keyframes: {
        'pulse-border': {
          '0%, 100%': { borderColor: 'rgba(255, 107, 53, 0.4)' },
          '50%': { borderColor: 'rgba(255, 107, 53, 1)' }
        },
        'glow': {
          '0%': { boxShadow: '0 0 5px rgba(0, 212, 170, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 212, 170, 0.8)' }
        }
      }
    },
  },
  plugins: [],
}

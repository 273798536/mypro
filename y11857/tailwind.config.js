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
          50: '#e6edf7',
          100: '#c1d1e9',
          200: '#98b3da',
          300: '#6e95cb',
          400: '#4f7ebf',
          500: '#2f67b3',
          600: '#2a5ea8',
          700: '#235299',
          800: '#1d468a',
          900: '#0F2B5B',
        },
        accent: {
          warning: '#E63946',
          success: '#2A9D8F',
          info: '#457B9D',
        }
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(230, 57, 70, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(230, 57, 70, 0.8)' },
        }
      }
    },
  },
  plugins: [],
}

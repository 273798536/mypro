/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          900: '#0F2540',
          800: '#1B3A5C',
          700: '#2A4F78',
          600: '#3D6899',
        },
        warning: {
          500: '#FF6B35',
          400: '#FF8A5E',
        },
        status: {
          green: '#2EC4B6',
          red: '#E63946',
          yellow: '#FFB627',
        },
        grid: {
          line: '#1E3A5F',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Space Mono"', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(30, 58, 95, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 58, 95, 0.3) 1px, transparent 1px)",
        'error-stripe': "repeating-linear-gradient(45deg, rgba(230, 57, 70, 0.15), rgba(230, 57, 70, 0.15) 10px, rgba(230, 57, 70, 0.05) 10px, rgba(230, 57, 70, 0.05) 20px)",
      },
      backgroundSize: {
        'grid': '20px 20px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}

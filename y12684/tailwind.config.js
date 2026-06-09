/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#FBF5EE',
          100: '#F5E6D3',
          200: '#E8CCAE',
          300: '#D9A978',
          400: '#C2956E',
          500: '#A87C4A',
          600: '#8B6239',
          700: '#78350F',
          800: '#5C2A0B',
          900: '#3D1B07'
        },
        amber: {
          DEFAULT: '#D97706'
        }
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        'md': '8px'
      },
      boxShadow: {
        'card': '0 2px 8px rgba(120, 53, 15, 0.15)',
        'hover': '0 4px 12px rgba(120, 53, 15, 0.25)'
      }
    }
  },
  plugins: []
};

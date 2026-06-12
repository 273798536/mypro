/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-sea': {
          50: '#E6F0FA',
          100: '#CCE1F5',
          200: '#99C3EB',
          300: '#66A5E1',
          400: '#3387D7',
          500: '#0F2B4A',
          600: '#0C233B',
          700: '#091B2C',
          800: '#06121E',
          900: '#03090F',
        },
        'ocean': {
          50: '#E6F4F8',
          100: '#CCE9F1',
          200: '#99D3E3',
          300: '#66BDD5',
          400: '#33A7C7',
          500: '#1E4A7E',
          600: '#183B65',
          700: '#122C4C',
          800: '#0C1E32',
          900: '#060F19',
        },
        'alert': {
          orange: '#FF7A45',
          red: '#EF4444',
          yellow: '#EAB308',
          green: '#22C55E',
          cyan: '#06B6D4',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}

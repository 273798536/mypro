/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary': '#1e3a5f',
        'primary-light': '#2c5282',
        'primary-dark': '#152a45',
        'warning': '#ff6b35',
        'warning-light': '#ff8c5e',
        'info-bg': '#e8f4f8',
        'text-dark': '#333333',
        'text-gray': '#6b7280',
        'border-light': '#e5e7eb'
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};

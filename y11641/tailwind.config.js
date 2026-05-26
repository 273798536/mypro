/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        medical: {
          primary: '#1565C0',
          secondary: '#1976D2',
          light: '#64B5F6',
          dark: '#0D47A1',
        },
        alert: {
          danger: '#E53935',
          warning: '#FB8C00',
          success: '#43A047',
          info: '#039BE5',
        },
        dark: {
          bg: '#1A1A2E',
          card: '#16213E',
          border: '#2A3A5C',
        }
      },
      fontFamily: {
        sans: ['"Source Han Sans CN"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

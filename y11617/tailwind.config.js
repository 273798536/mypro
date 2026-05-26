/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1a365d',
          secondary: '#2d3748',
        },
        stress: {
          safe: '#38a169',
          warning: '#d69e2e',
          danger: '#e53e3e',
        },
        type: {
          salary: '#805ad5',
          rent: '#dd6b20',
          loan: '#3182ce',
          receivable: '#38a169',
          tax: '#d53f8c',
          other: '#718096',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
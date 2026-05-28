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
          DEFAULT: '#1B2A4A',
          light: '#2D3F66',
          dark: '#0F1A2E',
        },
        accent: {
          amber: '#E8A838',
          emerald: '#2ECC71',
          danger: '#E74C3C',
        },
        neutral: {
          bg: '#F4F6F9',
          card: '#FFFFFF',
          text: '#334155',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['"Source Han Sans"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        cardHover: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}

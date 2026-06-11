/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        brand: {
          50: '#eef3f9',
          100: '#d5e1ee',
          200: '#acc9de',
          300: '#77a7c7',
          400: '#4a83ac',
          500: '#2d6691',
          600: '#1e3a5f',
          700: '#18304f',
          800: '#142740',
          900: '#0f1d30',
        },
        status: {
          normal: '#16a34a',
          pending: '#f59e0b',
          anomaly: '#dc2626',
          dismissed: '#6b7280',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(30,58,95,0.06)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { 'box-shadow': '0 0 0 0 rgba(220,38,38,0.4)' },
          '70%': { 'box-shadow': '0 0 0 8px rgba(220,38,38,0)' },
          '100%': { 'box-shadow': '0 0 0 0 rgba(220,38,38,0)' },
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out',
        'pulse-ring': 'pulse-ring 1.6s cubic-bezier(0.24, 0, 0.38, 1) infinite',
      }
    },
  },
  plugins: [],
};

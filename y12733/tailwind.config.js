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
        ink: {
          50: '#f4f6fb',
          100: '#e5eaf4',
          200: '#c5d1e4',
          300: '#95a9c8',
          400: '#5d79a3',
          500: '#3b5781',
          600: '#2a4266',
          700: '#1e3a5f',
          800: '#182f4c',
          900: '#14263f',
          950: '#0c1829',
        },
        status: {
          available: '#059669',
          pending: '#d97706',
          recollect: '#be123c',
          review: '#6d28d9',
        },
      },
      fontFamily: {
        serif: ['"Source Serif Pro"', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,38,63,0.04), 0 8px 24px -12px rgba(20,38,63,0.15)',
        cardHover: '0 2px 4px rgba(20,38,63,0.06), 0 16px 36px -12px rgba(20,38,63,0.25)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};

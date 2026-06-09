/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        serif: [
          '"Source Serif Pro"',
          '"Noto Serif SC"',
          'Georgia',
          'serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
        sans: [
          '"IBM Plex Sans"',
          '"Noto Sans SC"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      colors: {
        navy: {
          50: '#f0f4f9',
          100: '#d6e0ee',
          200: '#a7bcdb',
          300: '#7293c0',
          400: '#4a6ea2',
          500: '#2d5082',
          600: '#1e3a5f',
          700: '#173252',
          800: '#12283f',
          900: '#0f2138',
          950: '#081220',
        },
        amber: {
          500: '#d4a24c',
          600: '#b8873a',
        },
        emerald: {
          500: '#2d936c',
          400: '#5eb897',
        },
        sky: {
          500: '#4a8ec2',
        },
        coral: {
          500: '#c85353',
        },
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'grow-bar': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--target-width)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'grow-bar': 'grow-bar 0.6s ease-out forwards',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

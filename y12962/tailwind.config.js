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
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          950: '#0a0c10',
          900: '#111419',
          850: '#161a21',
          800: '#1c2129',
          700: '#272e38',
          600: '#3a4250',
          500: '#5b6573',
          400: '#8b94a3',
          300: '#b8c0cc',
        },
        signal: {
          amber: '#f5b342',
          rose: '#f5556a',
          emerald: '#3ed598',
          sky: '#4aa8ff',
          violet: '#9a8cff',
        },
      },
      boxShadow: {
        'glow-amber': '0 0 0 1px rgba(245,179,66,0.35), 0 0 24px -8px rgba(245,179,66,0.45)',
        'glow-rose': '0 0 0 1px rgba(245,85,106,0.35), 0 0 24px -8px rgba(245,85,106,0.45)',
      },
      keyframes: {
        'pulse-bar': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-bar': 'pulse-bar 2.4s ease-in-out infinite',
        'fade-up': 'fade-up 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./shared/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        lab: {
          900: '#0f2744',
          800: '#1e3a5f',
          700: '#2563eb',
          confirm: '#059669',
          warn: '#d97706',
          danger: '#dc2626',
          supplement: '#7c3aed',
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        flashYellow: {
          '0%': { backgroundColor: 'rgb(254 240 138)' },
          '50%': { backgroundColor: 'rgb(253 224 71)' },
          '100%': { backgroundColor: 'rgb(254 249 195)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        countUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.3)' },
        },
        watermarkRotate: {
          '0%': { transform: 'rotate(-45deg)' },
          '100%': { transform: 'rotate(315deg)' },
        },
      },
      animation: {
        flashYellow: 'flashYellow 1.5s ease-out forwards',
        slideIn: 'slideIn 0.4s ease-out forwards',
        countUp: 'countUp 0.6s ease-out forwards',
        pulseDot: 'pulseDot 2s ease-in-out infinite',
        watermarkRotate: 'watermarkRotate 60s linear infinite',
      },
    },
  },
  plugins: [],
};

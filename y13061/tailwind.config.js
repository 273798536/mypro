/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0a0e13',
          800: '#0f1419',
          700: '#1a2230',
          600: '#2a3546',
          500: '#3d4a60',
        },
        tealx: '#2dd4bf',
        amberx: '#f59e0b',
        redx: '#ef4444',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(45, 212, 191, 0.25)',
        'glow-amber': '0 0 24px rgba(245, 158, 11, 0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

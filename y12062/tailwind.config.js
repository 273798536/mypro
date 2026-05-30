/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-sea': '#0A1628',
        'deep-sea-light': '#0F2140',
        'sonar-green': '#00FF88',
        'sonar-green-dim': '#00CC6A',
        'warn-orange': '#FF6B35',
        'danger-red': '#FF3355',
        'echo-cyan': '#00D4FF',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Noto Sans SC', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'wave-spread': 'wave-spread 2s ease-out forwards',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        'wave-spread': {
          '0%': { transform: 'scale(0.1)', opacity: '1' },
          '100%': { transform: 'scale(3)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

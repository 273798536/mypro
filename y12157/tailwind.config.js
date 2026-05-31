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
        dark: {
          900: '#0a0a1a',
          800: '#0d0d1a',
          700: '#12122a',
          600: '#1a1a2e',
          500: '#2d2d44',
          400: '#3d3d54',
        },
        neon: {
          DEFAULT: '#00ff88',
          dim: '#00cc6a',
          glow: 'rgba(0, 255, 136, 0.3)',
        },
        amber: {
          DEFAULT: '#ffb347',
          dim: '#cc8f39',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Noto Sans SC', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

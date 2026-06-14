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
        base: {
          900: '#1a1a2e',
          800: '#22223b',
          700: '#2b2d42',
          600: '#3d3f5c',
          500: '#555770',
        },
        industrial: {
          blue: '#0f3460',
          'blue-light': '#1a4a8a',
          'blue-dim': '#0a2540',
        },
        warn: {
          orange: '#e94560',
          'orange-light': '#ff6b81',
        },
        status: {
          smooth: '#4a6fa5',
          supplementary: '#f5c542',
          anomalous: '#e94560',
          late: '#7b2d8e',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

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
        'deep-space': '#0B1D3A',
        'deep-space-50': '#E6EBF3',
        'deep-space-100': '#C2CEE3',
        'deep-space-200': '#99ACCE',
        'deep-space-300': '#6F8AB8',
        'deep-space-400': '#4F6FA7',
        'deep-space-500': '#2F5496',
        'deep-space-600': '#20417A',
        'deep-space-700': '#162F5C',
        'deep-space-800': '#0F2346',
        'deep-space-900': '#0B1D3A',
        'ice-blue': '#4FC3F7',
        'ice-blue-hover': '#29B6F6',
        'amber-warn': '#FFB74D',
        'green-pass': '#66BB6A',
        'red-reject': '#EF5350',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-ice': '0 0 12px rgba(79, 195, 247, 0.4)',
        'glow-amber': '0 0 10px rgba(255, 183, 77, 0.35)',
      },
    },
  },
  plugins: [],
};

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
        'deep-ocean': '#1e3a5f',
        'deep-ocean-light': '#2c5282',
        'deep-ocean-dark': '#152a45',
        'tundra-green': '#3d8b6b',
        'tundra-green-light': '#52a884',
        'tundra-green-dark': '#2e6a50',
        'amber-warning': '#e07b39',
        'amber-light': '#eba979',
        'moon-gray': '#f4f6f8',
        'moon-gray-dark': '#e2e8f0',
        'slate-panel': '#f8fafc',
      },
      fontFamily: {
        'serif-cn': ['"Source Han Serif CN"', '"Noto Serif SC"', 'SimSun', 'serif'],
        'mono-data': ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'card': '2px 2px 0 rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
        'card-hover': '4px 4px 0 rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.08)',
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-highlight': 'flash-highlight 2s ease-out forwards',
        'number-count': 'number-count 800ms ease-out',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        'flash-highlight': {
          '0%': { backgroundColor: 'rgba(59, 130, 246, 0.35)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
    },
  },
  plugins: [],
};

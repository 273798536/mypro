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
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      colors: {
        panel: {
          bg: '#0a0a0b',
          surface: '#141416',
          border: '#27272a',
          hover: '#1c1c1f',
        },
        accent: {
          amber: '#f59e0b',
          cyan: '#22d3ee',
          rose: '#f43f5e',
          lime: '#a3e635',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'border-flash': 'borderFlash 1.5s ease-in-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        borderFlash: {
          '0%, 100%': { borderColor: 'transparent' },
          '50%': { borderColor: '#f59e0b' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

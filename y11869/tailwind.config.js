/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        yard: {
          dark: '#0A2463',
          darker: '#051438',
          light: '#1E3A8A',
        },
        accent: {
          red: '#E63946',
          orange: '#FF9F1C',
          green: '#2EC4B6',
          blue: '#457B9D',
        },
        neutral: {
          light: '#F1FAEE',
          gray: '#A8DADC',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Noto Sans SC', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor' },
          '100%': { boxShadow: '0 0 20px currentColor' },
        }
      }
    },
  },
  plugins: [],
};

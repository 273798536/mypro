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
        sonar: {
          dark: '#0a2463',
          blue: '#1e3a5f',
          green: '#3e885b',
          warning: '#f9c74f',
          danger: '#e63946',
          cyan: '#00d4ff'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(62, 136, 91, 0.5)',
        'glow-cyan': '0 0 20px rgba(0, 212, 255, 0.5)',
        'glow-red': '0 0 20px rgba(230, 57, 70, 0.5)',
      }
    },
  },
  plugins: [],
};

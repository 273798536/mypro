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
        'space-black': '#0a0a1a',
        'space-blue': '#1a1a3a',
        'gravity-orange': '#ff6b35',
        'ray-cyan': '#00d4ff',
        'alert-red': '#ff4757',
        'success-green': '#2ed573',
        'warning-yellow': '#ffa502',
      },
      fontFamily: {
        'display': ['Orbitron', 'sans-serif'],
        'mono': ['Roboto Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 107, 53, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(255, 107, 53, 0.8)' },
        }
      }
    },
  },
  plugins: [],
};

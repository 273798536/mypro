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
        'deep-sea': '#0B2545',
        'sea-mist': '#EEF4ED',
        'alert-orange': '#F46036',
        'wake-teal': '#1B998B',
        'ocean-slate': '#13315C',
        'warning-amber': '#E2B03A',
      },
      fontFamily: {
        'engineering': ['"Chakra Petch"', 'monospace'],
        'body': ['"Noto Sans SC"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink-border': 'blinkBorder 1.5s ease-in-out infinite',
      },
      keyframes: {
        blinkBorder: {
          '0%, 100%': { boxShadow: '0 0 0 2px rgba(244, 96, 54, 0.8), 0 0 20px rgba(244, 96, 54, 0.4)' },
          '50%': { boxShadow: '0 0 0 2px rgba(244, 96, 54, 0.3), 0 0 5px rgba(244, 96, 54, 0.1)' },
        },
      },
    },
  },
  plugins: [],
};

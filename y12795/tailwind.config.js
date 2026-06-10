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
        lab: {
          navy: '#1e3a5f',
          navyLight: '#2d5080',
          amber: '#d4a038',
          amberLight: '#e8bc5c',
          green: '#2d5a3d',
          greenLight: '#3f7a54',
          red: '#a0342b',
          redLight: '#c44a3f',
          cream: '#fdf8e8',
          paper: '#f5f5f2',
          ink: '#2a2a2a',
          line: '#d4d4cc',
        }
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in-stagger': 'fadeIn 0.5s ease-out forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};

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
        deep: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc6fb',
          400: '#36a6f5',
          500: '#0c89e0',
          600: '#006dbc',
          700: '#015899',
          800: '#064b7e',
          900: '#0C2D48',
          950: '#081f33',
        },
        tide: {
          50: '#ecfffa',
          100: '#d2fff3',
          200: '#a8ffe8',
          300: '#6bfdd8',
          400: '#28f0c2',
          500: '#2EC4B6',
          600: '#16a095',
          700: '#137f77',
          800: '#156560',
          900: '#16534f',
          950: '#07302e',
        },
        coral: {
          50: '#fef4ee',
          100: '#ffe5d5',
          200: '#ffc5a9',
          300: '#ff9c70',
          400: '#ff6336',
          500: '#E76F51',
          600: '#d85835',
          700: '#b44529',
          800: '#903927',
          900: '#743225',
          950: '#3f170f',
        },
        sand: {
          50: '#faf8f4',
          100: '#f2ede2',
          200: '#e4d9c5',
          300: '#d4c1a0',
          400: '#c2a47a',
          500: '#b58e60',
          600: '#a87b53',
          700: '#8c6346',
          800: '#73523e',
          900: '#5f4536',
          950: '#32231b',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        display: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(46, 196, 182, 0.25)',
        'glow-coral': '0 0 20px rgba(231, 111, 81, 0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ripple': 'ripple 2s linear infinite',
      },
      keyframes: {
        ripple: {
          '0%': { boxShadow: '0 0 0 0 rgba(46, 196, 182, 0.4)' },
          '100%': { boxShadow: '0 0 0 12px rgba(46, 196, 182, 0)' },
        }
      },
    },
  },
  plugins: [],
};

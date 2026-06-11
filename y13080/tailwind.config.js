/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'wharf': {
          '50': '#E8F1FB',
          '100': '#C8DDF4',
          '200': '#8FB9E8',
          '300': '#5C97DC',
          '400': '#2F78CF',
          '500': '#0F5DB7',
          '600': '#0B4A92',
          '700': '#08386E',
          '800': '#0F2A4A',
          '900': '#0A1D36',
          '950': '#061226',
        },
        'danger': {
          '50': '#FFF2E8',
          '100': '#FFDFC8',
          '200': '#FFBD91',
          '300': '#FF9C5A',
          '400': '#FF7A29',
          '500': '#F2600D',
          '600': '#C44D0A',
          '700': '#963A07',
          '800': '#682805',
          '900': '#3A1603',
        },
        'steel': {
          '50': '#F4F6F8',
          '100': '#E3E8ED',
          '200': '#C8D1DB',
          '300': '#9FADC0',
          '400': '#6F829A',
          '500': '#4A5568',
          '600': '#3D4657',
          '700': '#303744',
          '800': '#242932',
          '900': '#181C22',
        },
      },
      fontFamily: {
        mono: ['"B612 Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '100%': { boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};

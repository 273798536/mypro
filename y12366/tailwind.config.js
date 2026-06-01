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
        steel: {
          900: '#1B2838',
          800: '#253547',
          700: '#2F4359',
          600: '#3A526B',
          500: '#4A6580',
        },
        warn: '#E8722A',
        signal: '#3DDC84',
        saturated: '#FF4444',
        photo: '#FFD600',
        displacement: '#4FC3F7',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

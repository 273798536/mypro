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
        milk: {
          50: '#FFF8F0',
          100: '#FFF0DE',
          200: '#FFE0BC',
          300: '#FFD09A',
          400: '#C8956C',
          500: '#B07D54',
          600: '#8B5E3C',
          700: '#5D3A1A',
          800: '#3D2510',
          900: '#1E1208',
        },
        window: {
          idle: '#6BCB77',
          serving: '#FF9F45',
          disabled: '#FF6B6B',
        },
        anomaly: '#9B59B6',
      },
      fontFamily: {
        display: ['"ZCOOL XiaoWei"', 'serif'],
        body: ['"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

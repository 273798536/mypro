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
        space: {
          50: "#E8EEF7",
          100: "#C5D3E8",
          200: "#9CB3D6",
          300: "#6E8BBF",
          400: "#4A68A3",
          500: "#2F4A80",
          600: "#1E335C",
          700: "#132445",
          800: "#0A1628",
          900: "#050B14",
          950: "#020509",
        },
        gold: {
          50: "#FBF6E4",
          100: "#F4E9B8",
          200: "#EDDB8A",
          300: "#E6CD5C",
          400: "#DEC13B",
          500: "#D4AF37",
          600: "#B8922B",
          700: "#967321",
          800: "#745618",
          900: "#543D10",
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'starfield': 'radial-gradient(ellipse at top, rgba(47, 74, 128, 0.3) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(212, 175, 55, 0.1) 0%, transparent 50%)',
        'gold-glow': 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'gold': '0 0 20px rgba(212, 175, 55, 0.2)',
        'gold-lg': '0 0 40px rgba(212, 175, 55, 0.3)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};

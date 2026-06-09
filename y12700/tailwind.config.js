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
        ink: {
          50:  "#F6F7FB",
          100: "#E8ECF5",
          200: "#CDD4E6",
          300: "#9AA6C4",
          400: "#627297",
          500: "#3C4A6E",
          600: "#2A3658",
          700: "#1C2644",
          800: "#0F2547",
          900: "#08142E",
          950: "#050B1C",
        },
        amber: {
          50:  "#FFF8EC",
          100: "#FEEFCB",
          200: "#FBD88A",
          300: "#F7BF4A",
          400: "#EDA417",
          500: "#D97706",
          600: "#B45309",
          700: "#92400E",
        },
        forest: {
          50:  "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#059669",
          600: "#047857",
          700: "#065F46",
        },
        rose: {
          50:  "#FFF1F2",
          100: "#FFE4E6",
          200: "#FECDD3",
          300: "#FDA4AF",
          400: "#FB7185",
          500: "#E11D48",
          600: "#BE123C",
        },
        gold: {
          400: "#E8C46A",
          500: "#C9A13A",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        mono:  ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans:  ['"PingFang SC"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card':   '0 2px 10px rgba(15, 37, 71, 0.08), 0 1px 3px rgba(15, 37, 71, 0.04)',
        'card-h': '0 8px 28px rgba(15, 37, 71, 0.14), 0 2px 8px rgba(15, 37, 71, 0.06)',
        'glow-a': '0 0 0 1px rgba(217, 119, 6, 0.25), 0 4px 16px rgba(217, 119, 6, 0.18)',
        'glow-g': '0 0 0 1px rgba(5, 150, 105, 0.25), 0 4px 16px rgba(5, 150, 105, 0.18)',
        'glow-r': '0 0 0 1px rgba(225, 29, 72, 0.25), 0 4px 16px rgba(225, 29, 72, 0.18)',
      },
      backgroundImage: {
        'grid-faint':
          "linear-gradient(rgba(15,37,71,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,37,71,0.04) 1px, transparent 1px)",
        'noise':
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.06  0 0 0 0 0.15  0 0 0 0 0.28  0 0 0 0.05 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.55' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up':    'fade-up 0.45s ease-out both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'shimmer':    'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
};

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
        surface: {
          950: "#0A1320",
          900: "#0F1B2D",
          800: "#172538",
          700: "#1E3148",
          600: "#2A4260",
        },
        accent: {
          amber: "#F59E0B",
          emerald: "#10B981",
          indigo: "#6366F1",
          rose: "#F43F5E",
          sky: "#38BDF8",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        sans: ['"Noto Sans SC"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 12px rgba(99, 102, 241, 0.25)",
        card: "0 1px 2px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04) inset",
      },
      backgroundImage: {
        "noise": "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      },
    },
  },
  plugins: [],
};

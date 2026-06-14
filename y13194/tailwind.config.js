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
        deepspace: {
          950: "#050A14",
          900: "#0A1628",
          800: "#0F1F38",
          700: "#152A47",
          600: "#1E3A5C",
        },
        cyber: {
          50: "#E6FFFA",
          100: "#B3F0E5",
          400: "#00E5B8",
          500: "#00D4AA",
          600: "#00B894",
          700: "#009678",
        },
        alert: {
          400: "#FF6B7A",
          500: "#FF4757",
          600: "#E63E4C",
          700: "#CC3542",
        },
        amberx: {
          400: "#FFB733",
          500: "#FFA502",
          600: "#E69400",
        },
        aurora: {
          400: "#A855F7",
          500: "#7B2CBF",
          600: "#5E2399",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        "glow-cyber": "0 0 16px rgba(0,212,170,0.35)",
        "glow-alert": "0 0 16px rgba(255,71,87,0.35)",
        "glow-amber": "0 0 12px rgba(255,165,2,0.3)",
        "inner-deep": "inset 0 1px 0 rgba(255,255,255,0.04)",
      },
      backgroundImage: {
        "grid-deep":
          "linear-gradient(rgba(0,212,170,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.04) 1px, transparent 1px)",
        "grain":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        pulseglow: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(255,71,87,0.5)" },
          "50%": { boxShadow: "0 0 0 8px rgba(255,71,87,0)" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        pulseglow: "pulseglow 2s ease-in-out infinite",
        floaty: "floaty 3s ease-in-out infinite",
        scanline: "scanline 6s linear infinite",
      },
      backgroundSize: {
        grid: "28px 28px",
      },
    },
  },
  plugins: [],
};

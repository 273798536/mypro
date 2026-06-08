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
          950: "#061225",
          900: "#0B1D3A",
          800: "#122B55",
          700: "#1A3872",
        },
        lime: {
          400: "#7CFFB2",
          500: "#4AE593",
        },
        alert: {
          400: "#FF8A3D",
          500: "#FF6B1A",
        },
        cool: {
          400: "#5B9DFF",
          500: "#3D7EEB",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Noto Sans SC'", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(124, 255, 178, 0.35)",
        "glow-alert": "0 0 20px rgba(255, 138, 61, 0.55)",
        "glow-cool": "0 0 18px rgba(91, 157, 255, 0.45)",
      },
      backgroundImage: {
        "grid-deep":
          "radial-gradient(ellipse at top, rgba(91,157,255,0.12) 0%, transparent 60%), linear-gradient(180deg, #061225 0%, #0B1D3A 100%)",
      },
      animation: {
        breathe: "breathe 2.4s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
      keyframes: {
        breathe: {
          "0%,100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
    },
  },
  plugins: [],
};

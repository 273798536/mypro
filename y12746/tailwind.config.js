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
          50: "#F4F7FB",
          100: "#E3EAF3",
          200: "#C5D3E4",
          300: "#98B1CC",
          400: "#6386AD",
          500: "#3F6189",
          600: "#2C486B",
          700: "#1E3654",
          800: "#0F2743",
          900: "#081527",
        },
        amber: {
          50: "#FBF5E7",
          100: "#F3E3B8",
          200: "#EAD088",
          300: "#E0BC58",
          400: "#D4A24C",
          500: "#B98A3A",
          600: "#936B2B",
          700: "#6D4F1F",
        },
        mist: {
          50: "#EEF6F6",
          100: "#D2E6E6",
          200: "#A7CECE",
          300: "#7BB5B5",
          400: "#4A8B8B",
          500: "#386F6F",
          600: "#2A5555",
          700: "#1E3D3D",
        },
        brick: {
          50: "#FBEEEB",
          100: "#F1CCC3",
          200: "#E4A093",
          300: "#D57361",
          400: "#C14B3C",
          500: "#A03B2E",
          600: "#7B2C22",
          700: "#561E17",
        },
        sand: {
          50: "#FBF6E4",
          100: "#F2E7BE",
          200: "#E8D8A8",
          300: "#DDC789",
          400: "#CFB264",
          500: "#AE9446",
        },
        paper: "#F7F3EC",
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: "0 2px 8px rgba(15, 39, 67, 0.08), 0 1px 2px rgba(15, 39, 67, 0.04)",
        cardHover: "0 8px 24px rgba(15, 39, 67, 0.14), 0 2px 6px rgba(15, 39, 67, 0.06)",
        inset: "inset 0 1px 0 rgba(15, 39, 67, 0.06)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        breathe: {
          "0%, 100%": { backgroundColor: "rgba(212, 162, 76, 0.08)" },
          "50%": { backgroundColor: "rgba(212, 162, 76, 0.35)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.5s ease-out both",
        breathe: "breathe 1.2s ease-in-out 2",
      },
    },
  },
  plugins: [],
};

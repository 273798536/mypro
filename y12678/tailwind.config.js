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
        ocean: {
          50: "#E6F0FA",
          100: "#C2D9F0",
          200: "#8FB8E0",
          300: "#5C97D1",
          400: "#2A76C1",
          500: "#0B3D91",
          600: "#09337A",
          700: "#072963",
          800: "#051F4C",
          900: "#031535",
        },
        seaweed: {
          50: "#E4F7F6",
          100: "#B8ECE8",
          200: "#8CDDD7",
          300: "#60CEC6",
          400: "#34BFB5",
          500: "#20B2AA",
          600: "#1A928B",
          700: "#13716C",
          800: "#0D514E",
          900: "#06302F",
        },
        coral: {
          50: "#FFEAEA",
          100: "#FFD0D0",
          200: "#FFA5A5",
          300: "#FF7B7B",
          400: "#FF6B6B",
          500: "#E85555",
          600: "#C74444",
          700: "#A63333",
          800: "#852222",
          900: "#641111",
        },
        amber: {
          50: "#FFF5E6",
          100: "#FFE7BF",
          200: "#FFD999",
          300: "#FFCB72",
          400: "#FFBD4C",
          500: "#FFB347",
          600: "#E69E33",
          700: "#CC8A1F",
          800: "#B3750B",
          900: "#8A5B00",
        },
        lavender: {
          50: "#F3EEFB",
          100: "#E3D8F5",
          200: "#C8B5EC",
          300: "#AE92E2",
          400: "#9B7ED8",
          500: "#8266BF",
          600: "#694F9A",
          700: "#503876",
          800: "#372151",
          900: "#1E0A2D",
        },
      },
      fontFamily: {
        song: ['"Noto Serif SC"', '"Source Han Serif SC"', '"SimSun"', "serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      boxShadow: {
        card: "0 2px 8px 0 rgba(11, 61, 145, 0.08), 0 1px 2px 0 rgba(11, 61, 145, 0.04)",
        "card-hover": "0 8px 24px 0 rgba(11, 61, 145, 0.12), 0 2px 6px 0 rgba(11, 61, 145, 0.08)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in-up": "fadeInUp 0.5s ease-out forwards",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

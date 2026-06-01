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
        primary: {
          50: "#E8F3FF",
          100: "#BEDAFF",
          200: "#94BDFF",
          300: "#6AA1FF",
          400: "#4085FF",
          500: "#165DFF",
          600: "#0E42D2",
          700: "#0A2BA0",
          800: "#061A6E",
          900: "#030D3C",
        },
        warning: {
          50: "#FFF3E8",
          100: "#FFDBB8",
          200: "#FFC188",
          300: "#FFA758",
          400: "#FF8D28",
          500: "#FF7D00",
          600: "#CC6400",
          700: "#994B00",
          800: "#663200",
          900: "#331900",
        },
        danger: {
          50: "#FFECE8",
          100: "#FECFC7",
          200: "#FDA597",
          300: "#FC7B67",
          400: "#FB5137",
          500: "#F53F3F",
          600: "#CB2636",
          700: "#A1122C",
          800: "#770827",
          900: "#4D031E",
        },
        success: {
          50: "#E8FFEA",
          100: "#B8F0BE",
          200: "#88E193",
          300: "#58D268",
          400: "#28C33D",
          500: "#00B42A",
          600: "#00901F",
          700: "#006C16",
          800: "#00480E",
          900: "#002408",
        },
        neutral: {
          50: "#F7F8FA",
          100: "#F2F3F5",
          200: "#E5E6EB",
          300: "#C9CDD4",
          400: "#86909C",
          500: "#4E5969",
          600: "#272E3B",
          700: "#1D2129",
          800: "#1A1C22",
          900: "#111218",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "serif"],
        sans: ['"Noto Sans SC"', "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in-up": "fadeInUp 0.6s ease-out forwards",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-in": "slideIn 0.3s ease-out forwards",
        "breathe": "breathe 2s ease-in-out infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        breathe: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.05)" },
        },
      },
      boxShadow: {
        card: "0 4px 16px rgba(0, 0, 0, 0.08)",
        "card-hover": "0 8px 24px rgba(0, 0, 0, 0.12)",
        "card-active": "0 2px 8px rgba(22, 93, 255, 0.15)",
      },
      borderRadius: {
        lg: "8px",
        md: "6px",
      },
    },
  },
  plugins: [],
};

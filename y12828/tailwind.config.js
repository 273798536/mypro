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
          50: "#E8EEF7",
          100: "#C1D0E9",
          200: "#9AB2DB",
          300: "#7394CD",
          400: "#4C76BF",
          500: "#2558B1",
          600: "#0F2B5B",
          700: "#0C234A",
          800: "#091B39",
          900: "#061228",
        },
        accent: {
          50: "#E6F9F7",
          100: "#B3EDE7",
          200: "#80E1D7",
          300: "#4DD5C7",
          400: "#1AC9B7",
          500: "#00B8A9",
          600: "#009387",
          700: "#006E65",
          800: "#004943",
          900: "#002421",
        },
        warning: {
          50: "#FEF5E6",
          100: "#FCE4B3",
          200: "#FAD380",
          300: "#F8C24D",
          400: "#F6B11A",
          500: "#F08A00",
          600: "#C06E00",
          700: "#905300",
          800: "#603700",
          900: "#301C00",
        },
        danger: {
          50: "#FDECEE",
          100: "#F9C5CB",
          200: "#F59EA8",
          300: "#F17785",
          400: "#ED5062",
          500: "#E63946",
          600: "#B82E38",
          700: "#8A222A",
          800: "#5C171C",
          900: "#2E0B0E",
        },
        lab: {
          bg: "#F5F7FA",
          panel: "#FFFFFF",
          border: "#E2E8F0",
          text: "#1E293B",
          textMuted: "#64748B",
          dark: "#0F172A",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "serif"],
        sans: ['"Noto Sans SC"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-border": "pulse-border 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        "pulse-border": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(240, 138, 0, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(240, 138, 0, 0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(0, 184, 169, 0.5)" },
          "100%": { boxShadow: "0 0 20px rgba(0, 184, 169, 0.8)" },
        },
      },
      boxShadow: {
        "inner-subtle": "inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "glow-accent": "0 0 20px rgba(0, 184, 169, 0.3)",
        "glow-warning": "0 0 20px rgba(240, 138, 0, 0.3)",
      },
    },
  },
  plugins: [],
};

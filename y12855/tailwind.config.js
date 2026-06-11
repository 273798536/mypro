/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      colors: {
        ocean: {
          50: "#F0F6FC",
          100: "#DCE8F3",
          200: "#AFC9DF",
          300: "#7AA5C7",
          400: "#3D7BAA",
          500: "#1A5F7A",
          600: "#124866",
          700: "#0E3A55",
          800: "#0A2540",
          900: "#061A2D",
          950: "#041120",
        },
        steel: {
          50: "#F7F9FB",
          100: "#EEF3F7",
          200: "#D5E1EB",
          300: "#B0C7D8",
          400: "#86AAC3",
          500: "#6490AE",
        },
        parchment: {
          50: "#FDFBF7",
          100: "#FAF7F2",
          200: "#F4ECD9",
          300: "#EBDBB8",
        },
        availability: {
          available: "#10B981",
          pending: "#F59E0B",
          recollect: "#EF4444",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif CN"', "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        sans: ['"PingFang SC"', '"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(10, 37, 64, 0.08), 0 1px 2px rgba(10, 37, 64, 0.04)",
        cardHover: "0 8px 24px rgba(10, 37, 64, 0.12), 0 2px 6px rgba(10, 37, 64, 0.06)",
        parchment: "0 4px 16px rgba(139, 115, 85, 0.1), 0 1px 3px rgba(139, 115, 85, 0.06)",
      },
      keyframes: {
        slideInUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(40px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseBorder: {
          "0%, 100%": { borderColor: "currentColor" },
          "50%": { borderColor: "transparent" },
        },
        flashGreen: {
          "0%, 100%": { borderColor: "#F59E0B" },
          "50%": { borderColor: "#10B981" },
        },
      },
      animation: {
        "slide-in-up": "slideInUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-in-right": "slideInRight 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-border": "pulseBorder 1.2s ease-in-out 2",
        "flash-green": "flashGreen 0.8s ease-in-out",
      },
    },
  },
  plugins: [],
};

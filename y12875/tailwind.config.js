/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
    },
    extend: {
      colors: {
        ocean: {
          50: "#E6F4FA",
          100: "#B3DFF0",
          200: "#80CAE6",
          300: "#4DB5DC",
          400: "#1AA0D2",
          500: "#00B4D8",
          600: "#008BA8",
          700: "#0A2540",
          800: "#071A2E",
          900: "#04101C",
          950: "#020810",
        },
        quality: {
          available: "#10B981",
          pending: "#F59E0B",
          recollect: "#EF4444",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', '"思源宋体"', "serif"],
        sans: ['"Inter"', '"Noto Sans SC"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"SF Mono"', "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float-in": "floatIn 0.5s ease-out forwards",
        "glow-border": "glowBorder 3s ease-in-out infinite",
      },
      keyframes: {
        floatIn: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glowBorder: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(239, 68, 68, 0)" },
          "50%": { boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.25)" },
        },
      },
      backgroundImage: {
        "ocean-gradient":
          "linear-gradient(135deg, #04101C 0%, #0A2540 40%, #071A2E 100%)",
        "noise-texture":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

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
        brand: {
          DEFAULT: "#0F4C5C",
          50: "#E8F4F7",
          100: "#CFE8EF",
          200: "#9FD1DF",
          300: "#6FBACF",
          400: "#3FA3BF",
          500: "#0F4C5C",
          600: "#0C3D4A",
          700: "#092E37",
          800: "#061E25",
          900: "#030F12",
        },
        alert: {
          DEFAULT: "#E36414",
          50: "#FDEDE0",
          100: "#FADBC1",
          500: "#E36414",
          600: "#B55010",
        },
        success: {
          DEFAULT: "#5FAD41",
          50: "#EAF6E4",
          500: "#5FAD41",
          600: "#4C8A34",
        },
        graphite: "#1F2937",
        slate: "#6B7280",
        cream: "#F8F8F5",
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        body: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        "sm-2": "2px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15,76,92,0.08), 0 1px 2px rgba(15,76,92,0.04)",
        "card-hover": "0 4px 12px rgba(15,76,92,0.12), 0 2px 4px rgba(15,76,92,0.06)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

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
          950: "#15130f",
          900: "#1c1915",
          850: "#232019",
          800: "#2b2720",
          700: "#3a342b",
          600: "#524b3e",
          400: "#8a8270",
          300: "#b3ac9a",
        },
        saffron: {
          DEFAULT: "#e0a82e",
          soft: "#b98a24",
          glow: "#f0c24a",
        },
        viridian: {
          DEFAULT: "#3fa66b",
          deep: "#2c7a4f",
        },
        brick: {
          DEFAULT: "#d65446",
          deep: "#a83c30",
        },
        paper: "#f3eee2",
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        console: "0 1px 0 0 rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(224,168,46,0.3), 0 0 24px -6px rgba(224,168,46,0.25)",
      },
      keyframes: {
        risein: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        sweep: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        risein: "risein 0.5s cubic-bezier(0.22,1,0.36,1) both",
        sweep: "sweep 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

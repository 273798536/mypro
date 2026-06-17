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
          950: "#070a10",
          900: "#0b0f17",
          850: "#11161f",
          800: "#161c27",
          700: "#1e2632",
          600: "#2a3340",
          500: "#3a4452",
        },
        signal: {
          DEFAULT: "#f5b13d",
          soft: "#f5b13d26",
          amber: "#f59e0b",
        },
        pass: {
          DEFAULT: "#34d399",
          soft: "#34d39926",
        },
        warn: {
          DEFAULT: "#fbbf24",
          soft: "#fbbf2426",
        },
        reject: {
          DEFAULT: "#fb7185",
          soft: "#fb718526",
        },
      },
      fontFamily: {
        display: ['"Schibsted Grotesk"', "system-ui", "sans-serif"],
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(245,177,61,0.18), 0 8px 30px -12px rgba(245,177,61,0.25)",
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 24px 60px -30px rgba(0,0,0,0.8)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        sweep: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        rise: "rise 0.5s cubic-bezier(0.22,1,0.36,1) both",
        sweep: "sweep 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

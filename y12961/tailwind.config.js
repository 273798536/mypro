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
          950: "#08090c",
          900: "#0b0d12",
          850: "#10131a",
          800: "#151922",
          750: "#1b2030",
          700: "#232a3c",
          600: "#2e3850",
          500: "#3c4866",
        },
        line: "rgba(125,145,190,0.14)",
        sky: { DEFAULT: "#38bdf8", soft: "#7dd3fc" },
        amber: { DEFAULT: "#fbbf24", soft: "#fcd34d" },
        rose: { DEFAULT: "#fb7185", soft: "#fda4af" },
        emerald: { DEFAULT: "#34d399", soft: "#6ee7b7" },
        violet: { DEFAULT: "#a78bfa", soft: "#c4b5fd" },
      },
      fontFamily: {
        sans: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(56,189,248,0.35), 0 0 24px -6px rgba(56,189,248,0.45)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 30px -18px rgba(0,0,0,0.8)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        sweep: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        pulseDot: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        gridFloat: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        rise: "rise 0.5s cubic-bezier(0.22,1,0.36,1) both",
        sweep: "sweep 2.2s ease-in-out infinite",
        pulseDot: "pulseDot 1.8s ease-in-out infinite",
        gridFloat: "gridFloat 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

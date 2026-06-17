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
        ink: "#0f0d0b",
        surface: "#161310",
        panel: "#211c17",
        edge: "#3a322b",
        edge2: "#4b4138",
        muted: "#a99f90",
        faint: "#6f655a",
        cream: "#f4ede2",
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tightish: "-0.02em",
        wider2: "0.14em",
        widest2: "0.22em",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(245,165,36,0.35), 0 0 24px -6px rgba(245,165,36,0.45)",
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 18px 40px -28px rgba(0,0,0,0.9)",
      },
      animation: {
        "fade-in": "fadeIn .5s ease both",
        "fade-up": "fadeUp .55s cubic-bezier(.2,.7,.2,1) both",
        "draw-line": "drawLine .6s ease both",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        drawLine: { "0%": { transform: "scaleY(0)" }, "100%": { transform: "scaleY(1)" } },
        pulseSoft: { "0%,100%": { opacity: "0.55" }, "50%": { opacity: "1" } },
      },
    },
  },
  plugins: [],
};

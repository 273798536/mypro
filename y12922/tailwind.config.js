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
        paper: {
          DEFAULT: "#F7F3EA",
          50: "#FBF8F1",
          100: "#F7F3EA",
          200: "#EFE9DA",
          300: "#E4DCC6",
        },
        ink: {
          DEFAULT: "#14110D",
          soft: "#3A352C",
          muted: "#6B6453",
          faint: "#9A917C",
        },
        teal: {
          DEFAULT: "#0F4C4A",
          soft: "#2E6B69",
          tint: "#E3EDEB",
        },
        amber2: {
          DEFAULT: "#B7791F",
          soft: "#C9922F",
          tint: "#F3E8D2",
        },
        oxblood: {
          DEFAULT: "#7A2E2E",
          soft: "#944343",
          tint: "#F0E0E0",
        },
      },
      fontFamily: {
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
        sans: ['"Hanken Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        ledger: "0 1px 0 0 rgba(20,17,13,0.08)",
        card: "0 1px 2px rgba(20,17,13,0.06), 0 8px 24px -16px rgba(20,17,13,0.18)",
      },
    },
  },
  plugins: [],
};

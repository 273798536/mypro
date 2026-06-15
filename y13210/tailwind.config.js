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
          50: "#F7F3EB",
          100: "#EFE8D8",
          200: "#D9CFB8",
          500: "#6B6356",
          700: "#3D3830",
          900: "#1A1712",
        },
        forest: {
          50: "#E8F2EC",
          100: "#C7E0D1",
          300: "#6FA98A",
          500: "#1F4D3A",
          700: "#143527",
          900: "#0A1E16",
        },
        copper: {
          50: "#FBF2EB",
          100: "#F3D9C2",
          300: "#E0A878",
          500: "#C87941",
          700: "#945628",
          900: "#5C3417",
        },
        voice: {
          soprano: "#9B5DE5",
          alto: "#00BBF9",
          tenor: "#4CAF50",
          bass: "#8D6E63",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', '"思源宋体"', "serif"],
        sans: ['"Noto Sans SC"', '"Source Han Sans SC"', '"思源黑体"', "sans-serif"],
      },
      backgroundImage: {
        "paper-texture":
          "radial-gradient(circle at 20% 30%, rgba(200, 121, 65, 0.04) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(31, 77, 58, 0.04) 0%, transparent 50%)",
        "staff-grid":
          "repeating-linear-gradient(to bottom, transparent 0px, transparent 19px, rgba(31, 77, 58, 0.08) 19px, rgba(31, 77, 58, 0.08) 20px)",
      },
      boxShadow: {
        card: "0 2px 8px rgba(26, 23, 18, 0.06), 0 1px 2px rgba(26, 23, 18, 0.04)",
        cardHover:
          "0 8px 24px rgba(26, 23, 18, 0.10), 0 2px 6px rgba(200, 121, 65, 0.15)",
      },
      keyframes: {
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(200, 121, 65, 0.5)" },
          "70%": { boxShadow: "0 0 0 12px rgba(200, 121, 65, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(200, 121, 65, 0)" },
        },
        noteBounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
      animation: {
        pulseRing: "pulseRing 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        noteBounce: "noteBounce 1s ease-in-out infinite",
        slideInRight: "slideInRight 0.35s ease-out",
      },
    },
  },
  plugins: [],
};

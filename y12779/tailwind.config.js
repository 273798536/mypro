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
          50: "#eff8f9",
          100: "#d6eef1",
          200: "#acdce3",
          300: "#78c3cf",
          400: "#4aa4b5",
          500: "#2f8899",
          600: "#256d7e",
          700: "#1f5866",
          800: "#0F4C5C",
          900: "#0a3340",
          950: "#052029",
        },
        status: {
          success: "#2A9D8F",
          pending: "#E9C46A",
          failed: "#E63946",
        },
        paper: {
          50: "#FDFCFA",
          100: "#F8F7F4",
          200: "#EDEBE4",
        },
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: "0 2px 10px -2px rgba(15, 76, 92, 0.08), 0 1px 3px -1px rgba(15, 76, 92, 0.06)",
        card: "0 4px 20px -4px rgba(15, 76, 92, 0.12), 0 2px 6px -2px rgba(15, 76, 92, 0.08)",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.5s ease-out both",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};

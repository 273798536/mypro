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
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-soft": "pulseSoft 2s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            color: "#334155",
            h1: {
              color: "#0f172a",
              fontWeight: "700",
              marginTop: "0",
              marginBottom: "1rem",
            },
            h2: {
              color: "#1e293b",
              fontWeight: "600",
              marginTop: "1.5rem",
              marginBottom: "0.75rem",
            },
            h3: {
              color: "#334155",
              fontWeight: "600",
              marginTop: "1.25rem",
              marginBottom: "0.5rem",
            },
            h4: {
              color: "#475569",
              fontWeight: "600",
              marginTop: "1rem",
              marginBottom: "0.5rem",
            },
            table: {
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "0.5rem",
              marginBottom: "1rem",
            },
            th: {
              backgroundColor: "#f1f5f9",
              padding: "0.5rem 0.75rem",
              border: "1px solid #e2e8f0",
              fontWeight: "600",
              textAlign: "left",
            },
            td: {
              padding: "0.5rem 0.75rem",
              border: "1px solid #e2e8f0",
            },
            "tr:nth-child(even)": {
              backgroundColor: "#f8fafc",
            },
            blockquote: {
              borderLeftColor: "#3b82f6",
              backgroundColor: "#eff6ff",
              padding: "0.75rem 1rem",
              borderRadius: "0.375rem",
              color: "#1e40af",
            },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

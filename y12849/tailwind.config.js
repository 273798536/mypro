/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  safelist: [
    'bg-red-50', 'bg-orange-50', 'bg-yellow-50', 'bg-emerald-50', 'bg-blue-50', 'bg-purple-50', 'bg-gray-50',
    'text-red-600', 'text-orange-600', 'text-yellow-600', 'text-emerald-600', 'text-blue-600', 'text-purple-600',
    'bg-red-100', 'bg-orange-100', 'bg-yellow-100', 'bg-emerald-100', 'bg-blue-100', 'bg-purple-100',
    'border-red-200', 'border-orange-200', 'border-yellow-200', 'border-emerald-200', 'border-blue-200', 'border-purple-200',
    'text-red-700', 'text-orange-700', 'text-yellow-700', 'text-emerald-700', 'text-blue-700', 'text-purple-700',
    'text-red-800', 'text-orange-800', 'text-yellow-800', 'text-emerald-800', 'text-blue-800', 'text-purple-800',
    'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-blue-500', 'bg-purple-500',
    'ring-red-500', 'ring-orange-500', 'ring-yellow-500', 'ring-emerald-500', 'ring-blue-500', 'ring-purple-500',
  ],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        'space-grotesk': ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
};

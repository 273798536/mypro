/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#1890ff',
        success: '#52c41a',
        warning: '#faad14',
        danger: '#ff4d4f',
        'bg-dark': '#141414',
        'bg-card': '#1f1f1f',
        'bg-hover': '#262626',
        border: '#303030',
        'border-hover': '#434343',
        'text-primary': '#ffffff',
        'text-secondary': '#cccccc',
        'text-muted': '#666666',
      },
      backgroundColor: {
        'bg-dark': '#141414',
        'bg-card': '#1f1f1f',
        'bg-hover': '#262626',
      },
      borderColor: {
        DEFAULT: '#303030',
        'border-hover': '#434343',
      },
      textColor: {
        'text-primary': '#ffffff',
        'text-secondary': '#cccccc',
        'text-muted': '#666666',
      },
    },
  },
  plugins: [],
}

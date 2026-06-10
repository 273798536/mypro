/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        // 主色调 - 深蓝灰系（专业、稳重）
        primary: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
        },
        // 医学蓝 - 强调色
        medical: {
          50: '#e6f6ff',
          100: '#b3e0ff',
          200: '#80caff',
          300: '#4db3ff',
          400: '#1a9dff',
          500: '#0080e6',
          600: '#0066b3',
          700: '#004d80',
          800: '#00334d',
          900: '#001a26',
        },
        // 异常橙 - 补材料类
        supplement: {
          50: '#fff4e6',
          100: '#ffe0b3',
          200: '#ffcc80',
          300: '#ffb84d',
          400: '#ffa31a',
          500: '#e68a00',
          600: '#b36b00',
          700: '#804d00',
          800: '#4d2e00',
          900: '#1a0f00',
        },
        // 口径紫 - 改口径类
        recalibration: {
          50: '#f3e8ff',
          100: '#dcb8ff',
          200: '#c68cff',
          300: '#af5fff',
          400: '#9933ff',
          500: '#7a00e6',
          600: '#5c00b3',
          700: '#3d0080',
          800: '#1f004d',
          900: '#0a001a',
        },
        // 警告黄
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // 行动绿
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        // 中性灰
        neutral: {
          50: '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#868e96',
          700: '#495057',
          800: '#343a40',
          900: '#212529',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Noto Sans"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"SF Mono"', 'Monaco', '"Cascadia Code"', '"Roboto Mono"', 'Consolas', 'monospace'],
      },
      fontSize: {
        xxs: '0.6875rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(16, 42, 67, 0.08), 0 1px 2px 0 rgba(16, 42, 67, 0.04)',
        'card-hover': '0 4px 6px -1px rgba(16, 42, 67, 0.1), 0 2px 4px -1px rgba(16, 42, 67, 0.06)',
        'side': '2px 0 8px 0 rgba(16, 42, 67, 0.06)',
      },
      borderRadius: {
        'sm': '2px',
        'md': '4px',
        'lg': '6px',
      },
      transitionTimingFunction: {
        'soft': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

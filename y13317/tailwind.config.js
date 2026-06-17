/** @type {import('tailwindcss').Config} */
// Tailwind CSS 配置文件
export default {
  // 内容路径配置
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,css,scss}'
  ],
  // 主题配置
  theme: {
    // 自定义颜色扩展
    extend: {
      colors: {
        // 工业蓝主色系
        industrial: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#172554',
          950: '#0B1120',
          // 主色
          DEFAULT: '#1E40AF'
        },
        // 警示橙色系
        warning: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
          950: '#431407',
          // 警示主色
          DEFAULT: '#EA580C'
        },
        // 确认绿色系
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
          950: '#022C22',
          // 确认主色
          DEFAULT: '#059669'
        },
        // 深红色系
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
          950: '#450A0A',
          // 危险主色
          DEFAULT: '#B91C1C'
        },
        // 琥珀色系
        amber: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
          950: '#451A03',
          // 琥珀主色
          DEFAULT: '#D97706'
        }
      },
      // 字体配置
      fontFamily: {
        // 无衬线字体（中文使用思源黑体）
        sans: [
          '"Source Han Sans CN"',
          '"Noto Sans SC"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
        // 等宽字体（使用 JetBrains Mono）
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          '"SF Mono"',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace'
        ]
      },
      // 自定义动画
      animation: {
        // 淡入动画
        'fade-in': 'fadeIn 0.3s ease-in-out',
        // 淡入上移
        'fade-in-up': 'fadeInUp 0.3s ease-in-out',
        // 淡入下移
        'fade-in-down': 'fadeInDown 0.3s ease-in-out',
        // 缩放进入
        'scale-in': 'scaleIn 0.2s ease-out',
        // 脉冲动画
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // 呼吸灯动画
        'breathe': 'breathe 2s ease-in-out infinite',
        // 呼吸灯背景动画
        'breathe-bg': 'breatheBg 2.5s ease-in-out infinite',
        // 慢速旋转
        'spin-slow': 'spin 8s linear infinite'
      },
      // 关键帧定义
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        breathe: {
          '0%, 100%': {
            opacity: '1',
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgba(185, 28, 28, 0.7)'
          },
          '50%': {
            opacity: '0.9',
            transform: 'scale(1.05)',
            boxShadow: '0 0 0 6px rgba(185, 28, 28, 0)'
          }
        },
        breatheBg: {
          '0%, 100%': {
            backgroundColor: 'rgba(254, 242, 242, 1)'
          },
          '50%': {
            backgroundColor: 'rgba(254, 202, 202, 0.7)'
          }
        }
      },
      // 阴影扩展
      boxShadow: {
        // 卡片阴影
        'card': '0 2px 8px 0 rgba(0, 0, 0, 0.08)',
        // 卡片悬浮阴影
        'card-hover': '0 4px 16px 0 rgba(0, 0, 0, 0.12)',
        // 模态框阴影
        'modal': '0 8px 32px 0 rgba(0, 0, 0, 0.16)',
        // 工业蓝发光
        'glow-industrial': '0 0 20px rgba(30, 64, 175, 0.3)',
        // 绿色发光
        'glow-success': '0 0 20px rgba(5, 150, 105, 0.3)',
        // 红色发光
        'glow-danger': '0 0 20px rgba(185, 28, 28, 0.3)'
      }
    }
  },
  // 插件列表
  plugins: []
};

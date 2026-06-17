// Vite 配置文件
import { defineConfig } from 'vite';
// React 插件
import react from '@vitejs/plugin-react';
// Node.js 路径模块
import path from 'path';

// Vite 配置
export default defineConfig({
  // 使用的插件列表
  plugins: [react()],
  // 开发服务器配置
  server: {
    // 端口号
    port: 3000,
    // 自动打开浏览器
    open: true,
    // 允许跨域
    cors: true,
    // 监听地址
    host: '0.0.0.0'
  },
  // 路径解析配置
  resolve: {
    // 路径别名
    alias: {
      // @ 指向 src 目录
      '@': path.resolve(__dirname, './src')
    }
  },
  // 构建配置
  build: {
    // 输出目录
    outDir: 'dist',
    // 构建产物目录
    assetsDir: 'assets',
    // 生成源映射
    sourcemap: false,
    // 代码压缩
    minify: 'esbuild',
    // 构建时清空输出目录
    emptyOutDir: true,
    // 块大小警告限制（单位：KB）
    chunkSizeWarningLimit: 1500,
    // Rollup 构建选项
    rollupOptions: {
      // 输出配置
      output: {
        // 手动代码分割
        manualChunks: {
          // React 相关单独打包
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // 图表库单独打包
          'echarts-vendor': ['echarts', 'echarts-for-react'],
          // 表格库单独打包
          'ag-grid-vendor': ['ag-grid-community', 'ag-grid-react']
        }
      }
    }
  },
  // 预构建优化配置
  optimizeDeps: {
    // 需要预构建的依赖
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'echarts',
      'echarts-for-react',
      'ag-grid-community',
      'ag-grid-react',
      'dayjs',
      'xlsx',
      'file-saver',
      'diff-match-patch'
    ]
  }
});

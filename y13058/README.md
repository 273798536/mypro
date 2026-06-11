# 医院物流机器人剖面讲解分析系统

## 项目简介
面向医院物流机器人剖面分析的全流程管理系统，提供撤回记录影响链可视化、CAD图层版本管理、对象重叠可执行步骤指引、评审回溯、Markdown交接报告、接手导航面板和多模式导出等核心功能。

## 快速开始

### 环境要求
- Node.js >= 18
- npm >= 9

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```
启动后访问 http://localhost:5173

### 类型检查
```bash
npm run check
```

### 生产构建
```bash
npm run build
```
构建产物输出到 `dist/` 目录

### 预览生产构建
```bash
npm run preview
```

## 功能模块

| 路由 | 模块 | 核心功能 |
|------|------|----------|
| `/` | 撤回记录影响链 | 可视化撤回记录如何传播到最终结论 |
| `/overlap` | 对象重叠处理 | AABB碰撞检测，自动生成可执行处理步骤 |
| `/review` | 评审回溯 | 截图热点链接CAD对象，一键定位来源 |
| `/report` | Markdown交接报告 | 三栏分明：已处理、待补材料、人工改判 |
| `/handover` | 接手导航面板 | 材料位置、异常位置、导出位置一目了然 |

## 核心验证路径

1. **重叠检测闭环**：访问 `/overlap` → 点击「重新检测重叠」→ 确认 AABB 检测到 **5组** 空间重叠，新增 **3项**（B1-电梯井A ⟷ 风管-西段、B1-电梯井A ⟷ AGV转弯半径修正、机器人停靠站#3 ⟷ 风管-西段）→ 页面统计从「共3项」变为「共6项」→ 展开新增项查看自动生成的4步处理步骤

2. **导出功能**：访问 `/handover` → 点击「在访达中打开」测试剪贴板复制 → 点击「开始导出」选择PNG/PDF/DXF格式，确认浏览器触发Blob下载

3. **类型安全**：运行 `npm run check` 确认0类型错误

## 技术栈
- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- Zustand 4
- React Router DOM 6
- Lucide React
- react-markdown

## 详细文档
- [产品需求文档](.trae/documents/PRD-医院物流机器人剖面讲解系统.md)
- [技术架构文档](.trae/documents/技术架构-医院物流机器人剖面讲解系统.md)

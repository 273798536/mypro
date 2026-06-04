# 数学函数涂色实验

一款面向数学教学与赛事评审的交互式函数图像标注工具。用户通过在网格坐标系中绘制数学函数曲线，对特定区域进行涂色标注，完成实验任务。

## ✨ 核心特性

- **网格吸附**：绘制点自动吸附到最近网格交点，确保坐标精度
- **撤销重做**：完整的操作历史记录，支持无限步撤销/重做（Ctrl+Z / Ctrl+Y）
- **边界检测**：超出边界绘制时自动触发失败提示与震动动画
- **异常检测**：自动检测空值、重复、备注混写等标注问题
- **数据导出**：导出JSON格式标注数据，确保与界面摘要一致
- **评审区分**：清晰展示"可直接使用"和"待复核"项，便于评审老师快速判断

## 🚀 快速开始

### 环境要求

- Node.js >= 16
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173/ 即可开始使用。

### 生产构建

```bash
npm run build
```

### 类型检查

```bash
npm run check
```

## 📁 项目结构

```
.
├── .trae/documents/           # 项目文档
│   ├── PRD-数学函数涂色实验.md    # 产品需求文档
│   └── TECH-数学函数涂色实验.md   # 技术架构文档
├── src/
│   ├── components/            # UI组件
│   │   ├── GridCanvas.tsx        # 网格画布组件
│   │   ├── Toolbar.tsx           # 工具栏组件
│   │   ├── AnnotationPanel.tsx   # 异常标注面板
│   │   └── LevelCard.tsx         # 关卡卡片组件
│   ├── data/                  # Mock数据
│   │   ├── levels.ts             # 关卡配置
│   │   └── mockAnnotations.ts    # 样例标注数据
│   ├── pages/                 # 页面
│   │   ├── Home.tsx              # 首页 - 关卡选择
│   │   ├── Experiment.tsx        # 实验页面 - 核心绘制界面
│   │   └── Result.tsx            # 结算页面 - 结果汇总
│   ├── store/                 # 状态管理
│   │   └── experimentStore.ts    # Zustand状态管理
│   ├── types/                 # TypeScript类型定义
│   │   └── index.ts
│   ├── utils/                 # 工具函数
│   │   ├── grid.ts               # 网格坐标计算
│   │   ├── mathParser.ts         # 数学函数解析
│   │   ├── annotationDetector.ts # 异常检测算法
│   │   └── export.ts             # JSON导出工具
│   ├── App.tsx                 # 应用入口
│   ├── main.tsx                # 渲染入口
│   └── index.css               # 全局样式
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 🎯 使用指南

### 第一份样例位置

启动项目后，首页会展示两个关卡：

1. **关卡1 - 基础函数绘制**：绘制 y = x² 函数曲线并对指定区域涂色
   - 边界范围：[±5, ±5]
   - 目标函数：y = x²

2. **关卡2 - 边界失败验证**：尝试在边界外绘制，体验边界失败机制
   - 边界范围：[±3, ±3]
   - 目标函数：y = sin(x)

### 操作说明

1. **绘制曲线**：选择「绘制曲线」工具，在网格上点击并拖动绘制
2. **填充区域**：选择「填充区域」工具，绘制封闭区域进行涂色
3. **选择颜色**：在左侧工具栏选择绘制颜色
4. **撤销重做**：使用工具栏按钮或快捷键 Ctrl+Z / Ctrl+Y
5. **重开本关**：一键清空当前关卡的所有标注
6. **编辑标注**：点击右侧面板中的标注卡片，可编辑备注和来源材料
7. **导出数据**：完成后导出JSON格式的标注数据

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + Z` | 撤销 |
| `Ctrl + Shift + Z` | 重做 |
| `Ctrl + Y` | 重做 |

## 🧪 核心流程

```
进入首页 → 选择关卡 → 绘制函数曲线
    ↓
区域涂色 → 异常检测 → 边界验证
    ↓
完成关卡 → 结算页面 → 导出JSON
```

### 必须体验的功能点

1. **边界失败**：在关卡2中尝试在边界外绘制，观察红色震动提示
2. **撤销重做**：绘制多个标注后，测试撤销和重做功能
3. **异常标注**：创建一个无备注的标注，观察系统自动标记为"待复核"
4. **数据一致性**：在结算页面点击「校验数据一致性」，验证导出数据与界面一致

## 🎨 设计规范

- **主色调**：深海蓝 #0F3B5F
- **可直接使用**：青色 #2DD4BF
- **待复核**：琥珀橙 #F59E0B
- **边界失败**：玫红 #EC4899
- **字体**：Playfair Display（展示）+ Fira Code（正文/代码）

## 📊 导出数据格式

导出的JSON包含以下字段：

```json
{
  "version": "1.0.0",
  "experimentId": "xxx",
  "summary": {
    "totalAnnotations": 5,
    "validCount": 3,
    "pendingCount": 2,
    "boundaryFailed": false
  },
  "annotations": [
    {
      "id": "anno-1",
      "type": "curve",
      "color": "#2DD4BF",
      "points": [{"x": 0, "y": 0}, {"x": 1, "y": 1}],
      "status": "valid",
      "note": "标准抛物线",
      "sourceMaterial": "教材第三章",
      "issues": []
    }
  ],
  "exportedAt": 1234567890
}
```

## 🔧 技术栈

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite 6
- **样式方案**：Tailwind CSS 3
- **状态管理**：Zustand
- **路由**：React Router DOM 6
- **图标**：Lucide React
- **画布**：HTML5 Canvas API

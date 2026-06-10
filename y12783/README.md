# 薄膜镀层厚度估算实验室管理系统

服务于实验室管理员的日常试剂台账管理、批次追踪、镀层厚度估算及谱图判读工作的全栈应用。

## 功能特性

- **批次追踪（日常入口）**：厚度估算日常操作、批次列表、快速录入、状态概览
- **试剂台账**：试剂信息管理、库存追踪、入库出库记录、导入导出
- **薄膜镀层厚度估算**：厚度计算、空白对照检测、估算结果版本记录、重复导入去重
- **谱图判读**：月底/课前谱图审核、判读记录、与厚度估算一致性校验
- **CLI 工具**：命令行批量处理、空白对照缺失专项处理、输入输出目录可指定

## 快速开始

### 环境要求

- Node.js >= 18.x
- npm (随 Node.js 自带)

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

启动后访问：
- 前端界面：http://localhost:5173
- 后端 API：http://localhost:3001

### 首次使用

打开前端页面后，系统会自动检测是否已有数据。如果是首次运行，会显示「加载示例数据」按钮，点击即可加载预置的示例数据，包括：

- 6 条试剂台账记录
- 5 个测试批次
- 4 条厚度估算历史
- 4 条谱图记录

示例数据位置：`./api/data/`

## CLI 工具使用

### 基本用法

```bash
npm run cli:thickness -- --input ./data/batches --output ./results
```

### 仅处理空白对照缺失的记录

```bash
npm run cli:thickness -- --input ./data --output ./results --only-blank-missing
```

### 完整参数列表

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--input, -i` | 输入目录路径 | `./data` |
| `--output, -o` | 输出目录路径 | `./results` |
| `--algorithm` | 算法: standard / degraded | `standard` |
| `--only-blank-missing` | 仅处理空白对照缺失的记录 | `false` |
| `--log-level` | 日志级别: info / warn / error | `info` |
| `--help, -h` | 显示帮助信息 | - |

### 输入文件格式

输入目录下放置 JSON 数组文件，示例：

```json
[
  {
    "batchNo": "COAT-2026-001",
    "materialNo": "MAT-001",
    "materialName": "SiO2薄膜",
    "wavelength": 632.8,
    "refractiveIndex": 1.457,
    "reflectance": 0.185,
    "blankControlComplete": true,
    "operator": "管理员"
  }
]
```

### 输出文件

- `thickness_results.json` - 完整的估算结果（JSON 格式）
- `summary.csv` - 摘要报表（CSV 格式，可直接用 Excel 打开）

## 项目结构

```
.
├── api/                    # 后端 Express 服务
│   ├── repository/         # 数据访问层
│   ├── routes/             # API 路由
│   ├── data/               # JSON 数据存储（运行时生成）
│   ├── app.ts              # Express 应用配置
│   └── server.ts           # 服务器入口
├── cli/                    # CLI 工具
│   ├── commands/           # CLI 命令
│   └── index.ts            # CLI 入口
├── shared/                 # 前后端共享代码
│   ├── types/              # TypeScript 类型定义
│   ├── utils/              # 工具函数（一致性映射、计算等）
│   └── data/               # 示例数据
├── src/                    # 前端 React 应用
│   ├── components/         # UI 组件
│   ├── pages/              # 页面组件
│   ├── store/              # Zustand 状态管理
│   ├── api/                # API 客户端
│   └── App.tsx             # 应用入口
└── package.json
```

## 核心设计原则

### 数据一致性保障

所有状态字段（通过/待确认/未通过 等）通过统一的映射表维护，确保：
- 前端界面显示
- 后端 API 返回
- 导出文件内容

三者完全一致，杜绝「页面说通过、文件里又写待确认」的情况。

### 重复导入去重

- 批次：按「批次号 + 材料编号」联合唯一键去重
- 厚度估算：同一批次版本号递增，每次保存都是新版本，不覆盖历史
- CLI 工具：同一批次重复运行，版本号自动递增

### 空白对照缺失处理

- Web 端检测到空白对照缺失时，自动标记并提示使用降级算法
- CLI 工具支持 `--only-blank-missing` 参数，专项处理此类记录
- 降级算法的结果标记为「待确认」状态，置信区间更宽

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动前后端开发服务器 |
| `npm run client:dev` | 仅启动前端开发服务器 |
| `npm run server:dev` | 仅启动后端开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run check` | TypeScript 类型检查 |
| `npm run lint` | ESLint 代码检查 |
| `npm run cli:thickness` | 运行 CLI 厚度估算工具 |

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS + Zustand + React Router + Lucide Icons
- **后端**：Express 4 + TypeScript
- **数据存储**：JSON 文件（轻量级，无需数据库）
- **CLI**：Commander.js + tsx

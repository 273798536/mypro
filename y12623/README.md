# 物流月台装载草图标注审核系统

用于管理和审核物流月台装载作业的标注数据。解决评分表修改后历史结论追溯、重复导入冲突、离线素材异常筛选等核心问题。

## 功能特性

- **网格吸附主页**：日常入口，卡片网格展示所有装载草图记录
- **批量导入**：支持Excel文件导入，自动去重和冲突检测
- **异常筛选**：自动识别素材缺失、评分冲突、重复导入等异常
- **评分历史**：时间线展示每次评分修改，强制记录修正原因
- **导出复盘**：月底/课前导出审核报告，数据与界面一致性校验
- **重复导入防冲突**：使用批次号+月台号+车牌号作为唯一键，重复导入自动合并为补录

## 技术栈

- **前端**：React 18 + TypeScript + Vite + TailwindCSS 3 + Zustand
- **后端**：Express 4 + TypeScript
- **数据库**：SQLite + better-sqlite3
- **文件处理**：Multer + XLSX

## 快速开始

### 1. 依赖安装

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

这将同时启动：
- 前端开发服务器：http://localhost:5173
- 后端API服务器：http://localhost:3001

### 3. 第一份样例数据

**方式一：一键导入样例数据（推荐）**

1. 访问 http://localhost:5173
2. 点击右上角「导入草稿」按钮
3. 在弹出的对话框中，点击「导入样例数据（快速体验）」
4. 系统将自动生成12条样例记录（包含素材缺失、评分冲突等异常场景）

**方式二：导入Excel文件**

样例Excel模板位置：`samples/装载草图样例.xlsx`

Excel列名要求：
| 列名 | 说明 | 必填 |
|------|------|------|
| 批次号 | 批次编号，如B20260601 | 是 |
| 月台号 | 月台编号，如A01 | 是 |
| 车牌号 | 车辆牌照号 | 是 |
| 草图 | 草图文件名 | 否 |
| 来源 | 数据来源说明 | 否 |
| 评分 | 0-100的整数 | 否 |
| 评分说明 | 评分备注 | 否 |
| 评分人 | 评分人姓名 | 否 |

## 项目结构

```
├── api/                      # 后端代码
│   ├── db/                   # 数据库层
│   │   ├── init.ts           # 数据库初始化
│   │   └── repository.ts     # 数据访问层
│   ├── routes/               # API路由
│   │   ├── records.ts        # 记录相关接口
│   │   └── export.ts         # 导出相关接口
│   ├── services/             # 业务逻辑层
│   │   ├── importService.ts  # 导入逻辑（含去重、异常检测）
│   │   ├── scoreService.ts   # 评分逻辑（含历史记录）
│   │   └── exportService.ts  # 导出逻辑（含一致性校验）
│   ├── app.ts                # Express应用
│   └── server.ts             # 服务器入口
├── src/                      # 前端代码
│   ├── api/                  # API调用层
│   │   └── client.ts         # 接口封装
│   ├── components/           # 公共组件
│   │   ├── Layout.tsx        # 布局组件
│   │   ├── RecordCard.tsx    # 记录卡片
│   │   ├── StatusBadge.tsx   # 状态标签
│   │   ├── ScoreTimeline.tsx # 评分时间线
│   │   └── ImportModal.tsx   # 导入对话框
│   ├── pages/                # 页面
│   │   ├── Home.tsx          # 网格吸附主页
│   │   ├── Anomalies.tsx     # 异常筛选页
│   │   ├── RecordDetail.tsx  # 记录详情页
│   │   └── Export.tsx        # 导出复盘页
│   ├── store/                # 状态管理
│   │   └── useStore.ts       # Zustand store
│   └── utils/                # 工具函数
│       └── format.ts         # 格式化函数
├── shared/                   # 共享类型
│   └── types.ts              # TypeScript类型定义
├── samples/                  # 样例数据
│   └── 装载草图样例.xlsx     # 导入模板
└── data/                     # 运行时数据
    ├── loading_sketch.db     # SQLite数据库
    └── exports/              # 导出文件目录
```

## 核心业务规则

### 重复导入检测
使用 `批次号 + 月台号 + 车牌号` 作为唯一键，重复导入时：
- 自动标记为补录记录
- 更新导入时间和来源
- 如果新数据包含缺失的素材，自动补充并清除异常状态
- 如果新数据评分与已有评分冲突，标记为评分冲突异常

### 评分历史强制记录
每次修改评分必须填写修正原因，系统自动：
- 保存旧分数和新分数
- 记录修改人、修改时间
- 以时间线形式展示历史版本

### 导出一致性校验
导出前自动对比界面展示数据与数据库数据：
- 检查记录数量是否一致
- 检查各状态数量是否一致
- 检查评分是否一致
- 不一致时给出警告，但仍可导出

## API接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/records | 获取记录列表 |
| GET | /api/records/:id | 获取单条记录详情（含历史和意见） |
| PUT | /api/records/:id/score | 更新评分（需填写原因） |
| POST | /api/records/:id/notes | 添加处理意见 |
| POST | /api/records/import | 导入Excel文件 |
| POST | /api/records/import/sample | 导入样例数据 |
| GET | /api/anomalies | 获取异常记录 |
| GET | /api/stats | 获取统计数据 |
| POST | /api/export | 生成导出报告 |
| GET | /api/export/:id/download | 下载报告 |

## 数据状态流转

```
pending (待审核)
    ↓
anomaly (异常) → 处理后 → pending
    ↓
评分后：
  score ≥ 80 → approved (通过)
  score < 60 → rejected (驳回)
  60 ≤ score < 80 → pending (待审核)
```

## 常用命令

```bash
# 启动前后端开发服务器
npm run dev

# 仅启动前端
npm run client:dev

# 仅启动后端
npm run server:dev

# 类型检查
npm run check

# 构建生产版本
npm run build

# 代码检查
npm run lint
```

## 注意事项

1. **空目录测试**：从空目录开始，只需执行 `npm install` 和 `npm run dev` 即可完整运行
2. **数据库自动创建**：首次启动时自动在 `data/` 目录创建SQLite数据库
3. **导出文件位置**：生成的Excel报告保存在 `data/exports/` 目录
4. **修改评分必填原因**：不填写修正原因无法保存评分修改

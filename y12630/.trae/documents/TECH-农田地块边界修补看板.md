# 农田地块边界修补看板 - 技术架构文档

## 1. 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    前端层 (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  看板视图   │  │  明细表格   │  │  导出模块   │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │           │
│  ┌──────┴────────────────┴────────────────┴──────┐     │
│  │              状态管理层 (Zustand)               │     │
│  │     - 数据集管理  - 筛选状态  - 选中记录        │     │
│  └──────────────────────┬─────────────────────────┘     │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────┐
│                    数据层                                  │
│  ┌──────────────────────┴─────────────────────────┐     │
│  │              数据处理引擎                         │     │
│  │  - CSV/Excel 解析  - 坐标偏差计算  - 状态分类    │     │
│  └──────────────────────┬─────────────────────────┘     │
│                         │                               │
│  ┌──────────────────────┴─────────────────────────┐     │
│  │              样例数据 (JSON/CSV)                 │     │
│  │         sample-data/                            │     │
│  └─────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## 2. 技术栈

- **前端框架**：React 18 + TypeScript
- **样式方案**：Tailwind CSS 3
- **状态管理**：Zustand
- **图表库**：Recharts
- **数据导入**：PapaParse (CSV) + xlsx (Excel)
- **构建工具**：Vite
- **导出功能**：jsPDF + html2canvas（报告）/ 原生 Blob（数据）

## 3. 路由定义

| 路由 | 页面 | 说明 |
|------|------|------|
| / | Dashboard | 看板首页，含统计卡片和图表 |
| /details | Details | 明细列表页面，支持筛选和操作 |
| /export | Export | 导出配置和下载页面 |

## 4. 数据模型

### 4.1 核心类型定义

```typescript
// 记录状态枚举
type RecordStatus = 'passed' | 'pending' | 'failed';

// 单条记录数据结构
interface BoundaryRecord {
  row_id: number;          // 原始行号
  image_name: string;      // 图片文件名
  base_map_x: number;     // 底图 X 坐标
  base_map_y: number;     // 底图 Y 坐标
  draft_x: number;        // 标注草稿 X 坐标
  draft_y: number;        // 标注草稿 Y 坐标
  deviation: number;      // 坐标偏差距离
  status: RecordStatus;   // 状态
  source_note: string;     // 来源备注
  reviewer_action?: string; // 复核操作
  created_at: string;      // 记录创建时间
}

// 统计数据结构
interface DashboardStats {
  total: number;           // 总记录数
  passed: number;         // 已通过数
  pending: number;         // 待确认数
  failed: number;          // 坏数据数
  passRate: number;        // 通过率
}

// 筛选状态结构
interface FilterState {
  status: RecordStatus | 'all';
  searchText: string;
  sortBy: 'row_id' | 'deviation' | 'created_at';
  sortOrder: 'asc' | 'desc';
}
```

### 4.2 数据流程

```
用户导入文件
     │
     ▼
┌─────────────┐
│  文件解析   │  ← PapaParse / xlsx
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  数据转换   │  ← 字段映射、类型校正
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  命中检测   │  ← 计算坐标偏差、状态分类
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  状态更新   │  ← Zustand Store 更新
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  视图渲染   │  ← React 组件重绘
└─────────────┘
```

## 5. 命中检测规则

### 5.1 偏差阈值配置

```typescript
const DEVIATION_THRESHOLDS = {
  PASSED: 0.1,      // ≤0.1米 → 已通过
  PENDING: 0.5,     // 0.1-0.5米 → 待确认
  FAILED: Infinity  // >0.5米 或 数据缺失 → 坏数据
};
```

### 5.2 异常检测规则

- `base_map_x` 或 `base_map_y` 为空 → 坏数据
- `draft_x` 或 `draft_y` 为空 → 坏数据
- 坐标值超出有效范围（如 < -180 或 > 180）→ 坏数据
- `deviation > 0.5` → 坏数据

## 6. 导出功能设计

### 6.1 导出格式

| 导出类型 | 格式 | 内容 |
|----------|------|------|
| 处理结果 | CSV | 全部记录含状态标签 |
| 原始数据 | CSV | 仅原始字段，无状态 |
| 复核报告 | PDF | 统计摘要 + 问题记录明细 |

### 6.2 导出数据源

所有导出数据必须来自同一个 Zustand Store，确保图表统计、明细表格、导出结果三者数据一致。

## 7. 项目结构

```
/Users/mac/pro/solo/workspaces/y12630/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Dashboard/
│   │   │   ├── StatCard.tsx
│   │   │   ├── StatusPieChart.tsx
│   │   │   └── TrendBarChart.tsx
│   │   ├── Details/
│   │   │   ├── DataTable.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   └── RecordDetail.tsx
│   │   └── Export/
│   │       └── ExportPanel.tsx
│   ├── stores/
│   │   └── dataStore.ts       // Zustand 状态管理
│   ├── utils/
│   │   ├── fileParser.ts      // CSV/Excel 解析
│   │   ├── deviationCalc.ts   // 坐标偏差计算
│   │   └── exporter.ts       // 导出功能
│   ├── types/
│   │   └── index.ts           // TypeScript 类型定义
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── sample-data/
│   └── boundary-records.csv   // 样例数据
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## 8. 启动命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 9. 依赖清单

| 依赖包 | 版本 | 用途 |
|--------|------|------|
| react | ^18.2.0 | UI 框架 |
| react-dom | ^18.2.0 | DOM 渲染 |
| zustand | ^4.5.0 | 状态管理 |
| recharts | ^2.10.0 | 图表组件 |
| papaparse | ^5.4.0 | CSV 解析 |
| xlsx | ^0.18.0 | Excel 解析 |
| jspdf | ^2.5.0 | PDF 生成 |
| tailwindcss | ^3.4.0 | 样式框架 |
| lucide-react | ^0.300.0 | 图标库 |

# 农田地块边界修补系统

命中检测与导出复盘看板 - 解决底图坐标与标注草稿冲突的可视化分析工具

## 功能概览

针对农田地块边界修补数据处理场景，提供可视化的命中检测看板：

- **命中检测引擎**：自动比对底图坐标与标注草稿，识别边界冲突
- **状态分类**：顺利通过（可直接使用）、待确认（需康复训练师复核）、数据异常（不可用）
- **数据溯源**：保留原始行号、图片文件名、来源备注，支持一键追溯
- **同源数据**：图表统计、明细表格、导出结果均来自同一数据源
- **多格式导出**：支持按状态筛选导出 CSV、完整复盘报告 JSON、文本摘要 TXT
- **地图查看**：支持缩放平移，在地图上叠加显示底图边界与标注边界

## 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装依赖

```bash
cd /Users/mac/pro/solo/workspaces/y12630
npm install
```

### 启动开发服务器

```bash
npm start
```

启动后访问：http://localhost:3000

### 构建生产版本

```bash
npm run build
```

## 样例数据

项目自带样例数据，首次启动即可查看完整效果。

### 样例数据位置

| 文件 | 路径 | 说明 |
|------|------|------|
| CSV 样例 | [sample-data/boundary_records.csv](file:///Users/mac/pro/solo/workspaces/y12630/sample-data/boundary_records.csv) | 6 条记录，覆盖三种状态 |
| JS 数据模块 | [src/data/sampleData.js](file:///Users/mac/pro/solo/workspaces/y12630/src/data/sampleData.js) | 自动执行命中检测并生成结构化数据 |

### 样例记录说明

| 行号 | 地块名称 | 状态 | 说明 |
|------|----------|------|------|
| 1 | 东沟村地块A1 | ✓ 顺利通过 | 坐标高度匹配，可直接使用 |
| 2 | 西湾村地块B3 | ? 待确认 | 坐标轻微偏差，需人工复核 |
| 3 | 南岗村地块C7 | ✗ 数据异常 | 坐标严重不匹配，坏数据 |
| 4 | 北坡村地块D2 | ✓ 顺利通过 | 坐标完全匹配，可直接使用 |
| 5 | 中心村地块E5 | ? 待确认 | 边界模糊区域，需确认 |
| 6 | 河边村地块F8 | ✗ 数据异常 | 左下角坐标缺失，坏数据 |

## 用户角色使用指南

### 学生（结果接收者）

打开页面后默认显示**学生视角**说明：

- 🟢 **绿色标记**：顺利通过，可直接使用
- 🔵 **蓝色标记**：待确认，需找康复训练师复核
- 🔴 **红色标记**：数据异常，不可使用

### 康复训练师（复核人员）

可使用完整功能：

1. **点击统计卡片**：快速筛选对应状态的记录
2. **点击行号**：高亮并定位到记录
3. **查看详情**：点击"详情"按钮查看完整坐标偏差、来源信息
4. **地图定位**：在详情弹窗中点击"在地图上查看"，缩放平移确认边界
5. **导出数据**：
   - 全部数据 CSV
   - 按状态筛选导出（顺利/待确认/异常）
   - 完整复盘报告 JSON
   - 文本摘要 TXT

## 项目结构

```
/Users/mac/pro/solo/workspaces/y12630/
├── sample-data/
│   └── boundary_records.csv      # 样例 CSV 数据
├── src/
│   ├── components/
│   │   ├── App.js                 # 主应用组件
│   │   ├── StatsCards.js          # 统计卡片（可点击筛选）
│   │   ├── BoundaryTable.js       # 明细表格（筛选/搜索/排序）
│   │   ├── BoundaryMap.js         # 地图查看（缩放/平移）
│   │   ├── Charts.js              # 统计图表
│   │   ├── DetailModal.js         # 记录详情弹窗
│   │   └── EquipmentPanel.js      # 设备清单面板
│   ├── data/
│   │   └── sampleData.js          # 样例数据与统计工具函数
│   ├── utils/
│   │   ├── hitDetection.js        # 命中检测引擎
│   │   └── exportUtils.js         # 导出工具（CSV/JSON/TXT）
│   ├── index.css                  # 全局样式
│   ├── index.js                   # 应用入口
│   └── App.js                     # 主组件
├── package.json
└── README.md
```

## 命中检测规则

### 偏差阈值

| 状态 | 最大偏差阈值 | 说明 |
|------|-------------|------|
| 顺利通过 | ≤ 0.01 | 坐标高度匹配 |
| 待确认 | 0.01 ~ 0.05 | 存在偏差，需人工复核 |
| 数据异常 | > 0.05 | 严重不匹配 |

### 异常检测规则

以下情况直接判定为**数据异常**：

- 任意坐标缺失（底图或标注）
- 坐标格式无效（非数值数组）
- 经纬度超出有效范围（经度 -180~180，纬度 -90~90）
- NaN 或非有限数值

## 核心技术栈

- React 18 - UI 框架
- Chart.js + react-chartjs-2 - 图表
- Leaflet + react-leaflet - 地图
- PapaParse - CSV 解析/导出
- Lucide React - 图标

## 数据字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| rowNumber | number | 原始行号（保留溯源） |
| fieldName | string | 地块名称 |
| sourceFile | string | 来源文件名 |
| imageName | string | 关联图片文件名 |
| sourceNote | string | 来源备注 |
| coordinates | object | 底图四角坐标 |
| labelCoordinates | object | 标注草稿四角坐标 |
| hitDetection | object | 命中检测结果（状态/匹配率/偏差/说明） |
| area | number | 面积（亩） |
| status | string | passed/pending/error |
| operator | string | 操作人 |
| createdAt | string | 创建时间 |
| remarks | string | 备注 |

## 常见问题

### Q: 如何从空目录重新开始？

```bash
# 1. 克隆或复制项目到空目录后
cd 项目目录

# 2. 安装依赖（首次必须执行）
npm install

# 3. 启动开发服务器
npm start

# 4. 浏览器自动打开 http://localhost:3000
```

### Q: 导出的数据和页面显示的数据一致吗？

是的。所有图表统计、明细表格、导出结果均来自同一个数据源，确保数据一致性。

### Q: 如何确认一条待确认记录？

1. 在明细中找到待确认记录（蓝色脉冲标签）
2. 点击"详情"查看完整偏差信息和来源
3. 点击"在地图上查看"，缩放平移确认底图与标注边界是否一致
4. 确认后可在导出时单独导出待确认记录用于复核

## License

内部使用

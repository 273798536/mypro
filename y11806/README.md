# 电商账期收款预测系统

为电商财务团队打造的本地Web应用，解决平台招商、广告扣点、退款等在账期内滚动带来的手工凑表痛点。

## 功能特性

- **账期归集**：以账期为主线，关联店铺订单、平台账单、退款记录
- **现金预测**：按周展示现金流预测，断流预警
- **扣费拆解**：平台扣点与广告费用对比分析，附带解释说明
- **待确认区**：集中展示扣点补扣、平台延迟结算、跨账期退款
- **广告扣费补录**：手动录入广告费用，系统自动检测订单结论变动
- **数据导出**：筛选后导出报表

## 技术栈

- **前端**：React 18 + TypeScript + TailwindCSS + Vite
- **图表**：Recharts
- **状态管理**：Zustand
- **图标**：Lucide React
- **后端**：Express + TypeScript
- **数据库**：SQLite (预留接口，当前使用Mock数据)

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式运行

同时启动前端和后端：

```bash
npm run dev
```

- 前端访问地址: http://localhost:3000
- 后端API地址: http://localhost:3001

### 单独运行

只启动前端：
```bash
npm run dev:client
```

只启动后端：
```bash
npm run dev:server
```

### 构建生产版本

```bash
npm run build
```

## 项目结构

```
.
├── src/                    # 前端源代码
│   ├── components/         # React组件
│   │   ├── PeriodTimeline.tsx    # 账期时间线
│   │   ├── OrderList.tsx         # 订单列表
│   │   ├── CashFlowForecast.tsx  # 现金流预测
│   │   ├── FeeBreakdown.tsx      # 扣费拆解
│   │   ├── PendingArea.tsx       # 待确认区
│   │   └── AdFeeModal.tsx        # 广告扣费补录弹窗
│   ├── data/               # Mock数据
│   ├── store/              # Zustand状态管理
│   ├── services/           # API服务
│   ├── types/              # TypeScript类型定义
│   ├── App.tsx             # 主应用组件
│   └── main.tsx            # 入口文件
├── api/                    # 后端源代码
│   └── index.ts            # Express服务器
├── .trae/documents/        # 项目文档
│   ├── prd.md              # 产品需求文档
│   └── tech-arch.md        # 技术架构文档
└── package.json
```

## 页面布局

采用三栏布局：

1. **左侧栏 (20%)**：账期时间线，点击选择账期
2. **中间主内容区 (55%)**：订单列表、搜索、筛选
3. **右侧辅助面板 (25%)**：
   - 现金预测图表
   - 扣费拆解饼图
   - 待确认事项列表

## 使用说明

1. **选择账期**：从左侧账期时间线点击选择要查看的账期
2. **查看订单**：中间区域展示该账期下的所有店铺订单
3. **识别变动**：带有橙色标记的订单表示结论有变动
4. **现金流预测**：右侧面板查看未来4周的现金流预测
5. **费用分析**：查看平台扣点与广告扣费的占比分析
6. **处理待确认**：在待确认区确认扣点补扣、延迟结算等事项
7. **补录广告扣费**：选择账期后点击"补录广告扣费"按钮
8. **导出报表**：点击"导出报表"按钮下载数据

## API接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/periods` | GET | 获取账期列表 |
| `/api/orders` | GET | 获取订单列表 |
| `/api/orders/filter` | GET | 筛选订单 |
| `/api/cashflow` | GET | 获取现金流预测 |
| `/api/pending` | GET | 获取待确认事项 |
| `/api/pending/:id/confirm` | POST | 确认待处理事项 |
| `/api/fees/breakdown/:periodId` | GET | 获取费用拆解 |
| `/api/fees` | POST | 补录广告扣费 |
| `/api/export` | GET | 导出数据 |
| `/api/health` | GET | 健康检查 |

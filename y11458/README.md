# 社区团购售后验收回放链路服务

## 项目概述

社区团购售后验收回放链路 API 服务，用于处理团长退款、仓库复核、用户备注、退款流水的完整链路追踪。

## 核心功能

### 1. 数据来源
- 团长退款表
- 仓库复核表
- 用户备注
- 退款流水

### 2. 业务能力
- **少发/坏品分流**：自动识别少发走补发，坏品走赔付
- **差异定位**：自动计算补偿金额差异
- **状态追踪**：完整记录状态变化的时间、操作者、原因
- **数据一致性**：详情接口、历史查询、导出文件共用同一数据源
- **脏记录处理**：识别缺字段、跨日、改名、金额/数量冲突等问题

### 3. 脏记录类型
- `MISSING_FIELD` - 缺字段
- `CROSS_DAY` - 跨日提交
- `NAME_CHANGED` - 商品改名
- `AMOUNT_CONFLICT` - 金额冲突
- `QUANTITY_CONFLICT` - 数量冲突

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 造数（生成测试数据）
```bash
npm run seed
```

### 3. 启动服务
```bash
npm run dev
```

### 4. 一键回放完整流程
```bash
npm run replay
```

## 目录结构

```
.
├── src/
│   ├── api/
│   │   └── routes.ts          # API路由定义
│   ├── database/
│   │   ├── index.ts           # 数据库连接
│   │   └── schema.ts          # 表结构定义
│   ├── scripts/
│   │   ├── seedData.ts        # 造数脚本
│   │   └── replay.ts          # 回放脚本
│   ├── services/
│   │   ├── AfterSalesService.ts   # 售后业务服务
│   │   ├── DataProcessor.ts      # 数据处理服务
│   │   └── ExportService.ts      # 导出服务
│   ├── types/
│   │   └── index.ts           # 类型定义
│   └── index.ts               # 服务入口
├── data/                      # 数据库文件目录
├── exports/                   # 导出文件目录
├── .env                       # 环境配置
├── package.json
├── tsconfig.json
├── test-curls.md              # 测试命令
└── README.md
```

## API 接口

### 基础接口
- `GET /api/health` - 健康检查
- `GET /api/statistics` - 统计数据

### 订单管理
- `POST /api/orders` - 创建售后单
- `GET /api/orders` - 订单列表
- `GET /api/orders/:orderNo` - 订单详情
- `GET /api/orders/:orderNo/status-logs` - 状态日志

### 业务流程
- `POST /api/orders/:orderNo/leader-refund` - 团长提交退款
- `POST /api/orders/:orderNo/warehouse-review` - 仓库复核
- `POST /api/orders/:orderNo/refund` - 财务退款
- `POST /api/orders/:orderNo/remarks` - 添加用户备注

### 脏数据处理
- `POST /api/dirty-records/detect` - 检测脏数据
- `GET /api/dirty-records` - 脏记录列表
- `POST /api/dirty-records/:dirtyId/resolve` - 解决脏记录

### 对账功能
- `POST /api/reconciliation` - 对账
- `GET /api/reconciliation` - 对账结果

### 导出功能
- `POST /api/export/orders` - 导出订单列表
- `POST /api/export/orders/:orderNo` - 导出订单详情
- `POST /api/export/dirty-records` - 导出脏记录
- `POST /api/export/reconciliation` - 导出对账报告
- `POST /api/export/status-logs` - 导出状态日志

## 状态流转

```
CREATED (创建)
    ↓
LEADER_SUBMITTED (团长提交)
    ↓
WAREHOUSE_REVIEWING (仓库复核中)
    ↓
WAREHOUSE_APPROVED / WAREHOUSE_REJECTED (仓库通过/驳回)
    ↓
REFUNDING (退款中)
    ↓
REFUND_SUCCESS / REFUND_FAILED (退款成功/失败)
    ↓
RECONCILING (对账中)
    ↓
RECONCILED / ABNORMAL (对账完成/异常)
    ↓
CLOSED (关闭)
```

## 角色定义

- `LEADER` - 团长
- `WAREHOUSE` - 仓管员
- `FINANCE` - 财务
- `SYSTEM` - 系统
- `CITY_MANAGER` - 城市负责人

## 问题类型

- `MISSING` - 少发
- `DAMAGED` - 坏品
- `AMOUNT_MISMATCH` - 金额不一致
- `QUANTITY_MISMATCH` - 数量不一致
- `OTHER` - 其他

## 城市负责人关注点

### 1. 命令脚本
- `npm run seed` - 造数
- `npm run dev` - 启动服务
- `npm run replay` - 回放流程
- `npm run export` - 导出数据

### 2. HTTP 读写
所有 API 请求响应统一格式：
```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. 本地持久化
- 数据库：SQLite (`./data/aftersales.db`)
- 导出文件：CSV (`./exports/` 目录)

### 4. 一致性保证
- 所有数据读写通过同一套 Service 层
- 导出功能直接调用详情接口相同逻辑
- 状态变更记录完整日志，可追溯

## 测试验证

详见 [test-curls.md](./test-curls.md) 获取完整测试命令序列。

快速验证流程：
1. 造数 → 启动服务
2. 检测脏数据 → 导出失败清单
3. 批量对账 → 导出对账报告
4. 查看详情接口 → 对比导出文件一致性

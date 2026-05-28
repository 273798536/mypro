# 供应链预付款核销后端服务

## 项目概述
本服务旨在解决供应商先收预付款后分批发货时，发票与入库单对不上时难以核销的问题。

## 核心功能

### 1. 预付款账本
- 记录预付款流水
- 实时追踪预付款余额
- 完整的借贷记账体系

### 2. 核销管理
- 支持发票与入库单匹配核销
- 入库单缺失时给出可操作提示
- 核销状态追踪（待核销/部分核销/已核销/已冲销）

### 3. 重点坑处理

#### 入库拆分
- 支持入库单按物料拆分
- 拆分后子入库单可独立核销

#### 发票红冲
- 支持全额/部分红冲
- 红冲自动回滚核销记录
- 自动恢复预付款余额

#### 扣罚占用
- 质量扣罚直接抵扣预付款
- 支持多种扣罚类型
- 自动更新账本余额

## 项目结构

```
src/
├── types/          # 类型定义
├── database/       # 数据库层
│   ├── connection.ts   # 数据库连接
│   ├── schema.ts     # 表结构
│   ├── sampleData.ts # 样例数据
│   └── init.ts     # 初始化脚本
├── dao/            # 数据访问层
├── services/       # 业务逻辑层
│   ├── ledgerService.ts      # 账本服务
│   ├── verificationService.ts  # 核销服务
│   ├── redFlushService.ts    # 红冲服务
│   ├── warehouseSplitService.ts # 入库拆分服务
│   └── penaltyService.ts   # 扣罚服务
├── routes/         # API路由
└── server.ts       # 服务入口
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npm run init-db
```

### 3. 启动服务

```bash
npm run dev
```

## API 接口

### 查询接口

- `GET /api/prepayment/flows` - 获取预付款流水列表
- `GET /api/prepayment/flows/:id` - 获取预付款流水详情
- `GET /api/prepayment/flows/:id/summary` - 获取核销汇总
- `GET /api/prepayment/flows/:id/invoices` - 获取发票列表
- `GET /api/prepayment/flows/:id/receipts` - 获取入库单列表
- `GET /api/prepayment/flows/:id/verifications` - 获取核销记录
- `GET /api/prepayment/flows/:id/penalties` - 获取扣罚记录
- `GET /api/prepayment/flows/:id/ledgers` - 获取预付款账本

### 业务操作

#### 执行核销

```bash
POST /api/operations/verify
```

请求体:
```json
{
  "prepaymentFlowId": "uuid",
  "invoiceId": "uuid",
  "warehouseReceiptId": "uuid",
  "verifiedAmount": 10000,
  "createdBy": "user1"
}
```

#### 冲销核销

```bash
POST /api/operations/verify/:id/reverse
```

请求体:
```json
{
  "reversedBy": "user1",
  "reason": "红冲回滚"
}
```

#### 发票红冲

```bash
POST /api/operations/red-flush
```

请求体:
```json
{
  "invoiceId": "uuid",
  "redFlushAmount": 5000,
  "createdBy": "user1",
  "reason": "退货红冲"
}
```

#### 入库单拆分

```bash
POST /api/operations/split-warehouse
```

请求体:
```json
{
  "parentReceiptId": "uuid",
  "splitItems": [
    {
      "materialCode": "MAT001",
      "materialName": "芯片A",
      "quantity": 50,
      "unitPrice": 100
    }
  ],
  "createdBy": "user1"
}
```

#### 扣罚处理

```bash
POST /api/operations/penalty
```

请求体:
```json
{
  "prepaymentFlowId": "uuid",
  "penaltyType": "quality",
  "penaltyAmount": 1000,
  "reason": "质量问题扣罚",
  "createdBy": "user1"
}
```

## 设计亮点

1. **事务一致性**: 所有业务操作都在事务中执行，确保数据一致性
2. **账本完整性**: 每笔操作都更新预付款账本，余额实时准确
3. **异常友好**: 入库单缺失时给出具体可操作提示，而非简单报错
4. **红冲回滚**: 红冲不只是提示，会实际回滚核销记录和账本余额
5. **状态追踪**: 完整的核销状态机，清晰展示每笔预付款的核销进度

# 口腔门诊材料异常回执状态机 API

## 项目概述

这是一个专门为口腔门诊设计的材料异常回执状态管理系统，用于解决种植体批号、预约记录、供应商发票和二次确认单的集中管理问题。

## 核心功能

### 1. 建账建档
- **种植体批号**：追溯种植体来源
- **预约记录**：关联患者就诊信息
- **供应商发票**：财务凭证关联
- **二次确认单**：患者知情同意附件追加

### 2. 核心状态流转
```
创建批次(DRAFT) → 提交复核(SUBMITTED) → 复核通过(APPROVED) → 结算(SETTLED) → 归档(ARCHIVED)
                          ↓                    ↑
                      驳回(REJECTED) → 主管改判(OVERRULED)
                          ↓
                    冻结(FROZEN) ↔ 解冻
```

### 3. 脏记录处理
- **缺字段检测**：自动识别必填项缺失
- **跨日记录**：标记异常日期
- **患者改名**：记录姓名变更历史
- **金额冲突**：单价*数量≠总金额时报警
- **数量冲突**：库存扣减异常检测
- **重复提交**：批次号去重校验

### 4. 权限体系(RBAC)

| 角色 | 可见字段数量 | 可执行操作 |
|------|-------------|-----------|
| 录入员(DATA_ENTRY) | 16个 | 创建、编辑、提交、撤回、上传附件 |
| 复核员(REVIEWER) | 20个 | 查看、复核通过/驳回、上传附件 |
| 主管(SUPERVISOR) | 26个 | 全部操作：改判、冻结、结算、归档、导出、处理脏记录 |
| 只读用户(READ_ONLY) | 8个 | 查看、导出 |

### 5. 院区主任视图
- 冻结前后状态对比
- 人工干预理由记录
- 汇总统计报表
- CSV导出功能

## 快速开始

### 环境要求
- Node.js >= 18
- npm >= 9

### 安装依赖
```bash
npm install
```

### 初始化数据库
```bash
# 生成 Prisma Client
npm run prisma:generate

# 执行数据库迁移
npm run prisma:migrate

# 初始化测试数据
npm run prisma:seed
```

### 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm run build && npm start
```

### 运行测试
```bash
npm test
```

## API 文档

### 认证
```bash
# 登录
POST /api/auth/login
Body: { username: "entry", password: "123456" }
```

### 回执管理
```bash
# 创建批次
POST /api/receipts
Headers: Authorization: Bearer <token>

# 提交复核
POST /api/receipts/:id/submit

# 复核
POST /api/receipts/:id/review
Body: { approved: true, reason: "数据核对无误" }

# 主管改判
POST /api/receipts/:id/overrule

# 冻结/解冻
POST /api/receipts/:id/freeze
POST /api/receipts/:id/unfreeze

# 结算/归档
POST /api/receipts/:id/settle
POST /api/receipts/:id/archive

# 查看变更历史
GET /api/receipts/:id/change-logs
```

### 附件管理
```bash
# 上传附件(支持二次确认单)
POST /api/receipts/:id/attachments
FormData: file, type: SECONDARY_CONFIRMATION

# 查看附件列表
GET /api/receipts/:id/attachments
```

### 院区主任视图
```bash
# 汇总视图
GET /api/receipts/director-view

# 冻结列表
GET /api/receipts/frozen

# 导出CSV
GET /api/receipts/export
```

### 脏记录处理
```bash
# 处理脏记录
PATCH /api/receipts/dirty-records/:id
Body: { handleOpinion: "已核实修正", correctedValue: "10000" }
```

## 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | 123456 | 主管 |
| entry | 123456 | 录入员 |
| reviewer | 123456 | 复核员 |
| director | 123456 | 院区主任 |
| viewer | 123456 | 只读用户 |

## 验收流程

### 1. 正常链路测试
```
创建批次 → 提交复核 → 复核通过 → 冻结 → 解冻 → 结算 → 归档
```

### 2. 异常场景测试
- 重复提交同一批次号
- 缺失必填字段
- 金额计算冲突
- 越权操作验证

### 3. 数据持久化测试
- 服务重启后历史数据保留
- 变更日志完整可追溯

## 项目结构

```
├── src/
│   ├── config/          # 配置文件
│   ├── lib/             # 工具库(Prisma)
│   ├── middleware/      # 中间件(认证、权限)
│   ├── routes/          # API路由
│   ├── services/        # 业务逻辑
│   ├── app.ts           # Express应用
│   └── index.ts         # 入口文件
├── prisma/
│   ├── schema.prisma    # 数据库模型
│   └── seed.ts          # 种子数据
├── tests/               # 测试用例
└── uploads/             # 附件存储
```

## 技术栈

- **后端框架**: Express + TypeScript
- **ORM**: Prisma
- **数据库**: SQLite (可切换至 PostgreSQL)
- **认证**: JWT
- **测试**: Jest + Supertest
- **文件上传**: Multer
- **CSV导出**: csv-writer

# 图书馆馆际借阅异常回执状态机服务

## 项目简介

本服务用于管理图书馆馆际借阅过程中产生的异常回执，解决跨店消费被撤销时的异常记录留存问题。核心功能包括：批次创建、附件补传、复核改判、冻结结算、撤回归档，每一步操作都支持审计追踪和历史差异对比。

## 核心特性

- **状态机管理**：7种状态流转（待复核、已通过、已拒绝、已冻结、已结算、已归档、已撤销）
- **权限控制**：4种角色（ADMIN、REVIEWER、OPERATOR、VIEWER）
- **数据一致性**：详情、导出、历史使用同一数据源
- **审计追踪**：每步操作记录前后状态差异
- **自动化检查**：重复导入、权限拦截、异常保留、重启一致性、导出一致性
- **完整业务闭环**：借阅申请、快递单、读者赔偿记录、供应商对账单全链路关联

## 技术栈

- **语言**：TypeScript
- **框架**：Express.js
- **数据库**：SQLite + Knex.js
- **认证**：基于 HTTP 头的简易认证
- **测试**：Jest + Supertest

## 快速开始

### 环境要求

- Node.js >= 18.x
- npm >= 9.x

### 安装依赖

```bash
npm install
```

### 环境变量

复制 `.env.example` 为 `.env` 并根据需要修改：

```bash
cp .env.example .env
```

### 启动服务

**开发模式**（自动重启）：

```bash
npm run dev
```

**生产模式**（自动构建后启动）：

```bash
npm start
```

服务默认运行在 `http://localhost:3000`

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm install` | 安装依赖 |
| `npm run build` | 构建 TypeScript 到 dist/ |
| `npm start` | 构建并启动生产服务 |
| `npm run dev` | 启动开发服务 |
| `npm test` | 运行所有测试 |
| `npm run lint` | 运行 ESLint 检查 |
| `npm run typecheck` | 运行 TypeScript 类型检查 |

## 项目结构

```
├── src/
│   ├── config/          # 配置管理
│   ├── types/           # TypeScript 类型定义
│   ├── db/              # 数据库初始化
│   ├── services/        # 业务逻辑层
│   │   ├── stateMachine.ts      # 状态机核心
│   │   ├── exceptionService.ts # 异常回执服务
│   │   ├── auditService.ts      # 审计日志
│   │   ├── reportService.ts    # 报表导出
│   │   ├── attachmentService.ts # 附件管理
│   │   ├── approvalEmailService.ts # 审批邮件服务
│   │   └── autoCheckService.ts # 自动化检查
│   ├── middleware/      # 中间件
│   ├── routes/        # API 路由
│   ├── utils/         # 工具函数
│   ├── app.ts         # Express 应用配置
│   └── index.ts       # 应用入口
├── tests/              # 测试文件
├── exports/            # 导出文件目录
├── data/               # 数据库文件目录
└── uploads/            # 附件上传目录
```

## API 文档

完整的 API 文档请参考 [API.md](./API.md)

### 核心流程

1. **批次创建** → 2. **复核改判** → 3. **冻结/解冻** → 4. **撤回归档**

### 认证说明

API 认证通过 HTTP 头传递：

- `x-user-id`: 用户 ID
- `x-user-name`: 用户姓名
- `x-user-role`: 用户角色 (admin/reviewer/operator/viewer)

## 测试

运行所有测试：

```bash
npm test
```

测试覆盖：

- ✅ 状态机流转测试（20个）
- ✅ 异常服务测试（18个）
- ✅ API 集成测试

## License

MIT

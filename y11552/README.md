# 智能柜补货重试补偿队列 API

可信记录系统，确保柜机库存、补货照片、退款记录和外部回执的一致性。

## 项目结构

```
y11552/
├── src/
│   ├── app.ts                    # 应用入口
│   ├── config/
│   │   └── index.ts              # 配置管理
│   ├── types/
│   │   └── index.ts              # TypeScript 类型定义
│   ├── database/
│   │   ├── init.ts               # 数据库初始化
│   │   └── dao.ts                # 数据访问对象
│   ├── services/
│   │   ├── CompensationService.ts # 补偿核心服务
│   │   └── QueueProcessor.ts     # 队列处理器
│   ├── controllers/
│   │   └── factController.ts     # API 控制器
│   ├── middleware/
│   │   ├── auth.ts               # 认证中间件
│   │   └── errorHandler.ts       # 错误处理
│   ├── routes/
│   │   └── index.ts              # 路由定义
│   └── scripts/
│       ├── seedData.ts           # 样例数据生成
│       └── automatedChecks.ts    # 自动化检查
├── data/                         # SQLite 数据库目录
├── package.json
├── tsconfig.json
├── .env                          # 环境配置
├── API_DOCS.md                   # API 文档
└── README.md
```

## 核心功能

### ✅ 幂等性保证
- 相同幂等键重复提交只更新同一条事实记录
- 历史记录可追溯重复提交行为

### ✅ 自动重试机制
- 6 种重试分类：网络问题、无效数据、缺附件、外部系统不可用、数据冲突、未知错误
- 可配置最大重试次数和间隔
- 超限自动进入死信队列

### ✅ 人工处理流程
- 人工审核、改判、补偿入账
- 完整记录处理人和原因

### ✅ 历史审计追踪
- 记录每次操作的时间、人员、变更内容
- 支持完整追溯

### ✅ 导出一致性
- 导出前自动冻结记录
- 防止导出期间数据被修改

### ✅ 运营仪表板
- 按状态、按分类统计
- 死信队列管理
- 恢复队列预览

## 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

服务器启动后访问：http://localhost:3000/health

### 生成样例数据
```bash
npm run seed
```

### 运行自动化检查
```bash
npm run test:checks
```

## 核心业务流程

```
提交事实数据
    ↓
自动检测异常 → 进入重试队列
    ↓                ↓
数据完整          定时重试
    ↓                ↓
已验证          成功→已验证
                    ↓
                  失败→重试计数+1
                    ↓
                超限→死信队列→人工恢复
```

## 样例数据说明

运行 `npm run seed` 会生成以下业务场景：

1. **缺附件样例**（上海柜机）
   - 缺少补货照片
   - 自动分类为 `missing_attachment`
   - 进入重试队列

2. **重复提交样例**（北京柜机）
   - 同一幂等键提交两次
   - 验证幂等性生效
   - 历史记录可查

3. **人工改判样例**（广州柜机）
   - 数据冲突进入重试
   - 管理员人工补偿入账
   - 完整记录处理链

4. **网络问题样例**（深圳柜机）
   - 外部回执提交失败
   - 分类为 `network_issue`
   - 等待自动重试

5. **撤回后重提样例**（杭州柜机）
   - 首次提交缺附件
   - 撤回关闭
   - 补充信息后重新提交（新幂等键）

## 边界场景覆盖

| 场景 | 处理方式 |
|------|----------|
| 重复提交 | 幂等键拦截，返回已有记录 |
| 撤回后再提交 | 新幂等键=新记录，旧记录保留 |
| 部分失败 | 异常数据进入重试队列 |
| 人工改判 | 完整记录操作人和原因 |
| 导出前冻结 | 记录锁定，防止变更 |
| 异常保留 | 错误不被吞噬，详细日志记录 |

## 配置说明

在 `.env` 文件中配置：

```env
PORT=3000                          # 服务端口
DB_PATH=./data/compensation.db    # 数据库路径
MAX_RETRY_COUNT=5                  # 最大重试次数
RETRY_INTERVAL_MINUTES=30          # 重试间隔（分钟）
DEAD_LETTER_AFTER_HOURS=24         # 死信超时（小时）
EXPORT_FROZEN_MINUTES=60           # 导出冻结时长（分钟）
ADMIN_API_KEY=admin-key-2024       # 管理员密钥
```

## API 使用

详细 API 文档请参考 [API_DOCS.md](./API_DOCS.md)

### 快速测试

```bash
# 健康检查
curl http://localhost:3000/health

# 运营仪表板
curl -H "x-user-id: test" -H "x-user-name: 测试" \
  http://localhost:3000/api/v1/facts/dashboard
```

## 数据库表结构

### compensation_facts（事实主表）
存储每一笔补偿事实的完整数据

### compensation_queue（重试队列表）
管理待重试的任务

### audit_logs（审计日志表）
记录所有操作历史

## 技术栈

- **框架**: Express.js
- **语言**: TypeScript
- **数据库**: SQLite3
- **认证**: API Key + 用户标识
- **日志**: Winston

## 运维注意事项

1. **重启后历史**: 数据库持久化存储，重启不丢失数据
2. **异常保留**: 所有错误写入 `error.log`
3. **队列恢复**: 服务重启后自动继续处理队列
4. **导出一致性**: 导出记录自动冻结，解冻后可修改

## 代码参考

- 核心业务逻辑: [CompensationService.ts](src/services/CompensationService.ts)
- 队列处理器: [QueueProcessor.ts](src/services/QueueProcessor.ts)
- 数据访问层: [dao.ts](src/database/dao.ts)
- API 控制器: [factController.ts](src/controllers/factController.ts)
- 类型定义: [index.ts](src/types/index.ts)

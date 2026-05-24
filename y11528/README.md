# 跨境小包清关验收回放链路服务

Cross-border Small Package Customs Clearance Playback Link Service

## 项目概述

本服务用于替代临时对账表，将申报表、轨迹节点、补税通知和主管批注中的异常和包裹拆分后的税费、异常件归属等信息串联起来，形成完整的清关验收回放链路。

## 核心功能

### 1. 数据管理
- **申报表管理**: 创建、查询、更新、审核、审批申报单
- **轨迹节点管理**: 记录包裹清关全流程节点
- **补税通知管理**: 管理税费核算、缴纳、豁免等流程
- **主管批注**: 记录主管审批意见，支持人工改判

### 2. 对账引擎
- 自动比对申报表、轨迹节点、补税通知的一致性
- 检测异常：缺附件、重复提交、税费错位、包裹拆分等
- 生成对账结果，支持按批次查询

### 3. 回放链路
- 单条记录可追溯：从报表数字追到原始数据
- 完整链路展示：申报单 → 轨迹节点 → 补税通知 → 主管批注

### 4. 坏数据处理
- 数据验证：格式检查、必填项验证
- 坏数据隔离：不合格数据不进入汇总
- 失败列表：可查看坏数据原因，支持人工修正

### 5. 权限控制
四种角色，权限分级：
| 角色 | 说明 | 主要权限 |
|------|------|----------|
| 录入员 (data_entry) | 数据录入人员 | 创建/查看申报单、轨迹节点 |
| 复核员 (reviewer) | 业务复核人员 | 审核申报单、运行对账、生成报告 |
| 主管 (supervisor) | 审批主管 | 审批、豁免税费、人工改判、管理坏数据 |
| 只读 (readonly) | 查看人员 | 仅查看权限 |

### 6. 报告导出
- 汇总报告：关键指标统计
- 明细报告：每条记录详情（含记录ID，可追溯）
- 坏数据报告：失败原因分析

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 一键运行完整测试流程

```bash
npm run test:flow
```

此命令会自动完成：
- 初始化数据库
- 创建测试用户
- 导入样例业务数据
- 触发坏数据场景
- 运行对账流程
- 生成对账报告

### 3. 分步操作（可选）

#### 初始化数据库
```bash
npm run db:init
```

#### 导入样例数据
```bash
npm run db:seed
```

#### 触发坏数据场景
```bash
npm run db:bad-data
```

#### 运行对账
```bash
npm run reconcile
```

#### 生成报告
```bash
npm run report:generate
```

### 4. 启动服务

```bash
npm run dev
```

服务启动后访问：
- 服务地址: http://localhost:3000
- 健康检查: http://localhost:3000/health
- API文档: 见下方API列表

## 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 录入员 | data_entry | data_entry_123 |
| 复核员 | reviewer | reviewer_123 |
| 主管 | supervisor | supervisor_123 |
| 只读 | readonly | readonly_123 |

## 样例数据场景说明

样例数据包含3个典型业务场景：

### 📌 场景1: 缺附件 (DECL-2024-000002)
- 申报单缺少商业发票和装箱单附件
- 轨迹节点有异常标记："缺少附件，需补充商业发票"
- 主管批注要求3个工作日内补充
- 补税通知状态为"逾期"

### 📌 场景2: 重复提交测试 (DECL-2024-000001)
- 正常审批通过的申报单
- 可用于测试重复提交验证
- 资料齐全，对账一致

### 📌 场景3: 包裹拆分 + 人工改判 (DECL-2024-000004)
- 包裹因重量超限进行拆分
- 税费归属错位
- 主管人工改判，调整税费核算方式
- 对账时标记为"待复核"状态

## API 接口列表

### 认证接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/auth/login | 登录 | 公开 |
| GET | /api/auth/me | 获取当前用户 | 登录 |
| GET | /api/users | 用户列表 | 主管 |

### 申报单接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/declarations | 创建申报单 | 录入员+ |
| GET | /api/declarations | 申报单列表 | 登录 |
| GET | /api/declarations/:id | 申报单详情 | 登录 |
| PUT | /api/declarations/:id | 更新申报单 | 录入员+ |
| POST | /api/declarations/:id/review | 审核申报单 | 复核员+ |
| POST | /api/declarations/:id/approve | 审批通过 | 主管 |

### 轨迹节点接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/trajectory | 创建节点 | 录入员+ |
| GET | /api/trajectory/declaration/:id | 申报单轨迹 | 登录 |
| PUT | /api/trajectory/:id | 更新节点 | 录入员+ |
| POST | /api/trajectory/:id/abnormal | 标记异常 | 录入员+ |

### 补税通知接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/tax-notices | 创建通知 | 复核员+ |
| GET | /api/tax-notices | 通知列表 | 登录 |
| GET | /api/tax-notices/:id | 通知详情 | 登录 |
| POST | /api/tax-notices/:id/paid | 标记已缴纳 | 复核员+ |
| POST | /api/tax-notices/:id/waive | 豁免税费 | 主管 |

### 对账接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/reconciliation/run | 运行对账 | 复核员+ |
| GET | /api/reconciliation/results | 对账结果列表 | 登录 |
| GET | /api/reconciliation/results/:id | 结果详情 | 登录 |
| GET | /api/reconciliation/playback/:id | 回放链路 | 登录 |
| POST | /api/reconciliation/results/:id/resolve | 标记已解决 | 主管 |

### 主管批注接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/comments | 创建批注 | 主管 |
| GET | /api/comments | 批注列表 | 登录 |

### 坏数据接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/bad-data | 坏数据列表 | 登录 |
| GET | /api/bad-data/:id | 坏数据详情 | 登录 |
| POST | /api/bad-data/:id/fix | 标记已修正 | 复核员+ |
| POST | /api/bad-data/:id/discard | 标记丢弃 | 主管 |

### 报告接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/reports/generate | 生成报告 | 主管 |
| GET | /api/reports/download/:file | 下载报告 | 登录 |

## 命令行工具

```bash
# 查看帮助
npx ts-node src/cli/index.ts --help

# 初始化数据库
npx ts-node src/cli/index.ts db:init

# 导入样例数据
npx ts-node src/cli/index.ts db:seed

# 触发坏数据场景
npx ts-node src/cli/index.ts db:bad-data

# 运行对账
npx ts-node src/cli/index.ts reconcile

# 查看回放链路
npx ts-node src/cli/index.ts playback <declarationId>

# 生成报告
npx ts-node src/cli/index.ts report:generate

# 完整测试流程
npx ts-node src/cli/index.ts test:flow
```

## 数据持久化

- 数据库: SQLite
- 数据文件: `./data/database.sqlite`
- 报告文件: `./data/reports/`
- 重启服务后数据不丢失

## 项目结构

```
.
├── src/
│   ├── entities/          # 数据模型
│   │   ├── User.ts           # 用户
│   │   ├── Declaration.ts    # 申报表
│   │   ├── TrajectoryNode.ts # 轨迹节点
│   │   ├── TaxNotice.ts      # 补税通知
│   │   ├── SupervisorComment.ts # 主管批注
│   │   ├── ReconciliationResult.ts # 对账结果
│   │   └── BadDataRecord.ts  # 坏数据记录
│   ├── controllers/       # API控制器
│   ├── middleware/        # 中间件（认证、权限）
│   ├── services/          # 业务服务
│   │   ├── reconciliation.service.ts # 对账引擎
│   │   ├── validation.service.ts     # 数据验证
│   │   └── report.service.ts         # 报告生成
│   ├── routes/            # 路由配置
│   ├── config/            # 配置（数据库、认证）
│   ├── data/              # 样例数据
│   ├── utils/             # 工具类
│   ├── cli/               # 命令行工具
│   └── index.ts           # 服务入口
├── data/                   # 运行时数据
│   ├── database.sqlite     # 数据库文件
│   └── reports/            # 报告输出目录
├── package.json
├── tsconfig.json
└── README.md
```

## 技术栈

- **运行时**: Node.js
- **语言**: TypeScript
- **Web框架**: Express
- **ORM**: TypeORM
- **数据库**: SQLite
- **认证**: JWT
- **密码加密**: bcryptjs
- **报告生成**: csv-writer
- **CLI**: commander

## 运行API测试

1. 先启动服务：
```bash
npm run dev
```

2. 再运行测试脚本：
```bash
./test-api.sh
```

## 注意事项

1. **数据追溯**: 所有报表数字都可以通过记录ID追溯到原始单据
2. **坏数据隔离**: 验证失败的数据不会进入对账汇总，但会保留在坏数据列表中
3. **权限控制**: 不同角色看到的字段范围和可执行操作不同
4. **人工改判**: 主管可以进行人工改判，改判记录会保存在主管批注中
5. **持久化**: 所有数据都保存在SQLite数据库中，重启后可查询

## 客户经理关注重点

1. **命令脚本**: `src/cli/index.ts` - 所有命令行操作入口
2. **HTTP读写**: `src/routes/index.ts` - API路由配置，清晰展示所有接口
3. **本地持久化**: 
   - 数据库: `data/database.sqlite`
   - 报告: `data/reports/`
   - 对账结果包含完整回放链路（playbackChain字段）

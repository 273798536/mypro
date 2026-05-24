# 广告素材投放验收回放链路服务

Ad Material Audit Replay Service

> 解决广告素材跨平台验收、效果归因、历史回放的全链路问题

---

## 核心功能

### 📦 批次管理
- 素材ID、审核结果、花费日报、门店交接纸统一按批次建账
- 三种重复策略：`ignore`(忽略) / `overwrite`(覆盖) / `append`(追加)
- 完整状态机：草稿 → 提交 → 处理 → 部分失败 → 完成 → 冻结

### 🔗 多平台素材映射
- 解决同素材跨平台改名后效果归因被拆散问题
- 支持 canonical ID 关联多平台不同 ID/名称
- 合并统计多平台花费、曝光、点击数据

### 📝 审计追踪
- 所有操作全量记录：谁在什么时候改了什么
- 字段级差异对比（原值 → 新值）
- 支持变更历史回放

### ⚠️ 异常检测
- 状态跳跃检测（如直接从通过变拒绝）
- 人工改判标记
- 重复素材告警
- 未冻结导出提醒

### 📊 导出对账
- 导出前强制冻结批次
- CSV格式明细导出
- 历史变更记录单独导出
- 对账报告：按平台统计花费、通过率

---

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
npm install
```

### 2. 空库启动

```bash
# 方式一：直接启动服务
npm run dev

# 方式二：先初始化数据库
npm run cli init-db
```

服务启动后访问：http://localhost:3000/health

### 3. 准备样例数据

```bash
# 生成样例素材 JSON
npm run cli gen-sample -n 10 -f materials.json

# 查看生成的文件
cat materials.json
```

### 4. 走主流程

```bash
# 4.1 创建批次
npm run cli create-batch \
  -n BATCH-20240524-001 \
  -N "5月第4周验收" \
  -o "张三" \
  -s overwrite

# 4.2 添加素材（记录返回的 batchId）
npm run cli add-materials \
  -b <batchId> \
  -f materials.json \
  -o "张三"

# 4.3 提交批次
npm run cli submit -b <batchId> -o "张三"
```

### 5. HTTP 接口操作

```bash
# 添加审核结果
curl -X POST http://localhost:3000/api/materials/audit \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "<batchId>",
    "materialId": "MAT0001",
    "status": "approved",
    "reason": "符合规范",
    "auditor": "李四"
  }'

# 添加花费日报
curl -X POST http://localhost:3000/api/materials/cost \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "<batchId>",
    "materialId": "MAT0001",
    "reportDate": "2024-05-20",
    "cost": 1500.50,
    "impressions": 50000,
    "clicks": 2500
  }'

# 一键执行完整流程测试
bash src/test/http-examples.sh
```

### 6. 对账与导出

```bash
# 查看对账报告
npm run cli report -b <batchId>

# 检测异常
npm run cli anomalies -b <batchId>

# 冻结批次（必须先冻结才能导出）
npm run cli freeze -b <batchId> -o "管理员"

# 导出数据
npm run cli export -b <batchId> -o "管理员"

# 导出历史变更记录
npm run cli history -b <batchId>
```

导出文件在 `exports/` 目录下。

### 7. 制造异常场景

```bash
# 场景1：重复提交（幂等测试）
npm run cli add-materials -b <batchId> -f materials.json  # 第二次添加同一份数据

# 场景2：撤回后再提交
npm run cli submit -b <batchId>
npm run cli withdraw -b <batchId> -o "张三"
npm run cli resubmit -b <batchId> -o "张三"

# 场景3：人工改判
curl -X POST http://localhost:3000/api/materials/manual-override \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "<batchId>",
    "materialId": "MAT0002",
    "newStatus": "approved",
    "reason": "客户特批",
    "operator": "审核主管"
  }'
```

### 8. 回放与查看差异

```bash
# 回放单个素材的所有变更
npm run cli replay -m MAT0002 -b <batchId>

# 查看批次完整历史
curl http://localhost:3000/api/audit/batch/<batchId>

# 查看某个字段的变更历史
curl "http://localhost:3000/api/audit/diff/<batchId>?fieldName=status"
```

---

## 一键全流程测试

```bash
# 运行所有测试用例
npm test
```

测试覆盖：
- ✅ 主流程（创建→添加→审核→对账→导出）
- ✅ 幂等性（重复添加、撤回再提交）
- ✅ 三种重复策略对比
- ✅ 多平台映射归因合并

---

## API 接口清单

### 批次管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/batches` | 获取批次列表 |
| GET | `/api/batches/:id` | 获取批次详情 |
| POST | `/api/batches` | 创建批次 |
| POST | `/api/batches/:id/materials` | 添加素材 |
| POST | `/api/batches/:id/submit` | 提交批次 |
| POST | `/api/batches/:id/withdraw` | 撤回批次 |
| POST | `/api/batches/:id/resubmit` | 重新提交 |
| POST | `/api/batches/:id/freeze` | 冻结批次 |
| POST | `/api/batches/:id/unfreeze` | 解冻批次 |

### 素材与审核

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/materials/:id` | 获取素材详情 |
| POST | `/api/materials/audit` | 添加审核结果 |
| POST | `/api/materials/manual-override` | 人工改判 |
| POST | `/api/materials/cost` | 添加花费日报 |
| POST | `/api/materials/mapping` | 创建映射关系 |
| POST | `/api/materials/remark` | 添加客服备注 |
| GET | `/api/materials/:materialId/merged` | 合并视图（多平台归因） |

### 审计与导出

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/audit/batch/:batchId` | 批次操作历史 |
| GET | `/api/audit/material/:materialId` | 素材变更历史 |
| GET | `/api/audit/anomalies/:batchId` | 异常检测 |
| GET | `/api/audit/replay/:materialId` | 回放变更 |
| GET | `/api/audit/report/:batchId` | 对账报告 |
| POST | `/api/audit/export/:batchId` | 导出批次数据 |
| POST | `/api/audit/export-history/:batchId` | 导出历史记录 |

---

## CLI 命令清单

```bash
npm run cli <command> [options]
```

| 命令 | 说明 |
|------|------|
| `init-db` | 初始化数据库 |
| `create-batch` | 创建批次 |
| `add-materials` | 从文件添加素材 |
| `submit` | 提交批次 |
| `withdraw` | 撤回批次 |
| `resubmit` | 重新提交 |
| `freeze` | 冻结批次 |
| `unfreeze` | 解冻批次 |
| `export` | 导出数据 |
| `report` | 对账报告 |
| `anomalies` | 检测异常 |
| `replay` | 回放变更 |
| `history` | 导出历史 |
| `gen-sample` | 生成样例数据 |

---

## 数据模型

### 核心实体关系

```
Batch (批次)
  └── Material (素材)
        ├── AuditResult (审核结果，支持多版本)
        ├── CostDaily (花费日报，按天)
        ├── MaterialMapping (多平台映射)
        └── CustomerRemark (客服备注)
  └── AuditLog (审计日志，全量操作记录)
  └── StoreHandover (门店交接纸)
```

### 状态流转

```
draft (草稿)
  ↓ submit
submitted (已提交)
  ↓
processing (处理中) ←─┐
  ↓                   │
partial_failed        │ withdraw → withdrawn (已撤回) → resubmit
  ↓                   │
completed (完成)      │
  ↓ freeze            │
frozen (已冻结) ──────┘
  ↓ unfreeze
```

### 批次状态定义

| 状态 | 说明 |
|------|------|
| `draft` | 草稿，可编辑 |
| `submitted` | 已提交，等待处理 |
| `processing` | 处理中 |
| `partial_failed` | 部分失败 |
| `completed` | 全部完成 |
| `frozen` | 已冻结，不可修改 |
| `withdrawn` | 已撤回 |

### 重复策略

| 策略 | 说明 |
|------|------|
| `ignore` | 重复素材直接跳过（默认） |
| `overwrite` | 重复素材覆盖原有信息 |
| `append` | 重复素材追加新记录 |

---

## 测试重点

### 状态变化测试

1. 正常流转：草稿 → 提交 → 完成 → 冻结 → 导出
2. 撤回流程：提交 → 撤回 → 重新提交
3. 状态限制：已冻结批次不能修改/提交
4. 部分失败：部分素材审核不通过时的批次状态

### 幂等性测试

1. 重复调用 `addMaterials` 结果一致
2. 重复提交同一份审核结果不产生副作用
3. 同一花费日报重复上报自动覆盖

### 边界场景

| 场景 | 验证点 |
|------|--------|
| 重复提交 | 按批次策略正确处理（忽略/覆盖/追加） |
| 撤回再提交 | 状态正确流转，历史记录完整 |
| 部分失败 | 失败素材可单独处理，不影响整体 |
| 人工改判 | 记录改判原因和操作人，标记为异常 |
| 导出前冻结 | 未冻结时导出失败，冻结后不可修改 |

---

## 目录结构

```
.
├── src/
│   ├── entities/           # 数据模型
│   │   ├── Batch.ts       # 批次
│   │   ├── Material.ts    # 素材
│   │   ├── AuditResult.ts # 审核结果
│   │   ├── CostDaily.ts   # 花费日报
│   │   ├── MaterialMapping.ts # 多平台映射
│   │   ├── CustomerRemark.ts  # 客服备注
│   │   ├── AuditLog.ts    # 审计日志
│   │   └── StoreHandover.ts   # 门店交接
│   ├── services/          # 业务服务
│   │   ├── BatchService.ts
│   │   ├── MaterialService.ts
│   │   ├── AuditLogService.ts
│   │   └── ExportService.ts
│   ├── routes/            # HTTP 路由
│   ├── cli/               # CLI 命令
│   ├── test/              # 测试脚本
│   ├── database/          # 数据库配置
│   └── index.ts           # 服务入口
├── data/                  # SQLite 数据库文件
├── exports/               # 导出的 CSV 文件
├── package.json
├── tsconfig.json
└── README.md
```

---

## 技术栈

- **Web 框架**: Koa 2.x
- **ORM**: TypeORM 0.3.x
- **数据库**: SQLite（嵌入式，无需额外安装）
- **语言**: TypeScript
- **CLI**: Commander.js
- **导出**: csv-writer

---

## 市场负责人关注重点

### 1. 命令脚本 (可追溯)

所有操作都有对应的 CLI 命令，参数明确，可复现：

```bash
# 创建批次（人、时间、策略都记录）
npm run cli create-batch -n BATCH-001 -o 张三 -s overwrite

# 冻结（谁冻的、什么时候冻的）
npm run cli freeze -b <id> -o 管理员
```

### 2. HTTP 读写 (透明化)

请求体、响应体结构清晰，每个接口入参可审计：

```json
// POST /api/materials/manual-override
{
  "batchId": "xxx",
  "materialId": "MAT0002",
  "newStatus": "approved",
  "reason": "客户特批，紧急活动",
  "operator": "审核主管"  // 谁改的
}
```

### 3. 本地持久化 (可回滚)

- 数据库文件：`./data/ad-material-audit.db` 可直接备份
- 所有变更都有审计日志，支持时间点回放
- 导出的 CSV 带完整字段，可二次分析

---

## 常见问题

**Q: 为什么导出前必须冻结？**

A: 防止导出后数据被修改，保证导出文件与数据库一致。冻结后可随时解冻修改。

**Q: 多平台素材如何归因？**

A: 通过 `MaterialMapping` 建立 canonical ID 与各平台 ID 的映射关系，调用 `GET /api/materials/:id/merged` 可获得合并视图。

**Q: 异常会被吞掉吗？**

A: 不会。所有异常都通过 API 返回，同时审计日志中会记录。检测异常接口会列出所有需要关注的问题。

**Q: 同一批数据跑两次怎么办？**

A: 取决于批次的 `duplicateStrategy`：
- `ignore`: 第二次跑直接跳过已有素材
- `overwrite`: 第二次跑覆盖更新
- `append`: 两次都保留，标记为重复

---

## License

MIT

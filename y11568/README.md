# 城市照明抢修验收回放链路服务

用"城市照明抢修验收回放链路服务"替掉临时对账表，把巡检照片、报修热线、备件批次和外部回执里的异常和同一路段反复熄灯却被拆成多个零散工单后的结论串起来。

## 核心特性

- ✅ **链路建账**: 从巡检照片、报修热线、备件批次开始建账，外部回执可追加
- ✅ **权限控制**: 录入、复核、主管、只读查看四级权限，可见字段和操作不同
- ✅ **数据校验**: 坏数据隔离机制，不进汇总但保留失败原因
- ✅ **操作回放**: 每一步都记录前后差异，可回看完整操作历史
- ✅ **对账功能**: 自动核对工单完整链路，发现异常标记
- ✅ **路段合并分析**: 自动识别同一路段的多个零散工单
- ✅ **导出报告**: 数据可追溯到单条记录，导出完整链路报告

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 一键完整演示

```bash
node scripts/cli.js full-demo
```

这个命令会依次执行:
- 初始化数据库和用户
- 导入样例数据
- 触发坏数据（用于测试）
- 生成分析报告

### 3. 启动服务

```bash
npm start
# 或
node scripts/cli.js start
```

服务运行在: http://localhost:3000

## 默认账号

| 角色 | 用户名 | 密码 | 权限说明 |
|------|--------|------|----------|
| 录入员 | entry_user | entry123 | 可创建、查看、编辑自己的工单 |
| 复核员 | review_user | review123 | 可复核、拒绝、查看所有数据 |
| 主管 | super_user | super123 | 所有权限，可解决坏数据 |
| 只读 | readonly_user | readonly123 | 只能查看有限字段 |

## API 接口

### 认证

```bash
# 登录获取 token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"super_user","password":"super123"}'

# 获取当前用户信息
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### 工单管理

```bash
# 工单列表
curl http://localhost:3000/api/work-orders \
  -H "Authorization: Bearer <token>"

# 创建工单
curl -X POST http://localhost:3000/api/work-orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "order_no": "WO202405240099",
    "road_section": "测试路1号",
    "light_count": 10,
    "fault_type": "bulb_broken",
    "description": "测试工单"
  }'

# 工单完整链路（照片+热线+备件+回执）
curl http://localhost:3000/api/work-orders/1/full-chain \
  -H "Authorization: Bearer <token>"

# 工单操作历史
curl http://localhost:3000/api/work-orders/1/history \
  -H "Authorization: Bearer <token>"
```

### 对账

```bash
# 单条工单对账
curl -X POST http://localhost:3000/api/reconciliation/check/1 \
  -H "Authorization: Bearer <token>"

# 批量对账
curl -X POST http://localhost:3000/api/reconciliation/batch-check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"status":"pending"}'
```

### 回放功能

```bash
# 操作日志
curl http://localhost:3000/api/replay/logs \
  -H "Authorization: Bearer <token>"

# 工单时间线
curl http://localhost:3000/api/replay/work-order/1/timeline \
  -H "Authorization: Bearer <token>"

# 路段合并分析
curl http://localhost:3000/api/replay/road-section/中山路/merge-analysis \
  -H "Authorization: Bearer <token>"

# 异常汇总
curl http://localhost:3000/api/replay/abnormal-summary \
  -H "Authorization: Bearer <token>"
```

### 坏数据管理

```bash
# 坏数据列表
curl http://localhost:3000/api/bad-data \
  -H "Authorization: Bearer <token>"

# 解决坏数据（主管权限）
curl -X POST http://localhost:3000/api/bad-data/1/resolve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"resolution_note":"已人工修正"}'
```

### 导出

```bash
# 汇总报告
curl http://localhost:3000/api/export/summary \
  -H "Authorization: Bearer <token>"

# 工单完整报告
curl http://localhost:3000/api/export/full-report/1 \
  -H "Authorization: Bearer <token>"
```

## 命令行工具

```bash
# 初始化数据库
node scripts/cli.js init

# 导入样例数据
node scripts/cli.js import

# 触发坏数据
node scripts/cli.js bad-data

# 生成报告
node scripts/cli.js report

# 启动服务
node scripts/cli.js start

# 完整演示
node scripts/cli.js full-demo
```

## 项目结构

```
.
├── src/
│   ├── server.js              # 服务入口
│   ├── config/
│   │   └── database.js        # 数据库配置
│   ├── middleware/
│   │   └── auth.js            # 权限中间件
│   ├── routes/
│   │   ├── auth.js            # 认证路由
│   │   ├── workOrders.js      # 工单路由
│   │   ├── inspectionPhotos.js # 巡检照片
│   │   ├── repairHotlines.js  # 报修热线
│   │   ├── spareParts.js      # 备件
│   │   ├── externalReceipts.js # 外部回执
│   │   ├── reconciliation.js  # 对账
│   │   ├── export.js          # 导出
│   │   ├── replay.js          # 回放
│   │   └── badData.js         # 坏数据
│   └── utils/
│       ├── operationLogger.js # 操作日志
│       └── dataValidator.js   # 数据校验
├── scripts/
│   ├── init-db.js             # 数据库初始化
│   ├── import-sample.js       # 样例数据
│   ├── trigger-bad-data.js    # 坏数据
│   ├── generate-report.js     # 报告生成
│   └── cli.js                 # 命令行工具
├── data/                      # 数据库文件
├── exports/                   # 导出文件
├── .env                       # 环境配置
└── package.json
```

## 数据库表结构

1. **users** - 用户表（4种角色）
2. **work_orders** - 工单表
3. **inspection_photos** - 巡检照片
4. **repair_hotlines** - 报修热线
5. **spare_parts** - 备件批次
6. **external_receipts** - 外部回执
7. **operation_logs** - 操作日志（含前后差异）
8. **bad_data_records** - 坏数据记录
9. **reconciliation_records** - 对账记录
10. **road_section_relations** - 路段关联

## 权限矩阵

| 操作 | 录入员 | 复核员 | 主管 | 只读 |
|------|--------|--------|------|------|
| 创建工单 | ✅ | ✅ | ✅ | ❌ |
| 编辑自己的工单 | ✅ | ✅ | ✅ | ❌ |
| 编辑所有工单 | ❌ | ✅ | ✅ | ❌ |
| 复核工单 | ❌ | ✅ | ✅ | ❌ |
| 查看坏数据 | ❌ | ✅ | ✅ | ❌ |
| 解决坏数据 | ❌ | ❌ | ✅ | ❌ |
| 查看操作日志 | ❌ | ✅ | ✅ | ❌ |
| 导出报告 | ❌ | ✅ | ✅ | ❌ |
| 查看数据（受限） | ✅ | ✅ | ✅ | ✅ |

## 复现步骤

要完整复现整个流程：

```bash
# 1. 安装依赖
npm install

# 2. 完整演示（初始化+导入+坏数据+报告）
node scripts/cli.js full-demo

# 3. 启动服务
npm start

# 4. 用主管账号登录获取 token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"super_user","password":"super123"}'

# 5. 查看工单列表
curl http://localhost:3000/api/work-orders \
  -H "Authorization: Bearer <token>"

# 6. 查看坏数据
curl http://localhost:3000/api/bad-data \
  -H "Authorization: Bearer <token>"

# 7. 对账检查
curl -X POST http://localhost:3000/api/reconciliation/check/1 \
  -H "Authorization: Bearer <token>"

# 8. 查看操作日志
curl http://localhost:3000/api/replay/logs \
  -H "Authorization: Bearer <token>"

# 9. 导出汇总报告
curl http://localhost:3000/api/export/summary \
  -H "Authorization: Bearer <token>"
```

# 智能柜补货权限追责台账服务

一个完整的后端服务系统，用于智能柜补货业务的台账管理、权限控制、审计追踪和追责追溯。

## 功能特性

### 核心业务流程
- **草稿创建**: 录入员创建台账草稿，包含柜机库存、补货照片
- **提交审核**: 提交台账进入审核流程
- **复核驳回**: 复核员可驳回并注明原因
- **二次确认**: 主管进行二次确认
- **结案归档**: 最终结案，数据不可篡改

### 追溯能力
- ✅ 柜机库存变化追溯
- ✅ 补货照片存档
- ✅ 退款记录关联
- ✅ 盘点差异分析
- ✅ 网络恢复后重复扣库存标记
- ✅ 热销格口满仓异常检测

### 脏记录处理
- **缺字段检测**: 自动检测缺失必填字段
- **跨日检测**: 检测跨日操作异常
- **改名检测**: 商品名称变更追踪
- **金额冲突**: 金额不一致检测
- **数量冲突**: 库存数量差异检测
- **保留原始内容**: 异常数据完整保留
- **处理意见**: 记录处理过程和意见
- **重新汇总**: 修正后数据重新汇总

### 权限系统
四种角色，字段级权限控制：

| 角色 | 可见字段 | 可操作动作 |
|------|---------|-----------|
| **录入员(data_entry)** | 基本信息、库存、照片 | 创建草稿、提交、编辑驳回的台账 |
| **复核员(reviewer)** | 基本信息、库存、照片、退款、审计 | 审核、驳回、确认 |
| **主管(supervisor)** | 全部字段 | 所有操作、二次确认、结案 |
| **只读(read_only)** | 基本信息、汇总数据 | 仅查看 |

### 城市运营视图
- 按角色定制的仪表板
- 变更原因完整追踪
- 敏感字段自动脱敏
- 数据来源可追溯

### 自动化检查
- ✅ **重复导入检测**: 批量导入自动去重
- ✅ **权限拦截**: 越权操作自动拦截并记录
- ✅ **异常保留**: 异常数据自动存入脏记录表
- ✅ **重启后历史**: 历史版本完整性检查
- ✅ **导出一致性**: 导出数据与原数据一致性校验

## 技术栈

- **运行时**: Node.js 16+
- **框架**: Express.js
- **数据库**: MongoDB
- **认证**: JWT
- **密码加密**: bcryptjs
- **数据导出**: CSV
- **日期处理**: dayjs

## 快速开始

### 环境要求
- Node.js 16.x 或更高版本
- MongoDB 4.4 或更高版本

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env` 文件并配置：

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/smart_cabinet_ledger
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
```

### 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 初始化测试用户

服务启动后，调用接口初始化测试用户：

```bash
curl -X POST http://localhost:3000/api/auth/init-users
```

预设用户账号：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 主管(supervisor) |
| reviewer | reviewer123 | 复核员(reviewer) |
| operator | operator123 | 录入员(data_entry) |
| viewer | viewer123 | 只读(read_only) |

## API 文档

### 认证接口

#### 登录
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

#### 获取用户信息
```
GET /api/auth/profile
Authorization: Bearer <token>
```

### 台账接口

#### 创建台账草稿
```
POST /api/ledger
Authorization: Bearer <token>
Content-Type: application/json

{
  "cabinetId": "CAB001",
  "cabinetName": "中关村一号柜",
  "address": "北京市海淀区中关村大街1号",
  "restockDate": "2024-01-15T00:00:00.000Z",
  "inventoryBefore": [
    {
      "compartmentId": "A01",
      "productId": "P001",
      "productName": "矿泉水",
      "quantity": 2,
      "isHot": true
    }
  ],
  "inventoryAfter": [
    {
      "compartmentId": "A01",
      "productId": "P001",
      "productName": "矿泉水",
      "quantity": 10,
      "isHot": true
    }
  ]
}
```

#### 获取台账列表
```
GET /api/ledger?page=1&limit=50&status=draft
Authorization: Bearer <token>
```

#### 获取台账详情
```
GET /api/ledger/:id
Authorization: Bearer <token>
```

#### 提交台账
```
POST /api/ledger/:id/submit
Authorization: Bearer <token>
```

#### 驳回台账（复核员/主管）
```
POST /api/ledger/:id/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "rejectReason": "补货照片不清晰，请重新上传"
}
```

#### 二次确认（主管）
```
POST /api/ledger/:id/second-confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "secondConfirmRemark": "情况属实，同意结案"
}
```

#### 结案（主管）
```
POST /api/ledger/:id/finalize
Authorization: Bearer <token>
```

#### 版本历史对比
```
GET /api/ledger/:id/versions/compare?v1=1&v2=2
Authorization: Bearer <token>
```

#### 审计追踪
```
GET /api/ledger/:id/audit-trail
Authorization: Bearer <token>
```

### 库存接口

#### 创建库存记录
```
POST /api/inventory
Authorization: Bearer <token>
```

#### 批量导入库存
```
POST /api/inventory/batch-import
Authorization: Bearer <token>
```

### 退款记录接口

#### 创建退款记录
```
POST /api/refund
Authorization: Bearer <token>
```

#### 添加退款到台账
```
POST /api/ledger/:id/add-refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "refundRecordId": "refund_record_object_id"
}
```

### 审计接口

#### 脏记录列表（复核员/主管）
```
GET /api/audit/dirty-records
Authorization: Bearer <token>
```

#### 处理脏记录
```
PUT /api/audit/dirty-records/:id/process
Authorization: Bearer <token>
```

#### 自动化检查统计
```
GET /api/audit/check-stats
Authorization: Bearer <token>
```

### 导出接口

#### 导出台账CSV
```
POST /api/export/ledgers
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "finalized",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

#### 导出审计轨迹
```
POST /api/export/audit-trail
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetType": "ledger",
  "targetId": "ledger_object_id"
}
```

#### 获取角色视图配置
```
GET /api/export/role-view-config
Authorization: Bearer <token>
```

## 项目结构

```
.
├── src/
│   ├── app.js                 # 应用入口
│   ├── config/
│   │   └── database.js        # 数据库配置
│   ├── middleware/
│   │   └── auth.js            # 认证授权中间件
│   ├── models/                # 数据模型
│   │   ├── User.js           # 用户模型
│   │   ├── CabinetInventory.js # 柜机库存
│   │   ├── RestockPhoto.js   # 补货照片
│   │   ├── RefundRecord.js   # 退款记录
│   │   ├── Ledger.js         # 台账主表
│   │   ├── OperationLog.js   # 操作日志
│   │   └── DirtyRecord.js    # 脏记录表
│   ├── services/             # 业务服务
│   │   ├── ledgerService.js  # 台账服务
│   │   ├── auditService.js   # 审计服务
│   │   ├── dirtyRecordService.js # 脏记录服务
│   │   ├── exportService.js  # 导出服务
│   │   └── autoCheckService.js # 自动化检查
│   └── routes/               # API路由
│       ├── auth.js
│       ├── ledger.js
│       ├── inventory.js
│       ├── refund.js
│       ├── audit.js
│       └── export.js
├── exports/                  # 导出文件目录
├── .env                      # 环境变量
├── package.json
└── README.md
```

## 台账状态流转

```
草稿(draft)
    ↓
  提交
    ↓
已提交(submitted) → 审核中(reviewing) → 已确认(confirmed) → 二次确认(second_confirm) → 已结案(finalized)
    ↓                   ↓
  驳回(rejected)      驳回(rejected)
    ↓                   ↓
  重新编辑            重新编辑
    ↓                   ↓
  重新提交            重新提交
```

## 核心数据模型

### 台账主表(Ledger)
- `ledgerNo`: 台账编号（自动生成）
- `cabinetId`: 柜机ID
- `status`: 状态
- `inventoryBefore`: 补货前库存
- `inventoryAfter`: 补货后库存
- `inventoryDiffs`: 库存差异明细
- `photoIds`: 补货照片ID列表
- `refundRecordIds`: 退款记录ID列表
- `previousVersions`: 历史版本快照
- `dirtyRecordIds`: 关联脏记录

### 脏记录表(DirtyRecord)
- `dirtyType`: 脏记录类型
- `originalData`: 原始数据完整保留
- `missingFields`: 缺失字段列表
- `conflictFields`: 冲突字段详情
- `processStatus`: 处理状态
- `processOpinion`: 处理意见
- `correctionData`: 修正后数据

## 运维监控

### 关键检查点
1. **脏记录数量**: 监控 `/api/audit/dirty-records`
2. **权限拦截次数**: 查看 `/api/audit/check-stats`
3. **重复导入情况**: 脏记录类型统计
4. **导出一致性**: 定期校验导出数据

### 数据安全
- 所有写操作记录审计日志
- 敏感字段自动脱敏
- 历史版本不可删除
- 结案后数据只读

## 注意事项

1. 生产环境务必修改 `JWT_SECRET`
2. 建议启用 MongoDB 认证
3. 定期备份 `exports` 目录
4. 脏记录需定期处理
5. 结案前请确保所有检查通过

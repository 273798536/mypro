# 智能柜补货权限追责台账服务

一个完整的后端服务系统，用于智能柜补货业务的台账管理、权限控制、审计追踪和追责追溯。

## 🛠 修复记录

### v1.2.2 - ledgerNo 自动生成修复 (2026-05-26)

**问题：ledgerNo 在 pre('save') 中生成，但验证在 save 之前执行**
- [Ledger.js:182](file:///Users/mac/pro/solo/workspaces/y11554/src/models/Ledger.js#L182-L189) 将 `pre('save')` 改为 `pre('validate')`
- Mongoose 执行顺序：`pre('validate')` → `validate` → `pre('save')` → `save`
- 修复后 ledgerNo 在验证前生成，不再报 "Path `ledgerNo` is required" 错误
- `/api/ledger` 核心入口可正常创建台账草稿

### v1.2.1 - 权限拦截日志 targetType 修复 (2026-05-26)

**问题：权限拦截日志 targetType 记录错误导致查询不到**
- 当访问 `/api/ledger/:id/submit` 被拒绝时，`req.path.split('/')[1]` 得到台账ID而非 `ledger`
- [auth.js:35-36](file:///Users/mac/pro/solo/workspaces/y11554/src/middleware/auth.js#L35-L36) 改为使用 `req.baseUrl` 获取 targetType
- [auth.js:72-73](file:///Users/mac/pro/solo/workspaces/y11554/src/middleware/auth.js#L72-L73) `requirePermission` 中间件同样修复
- [autoCheckService.js:252-268](file:///Users/mac/pro/solo/workspaces/y11554/src/services/autoCheckService.js#L252-L268) 权限拦截查询支持 ObjectId 和字符串两种匹配
- 修复后自动化检查能正确匹配真实拦截日志，不再误报"权限控制正常"

### v1.2 - 核心闭环修复 (2026-05-26)

**问题1：脱敏导出空表头**
- 修复 [exportService.js:16](file:///Users/mac/pro/solo/workspaces/y11554/src/services/exportService.js#L16-L21) `EXPORT_ROLES` 键名大小写问题
- 键名从 `DATA_ENTRY`/`SUPERVISOR` 改为 `data_entry`/`supervisor`，与实际角色值一致
- 修复后导出CSV将生成正确表头，不再空表头

**问题2：权限拦截不写日志导致误报**
- 修复 [auth.js:27-58](file:///Users/mac/pro/solo/workspaces/y11554/src/middleware/auth.js#L27-L58) `authorize` 中间件，权限拦截时记录失败日志
- 修复 [auth.js:61-92](file:///Users/mac/pro/solo/workspaces/y11554/src/middleware/auth.js#L61-L92) `requirePermission` 中间件，同样记录失败日志
- 修复 [autoCheckService.js:251](file:///Users/mac/pro/solo/workspaces/y11554/src/services/autoCheckService.js#L251-L256) 和 [autoCheckService.js:337](file:///Users/mac/pro/solo/workspaces/y11554/src/services/autoCheckService.js#L337-L341) 权限拦截日志查询匹配逻辑
- 修复后自动化检查能正确统计权限拦截次数，不再误报"无权限拦截记录"

**问题3：路由被抢占**
- 修复 [ledger.js:55-57](file:///Users/mac/pro/solo/workspaces/y11554/src/routes/ledger.js#L55-L57) `/statuses` 路由位置，移到 `/:id` 之前
- 删除底部重复的 `/statuses` 路由
- 修复后 `/api/ledger/statuses` 能正确返回状态枚举，不再被匹配为台账ID

### v1.1 - 基础功能修复

**权限闭环修复**
- 修复 [ledger.js](file:///Users/mac/pro/solo/workspaces/y11554/src/routes/ledger.js) 中所有写接口权限拦截：`POST /`, `PUT /:id`, `POST /:id/submit`, `POST /:id/add-refund`, `POST /:id/add-photo`
- 修复 [inventory.js](file:///Users/mac/pro/solo/workspaces/y11554/src/routes/inventory.js) 中 `POST /` 和 `PUT /:id` 权限拦截
- 修复 [refund.js](file:///Users/mac/pro/solo/workspaces/y11554/src/routes/refund.js) 中 `POST /` 和 `PUT /:id` 权限拦截
- 所有写接口仅允许 `data_entry`、`reviewer`、`supervisor` 角色访问，`read_only` 角色无法触发写操作

**功能补全**
- ✅ 新增 [multer.js](file:///Users/mac/pro/solo/workspaces/y11554/src/config/multer.js) 照片上传配置
- ✅ 新增 [photo.js](file:///Users/mac/pro/solo/workspaces/y11554/src/routes/photo.js) 照片上传/管理API，支持真实文件上传、去重、审核
- ✅ 脏记录检测接入主流程：[ledgerService.js](file:///Users/mac/pro/solo/workspaces/y11554/src/services/ledgerService.js#L69-L195) 创建/更新台账时自动检测缺字段、跨日、改名、金额/数量冲突
- ✅ 自动化检查覆盖5项：[autoCheckService.js](file:///Users/mac/pro/solo/workspaces/y11554/src/services/autoCheckService.js#L214-L316) 历史版本完整性、重复导入、权限拦截、异常保留、导出一致性

**测试与验证**
- ✅ 新增 [auth.test.js](file:///Users/mac/pro/solo/workspaces/y11554/tests/auth.test.js) 认证接口测试
- ✅ 新增 [permission.test.js](file:///Users/mac/pro/solo/workspaces/y11554/tests/permission.test.js) 权限控制测试（验证read_only角色被正确拦截）
- ✅ 新增 [full-flow.test.js](file:///Users/mac/pro/solo/workspaces/y11554/tests/full-flow.test.js) 完整业务流程闭环测试（从建账到结案）
- ✅ 新增 [verify-installation.js](file:///Users/mac/pro/solo/workspaces/y11554/scripts/verify-installation.js) 安装验证脚本

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

### 验证安装

```bash
npm run verify
```

该命令会检查所有依赖、源文件、测试文件是否完整。

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

### 补货照片接口

#### 上传照片（支持批量）
```
POST /api/photo/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

表单字段：
- cabinetId: 柜机ID (必填)
- photoType: 照片类型 (before_restock/after_restock/compartment_closeup/inventory_list)
- ledgerId: 关联台账ID
- compartmentId: 格口ID
- remark: 备注
- photos: 照片文件（支持多文件上传，最多20张
```

#### 获取照片列表
```
GET /api/photo?cabinetId=CAB001
Authorization: Bearer <token>
```

#### 审核照片（复核员/主管）
```
PUT /api/photo/:id/verify
Authorization: Bearer <token>
```

#### 关联照片到台账
```
PUT /api/photo/:id/link-ledger
Authorization: Bearer <token>
Content-Type: application/json

{
  "ledgerId": "60d...
}
```

### 库存接口

#### 创建库存记录
```
POST /api/inventory
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
│   │   ├── database.js        # 数据库配置
│   │   └── multer.js          # 照片上传配置
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
│   │   ├── ledgerService.js  # 台账服务（含脏记录自动检测）
│   │   ├── auditService.js   # 审计服务
│   │   ├── dirtyRecordService.js # 脏记录服务
│   │   ├── exportService.js  # 导出服务
│   │   └── autoCheckService.js # 自动化检查（5项检查）
│   └── routes/               # API路由
│       ├── auth.js
│       ├── ledger.js         # 所有写接口已加权限拦截
│       ├── inventory.js      # 所有写接口已加权限拦截
│       ├── refund.js         # 所有写接口已加权限拦截
│       ├── photo.js          # 照片上传（新增）
│       ├── audit.js
│       └── export.js
├── tests/                    # 测试文件
│   ├── auth.test.js          # 认证接口测试
│   ├── permission.test.js    # 权限控制测试
│   └── full-flow.test.js     # 完整业务流程测试
├── scripts/
│   └── verify-installation.js # 安装验证脚本
├── uploads/                  # 照片上传目录
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

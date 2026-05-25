# 企业培训签到异常回执状态机 API 使用指南

## 项目概述

这是一个完整的企业培训签到异常回执状态机服务，从报名表、签到二维码、课后作业开始建账，短信截图也可追加。核心动作包括批次创建、附件补传、复核改判、冻结结算、撤回归档，每一步都能回看前后差异。

## 项目结构

```
├── src/
│   ├── index.ts                 # 主入口文件
│   ├── types/
│   │   └── index.ts          # 类型定义
│   ├── database/
│   │   ├── data-source.ts    # 数据库配置
│   │   └── entities/         # 数据库实体
│   ├── services/               # 业务逻辑服务
│   │   ├── StateMachineService.ts   # 状态机核心
│   │   ├── ExceptionRecordService.ts # 异常记录服务
│   │   ├── BatchService.ts       # 批次服务
│   │   ├── AuditLogService.ts     # 审计日志服务
│   │   └── ReportService.ts      # 报表服务
│   ├── middleware/
│   │   └── auth.ts            # 认证和权限中间件
│   ├── routes/                  # API 路由
│   │   ├── batches.ts
│   │   ├── exceptions.ts
│   │   ├── reports.ts
│   │   └── audit.ts
│   └── scripts/
│       └── init-data.ts         # 初始化数据
├── data/                          # 示例数据文件
└── tests/
    └── boundary.test.ts         # 边界情况测试
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库和用户数据

```bash
npx ts-node src/scripts/init-data.ts
```

### 3. 启动服务

```bash
npm run dev
```

服务将在 http://localhost:3000 启动

## 预置用户

| 角色 | 用户ID | 用户名 | 密码 | 说明 |
|------|--------|--------|------|------|
| 管理员 | user-admin-001 | 系统管理员 | admin123 | 拥有所有权限 |
| HRBP | user-hrbp-001 | HRBP张三 | hrbp123 | 可复核、冻结、结算、导出 |
| 培训管理员 | user-training-001 | 培训管理员李四 | train123 | 可创建批次、导入数据、撤回 |
| 部门经理 | user-manager-001 | 部门经理王五 | mgr123 | 可查看、复核本部门 |
| 员工 | user-employee-001 | 员工赵六 | emp123 | 仅可查看和上传附件 |
| 审计员 | user-auditor-001 | 审计员钱七 | audit123 | 可查看、复核、查看审计日志 |

## API 使用指南

### 认证方式

在请求头中添加：

```
x-user-id: user-admin-001
x-user-role: admin
```

---

## 一、批次管理 API

### 1. 创建批次

**POST** `/api/batches`

请求体：
```json
{
  "name": "2024年Q1安全培训异常批次",
  "trainingId": "TRAIN-2024-Q1-SAFETY",
  "trainingName": "2024年度安全生产培训"
}
```

响应：返回创建的批次信息

### 2. 获取批次列表

**GET** `/api/batches?trainingId=&status=&page=1&pageSize=50

### 3. 导入报名表数据

**POST** `/api/batches/:id/import/registration`

Content-Type: `multipart/form-data`

字段：
- `file`: CSV文件（参考 data/sample-registration.csv）

CSV格式要求：
```
员工工号,员工姓名,部门,培训日期,异常类型
EMP001,张三,技术研发部,2024-01-15,missing_sign
```

异常类型可选值：
- `missing_sign` - 未签到
- `late_sign` - 迟到
- `early_leave` - 早退
- `proxy_sign` - 代签
- `makeup_sign` - 补签
- `mixed_sign` - 混签
- `homework_incomplete` - 作业未完成
- `photo_abnormal` - 照片异常
- `sms_evidence` - 短信证据

### 4. 导入签到二维码数据

**POST** `/api/batches/:id/import/qrcode

CSV格式：
```
员工工号,员工姓名,部门,培训日期,签到时间,是否扫码,地点,设备信息
EMP001,张三,技术研发部,2024-01-15,09:15:00,是,3楼会议室,iPhone14
```

### 5. 导入课后作业数据

**POST** `/api/batches/:id/import/homework

CSV格式：
```
员工工号,员工姓名,部门,培训日期,是否提交作业,作业分数
EMP001,张三,技术研发部,2024-01-15,是,85
```

### 6. 导入异常照片分析

**POST** `/api/batches/:id/import/photo

CSV格式：
```
员工工号,员工姓名,部门,培训日期,照片分析,是否代签,是否混签
EMP001,张三,技术研发部,2024-01-15,人脸识别不匹配,否,是
```

### 7. 追加短信截图证据

**POST** `/api/batches/:id/import/sms

CSV格式：
```
员工工号,员工姓名,部门,培训日期,短信内容,短信时间
EMP001,张三,技术研发部,2024-01-15,【HR通知迟到,2024-01-15 09:30:00
```

### 8. 查看批次导入失败记录

**GET** `/api/batches/:id/failed-records`

---

## 二、异常记录 API

### 1. 获取异常记录列表

**GET** `/api/exceptions?batchId=&employeeId=&trainingId=&department=&status=&exceptionType=&isFrozen=&page=1&pageSize=50`

状态可选值：
- `draft` - 草稿
- `pending_review` - 待复核
- `reviewing` - 复核中
- `approved` - 已确认异常
- `rejected` - 已驳回（正常）
- `supplement_required` - 需补充材料
- `frozen` - 已冻结
- `settled` - 已结算
- `withdrawn` - 已撤回
- `archived` - 已归档

### 2. 获取单条记录详情

**GET** `/api/exceptions/:id`

### 3. 复核异常记录

**POST** `/api/exceptions/:id/review`

请求体：
```json
{
  "result": "confirmed_abnormal",
  "reason": "经核实考勤系统记录，确未签到"
}
```

复核结果可选值：
- `confirmed_abnormal` - 确认异常
- `corrected_normal` - 更正为正常
- `need_more_evidence` - 需要更多证据
- `escalated` - 已升级处理

### 4. 人工改判（管理员/审计员专用）

**POST** `/api/exceptions/:id/revise`

请求体：
```json
{
  "result": "corrected_normal",
  "reason": "新证据显示已签到，人工改判",
  "targetStatus": "rejected"
}
```

### 5. 上传附件/补充证据

**POST** `/api/exceptions/:id/attachments`

Content-Type: `multipart/form-data`

字段：
- `file`: 附件文件
- `description`: 附件说明

### 6. 冻结记录（导出前）

**POST** `/api/exceptions/:id/freeze`

请求体：
```json
{
  "reason": "数据核对完成，冻结待导出"
}
```

**注意**：冻结后无法进行复核、改判、结算等操作

### 7. 解冻记录

**POST** `/api/exceptions/:id/unfreeze`

请求体：
```json
{
  "reason": "需要补充信息"
}
```

### 8. 结算记录

**POST** `/api/exceptions/:id/settle`

### 9. 撤回记录

**POST** `/api/exceptions/:id/withdraw`

请求体：
```json
{
  "reason": "数据有误，撤回修正"
}
```

### 10. 重新提交（撤回的记录

**POST** `/api/exceptions/:id/reactivate`

请求体：
```json
{
  "reason": "数据已修正，重新提交"
}
```

### 11. 归档记录

**POST** `/api/exceptions/:id/archive`

### 12. 查看状态流转历史

**GET** `/api/exceptions/:id/transitions`

### 13. 查看两次状态间的差异

**GET** `/api/exceptions/:id/diff?from=0&to=1`

### 14. 查看原始证据（不可修改）

**GET** `/api/exceptions/:id/original-evidence`

返回内容包含：
- 来源文件名
- 原始行号
- 原始值
- 解析后的标准值
- 原始证据数据

### 15. 查看当前可用的状态转换选项

**GET** `/api/exceptions/:id/valid-transitions`

---

## 三、报表导出 API

### 1. 获取HRBP汇总报告（JSON）

**GET** `/api/reports/hrbp?trainingId=&department=&startDate=&endDate=&includeFrozen=true`

返回内容：
- **summary**: 汇总统计
  - 总记录数
  - 按状态分布
  - 按异常类型分布
  - 按部门分布
  - 已冻结数量
  - 人工改判次数
  - 已结算数量
- **details**: 详细记录列表
  - 冻结前后状态对比
  - 人工改判理由
  - 来源文件和行号
- **stateChanges**: 状态变更历史

### 2. 导出HRBP报告（Excel）

**GET** `/api/reports/hrbp/export?trainingId=&department=`

生成包含三个工作表的Excel文件：
1. **汇总** - 各项统计指标
2. **明细** - 每条记录的详细信息
3. **状态变更历史** - 所有状态流转记录

### 3. 获取冻结记录报告

**GET** `/api/reports/frozen?trainingId=&department=`

---

## 四、审计日志 API

### 1. 查看审计日志

**GET** `/api/audit?resourceType=&resourceId=&userId=&actionType=&startTime=&endTime=`

### 2. 查看权限拦截记录

**GET** `/api/audit/permission-denied`

---

## 边界情况处理说明

### 1. 重复提交

**场景**：同一员工在同一培训中存在相同类型的异常记录

**处理方式**：系统自动拦截，返回错误信息 `DUPLICATE_RECORD`

**修正方式**：
- 撤回原有记录后重新导入，或在原有记录上补充证据

### 2. 撤回后再提交

**场景**：发现导入数据有误，撤回修正后重新提交

**状态流转**：
`pending_review` → `withdrawn` → `pending_review`

**修正方式**：
1. 培训管理员撤回记录
2. 修改数据
3. 重新提交进入复核流程

### 3. 部分失败

**场景**：批量导入时部分记录成功、部分失败

**处理方式**：
- 批次状态标记为 `partial_failed`
- 成功记录正常创建
- 失败记录保存在 `failedRecords` 中，包含：
  - 原始行号
  - 原始值
  - 错误信息
  - 错误代码

**修正方式**：
1. 查看失败记录列表
2. 修正错误数据
3. 单独创建或重新导入

### 4. 人工改判

**场景**：复核结果需要人工干预改判

**权限要求**：仅 `admin` 和 `auditor` 角色可执行

**状态流转记录**：
- `manualOverride` 标记为 true
- 记录改判前状态和改判后状态
- 改判理由永久保存

### 5. 导出前冻结

**场景**：导出报表前需要锁定数据，防止导出过程中数据变更

**冻结后限制**：
- 无法复核
- 无法改判
- 无法结算
- 无法撤回

**解冻后恢复**：回到待复核状态继续处理

---

## 权限控制说明

### 权限矩阵

| 权限 | 管理员 | HRBP | 培训管理员 | 部门经理 | 员工 | 审计员 |
|------|--------|------|------------|----------|------|--------|
| 创建批次 | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| 查看批次 | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| 创建异常 | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| 查看异常 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 复核异常 | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ |
| 人工改判 | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| 冻结/解冻 | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| 结算 | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| 撤回/重提 | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| 归档 | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| 上传附件 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 导出报表 | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| 查看审计 | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |

### 权限不足时的响应

```json
{
  "error": "PERMISSION_DENIED",
  "message": "权限不足：需要 freeze_record 权限",
  "currentRole": "employee",
  "requiredPermission": "freeze_record"
}
```

同时，该操作会被记录到审计日志的权限拦截记录中，可通过 `/api/audit/permission-denied` 查看。

---

## HRBP 关注要点

### 冻结前后对比

在详情列表中可查看：
- `isFrozen` - 是否冻结
- `frozenAt` - 冻结时间
- `frozenBy` - 冻结人
- `freezeReason` - 冻结理由
- 冻结前状态（从状态流转历史中查看）

### 人工改判追踪

- `manualReviewCount` - 人工改判次数
- `latestReviewResult` - 最新复核结果
- `latestReviewReason` - 最新复核理由
- 完整改判历史在状态流转中

### 报表数据来源

每条记录都包含：
- `sourceFileName` - 来源文件名
- `sourceRowNumber` - 原始行号
- 可追溯到原始导入文件

---

## 状态机状态流转图

```
draft → pending_review ← supplement_required
           ↓                    ↑
        reviewing  ─────────────┘
         ↓    ↓
    approved  rejected
         ↓    ↓
        settled
           ↓
         archived

注：pending_review 可直接通过复核操作转为 approved 或 rejected
    (无需先转 reviewing，reviewing 为可选中间状态)

withdrawn ← [所有可撤回状态]
    ↓
pending_review (重新提交)

frozen ← [所有可冻结状态]
    ↓
pending_review (解冻后)
```

---

## 测试运行

运行边界情况测试：

```bash
npx ts-node tests/boundary.test.ts
```

测试覆盖：
1. 重复提交拦截
2. 撤回后再提交
3. 部分失败处理
4. 人工改判
5. 导出前冻结
6. 权限不足拦截

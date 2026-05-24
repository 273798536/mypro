# 财务报销稽核异常回执状态机 API

## 系统概述

本系统是一个完整的财务报销稽核异常回执状态机，用于追踪从发票PDF、差旅申请、付款流水和门店交接纸等来源到多人共用行程时住宿和交通重复报销背后的责任和结果。

### 核心能力

1. **多源数据接入**：发票PDF、差旅申请、付款流水、门店交接纸、客服备注
2. **完整状态流转**：批次创建 → 附件补传 → 复核改判 → 冻结结算 → 撤回归档
3. **稽核检测**：重复发票、住宿重叠、交通重复、多人共用、日期重叠等
4. **数据持久化**：所有状态和数据保存在数据库，重启不丢失
5. **原始证据保留**：保留来源文件、原始行号和解析后标准值，改判不覆盖原始证据
6. **审计追溯**：完整的操作日志和权限拦截记录
7. **经理仪表板**：冻结前后状态、人工理由、导出汇总

---

## 快速开始

### 安装依赖

```bash
npm install
```

### 初始化数据库

```bash
npx prisma migrate dev --name init
npm run seed
```

### 运行演示流程

```bash
npx ts-node scripts/demo-flow.ts
```

### 启动API服务

```bash
npm run dev
```

服务将在 `http://localhost:3000` 启动

---

## 用户角色与权限

| 角色 | 用户名 | 权限说明 |
|------|--------|----------|
| 财务文员 | clerk01 | 创建批次、上传文件、撤回、导出 |
| 稽核员 | reviewer01 | 稽核检测、确认/驳回异常 |
| 财务经理 | manager01 | 冻结/解冻、人工改判、批准/驳回、归档 |
| 系统管理员 | admin01 | 全部权限 |

### 权限不足的操作路径示例

**场景**：财务文员 (clerk01) 尝试冻结某个批次

```bash
curl -X POST http://localhost:3000/api/batches/{batchId}/freeze \
  -H "X-Username: clerk01" \
  -H "Content-Type: application/json" \
  -d '{"reason": "测试冻结"}'
```

**返回结果** (403 Forbidden)：
```json
{
  "error": "权限不足",
  "message": "您的角色 (CLERK) 没有权限执行此操作: BATCH_FREEZE",
  "requiredRoles": ["FINANCE_MANAGER", "ADMIN"],
  "auditLogged": true
}
```

**审计记录**：系统会自动记录这次权限拦截，在审计日志中可查看到：
- 操作类型: `PERMISSION_DENIED`
- 尝试执行的动作: `BATCH_FREEZE`
- 用户信息: clerk01 (CLERK)

---

## API 接口文档

### 认证方式

所有API请求需要在Header中添加 `X-Username` 指定用户：

```
X-Username: clerk01
```

### 批次管理

#### 创建批次
```
POST /api/batches
Content-Type: application/json

{
  "title": "2024年1月差旅稽核",
  "description": "销售部门差旅报销稽核",
  "periodStart": "2024-01-01",
  "periodEnd": "2024-01-31"
}
```

#### 获取批次列表
```
GET /api/batches?page=1&pageSize=20&status=DRAFT
```

#### 获取批次详情
```
GET /api/batches/{batchId}?includeDetails=true
```

#### 状态流转操作
```
POST /api/batches/{batchId}/submit-processing   # 提交处理
POST /api/batches/{batchId}/submit-review       # 提交复核
POST /api/batches/{batchId}/freeze              # 冻结
POST /api/batches/{batchId}/unfreeze            # 解冻
POST /api/batches/{batchId}/approve             # 批准
POST /api/batches/{batchId}/reject              # 驳回
POST /api/batches/{batchId}/withdraw            # 撤回
POST /api/batches/{batchId}/resubmit            # 重新提交
POST /api/batches/{batchId}/archive             # 归档
```

### 文件管理

#### 上传文件
```
POST /api/batches/{batchId}/files
Content-Type: multipart/form-data

file: [选择文件]
fileType: INVOICE_PDF | TRAVEL_APPLICATION | PAYMENT_RECORD | STORE_HANDOVER | CUSTOMER_SERVICE_NOTE
```

#### 删除文件
```
DELETE /api/files/{fileId}
```

#### 获取文件列表
```
GET /api/batches/{batchId}/files
```

### 稽核管理

#### 运行稽核检测
```
POST /api/batches/{batchId}/audit
```

#### 获取异常列表
```
GET /api/batches/{batchId}/exceptions?status=DETECTED
```

#### 处理异常
```
POST /api/exceptions/{exceptionId}/confirm   # 确认异常
POST /api/exceptions/{exceptionId}/overrule  # 人工改判
POST /api/exceptions/{exceptionId}/dismiss   # 驳回异常
```

### 报表导出

#### 导出稽核报告
```
POST /api/batches/{batchId}/export
Content-Type: application/json

{
  "note": "2024年1月稽核报告"
}
```

#### 经理仪表板
```
GET /api/batches/{batchId}/dashboard
```

#### 导出历史
```
GET /api/exports?batchId={batchId}
```

### 审计日志

```
GET /api/audit-logs?batchId={batchId}&page=1&pageSize=50
```

---

## 样例材料与测试数据

系统提供完整的测试数据，位于 `sample-data/` 目录：

### 1. 差旅申请数据 (travel-applications.csv)

**样例数据设计**：
- APP001: 张三 1月15-18日北京出差，同行人李四、王五
- APP002: 张三 1月17-20日上海出差（与APP001日期重叠2天）
- APP003: 李四 1月15-18日北京出差（与张三同时同地）
- APP004: 王五 2月1-5日广州培训

**预期检测结果**：
- 张三的两个申请存在日期重叠（2天）
- 张三、李四、王五多人同时在北京

### 2. 付款流水数据 (payment-records.csv)

**样例数据设计**：
- PAY001/PAY002: 两笔相同金额的北京酒店付款（关联同一发票INV001）
- PAY003: 上海酒店付款
- PAY004: 广州酒店付款

**预期检测结果**：
- INV001发票关联两笔付款，存在重复报销嫌疑

### 3. 发票模拟数据 (sample-invoices.json)

**样例数据设计**：
- INV001: 北京酒店发票（重复出现2次，测试重复发票检测）
- INV002: 上海酒店发票（张三单人）
- INV003: 广州酒店发票（王五单人）
- INV004/INV005: 同日同金额打车发票（测试交通费重复检测）

**预期检测结果**：
- INV001重复出现2次 → 重复发票异常
- 北京酒店3人合住 → 多人共用行程异常
- INV004/INV005同日同金额 → 交通费重复异常

---

## 边界情况覆盖

### 1. 重复提交

**场景**：同一文件重复上传

**处理逻辑**：
- 系统计算文件SHA256哈希值
- 检测到相同哈希值文件已存在时拒绝上传
- 返回错误：`该文件已在此批次中上传过`

**修正方式**：确认是否为误操作，如确实需要重新上传需先删除原有文件

---

### 2. 撤回后再提交

**状态流转路径**：
```
DRAFT → PROCESSING → WITHDRAWN → DRAFT → PROCESSING → ...
```

**处理逻辑**：
- 撤回后状态变为 WITHDRAWN，数据保留
- 可重新提交回到 DRAFT 状态
- 所有状态变更记录在 StatusHistory 中可追溯

**报表变化**：
- 导出报告会显示完整的状态变更历史
- 撤回原因会被记录
- 异常处理结果不会丢失

---

### 3. 部分失败

**场景**：批量上传文件时部分解析失败

**处理逻辑**：
- 解析错误不会抛出异常中断整个流程
- 解析成功的记录正常保存
- 失败的原因记录在 parseErrors 返回
- 审计日志中记录解析数量和错误详情

**修正方式**：
- 根据错误信息修正源文件格式
- 重新上传修正后的文件

---

### 4. 人工改判

**改判类型**：
- `CONFIRMED`: 确认异常（稽核员）
- `DISMISSED`: 驳回异常（稽核员）
- `OVERRULED`: 人工改判（财务经理，高权限）

**处理逻辑**：
- 每次改判必须填写理由（至少5个字符）
- 改判人、时间、理由完整记录
- 原始检测结果保留，不会被覆盖
- 可在异常详情中查看完整处理轨迹

**报表变化**：
- 异常明细sheet显示所有状态变更时间点
- 汇总统计按最终状态分类
- 经理仪表板展示人工改判数量

---

### 5. 导出前冻结

**场景**：导出报告前财务经理冻结批次

**处理逻辑**：
- 冻结后无法上传/删除文件
- 冻结后无法处理异常
- 冻结原因必填
- 导出报告中记录冻结状态和原因

**报表变化**：
- 批次信息sheet显示冻结时间、冻结人、冻结原因
- `statusBefore` 字段记录导出时的状态
- 状态历史sheet包含冻结/解冻记录

---

## 异常类型说明

| 异常类型 | 严重程度 | 检测逻辑 |
|---------|---------|---------|
| DUPLICATE_INVOICE | 高 (3) | 同一发票号码出现多次 |
| DATE_OVERLAP | 高 (3) | 同一申请人差旅申请日期重叠 |
| DUPLICATE_ACCOMMODATION | 中 (2) | 同一日期多张住宿发票 |
| DUPLICATE_TRANSPORTATION | 中 (2) | 同日同金额交通发票 |
| MULTIPLE_PERSON_SHARE | 中 (2) | 发票包含多个入住人 |
| AMOUNT_MISMATCH | 中 (2) | 发票金额与付款金额不符 |
| MISSING_DOCUMENT | 中 (2) | 缺少支持文档 |
| SUSPICIOUS_ROUNDING | 低 (1) | 金额异常规整（如整数） |

---

## 数据库设计

### 核心表结构

1. **Batch** - 稽核批次
   - 状态机主表，管理整个稽核流程

2. **SourceFile** - 来源文件
   - 保存原始文件信息（文件名、哈希、存储路径）
   - 确保原始证据可追溯

3. **Invoice** - 发票数据
   - 原始数据(rawData) + 解析标准字段
   - sourceRowNo 记录原始行号

4. **TravelApplication** - 差旅申请
5. **PaymentRecord** - 付款流水

6. **AuditException** - 稽核异常
   - 完整的状态流转记录
   - 检测/确认/改判/驳回/解决 各阶段独立字段

7. **StatusHistory** - 状态历史
   - 批次状态每次变更的完整记录

8. **AuditLog** - 审计日志
   - 所有操作的完整记录，包括权限拦截

9. **ExportRecord** - 导出记录
   - 每次导出的时间、状态、文件名

---

## 失败路径与修正方式

### 场景1：重复发票检测失败

**现象**：两张相同号码的发票被系统判定为正常

**原因排查**：
1. 检查发票号码解析是否正确 → 查看 Invoice.rawData
2. 检查PDF解析质量 → 检查 SourceFile 原始文件

**修正方式**：
1. 财务经理人工改判为异常
```
POST /api/exceptions/{exceptionId}/overrule
{
  "reason": "人工核实确认重复发票"
}
```
2. 修正PDF解析逻辑后重新解析文件

---

### 场景2：误判正常为异常

**现象**：正常业务被系统误判为异常

**原因排查**：
1. 检查检测规则是否过于严格
2. 核实是否为特殊情况（如连续出差日期重叠）

**修正方式**：
稽核员驳回异常，填写理由
```
POST /api/exceptions/{exceptionId}/dismiss
{
  "reason": "张三从北京直接去上海，日期重叠属于连续出差，情况合理"
}
```

---

### 场景3：状态流转失败

**现象**：无法执行某个状态变更

**常见原因**：
1. 权限不足 → 检查用户角色权限矩阵
2. 当前状态不允许该转换 → 查看有效转换路径

**修正方式**：
1. 确认是否有权限执行该操作
2. 检查当前批次状态，选择正确的流转路径
3. 查看 `/api/batches/{batchId}` 确认当前状态

**有效状态转换图**：
```
DRAFT → PROCESSING → REVIEWING → APPROVED → ARCHIVED
  ↓          ↓          ↓          ↓
WITHDRAWN  FROZEN    REJECTED
  ↓          ↓
DRAFT    REVIEWING
```

---

## 报表变化说明

### 导出报告包含5个Sheet

#### 1. 批次信息
- 基本信息：批次号、标题、时间范围
- **状态关键信息**：冻结时间、冻结人、冻结原因
- **审批信息**：批准时间、批准人、批准备注

#### 2. 汇总统计
- 发票总数、总金额
- 异常按类型统计
- 异常按状态统计（待处理/已确认/已改判/已驳回）

#### 3. 发票明细
- **来源追溯**：来源文件名、原始行号
- 解析后的标准字段
- 原始数据保留（可通过rawData查看）

#### 4. 异常明细
- **完整状态轨迹**：检测、确认、改判、驳回各时间点
- **人工理由**：改判原因、驳回原因
- 涉及发票清单

#### 5. 状态历史
- 每次状态变更的时间、操作人、原因
- 包括冻结/解冻记录

---

## 运行测试

```bash
npm test
```

## 开发命令

```bash
npm run dev          # 开发模式启动
npm run build        # 编译
npm start            # 生产模式启动
npm run prisma:studio # 打开数据库管理界面
```

---

## 注意事项

1. **原始证据保护**：系统设计确保原始数据不会被后续改判覆盖，所有变更只新增记录
2. **审计完整性**：包括权限拦截在内的所有操作都有日志记录
3. **边界情况处理**：重复提交、撤回、部分失败等情况都有明确处理逻辑
4. **财务经理视角**：报表重点展示冻结前后状态、人工理由、汇总统计，而非单纯的数字堆砌

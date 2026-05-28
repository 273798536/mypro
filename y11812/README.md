# 门店租金抽成复核 API

面向连锁财务的租金抽成复核系统，支持保底+抽成模式计算、数据校验、状态流转、变更追踪。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库
npm run init-db

# 3. 加载样例数据
npm run load-samples

# 4. 启动服务
npm start
```

服务地址: http://localhost:3000

## 核心功能

### 1. 数据导入
- 门店信息导入
- 租赁合同导入（支持多版本）
- 抽成规则导入（梯级抽成）
- 销售数据导入
- CSV文件上传导入

### 2. 租金抽成复核
- 自动创建复核批次
- 保底+梯级抽成计算
- 数据完整性校验
- 自动生成修正提示

### 3. 状态流转
- `calculated` - 已计算
- `pending_confirmation` - 待确认（保底切换、缺字段等）
- `confirmed` - 已确认
- `finalized` - 已归档
- `re_calculating` - 重新计算中

### 4. 完整追溯
从一条复核结果可追溯：
- 合同版本信息
- 销售数据归集
- 抽成试算明细
- 状态变更历史
- 版本对比记录

### 5. 变更追踪
- 修改销售数据后重跑，自动检测变化
- 生成影响分析报告
- 字段级差异对比

### 6. 结果导出
- 复核结果导出（CSV/JSON）
- 抽成试算明细导出
- 影响分析报告导出
- 销售明细导出

## API 接口

### 导入接口
```bash
# 导入门店
POST /api/import/stores

# 导入合同
POST /api/import/contracts

# 导入抽成规则
POST /api/import/commission-rules

# 导入销售
POST /api/import/sales

# CSV文件上传导入
POST /api/import/upload/{dataType}

# 下载导入模板
GET /api/import/template/{dataType}
```

### 复核接口
```bash
# 创建并执行复核批次
POST /api/audit/batch
{
  "period": "2024-01",
  "storeIds": ["store1", "store2"]  // 可选，指定门店
}

# 获取批次列表
GET /api/audit/batches

# 获取批次下的复核记录
GET /api/audit/batch/{batchId}/records?status=pending_confirmation

# 获取单条记录详情
GET /api/audit/record/{recordId}

# 更新记录状态
POST /api/audit/record/{recordId}/status
{
  "status": "confirmed",
  "reason": "已核对合同信息",
  "operator": "财务_张三"
}

# 获取完整追溯信息
GET /api/audit/record/{recordId}/trace
```

### 导出接口
```bash
# 导出复核结果
GET /api/export/audit/{batchId}?format=csv&status=confirmed

# 导出试算明细
GET /api/export/trial/{recordId}

# 导出影响分析报告
GET /api/export/impact/{batchId}

# 导出销售明细
GET /api/export/sales/{storeId}/{period}
```

## 业务场景示例

### 场景1：数据校验提示
- 门店缺少商场名称 → 警告提示
- 合同缺少保底金额 → 待确认状态
- 缺少有效合同 → 待确认+修正提示
- 没有销售数据 → 警告提示

### 场景2：保底切换
- 系统自动检测合同版本变更
- 标记为待确认状态
- 提示核对生效日期
- 记录后续动作建议

### 场景3：退款追溯
- 系统检测到退款调整
- 提示核对归属期间
- 财务可确认后推进状态

### 场景4：销售数据变更
- 修改某门店某条销售记录
- 重新执行复核
- 系统自动标记受影响的记录
- 生成变更对比报告

## 数据模型

- **stores** - 门店表
- **contracts** - 合同表（多版本）
- **commission_rules** - 抽成规则表
- **sales_data** - 销售数据表
- **audit_batches** - 复核批次表
- **audit_records** - 复核记录表
- **status_transitions** - 状态流转表
- **import_logs** - 导入日志表

## 测试流程

```bash
# 启动服务后运行测试
npm test
```

测试脚本将自动执行：
1. 创建复核批次
2. 查看待确认记录
3. 查看追溯信息
4. 推进状态
5. 导出结果
6. 模拟变更追踪

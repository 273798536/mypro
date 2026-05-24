# 客服知识库发布多源导入巡检 CLI 工具

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化巡检项目

```bash
# 新建一个工作目录并进入
mkdir my-audit && cd my-audit

# 初始化巡检项目
node ../bin/kbase-audit.js init --name "客服知识库巡检" --desc "2024年Q1知识库发布巡检"
```

### 3. 导入数据

```bash
# 导入变更单
node ../bin/kbase-audit.js import ../samples/change_orders.csv

# 导入审核意见（同一批次）
node ../bin/kbase-audit.js import ../samples/review_opinions.csv

# 导入客服引用记录
node ../bin/kbase-audit.js import ../samples/citation_records.csv

# 导入扫码明细
node ../bin/kbase-audit.js import ../samples/scan_details.csv
```

### 4. 执行巡检检查

```bash
node ../bin/kbase-audit.js check
```

检查重点：
- 变更单是否有对应的审核意见
- 已下线答案是否仍被坐席引用（高风险）
- 数据完整性校验

### 5. 生成报告

```bash
# JSON格式报告
node ../bin/kbase-audit.js report --show-failures --show-source

# HTML格式报告（可视化）
node ../bin/kbase-audit.js report -f html -o report.html

# CSV格式（便于Excel处理）
node ../bin/kbase-audit.js report -f csv
```

报告包含：
- 失败清单（含原始行号）
- 警告清单
- 风险项（错赔风险预警）
- 按来源文件统计

### 6. 人工改判

```bash
# 列出所有问题项
node ../bin/kbase-audit.js fix --list

# 改判单个记录
node ../bin/kbase-audit.js fix --record CO004 --status pass --reason "待审核状态为正常流程"

# 批量改判
node ../bin/kbase-audit.js fix --all --status pass --reason "批量确认"
```

改判不会覆盖原始证据，所有修改都有历史记录。

### 7. 查看历史和差异

```bash
# 查看所有操作历史
node ../bin/kbase-audit.js history

# 按类型过滤
node ../bin/kbase-audit.js history --action import

# 查看详细差异
node ../bin/kbase-audit.js history --diff <import-id/fix-id>
```

### 8. 导出（冻结后导出）

```bash
# 冻结并导出
node ../bin/kbase-audit.js export -f all --include-source

# 仅导出不冻结
node ../bin/kbase-audit.js export --no-freeze

# 解冻项目
node ../bin/kbase-audit.js export --unfreeze
```

导出内容：
- 所有数据记录（含原始行号和来源文件）
- 检查结果
- 最终报告
- MANIFEST清单

---

## 边界情况处理

### 1. 重复提交

```bash
# 导入相同文件，默认会检测重复并跳过
node ../bin/kbase-audit.js import ../samples/change_orders.csv

# 允许重复导入
node ../bin/kbase-audit.js import --allow-duplicate ../samples/change_orders.csv
```

### 2. 撤回后重新提交

```bash
# 使用 --resubmit 参数，会保留旧版本
node ../bin/kbase-audit.js import --resubmit ../samples/change_orders_v2.csv
```

系统会自动记录 previousVersion，支持回滚。

### 3. 部分失败

```bash
# 允许部分导入（跳过错误行）
node ../bin/kbase-audit.js import --allow-partial bad_data.csv
```

失败行会被记录在 import errors 中，可单独查看。

### 4. 导出前冻结

导出前自动冻结项目，防止数据修改导致不一致。

---

## 数据字段说明

### 变更单 (change_order)
- `change_id`: 变更单ID
- `title`: 标题
- `status`: 状态 (online/offline/pending)
- `creator`: 创建人
- `created_at`: 创建时间
- `answer_id`: 关联答案ID

### 审核意见 (review_opinion)
- `review_id`: 审核ID
- `change_id`: 关联变更单ID
- `reviewer`: 审核人
- `opinion`: 意见内容
- `status`: 审核状态

### 客服引用记录 (citation_record)
- `citation_id`: 引用ID
- `answer_id`: 答案ID
- `agent_id`: 坐席ID
- `used_at`: 使用时间
- `conversation_id`: 会话ID

### 扫码明细 (scan_detail)
- `scan_id`: 扫码ID
- `answer_id`: 答案ID
- `user_id`: 用户ID
- `scanned_at`: 扫码时间
- `channel`: 渠道

---

## 目录结构

```
.kbase-audit/          # 配置和状态
data/
  source/              # 原始源文件备份
  parsed/              # 解析后数据（含原始证据）
  check/               # 检查结果
history/               # 操作历史和快照
reports/               # 生成的报告
exports/               # 导出数据
```

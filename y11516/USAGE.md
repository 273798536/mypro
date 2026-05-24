# 水务抢修材料多源导入巡检 CLI 使用手册

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
pip install -e .
```

### 2. 初始化项目

```bash
mkdir my_project && cd my_project
wri init
```

## 核心命令详解

### init - 初始化项目

**用途**：创建巡检项目目录结构和配置文件

**样例**：
```bash
wri init --dir ./inspect_project
```

**生成的目录结构**：
```
inspect_project/
├── imports/     # 待导入文件放置处
├── exports/     # 导出报表输出目录
├── data/        # 数据存储
│   ├── records/ # 巡检记录（JSON格式）
│   └── history/ # 变更历史（每次修改自动保存）
├── logs/        # 操作日志
└── config.yaml  # 配置文件
```

---

### import - 导入数据

**用途**：导入四种数据源，保留完整证据链

**数据源类型**：
- `dispatch_order` - 派工单
- `valve_inventory` - 阀门库存
- `site_photo` - 现场照片
- `scan_detail` - 扫码明细

**基本用法**：
```bash
wri import dispatch_order ./sample_data/dispatch_orders.csv
wri import valve_inventory ./sample_data/valve_inventory.csv
wri import site_photo ./sample_data/site_photos.csv
wri import scan_detail ./sample_data/scan_details.csv
```

**Excel文件支持**：
```bash
wri import dispatch_order ./data/工单.xlsx --sheet Sheet1
```

#### 导入结果解读

```
============================================================
导入结果: dispatch_order
============================================================
源文件: ./sample_data/dispatch_orders.csv
总行数: 5
成功: 5    ← 成功导入的记录数
失败: 0    ← 解析失败的记录数
重复: 0    ← 已存在、被更新的记录数
状态: success

导入批次: 20260524_143022
```

#### 关键特性

1. **幂等性保证**：重复导入相同业务主键的数据，只会更新同一条记录，不会重复创建

2. **证据链完整**：每条记录保留：
   - 来源文件名
   - 文件哈希值
   - 原始行号
   - 原始内容（未修改）
   - 解析后的标准值

3. **撤回后再提交**：撤回状态的记录重新导入会自动恢复为待处理状态

4. **冻结保护**：已冻结的记录不允许更新

---

### check - 数据检查

**用途**：检查数据一致性和业务规则

**用法**：
```bash
wri check                    # 检查所有数据
wri check --order-no WQ20260524001  # 检查指定工单
wri check --source-type dispatch_order  # 只检查某类数据
```

#### 检查结果示例

```
============================================================
检查结果
============================================================

dispatch_order:
  总数: 5
  有效: 3
  无效: 1
  待处理: 1

问题清单 (3 项):
  ! [1] inventory_validation
     记录: valve_inventory_a1b2c3d4e5f6
     描述: 库存为负，夜间抢修用料后补录导致
     原始行号: 3
     来源文件: ./sample_data/valve_inventory.csv
```

#### 检查规则

| 数据源 | 检查项 | 严重程度 | 说明 |
|--------|--------|----------|------|
| 派工单 | 缺少工单编号 | error | 必须字段缺失 |
| 派工单 | 数量异常（≤0） | warning | 数量可能有误 |
| 阀门库存 | 缺少阀门编码 | error | 必须字段缺失 |
| 阀门库存 | 库存为负 | warning | 夜间抢修正常场景 |
| 阀门库存 | 数量超出范围 | warning | 可能数据错误 |
| 现场照片 | 缺少工单编号 | error | 必须字段缺失 |
| 现场照片 | 缺少照片路径 | error | 必须字段缺失 |
| 扫码明细 | 缺少工单编号 | error | 必须字段缺失 |
| 扫码明细 | 缺少材料编码 | error | 必须字段缺失 |

---

### fix - 修复问题

**用途**：自动修复或人工改判数据问题

#### 自动修复

```bash
wri fix --all       # 修复所有可自动修复的问题
wri fix <record_id> # 修复单条记录
```

**可自动修复的问题**：
- 从原始证据恢复缺失的关键字段
- 数量精度修正（保留2位小数）
- 负库存标记（添加备注，不修改数值）

#### 撤回记录

```bash
wri fix --withdraw dispatch_order_a1b2c3d4e5f6
```

**撤回后特性**：
- 记录状态变为 `withdrawn`
- 保留所有历史证据
- 重新导入同一条数据会自动恢复

---

### report - 生成报表

**用途**：生成站点负责人需要的重点报表

**用法**：
```bash
wri report                    # 文本格式输出到控制台
wri report --format html      # HTML格式
wri report --output report.txt  # 保存到文件
```

#### 报表核心内容

**1. 数据概览**
- 各数据源的总数、有效、无效、待处理、撤回、人工改判、已冻结数量

**2. 失败清单（重点！）**
- 记录ID
- **来源文件**
- **原始行号**
- 错误信息
- 当前值

**3. 负库存明细（重点！）**
- 阀门编码、名称
- 库存数量（负值高亮）
- 盘点日期
- **来源文件、原始行号**
- 自动备注：夜间抢修先用料后补录

**4. 跨源关联检查**
- 派工单、照片、扫码的关联情况
- 缺少照片/扫码的工单列表

**5. 修正历史**
- 每条修正的时间、类型、内容
- 人工改判记录

---

### history - 查看变更历史

**用途**：追踪单条记录的所有变更

**用法**：
```bash
wri history dispatch_order_a1b2c3d4e5f6
```

**输出内容**：
- 每次变更的时间戳
- 变更前后的状态
- 来源文件和原始行号
- 证据链变化

---

### export - 导出数据

**用途**：导出所有巡检数据，导出前自动冻结

**用法**：
```bash
wri export                    # Excel格式，冻结所有数据
wri export --format csv       # CSV格式
wri export --no-freeze        # 不冻结直接导出
wri export --source-type dispatch_order  # 只导出某类数据
```

#### Excel导出结构

| 工作表 | 内容 |
|--------|------|
| 汇总 | 各数据源统计概览 |
| dispatch_order | 派工单明细 |
| valve_inventory | 阀门库存明细 |
| site_photo | 现场照片明细 |
| scan_detail | 扫码明细 |
| **失败清单** | 所有无效记录，含原始行号 |
| **修正历史** | 所有修改记录 |

**每笔记录均包含**：
- 来源文件
- 原始行号
- 人工改判信息

---

## 边界场景处理流程

### 场景1：重复提交

**流程**：
1. 第一次导入：创建新记录
2. 第二次导入相同业务主键：
   - 保留原有记录ID
   - 追加新的证据（不覆盖旧证据）
   - 更新当前值为最新解析值
   - 重置为待检查状态

**验证**：
```bash
# 第一次导入
wri import dispatch_order orders.csv
# 数一下：5条

# 第二次导入相同文件
wri import dispatch_order orders.csv
# 数一下：还是5条（更新），显示重复: 5
```

---

### 场景2：撤回后再提交

**流程**：
1. 导入数据 → 记录正常
2. 发现错误 → `wri fix --withdraw <id>`
3. 修正源文件 → 重新导入
4. 系统自动恢复记录状态为待处理

**验证**：
```bash
wri fix --withdraw dispatch_order_abc123
# 状态: withdrawn

wri import dispatch_order orders_corrected.csv
# 该记录被更新，状态变为 pending
```

---

### 场景3：部分失败导入

**现象**：导入结果显示 `partial_failure`

**处理**：
1. 查看失败清单中的**原始行号**
2. 对照源文件修正对应行
3. 重新导入整个文件
4. 成功的行会更新，失败的行会重新尝试

**重要**：不会因为部分行失败而回滚整个导入

---

### 场景4：人工改判

**适用**：自动修复无法处理的特殊情况

**效果**：
- 记录状态变为 `manual_judged`
- 不再参与自动检查
- 保留改判人、改判时间、改判意见
- 原始证据完整保留，不被覆盖

---

### 场景5：导出前冻结

**机制**：
1. 执行 `wri export` 时，默认先冻结所有未冻结记录
2. 冻结后的数据：
   - 不能再导入更新
   - 不能撤回或修复
   - 保证导出数据的一致性

**解冻**：如需修改，需手动编辑JSON文件移除 `is_frozen` 标记（不推荐）

---

## 证据链保障机制

### 1. 原始证据不可篡改

每条记录的 `source_evidence` 数组包含所有导入历史：
```json
{
  "source_file": "orders.csv",
  "source_file_hash": "sha256:...",
  "original_row_number": 3,
  "original_content": {...},  // 原始值，永不修改
  "parsed_standard_value": {...},
  "import_timestamp": "2026-05-24T14:30:22"
}
```

### 2. 变更历史完整记录

每次修改前自动保存历史版本到 `data/history/` 目录

### 3. 人工改判不覆盖原始值

改判值存在 `manual_judgment.override_value`，原始值保留在 `source_evidence` 中

---

## 配置文件说明

`config.yaml` 可配置项：

```yaml
data_sources:
  dispatch_order:
    required_columns: [order_no, repair_date, ...]
    date_format: "%Y-%m-%d"

validation:
  allow_negative_inventory: false  # 设为true则负库存不报warning
  quantity_precision: 2
  max_quantity: 10000

reporting:
  highlight_thresholds:
    negative_inventory: -1
    mismatch_rate: 0.1
```

---

## 常见问题

**Q: 导入时报错"缺少必要列"怎么办？**
A: 检查CSV/Excel的列名是否与配置一致，注意大小写和空格

**Q: 如何重新导入已撤回的记录？**
A: 直接重新导入源文件即可，系统会自动恢复

**Q: 冻结后发现数据错误怎么办？**
A: 1. 导出数据留档 2. 删除data/records下对应JSON 3. 重新导入修正后的文件

**Q: 证据链中的文件哈希有什么用？**
A: 用于事后审计，验证源文件未被篡改

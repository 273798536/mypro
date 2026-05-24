# 会议室占用多源导入巡检CLI工具

## 功能概述

处理会议室预约的真实交接场景，对预约日历、门禁刷卡、临时取消消息、二次确认单四类数据进行交叉校验，识别"会议取消但茶歇和设备仍被准备"等成本难追回的问题。

## 快速开始

### 安装依赖

```bash
npm install
npm run build
npm link
```

### 初始化工作区

```bash
mr-inspect init
```

## 命令详解

### 1. init - 初始化工作区

在当前目录创建 `.mr-inspect` 目录和 SQLite 数据库。

```bash
mr-inspect init
```

### 2. import - 导入数据源

支持 `.csv`、`.xlsx`、`.xls` 格式文件。

**四种数据源类型：**
- `booking` - 预约日历
- `access` - 门禁刷卡
- `cancellation` - 临时取消消息
- `confirmation` - 二次确认单

**导入预约日历：**
```bash
mr-inspect import --type booking samples/bookings.csv
```

**指定批次导入（多源数据使用同批次ID）：**
```bash
mr-inspect import --type booking --batch BATCH-20260520 samples/bookings.csv
mr-inspect import --type access --batch BATCH-20260520 samples/access.csv
mr-inspect import --type cancellation --batch BATCH-20260520 samples/cancellations.csv
mr-inspect import --type confirmation --batch BATCH-20260520 samples/confirmations.csv
```

**撤回导入：**
```bash
mr-inspect import --type booking --withdraw samples/bookings.csv
```

**保留信息：**
- 来源文件名
- 文件哈希（用于查重和撤回）
- 原始行号
- 原始数据（raw_data，不允许覆盖）
- 解析后标准值（parsed_data）

### 3. check - 运行一致性校验

```bash
mr-inspect check
```

**指定批次校验：**
```bash
mr-inspect check --batch BATCH-20260520
```

### 4. report - 生成巡检报告

```bash
mr-inspect report
```

**只显示失败记录：**
```bash
mr-inspect report --failures-only
```

**指定批次：**
```bash
mr-inspect report --batch BATCH-20260520
```

### 5. fix - 人工改判

```bash
mr-inspect fix <记录ID> --status success --reason "核实无误" --operator "张三"
```

**状态选项：**
- `success` - 标记为成功
- `failed` - 标记为失败
- `withdrawn` - 标记为已撤回

### 6. history - 查看操作历史

```bash
mr-inspect history
```

```bash
mr-inspect history --limit 50
```

### 7. export - 导出巡检结果

```bash
mr-inspect export --batch BATCH-xxxx --format xlsx
```

**导出前冻结（防止后续修改）：**
```bash
mr-inspect export --batch BATCH-xxxx --freeze
```

**格式选项：**
- `xlsx` - Excel格式（默认），包含「巡检结果」和「失败清单」两个sheet
- `csv` - CSV格式

## 校验规则

### 严重问题（Fail）

1. **预约取消冲突** - 预约状态非取消，但存在取消记录或确认取消
2. **茶歇设备成本风险** - 已取消的会议仍有茶歇或设备需求（**核心业务逻辑**）
3. **时间不一致** - 结束时间早于开始时间

### 警告（Warning）

1. **取消缺少确认单** - 取消记录缺少对应的二次确认单
2. **已取消会议的门禁记录** - 门禁刷卡时间对应已取消会议时段
3. **孤立记录** - 取消记录或确认单找不到对应预约
4. **取消时间过晚** - 取消时间晚于原会议开始时间（可能已产生成本）
5. **重复记录** - 同一ID存在多条记录

## 样例材料

`samples/` 目录包含测试数据：

| 文件 | 说明 | 预设问题 |
|------|------|----------|
| bookings.csv | 预约日历（5条） | B003已取消但茶歇=是；B005结束<开始 |
| access.csv | 门禁刷卡（7条） | A004、A005对应已取消的B003时段 |
| cancellations.csv | 取消消息（2条） | C002对应不存在的B006 |
| confirmations.csv | 二次确认单（4条） | CONF004对应不存在的B999 |

## 失败路径与修正方式

### 场景1：重复提交

**现象：** 导入时显示「重复跳过」

**原因：** 文件哈希+原始行号+数据源类型构成唯一键，重复导入同一文件会自动跳过。

**修正：**
1. 确认数据无误则无需处理
2. 如需重新导入，先 `--withdraw` 撤回，修正文件后再导入

### 场景2：撤回后再提交

**操作流程：**
```bash
# 撤回
mr-inspect import --type booking --withdraw samples/bookings.csv

# 修正文件后重新导入
mr-inspect import --type booking samples/bookings_fixed.csv
```

### 场景3：部分失败

**现象：** 部分记录解析失败或校验失败

**定位：**
```bash
# 查看报告中的失败明细
mr-inspect report --failures-only

# 关注字段：原始行号、失败原因
```

**修正方式A - 改判（数据实际正确）：**
```bash
mr-inspect fix 5 --status success --reason "格式虽特殊但数据有效" --operator "李经理"
```

**修正方式B - 重导（数据确实错误）：**
1. 修正源文件对应行号
2. 撤回原文件导入
3. 重新导入修正后的文件

### 场景4：人工改判

**注意事项：**
- 原始证据（raw_data）永久保留，不会被覆盖
- 改判记录（override_records表）完整记录：字段、原值、新值、原因、操作人、时间
- 已冻结（frozen）状态的记录无法改判

### 场景5：导出前冻结

**目的：** 确保导出报表的数据不可篡改，保证审计一致性。

**操作：**
```bash
mr-inspect export --batch BATCH-xxxx --freeze --format xlsx
```

**冻结后影响：**
- 记录状态变为 `frozen`
- 无法进行 `fix` 改判
- 再次导出带 `--freeze` 会提示已冻结

## 报表变化说明

### 修正前 vs 修正后

| 阶段 | 失败数 | 说明 |
|------|--------|------|
| 首次校验 | 5 | 包含所有检测到的问题 |
| 人工改判3条 | 2 | 失败数减少，改判记录可追溯 |
| 重新导入修正文件 | 1 | 原始行号对应新文件行 |

### 行政经理关注字段

导出报表中重点关注：

1. **原始行号** - 直接定位源文件问题行
2. **失败清单** - 独立Sheet，只列有问题的记录
3. **源文件/文件哈希** - 确认数据来源版本
4. **改判次数/操作人** - 追踪人工干预
5. **校验问题数/警告数** - 问题严重程度量化

## 数据库结构

- `import_records` - 导入记录主表
- `override_records` - 人工改判历史
- `check_results` - 校验结果明细
- `export_records` - 导出操作日志
- `metadata` - 元数据

## 项目结构

```
.
├── src/
│   ├── cli.ts              # CLI入口
│   ├── db/
│   │   └── database.ts     # 数据库层
│   ├── models/
│   │   └── types.ts        # 数据模型
│   ├── parsers/            # 各数据源解析器
│   └── services/
│       └── checker.ts      # 校验服务
├── samples/                # 样例数据
└── package.json
```

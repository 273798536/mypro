# 仓内波次拣货多源导入巡检 CLI (wwi)

## 项目概述

这是一个面向仓储经理的波次拣货数据巡检工具，解决主管临时换指标、数据需要补传、改判、缺货拆单后重新汇总等场景。

**核心设计原则：单一事实来源**
- 所有数据通过唯一的事实键（factKey）统一管理
- 重复导入只会更新同一条事实，不会重复计算
- 报表、详情、历史、导出文件都来自同一数据源，确保数据一致性

## 功能特性

| 命令 | 功能 | 说明 |
|------|------|------|
| `init` | 初始化工作区 | 创建目录结构和数据库 |
| `import` | 导入数据 | 支持波次单、拣货差异、复核扫描、客服备注 |
| `check` | 数据校验 | 单字段校验 + 跨源一致性校验 |
| `fix` | 数据修正 | 手动改判、缺货拆单后重新汇总 |
| `report` | 生成报表 | 汇总报表 + 明细追溯 |
| `history` | 历史查询 | 导入批次、修正记录 |
| `export` | 数据导出 | CSV/JSON格式，统一事实 |

## 快速开始

### 1. 安装依赖

```bash
npm install
npm run build
```

### 2. 初始化工作区

```bash
# 在当前目录初始化
npx ts-node src/index.ts init

# 或强制重新初始化
npx ts-node src/index.ts init --force
```

初始化后会创建 `.wwi/` 目录：
```
.wwi/
├── facts.db          # SQLite事实数据库（单一事实来源）
├── config.json       # 配置文件
├── data/             # 待导入数据目录
├── exports/          # 导出文件目录
├── reports/          # 报表目录
└── logs/             # 日志目录
```

### 3. 准备数据文件

将CSV数据文件放入 `.wwi/data/` 目录，文件命名需遵循以下规则：

| 数据类型 | 文件名模式 | 示例 |
|---------|-----------|------|
| 波次单 | `wave_*.csv` | `wave_20240501_001.csv` |
| 拣货差异 | `pick_diff_*.csv` | `pick_diff_20240501_001.csv` |
| 复核扫描 | `review_scan_*.csv` | `review_scan_20240501_001.csv` |
| 客服备注 | `customer_note_*.csv` | `customer_note_20240501_001.csv` |

示例数据在 `examples/` 目录下，可以直接复制使用：
```bash
cp examples/*.csv .wwi/data/
```

### 4. 导入数据

```bash
# 导入所有匹配的文件
npx ts-node src/index.ts import

# 只导入特定类型
npx ts-node src/index.ts import --type wave

# 导入指定文件
npx ts-node src/index.ts import --file wave_20240501_001.csv

# 指定操作人
npx ts-node src/index.ts import --operator 张三
```

**重要：**
- 相同事实键（数据源+波次号+订单号+SKU编码）的数据会自动更新，不会重复插入
- 每条记录保留原始行号，便于追溯源文件

### 5. 数据校验

```bash
# 校验所有数据
npx ts-node src/index.ts check

# 只校验指定波次
npx ts-node src/index.ts check --wave WAVE001

# 校验并导出失败清单
npx ts-node src/index.ts check --export
```

校验内容包括：
- **单字段校验**：必填字段、数值合法性
- **跨源一致性校验**：波次单商品在拣货/复核数据中是否存在，反之亦然

失败清单包含：原始行号、数据源、错误码、错误信息

### 6. 查看报表

```bash
# 汇总报表
npx ts-node src/index.ts report

# 指定波次
npx ts-node src/index.ts report --wave WAVE001

# 显示明细
npx ts-node src/index.ts report --detail

# 导出报表
npx ts-node src/index.ts report --export
```

报表数字都可追溯到单条记录，点击factKey可查看详情。

### 7. 修正数据

```bash
# 查看无效记录列表
npx ts-node src/index.ts fix

# 查看修正历史
npx ts-node src/index.ts fix --list

# 手动修正字段
npx ts-node src/index.ts fix --fact-key "wave:WAVE001:ORD001:SKU001" --field planQty --value 12

# 缺货拆单（重新汇总波次绩效）
npx ts-node src/index.ts fix --wave WAVE001 --split
```

### 8. 历史查询

```bash
# 查看所有历史（导入批次 + 修正记录）
npx ts-node src/index.ts history

# 只看导入历史
npx ts-node src/index.ts history --type import

# 查看单条记录完整历史
npx ts-node src/index.ts history --fact-key "wave:WAVE001:ORD001:SKU001"
```

### 9. 导出数据

```bash
# 导出全部数据
npx ts-node src/index.ts export

# 按波次导出
npx ts-node src/index.ts export --wave WAVE001

# 按状态导出（只导出有效数据）
npx ts-node src/index.ts export --status valid

# 导出JSON格式
npx ts-node src/index.ts export --format json
```

## 数据规范

### 波次单字段

| 字段 | 必填 | 说明 |
|------|------|------|
| waveNo | 是 | 波次号 |
| orderNo | 是 | 订单号 |
| skuCode | 是 | SKU编码 |
| skuName | 是 | SKU名称 |
| planQty | 是 | 计划数量 |
| storeCode | 是 | 门店编码 |
| storeName | 是 | 门店名称 |
| picker | 否 | 拣货员 |
| area | 否 | 拣货区域 |

### 拣货差异字段

| 字段 | 必填 | 说明 |
|------|------|------|
| waveNo | 是 | 波次号 |
| orderNo | 是 | 订单号 |
| skuCode | 是 | SKU编码 |
| pickQty | 是 | 拣货数量 |
| diffQty | 是 | 差异数量（负为少拣，正为多拣） |
| diffType | 是 | 差异类型 |
| diffReason | 否 | 差异原因 |
| picker | 否 | 拣货员 |
| pickTime | 否 | 拣货时间 |

### 复核扫描字段

| 字段 | 必填 | 说明 |
|------|------|------|
| waveNo | 是 | 波次号 |
| orderNo | 是 | 订单号 |
| skuCode | 是 | SKU编码 |
| reviewQty | 是 | 复核数量 |
| reviewer | 否 | 复核员 |
| reviewTime | 否 | 复核时间 |
| isException | 是 | 是否异常（true/false） |
| exceptionReason | 否 | 异常原因 |

### 客服备注字段

| 字段 | 必填 | 说明 |
|------|------|------|
| waveNo | 是 | 波次号 |
| orderNo | 是 | 订单号 |
| skuCode | 否 | SKU编码（空则为订单级备注） |
| noteType | 是 | 备注类型 |
| noteContent | 是 | 备注内容 |
| operator | 否 | 操作人 |
| noteTime | 否 | 备注时间 |
| isUrgent | 是 | 是否紧急（true/false） |

## 设计亮点

### 1. 单一事实来源
- 所有命令共用同一个SQLite数据库
- factKey = 数据源类型 + 波次号 + 订单号 + SKU编码
- 重复导入自动执行upsert，确保数据一致性

### 2. 完整可追溯
- 每条记录保留：原始行号、来源文件、导入批次
- 所有修改都有fix_record记录，保留新旧值对比
- 校验错误单独存储，不污染原始数据

### 3. 坏数据隔离
- 校验不通过的数据标记为invalid状态
- 报表汇总时自动排除invalid数据
- 失败清单可单独导出，方便修正后重新导入

### 4. 支持补传和改判
- 补传数据：同名factKey自动合并更新
- 缺货拆单：diffQty为负时自动拆分计算实际拣货量
- 手动改判：指定factKey修改任意字段，保留操作痕迹

## 典型工作流程

```bash
# 1. 初始化
wwi init

# 2. 导入第一批数据（波次单、拣货差异）
cp wave.csv pick_diff.csv .wwi/data/
wwi import

# 3. 主管要求补传复核扫描
cp review_scan.csv .wwi/data/
wwi import  # 自动关联已有数据，不会重复

# 4. 客服补备注
cp customer_note.csv .wwi/data/
wwi import

# 5. 数据校验
wwi check --export  # 生成失败清单

# 6. 根据失败清单修正源文件，重新导入
wwi import
wwi check

# 7. 缺货拆单，重新计算绩效
wwi fix --wave WAVE001 --split

# 8. 生成最终报表
wwi report --detail --export

# 9. 导出统一数据给其他系统
wwi export --status valid
```

## 仓储经理关注点

1. **原始行号**：所有导出文件和报表都包含原始行号，可直接定位到源文件
2. **失败清单**：check --export 生成完整的错误列表，包含错误码和错误信息
3. **修正后再导入**：fix命令支持手动改判，所有修改都有历史记录可查
4. **数据一致性**：列表、详情、历史、导出都是同一套数据，不会出现数字打架

## 项目结构

```
src/
├── index.ts              # CLI入口
├── types.ts              # 类型定义
├── database.ts           # 数据库管理（单一事实来源）
├── utils.ts              # 工具函数
└── commands/
    ├── init.ts           # 初始化命令
    ├── import.ts         # 数据导入命令
    ├── check.ts          # 数据校验命令
    ├── fix.ts            # 数据修正命令
    ├── report.ts         # 报表命令
    ├── history.ts        # 历史查询命令
    └── export.ts         # 数据导出命令
```

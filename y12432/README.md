# 保税仓进口关税暂估工具 (BDE)

跨境供应链财务专用命令行工具，解决保税仓进口关税暂估流程中的核心痛点。

## 核心特性

### 🔍 **数据来源可追溯**
- 商品清单、报关单、暂估报告分别记录，每条数据都保留来源文件、工作表、行号信息
- 复核时可以清晰看到每条记录的原始来源，不再被压成一行总记录

### ⚠️ **宁可待复核，不做假通过**
- 税则错用（HS编码不一致）自动标记
- 汇率跨期（使用非当期汇率）自动检测
- 补申报覆盖（同一SKU同一期间多次暂估）自动识别
- 计算口径不一致（暂估值与计算值差异过大）自动比对
- 异常保留（税费为0或异常偏低）自动检查
- 所有异常项统一标记为「待复核」，不输出不可信的通过结果

### 📊 **差异导出有记录**
- 期间差异对比：逐月对比暂估数据变化
- 导入批次对比：两次导入的数据差异
- 所有差异支持一键导出，无需事后翻聊天记录

### ✅ **基础检查有保障**
- 重复导入检测：文件哈希校验，防止重复导入
- 异常保留：数据异常不自动清除，保留待查
- 导出校验：导出文件带校验码，支持事后验真

## 快速开始

### 安装

```bash
cd /path/to/project
pip install -e .
```

或直接使用 `PYTHONPATH` 运行：

```bash
export PYTHONPATH=/path/to/project/src
python -m bde.cli --help
```

### 生成示例数据

```bash
python generate_examples.py
```

### 典型工作流程

```bash
# 1. 导入商品清单
bde import file examples/商品清单_202605.xlsx --by 财务A

# 2. 导入报关单
bde import file examples/报关单_202605.xlsx --by 财务A

# 3. 导入暂估报告
bde import file examples/暂估报告_202605.xlsx --by 财务A

# 4. 执行暂估计算和异常检测
bde estimate --period 202605

# 5. 查看待复核记录
bde review list --period 202605

# 6. 查看单条记录详情（含数据来源追溯）
bde review show 1

# 7. 复核处理
bde review approve 1 --by 主管 --notes "情况属实"
bde review reject 5 --by 主管 --notes "税则号错误，请核实"
bde review resolve-anomaly 3 --by 财务A --notes "已确认汇率差异为月末调汇"

# 8. 查看统计
bde review stats --period 202605

# 9. 差异比较
bde diff period 202604 202605 --export

# 10. 导出数据
bde export estimations --period 202605 --by 财务A
bde export anomalies --period 202605 --by 财务A

# 11. 校验导出文件
bde export verify /path/to/exported/file.xlsx

# 12. 生成月度报告（月底转发用）
bde report 202605 --by 财务A
```

## 批量操作

```bash
# 批量导入一个目录下的所有Excel
bde import batch "data/*.xlsx" --by 财务A

# 批量导入指定类型
bde import batch "data/报关单*.xlsx" --type 报关单 --by 财务A

# 强制导入（跳过重复检查）
bde import file examples/暂估报告_202605_补申报.xlsx --force --by 财务A
```

## 异常类型说明

| 异常类型 | 说明 |
|---------|------|
| 税则错用 | 暂估使用的HS编码与商品清单或报关单不一致 |
| 汇率跨期 | 使用的汇率不属于当前暂估期间 |
| 补申报覆盖 | 同一SKU同一期间存在多条暂估记录 |
| 重复导入 | 同一文件多次导入 |
| 异常保留 | 暂估税费为0或异常偏低 |
| 计算口径不一致 | 暂估值与根据报关数据计算的值差异过大 |
| 数据缺失 | 关键字段为空 |

## 复核状态

| 状态 | 说明 |
|-----|------|
| 待复核 | 存在未解决的异常 |
| 已复核 | 异常已标记解决但未最终审批 |
| 已通过 | 审批通过，异常同步标记解决 |
| 已驳回 | 审批驳回 |

## 数据存储位置

- 数据目录：`~/.bde/`
- 数据库：`~/.bde/data/bde.db` (SQLite)
- 导出目录：`~/.bde/exports/`

## 命令一览

```
bde import file     # 导入单个文件
bde import batch    # 批量导入文件
bde estimate        # 执行暂估计算和异常检测
bde review list     # 列出待复核记录
bde review show     # 查看记录详情
bde review stats    # 查看统计信息
bde review approve  # 审批通过
bde review reject   # 驳回
bde diff period     # 期间差异比较
bde diff import     # 导入批次差异比较
bde export estimations  # 导出暂估明细
bde export anomalies    # 导出异常明细
bde export verify       # 校验导出文件
bde report          # 生成月度报告
bde info            # 查看工具信息
```

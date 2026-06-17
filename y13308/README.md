# 病历问答误判回放

病历问答评测结果分析工具，用于定位误判样本、识别重复评测、追踪拉偏结论的记录。

---

## 1. 启动

### 安装依赖

```bash
pip install -r requirements.txt
```

### 运行分析

```bash
# 基础分析
python main.py run data/sample_data.csv

# 指定阈值（覆盖配置文件）
python main.py run data/sample_data.csv --threshold 0.8

# 指定配置文件
python main.py run data/sample_data.csv -c config.yaml
```

输出包含：
- **已处理** / **已跳过** / **坏行** 三类数量分开统计
- 字段识别映射（自动兼容不同版本字段名）
- 正确 / 误判 / 不确定 / 重复评测 明细
- 可能拉偏结论的样本列表

---

## 2. 重跑

### 修改阈值后重新运行

阈值改动后，旧结论的变化可通过重跑验证：

```bash
# 阈值 0.75
python main.py run data/sample_data.csv -t 0.75

# 阈值 0.80
python main.py run data/sample_data.csv -t 0.80

# 对比两次导出的 JSON，可精确看到哪些样本结论发生了变化
```

### 筛选查看

```bash
# 只看误判样本
python main.py list data/sample_data.csv --only-wrong

# 只看重复评测
python main.py list data/sample_data.csv --only-duplicates

# 只看拉偏结论的样本
python main.py list data/sample_data.csv --only-outliers

# 按来源筛选
python main.py list data/sample_data.csv --source 内部

# 查看单条详情
python main.py detail data/sample_data.csv S003
```

**字段名兼容**：即使版本说明中字段名前后不一致（如"来源" vs "数据源"、"处理状态" vs "评测状态"），工具也能自动识别，**来源和处理状态一定保住**。

---

## 3. 查看截图说明

### 导出截图说明报告

```bash
# 导出 Markdown 格式的截图说明报告
python main.py export data/sample_data.csv -f report

# 导出 Excel（含汇总+明细）
python main.py export data/sample_data.csv -f excel

# 导出 CSV 明细表
python main.py export data/sample_data.csv -f csv

# 导出完整 JSON（可用于后续重跑对比）
python main.py export data/sample_data.csv -f json
```

**状态一致性保证**：页面（CLI）上显示的"已处理/已跳过/坏行""重复评测""拉偏结论"等标记，与导出文件中的字段值**完全一致**，评审时截图和文件说法统一。

报告中重点列出：
- 拉偏结论的样本（评审追问哪几条带偏了结论时直接用）
- 所有误判样本的详情（问题、金标准、预测、置信度）
- 重复评测样本标记（不会和正常材料混淆）

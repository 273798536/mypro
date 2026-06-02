# 图论社群欺诈筛查分析工具

用于风控欺诈筛查的图分析工具，支持社群发现、路径追踪、风险标签管理、人工修正回溯等功能。

## 启动方式

### 环境准备

```bash
# 安装依赖
pip install poetry
poetry install

# 或直接使用pip
pip install networkx pandas numpy pyvis
```

### 快速启动演示

```bash
# 运行完整演示
python -m fraud_graph_analyzer.cli demo

# 运行演示并导出结果
python -m fraud_graph_analyzer.cli demo --export
```

### 常用命令

```bash
# 查看帮助
python -m fraud_graph_analyzer.cli --help

# 运行完整分析
python -m fraud_graph_analyzer.cli analyze --nodes acc_001,acc_002

# 检查地址边问题
python -m fraud_graph_analyzer.cli address
python -m fraud_graph_analyzer.cli address --account acc_001
python -m fraud_graph_analyzer.cli address --priority high

# 生成网络图
python -m fraud_graph_analyzer.cli graph --nodes acc_001

# 导出数据
python -m fraud_graph_analyzer.cli export --format csv
python -m fraud_graph_analyzer.cli export --format json
```

## 样例位置

- 样例数据内置在 `src/fraud_graph_analyzer/main.py` 的 `_load_sample_data()` 方法中
- 演示输出文件位于 `output/` 目录：
  - `output/graphs/` - 网络图HTML文件
  - `output/reports/` - CSV和JSON导出文件

## 关系过长的触发办法

### 触发条件

关系过长告警在以下情况触发：

1. **BFS遍历路径长度超过阈值**（默认阈值：4）
   - 当从起始节点出发的BFS遍历访问的节点数量超过 `long_relation_threshold`
   - 默认配置：`config.graph.long_relation_threshold = 4`

2. **如何触发演示**
   ```bash
   # 方式1：运行demo，样例数据中dev_001设备关联4个账户，会触发设备共享告警
   python -m fraud_graph_analyzer.cli demo
   
   # 方式2：修改配置触发
   # 在config.py中设置较小的阈值
   # max_path_length = 3
   # long_relation_threshold = 2
   ```

3. **手动创建长路径**
   ```python
   from fraud_graph_analyzer import FraudGraphAnalysisTool
   
   tool = FraudGraphAnalysisTool()
   # 创建长链条: acc_1 -> acc_2 -> acc_3 -> acc_4 -> acc_5
   # 然后从acc_1开始BFS遍历，路径长度会触发告警
   ```

### 告警处理

- 触发关系过长后，风险等级会自动降级（HIGH->MEDIUM, MEDIUM->LOW）
- 原始值和当前值都会被保留，可在 `special_case_handler.get_audit_log()` 中查看
- 可通过人工修正功能恢复或调整风险等级

## 核心功能

### 1. 统一数据源机制

所有功能（图表、明细、下载）共用同一 `AnalysisContext`，确保数据一致性：

```python
# 创建分析上下文
context = analyzer.create_analysis_context(
    node_ids=["acc_001", "acc_002"],
    tag_version="v1.0"
)

# 生成图表（使用同一上下文）
graph_path = analyzer.generate_network_graph(context)

# 查看明细（使用同一上下文）
details = analyzer.get_node_details(context, "acc_001")

# 导出数据（使用同一上下文）
csv_paths = analyzer.export_to_csv(context)
```

### 2. 标签口径影响分析

当风险标签口径变更时，可分析影响范围：

```python
# 比较两个标签版本
diff = version_manager.compare_tag_versions("v1.0", "v2.0")

# 分析版本变更的影响
impact = version_manager.analyze_version_impact(
    "v1.0", "v2.0",
    graph_store.nodes,
    traverser.traversal_history,
    communities
)

# 查看受影响的图遍历
print(impact.affected_traversals)
```

### 3. 特殊场景处理

- **关系过长**：路径超过阈值时自动降级风险，保留原始值用于复盘
- **设备共享误伤**：设备关联账户过多时标记待复核，支持标记误伤
- **标签滞后**：标签长期未更新时自动调整风险等级

### 4. 人工修正与回溯

```python
# 标记误伤
diff = correction_manager.mark_false_positive(
    node_id="acc_003",
    operator="analyst_01",
    reason="正常业务共享设备"
)

# 查看遍历状态变化
state_diff = correction_manager.get_traversal_state_diff(traversal_id)

# 查看节点完整历史
history = correction_manager.get_node_history("acc_003")
```

### 5. 地址边缺失提示

```bash
# 批量查看地址边问题
python -m fraud_graph_analyzer.cli address

# 查看特定账户的可操作建议
python -m fraud_graph_analyzer.cli address --account acc_005
```

输出包含：
- 问题类型（缺失/陈旧）
- 优先级
- 建议操作
- 具体步骤

## 配置说明

配置文件位置：`src/fraud_graph_analyzer/config.py`

```python
# 图遍历配置
max_path_length = 5              # 最大遍历深度
max_community_size = 50          # 最大社群规模
min_community_size = 2           # 最小社群规模
address_edge_staleness_days = 3  # 地址边陈旧阈值(天)
device_share_threshold = 3       # 设备共享告警阈值
long_relation_threshold = 4      # 关系过长阈值
```

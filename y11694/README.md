# 图论最短路审计 CLI

物流线路数据审计工具 - 帮助算法工程师快速检查最短路结果的合理性。

## 快速开始

### 1. 安装依赖

```bash
pip install -e .
```

或

```bash
pip install -r requirements.txt
```

### 2. 生成示例数据

```bash
graph-audit generate-sample --output-dir examples
```

### 3. 验证数据

```bash
graph-audit validate -n examples/nodes.csv -e examples/edges.csv -f examples/forbidden.csv
```

### 4. 执行审计

**单点查询:**
```bash
graph-audit audit -n examples/nodes.csv -e examples/edges.csv -f examples/forbidden.csv -s N01 -t N10
```

**批量查询:**
```bash
graph-audit audit -n examples/nodes.csv -e examples/edges.csv -f examples/forbidden.csv -q examples/queries.csv
```

**输出报告:**
```bash
graph-audit audit -n examples/nodes.csv -e examples/edges.csv -f examples/forbidden.csv -q examples/queries.csv --output-json report.json --output-csv output/
```

## 输入文件格式

### 节点表 (nodes.csv)
```csv
node_id,name,type
N01,北京仓,仓库
N02,天津配送点,配送点
```

### 边表 (edges.csv)
```csv
source,target,weight,road_type,distance_km
N01,N02,5.0,高速,50
N01,N03,3.0,国道,30
```

### 禁行边表 (forbidden.csv) - 可选
```csv
source,target,reason
N02,N05,道路施工
N07,N09,交通管制
```

### 查询表 (queries.csv)
```csv
source,target
N01,N10
N01,N08
```

## 主要功能

### 1. 图解析
- 自动解析节点、边、禁行边数据
- 检查数据完整性和格式错误
- 保留数据来源追踪

### 2. 路径解释
- 显示完整路径和每段边的权重
- 累计权重计算
- 标注负权边和禁行边

### 3. 异常检测
- **负权边检测**: 自动识别并使用Bellman-Ford算法
- **孤立点检测**: 标记没有连接的节点
- **禁行未生效检测**: 对比禁行前后的路径差异
- **负权环检测**: 检测并定位负权环
- **重复边检测**: 识别重复的边记录

### 4. 边敏感度分析
- 分析移除每条边对路径的影响
- 标记关键边（移除后路径中断或权重大幅增加）

### 5. 批量查询
- 支持单个查询和批量文件查询
- 进度显示和结果汇总

### 6. 报告输出
- **JSON报告**: 完整的审计数据，便于后续处理
- **CSV报告**: 分三个文件（路径、问题、边详情）
- **控制台输出**: 彩色格式化显示

## 命令详解

### audit - 执行审计

```
graph-audit audit [OPTIONS]

选项:
  -n, --nodes FILE          节点表CSV文件路径
  -e, --edges FILE          边表CSV文件路径 [必填]
  -f, --forbidden FILE      禁行边表CSV文件路径
  -s, --source TEXT         起点节点ID
  -t, --target TEXT         终点节点ID
  -q, --query-file FILE     批量查询CSV文件路径
  -j, --output-json FILE    输出JSON报告文件路径
  -c, --output-csv PATH     输出CSV报告目录路径
  --no-sensitivity          跳过边敏感度分析（加快速度）
  --no-forbidden-check      跳过禁行边对比检查
  --algorithm [auto|dijkstra|bellman-ford]
                            强制使用的算法 [默认: auto]
```

### generate-sample - 生成示例数据

```
graph-audit generate-sample [OPTIONS]

选项:
  -o, --output-dir PATH      输出目录 [默认: examples]
  --with-issues / --no-issues  是否生成包含异常的数据 [默认: True]
```

### validate - 验证图数据

```
graph-audit validate [OPTIONS]

选项:
  -n, --nodes FILE          节点表CSV文件路径
  -e, --edges FILE          边表CSV文件路径 [必填]
  -f, --forbidden FILE      禁行边表CSV文件路径
```

## 异常处理场景

### 场景1: 负权边
- 自动检测并切换到Bellman-Ford算法
- 在路径中标注负权边
- 发出警告提示

### 场景2: 孤立点
- 检测起点/终点是否为孤立点
- 明确提示无法计算的原因

### 场景3: 禁行未生效
- 对比应用禁行规则前后的路径
- 标记使用了禁行边的路径
- 显示禁行规则导致的路径变化和权重差异

### 场景4: 负权环
- 检测负权环的存在
- 显示环的具体路径
- 标记为严重错误

## 输出说明

### JSON报告结构
```json
{
  "metadata": { ... },
  "graph_summary": { ... },
  "parse_issues": [ ... ],
  "audit_results": [
    {
      "query": { "source": "N01", "target": "N10" },
      "baseline_result": { ... },
      "audit_findings": [ ... ],
      "edge_sensitivity": [ ... ],
      "edge_explanations": [ ... ],
      "forbidden_comparison": { ... }
    }
  ],
  "summary": { ... }
}
```

### CSV报告文件
1. `paths.csv` - 所有查询的路径结果汇总
2. `findings.csv` - 所有审计发现的问题
3. `edges_detail.csv` - 路径中每条边的详细信息

## 最佳实践

1. **先验证再审计**: 使用 `validate` 命令先检查数据质量
2. **处理脏数据**: 工具可以处理含异常的数据，但建议先清理
3. **按需跳过分析**: 大数据量时使用 `--no-sensitivity` 加快速度
4. **保留报告**: 每次审计都输出JSON报告，便于追溯和对比

## 项目结构

```
graph_audit/
├── __init__.py
├── cli.py          # CLI入口
├── graph.py        # 图数据结构和解析
├── algorithm.py    # 最短路算法
├── auditor.py      # 审计逻辑
└── report.py       # 报告生成
```

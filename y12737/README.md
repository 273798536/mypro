# 欧拉路径巡检工具 使用说明

## 一、启动

### 1.1 环境要求
- Python 3.8+
- 无第三方依赖（仅使用标准库）

### 1.2 快速启动
```bash
# 查看帮助
python3 euler_inspect.py --help

# 查看具体命令帮助
python3 euler_inspect.py check --help
python3 euler_inspect.py boundary --help
python3 euler_inspect.py records --help
python3 euler_inspect.py review --help
```

---

## 二、导入数据并执行检测

### 2.1 支持的输入格式

**JSON 格式（推荐）**
```json
{
  "name": "图名称",
  "directed": false,
  "vertices": ["A", "B", "C"],
  "edges": [
    {"source": "A", "target": "B", "weight": 1.0},
    {"source": "B", "target": "C", "weight": 1.0}
  ]
}
```

**CSV 格式**
```csv
source,target,weight
A,B,1
B,C,1
```

**TXT 边列表格式**
```
# 注释行
name = 图名称
directed = false
A B 1
B C 1
```

### 2.2 检测单个文件
```bash
python3 euler_inspect.py check --input samples/euler_circuit_undirected.json
```

### 2.3 批量检测多个文件
```bash
# 指定多个文件
python3 euler_inspect.py check \
  --input samples/euler_circuit_undirected.json \
  --input samples/empty_graph.json \
  --input samples/disconnected_graph.json

# 指定格式（所有输入按同格式解析）
python3 euler_inspect.py check --input samples/*.json --format json
```

### 2.4 常用参数
| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--input, -i` | 输入文件路径（可多次指定） | 必填 |
| `--format, -f` | 输入格式: json/csv/txt | 自动推断 |
| `--output, -o` | 输出文件或目录 | 不导出 |
| `--output-format` | 导出格式: json/txt | json |
| `--no-construct` | 仅检测条件，不构造路径 | 构造 |
| `--start-vertex` | 指定路径起始顶点 | 自动选择 |
| `--operator` | 操作员标识 | algorithm_engineer |
| `--records-dir` | 记录存储目录 | ./euler_records |

---

## 三、查看异常与边界样例

### 3.1 列出所有预定义边界样例
```bash
python3 euler_inspect.py boundary --list
```

输出会显示：
- 标签（如 EMPTY_GRAPH、DISCONNECTED 等）
- 严重级别：error / warning / info
- 问题描述和触发条件

### 3.2 追溯指定边界样例的详细信息
```bash
python3 euler_inspect.py boundary --trace EMPTY_GRAPH
```

输出包含：
- 问题描述
- 触发条件
- **处理意见**（给算法工程师的操作建议）
- 典型场景举例

### 3.3 在历史记录中查找某类边界样例
```bash
python3 euler_inspect.py boundary --find DISCONNECTED
```

### 3.4 查看所有含错误的记录
```bash
python3 euler_inspect.py records --errors
```

---

## 四、复核记录（无需重新导入）

### 4.1 查看待复核记录
```bash
python3 euler_inspect.py records --unreviewed
```

### 4.2 对单条记录进行复核
```bash
python3 euler_inspect.py review \
  --record <record_id> \
  --notes "数据确认无误，边界样例为预期测试场景"
```

每条记录处理完成后，终端会输出复核入口：
```
[复核入口] 记录ID: 20260609_120000_123
    复核命令: euler-inspect review --record 20260609_120000_123 --notes "你的意见"
```

直接复制命令即可复核，无需重新导入数据。

---

## 五、导出结果

### 5.1 检测时即时导出
```bash
# 单文件导出为指定文件
python3 euler_inspect.py check \
  --input samples/euler_circuit_undirected.json \
  --output result.json

# 批量导出到目录
python3 euler_inspect.py check \
  --input samples/*.json \
  --output ./results/ \
  --output-format json

# 导出为文本报告
python3 euler_inspect.py check \
  --input samples/euler_circuit_undirected.json \
  --output report.txt \
  --output-format txt
```

### 5.2 导出历史记录
```bash
# 导出所有批次记录
python3 euler_inspect.py records --export all_records.json
```

### 5.3 导出参数缺口报告
```bash
python3 euler_inspect.py gaps --export gaps_report.json
```

缺口报告列出：
- 缺失/异常的参数名
- 严重级别（critical / warning / info）
- 当前值和建议值
- 受影响的项目
- 是否可恢复

---

## 六、处理记录管理

### 6.1 查看最近批次
```bash
python3 euler_inspect.py records --list
```

### 6.2 查看批次详情
```bash
python3 euler_inspect.py records --show <batch_id>
```

### 6.3 对比两条记录
```bash
python3 euler_inspect.py records --compare <record_id_1> <record_id_2>
```

可用于：
- 同一图不同版本的结果对比
- 修复前后的结果验证
- 回归测试

---

## 七、异常追溯流程（验收标准）

当检测到异常结果时，按以下路径追溯：

```
异常结果
  ↓
终端输出记录ID
  ↓
euler-inspect boundary --trace <边界标签>
  ↓ 获取：边界定义 + 处理意见
  ↓
euler-inspect records --show <batch_id>
  ↓ 获取：关联记录 + 原始参数
  ↓
euler-inspect review --record <id> --notes "已核实..."
  ↓ 标记复核，无需重跑
```

---

## 八、样例数据

`samples/` 目录提供以下样例：

| 文件 | 说明 | 预期结果 |
|------|------|----------|
| `euler_circuit_undirected.json` | 无向欧拉回路 | EULER_CIRCUIT |
| `euler_path_undirected.json` | 无向欧拉路径 | EULER_PATH |
| `euler_circuit_directed.json` | 有向欧拉回路 | EULER_CIRCUIT |
| `euler_path_directed.json` | 有向欧拉路径 | EULER_PATH |
| `empty_graph.json` | 空图（边界） | NONE + EMPTY_GRAPH |
| `no_edges_graph.json` | 无边孤立点（边界） | NONE + NO_EDGES |
| `two_vertex_one_edge.json` | 两顶点单边（边界） | EULER_PATH |
| `disconnected_graph.json` | 不连通图 | NONE + DISCONNECTED |
| `odd_vertex_count.json` | 奇数度顶点异常 | NONE + ODD_VERTEX_COUNT |
| `directed_degree_mismatch.json` | 有向图度不匹配 | NONE + degree error |
| `with_isolated_vertices.json` | 含孤立顶点 | 正常 + warning |
| `sample_graph.csv` | CSV 格式样例 | EULER_CIRCUIT |
| `sample_graph.txt` | TXT 边列表样例 | EULER_CIRCUIT |

---

## 九、容错行为说明

- **参数缺失**：使用默认值继续处理，不会整批失败，事后列出缺口
- **单文件导入失败**：跳过该文件，继续处理其他文件
- **边数据格式错误**：跳过该条边，记录警告，不影响其他边
- **空集合输入**：标记为边界样例，不报错退出

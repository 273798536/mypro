# prob-review 概率树错因复盘工具

建模社助教专用的概率树错因复盘 CLI。纯 Python 3 标准库实现，无需额外依赖。

## 快速开始

```bash
# 1. 处理示例数据（自动生成处理记录 + 报告）
python3 prob_review_cli.py run \
  --input examples/sample_trees.json \
  --output ./out \
  --report

# 2. 查看所有处理记录
python3 prob_review_cli.py list --output ./out

# 3. 进入交互复核（查看详情、添加复核意见、标记已复核）
python3 prob_review_cli.py review --output ./out

# 4. 按误差ID / 节点ID倒查（验收场景：从异常一路追到计算草稿和处理意见）
python3 prob_review_cli.py trace --output ./out <记录ID> <误差ID或节点ID>
```

## 子命令一览

| 子命令 | 说明 |
|--------|------|
| `run`     | 批量处理输入，按 hash 去重，幂等安全 |
| `list`    | 列出所有处理记录 |
| `review`  | 交互复核：看误差、看树、加意见、标记已复核 |
| `report`  | 重新生成 Markdown 报告 |
| `trace`   | 按误差/节点ID倒查来源与处理记录 |

## 输入文件格式

JSON 文件，包含 `trees` 数组，每棵树节点字段：

```json
{
  "id": "唯一ID",
  "label": "节点名称",
  "probability": 0.35,
  "calc_note": "计算草稿引用/备注（倒查用）",
  "source_ref": "来源引用，如草稿第3页-表2",
  "raw_value": "原始录入值（便于比对笔误）",
  "children": [ /* 子节点 */ ]
}
```

## 校验规则

1. **概率范围**：`0 ≤ P ≤ 1`，超限判严重
2. **子节点和为 1**：父节点下所有子节点概率和偏离 1 的程度分级
3. **父子关系**：子节点条件概率不应造成联合概率超过父节点

阈值：轻微 ≥2%，中等 ≥5%，较大 ≥10%，严重 ≥20%。

## 验收倒查流程

以 sample_trees.json 为例，存在以下故意设置的异常：

- `node_staff`：概率值 1.3（>1，百分比未换算）
- `node_supply`：概率值 -0.05（负值，符号误写）
- `node_market` 下三子节点概率和 = 1.05（>1，归一性错误）

验收操作：

```bash
# 1. 首次跑批
python3 prob_review_cli.py run -i examples -o ./out -r

# 2. 记录输出中的 记录ID 与 严重偏差ID
# 3. 倒查某条严重误差：
python3 prob_review_cli.py trace -o ./out <记录ID> <误差ID>
#    输出将包含：误差详情、计算草稿引用、处理意见、
#               在概率树中的回溯路径、历史复核记录
```

## 幂等性保障

同一输入文件重复运行时（hash 不变且不加 `-f`）：
- 不会生成新的处理记录
- 不会覆盖已有记录
- 只提示"已存在"并跳过
- 加 `-f/--force` 才会重新处理

# 拓扑路径连通检查工具

## 功能特性

- **孤立节点检测**: 识别没有任何边连接的节点
- **反向边检测**: 识别方向为反向(reverse)的边
- **跨层连接检测**: 识别跨不同层级的边连接
- **路径连通性检查**: 检查图的连通分量
- **无障碍标签影响分析**: 分析无障碍标签变更对路径的影响
- **幂等性保证**: 重复运行结果一致
- **变更对比**: 与上次运行结果对比

## 快速开始

### 使用示例数据运行：

```bash
python -m topology_checker/cli.py --sample
```

### 正常使用：

1. 准备节点数据文件 (nodes.json):
```json
{
  "nodes": [
    {"node_id": "N1", "name": "节点1", "layer": "1F"},
    {"node_id": "N2", "name": "节点2", "layer": "1F"}
  ]
}
```

2. 准备边数据文件 (edges.json):
```json
{
  "edges": [
    {"edge_id": "E1", "from_node": "N1", "to_node": "N2", "direction": "forward"}
  ]
}
```

3. 第一次运行（仅导入节点和边：

```bash
python -m topology_checker/cli.py --nodes nodes.json --edges edges.json --save-snapshot phase1
```

4. 准备无障碍标签数据 (accessible.json):
```json
{
  "nodes": [
    {"node_id": "N1", "accessible": true}
  ],
  "edges": [
    {"edge_id": "E1", "accessible": true}
  ]
}
```

5. 第二次运行（补录无障碍标签并对比：

```bash
python -m topology_checker/cli.py --nodes nodes.json --edges edges.json --accessible accessible.json --compare --use-accessible
```

## 边界样例包含：

- **孤立节点**: 无任何边连接的节点
- **跨层错连**: 连接不同layer的边
- **方向边反**: direction为reverse的边

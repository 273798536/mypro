# 应急物资调度系统

## 功能特性

- **最短路算法**：基于Dijkstra优先队列实现，自动计算最优配送路线
- **多目录隔离**：每个调度任务在独立目录中运行，数据互不干扰
- **幂等运行**：同一批数据重复运行结果一致，不会越跑越乱
- **上下文管理**：自动归并仓库、道路、车辆、需求到同一调度任务
- **错误追踪**：
  - 道路中断：检测中断道路并提示绕行方案
  - 需求重复：自动识别重复需求并提示去重
  - 车辆超载：检测超载情况并提示分批配送
- **报告导出**：支持JSON和文本格式的复盘报告

## 快速开始

### 1. 创建新的调度目录

```bash
python3 main.py new my_dispatch
```

或基于模板创建：
```bash
python3 main.py new my_dispatch --template examples/sample_with_blocked_road
```

### 2. 准备数据

在目录中编辑以下文件：
- `warehouses.json` - 仓库库存
- `roads.json` - 道路状态
- `vehicles.json` - 车辆信息
- `demands.json` - 物资需求

### 3. 执行调度

```bash
python3 main.py run dispatches/my_dispatch
```

重新运行（重置状态）：
```bash
python3 main.py run dispatches/my_dispatch --rerun
```

### 4. 查看报告

调度完成后，报告生成在 `output/` 目录：
- `report.json` - 结构化报告
- `report.txt` - 可读文本报告

## 错误处理说明

系统会自动检测并报告以下问题：

| 错误类型 | 触发条件 | 报告内容 |
|---------|---------|---------|
| 道路中断 | 道路状态为BLOCKED | 显示中断路段、受影响路径、下一步建议 |
| 需求重复 | 相同位置+物资+优先级的需求 | 显示重复需求ID、来源文件 |
| 车辆超载 | 需求总量超过车辆容量 | 显示车辆容量、需求量、拆分建议 |

## 示例

```bash
# 运行道路中断示例
python3 main.py run examples/sample_with_blocked_road

# 运行错误场景示例
python3 main.py run examples/test_error_scenarios
```

## 项目结构

```
emergency_dispatch/
├── models.py          # 核心数据模型
├── shortest_path.py   # 最短路算法
├── dispatcher.py      # 调度逻辑
└── reporter.py        # 报告生成
examples/
├── sample_with_blocked_road/  # 道路中断示例
└── test_error_scenarios/      # 错误场景示例
main.py                # CLI入口
```

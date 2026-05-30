# 梯度下降可视课堂

一键模拟梯度下降，生成带等高线轨迹、损失曲线、收敛诊断的交互式 HTML 报告。

## 安装

```bash
pip install -e .
```

安装后获得 `gd-classroom` 命令。

## 快速开始

```bash
# 用自带示例材料试一次
gd-classroom materials/ --open
```

报告输出到 `gd_output/gradient_descent_report.html`，浏览器打开即可交互。

## 怎样准备损失函数

在 `materials/` 目录下新建 YAML 文件，最少只需 4 个字段：

```yaml
name: "我的损失函数"
loss: "x**2 + y**2"
learning_rate: 0.1
initial_point: [3.0, 4.0]
```

**必填字段**

| 字段 | 说明 | 示例 |
|------|------|------|
| `loss` | Python 表达式，变量用 x, y, z | `"x**2 + sin(y)"` |
| `learning_rate` | 学习率（正数） | `0.1` |
| `initial_point` | 起始坐标列表 | `[1.0, 2.0]` |

**可选字段**

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `name` | 文件名 | 显示在报告标签页 |
| `max_iterations` | 200 | 最大迭代步数 |
| `tolerance` | 1e-6 | 梯度范数低于此值判为收敛 |
| `bounds` | 自动 | `[xmin, xmax, ymin, ymax]`，超出范围的初始点会报越界 |

**可用函数**：`abs`, `sqrt`, `sin`, `cos`, `exp`, `log`, `pi`, `e`, `pow`, `min`, `max`

## 怎样复现学习率过大

```yaml
name: "学习率过大"
loss: "x**2 + y**2"
learning_rate: 1.5
initial_point: [1.0, 1.0]
```

运行后诊断会提示"学习率过大导致发散"并建议缩小 10 倍。把 `learning_rate` 改为 `0.15` 重新运行即可看到收敛。

## 幂等性

同一份材料反复运行，输出文件会被覆盖，不会越跑越乱。如果想对比不同参数，用不同的 YAML 文件名即可——同一批材料生成一份报告。

## 命令行参数

```
gd-classroom [材料文件或目录] [-o 输出目录] [--open]
```

- 默认读取 `./materials/` 下所有 `*.yaml` / `*.yml`
- 默认输出到 `./gd_output/`
- `--open` 生成后自动打开浏览器

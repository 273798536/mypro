# 机器人关节力矩检查工具

一套完整的机器人关节力矩检查接口链路，从数据导入到报告导出全自动完成。

## 核心功能

### 1. 数据导入
- **关节配置**: 连杆长度、角度范围、最大角速度、最大力矩
- **载荷配置**: 载荷质量、载荷位置、最大允许值
- **动作序列**: 各关节随时间变化的角度序列
- **多源支持**: JSON、CSV格式，区分原始数据和处理结果

### 2. 力矩计算
- 基于牛顿-欧拉简化算法
- 考虑连杆自重和末端载荷
- 同步计算关节角速度

### 3. 超限检测
- **载荷越界**: 载荷质量、作用半径超限
- **角度超限**: 超出关节运动范围
- **速度超限**: 角速度超过限制
- **力矩超限**: 计算力矩超过额定值

### 4. 可视化
- 关节角度随时间变化图
- 关节力矩随时间变化图
- 关节角速度随时间变化图
- 机械臂位姿图
- 运动动画GIF

### 5. 报告导出
- **HTML格式**: 带图表的完整报告
- **文本格式**: 适合日志记录
- **JSON格式**: 便于程序处理

## 快速开始

### 环境要求
```bash
# 安装依赖（可选，用于可视化）
pip install matplotlib
```

### 使用样例数据测试

#### 测试载荷越界场景（关键失败路径）
```bash
cd robot_joint_checker
python run_check.py --example exceeded
```

这个测试会：
- ✅ 导入3个关节的配置
- ✅ 导入**超限的载荷配置**（15kg > 10kg）
- ✅ 导入5秒的动作序列
- ✅ 计算各关节力矩
- 🔴 **检测到载荷越界**（关键失败路径）
- ✅ 检测到角度超限和速度超限
- ✅ 生成可视化图表
- ✅ 导出完整报告

#### 测试正常场景
```bash
python run_check.py --example normal
```

### 使用自定义数据

```bash
python run_check.py \
  --joint path/to/joint_config.json \
  --load path/to/load_config.json \
  --motion path/to/motion_sequence.json \
  --output output_dir
```

### 命令行参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--joint`, `-j` | 关节配置文件路径 | - |
| `--load`, `-l` | 载荷配置文件路径 | - |
| `--motion`, `-m` | 动作序列文件路径 | - |
| `--output`, `-o` | 输出目录 | `reports/` |
| `--example` | 使用样例数据 (`normal`/`exceeded`) | - |
| `--no-plots` | 不生成可视化图表 | - |
| `--format` | 报告格式 (`html`/`text`/`json`/`all`) | `all` |
| `--include-raw` | 在报告中包含原始数据 | - |

## 数据文件格式

### 关节配置 (JSON)
```json
{
  "joints": [
    {
      "joint_id": 1,
      "name": "肩关节",
      "link_length": 0.5,
      "min_angle": -90,
      "max_angle": 90,
      "max_angular_velocity": 60,
      "max_torque": 50,
      "mass": 2.0,
      "center_of_mass": 0.5
    }
  ]
}
```

### 载荷配置 (JSON)
```json
{
  "load_mass": 5.0,
  "load_position": [0.1, 0.0, 0.0],
  "max_load_mass": 10.0,
  "max_load_radius": 1.0
}
```

### 动作序列 (JSON)
```json
{
  "time_steps": [0.0, 0.1, 0.2, ...],
  "joint_angles": {
    "1": [0, 5, 10, ...],
    "2": [0, 10, 20, ...]
  },
  "sample_rate": 10.0
}
```

## 项目结构

```
robot_joint_checker/
├── src/                      # 源代码
│   ├── __init__.py
│   ├── config.py            # 数据结构定义
│   ├── data_import.py       # 数据导入模块
│   ├── torque_calculator.py # 力矩计算模块
│   ├── violation_detector.py# 超限检测模块
│   ├── visualizer.py        # 可视化模块
│   ├── report_exporter.py   # 报告导出模块
│   └── workflow.py          # 工作流编排
├── examples/                 # 样例数据
│   ├── joint_config.json
│   ├── load_config_normal.json
│   ├── load_config_exceeded.json
│   └── motion_sequence.json
├── reports/                  # 输出目录（自动创建）
└── run_check.py             # 命令行入口
```

## Python API 使用

```python
from src import JointCheckWorkflow

# 创建工作流
workflow = JointCheckWorkflow(output_dir="my_reports")

# 运行完整检查
result = workflow.run_full_workflow(
    joint_config_file="path/to/joint.json",
    load_config_file="path/to/load.json",
    motion_sequence_file="path/to/motion.json",
    generate_plots=True
)

# 检查结果
print(f"超限总数: {result['violation_summary']['total_violations']}")
print(f"载荷越界: {result['has_load_violation']}")
```

## 关键设计特点

1. **数据溯源**: 每个数据点记录来源文件和导入时间
2. **原始/处理分离**: `raw_data` 保存原始输入，`processed_data` 保存处理结果
3. **统一数据源**: 动作回放和超限检测使用同一套计算结果
4. **失败路径高亮**: 载荷越界作为关键失败路径在报告中特别标注
5. **全链路脚本化**: 一条命令完成从导入到导出的全部流程

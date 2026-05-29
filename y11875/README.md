# 排课冲突最小化 CLI 工具

> 解决学院排课中教师时间、教室容量、实验课连堂等冲突问题，提供可追溯的决策过程和详细的冲突解释。

## 功能特性

### 核心功能
- ✅ **约束求解引擎** - 基于贪心算法，优先处理约束多的课程
- ✅ **冲突检测** - 自动检测8种类型的排课冲突
- ✅ **可追溯性** - 每门课的排课决策都有完整记录，可从结果追溯到约束求解过程
- ✅ **详细原因解释** - 未排定的课程会列出所有约束冲突原因，而不是简单的失败提示
- ✅ **方案评分** - 多维度评分，帮助评估排课方案质量

### 输出格式
- 🖥️ **终端摘要** - 简洁的进度条和统计信息，快速查看结果
- 📄 **人读报告** - Markdown格式，包含完整的冲突详情、解决方案建议、课程表
- 🤖 **机器可读JSON** - 结构化数据，便于程序处理和后续分析

### 可视化
- 📊 ASCII图表：评分柱状图、冲突类型饼图、周课程热力图
- 📖 每个图表都附带详细解读，说明与原始数据（课程清单、教师时间）的关系

### 数据兼容性
- 支持 JSON 和 CSV 两种输入格式
- 所有数据保留原始名称，便于与原始材料核对
- 支持多种字段名映射（中英文），适应不同的表格格式

## 快速开始

### 环境要求
- Python 3.7+
- 无需额外依赖（纯Python标准库实现）

### 基础使用

```bash
# 使用JSON格式的示例数据
python3 main.py \
  --courses examples/courses.json \
  --classrooms examples/classrooms.json \
  --teachers examples/teachers.json \
  --timeslots examples/timeslots.json

# 使用CSV格式的示例数据
python3 main.py \
  --courses examples/courses.csv \
  --classrooms examples/classrooms.csv \
  --teachers examples/teachers.csv \
  --timeslots examples/timeslots.csv
```

### 常用命令

```bash
# 生成完整的人读报告
python3 main.py --courses examples/courses.json \
  --classrooms examples/classrooms.json \
  --teachers examples/teachers.json \
  --timeslots examples/timeslots.json \
  --format report --output output/排课报告.md

# 生成机器可读JSON
python3 main.py --courses examples/courses.json \
  --classrooms examples/classrooms.json \
  --teachers examples/teachers.json \
  --timeslots examples/timeslots.json \
  --format json --output output/result.json

# 显示可视化图表
python3 main.py --courses examples/courses.json \
  --classrooms examples/classrooms.json \
  --teachers examples/teachers.json \
  --timeslots examples/timeslots.json \
  --charts

# 追溯完整排课过程
python3 main.py --courses examples/courses.json \
  --classrooms examples/classrooms.json \
  --teachers examples/teachers.json \
  --timeslots examples/timeslots.json \
  --trace

# 查看某门课的详细排课信息
python3 main.py --courses examples/courses.json \
  --classrooms examples/classrooms.json \
  --teachers examples/teachers.json \
  --timeslots examples/timeslots.json \
  --explain "有机化学实验"
```

## 命令行参数

### 输入数据文件
| 参数 | 说明 | 必需 |
|------|------|------|
| `--courses` | 课程清单文件 (JSON/CSV) | ✅ |
| `--classrooms` | 教室清单文件 (JSON/CSV) | ✅ |
| `--teachers` | 教师清单文件 (JSON/CSV) | ✅ |
| `--timeslots` | 时间段清单文件 (JSON/CSV) | ✅ |

### 输出控制
| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--format` | 输出格式: `terminal`, `report`, `json` | `terminal` |
| `--output` | 输出文件路径 (不指定则输出到终端) | - |
| `--charts` | 在终端输出中显示可视化图表 | - |

### 分析选项
| 参数 | 说明 |
|------|------|
| `--trace` | 输出完整的排课决策过程追溯 |
| `--explain <课程名称>` | 解释指定课程的排课结果或失败原因 |
| `--max-iterations` | 最大迭代次数 (默认: 100) |

## 数据格式说明

### 时间段 (timeslots)
```json
{
  "时间段": [
    {
      "名称": "周一1-2节",
      "星期": "周一",
      "节次": "1-2",
      "开始时间": "08:00",
      "结束时间": "09:40"
    }
  ]
}
```

### 教师 (teachers)
```json
{
  "教师": [
    {
      "姓名": "张教授",
      "工号": "T001",
      "不可用时间": ["周一1-2节", "周三3-4节"],
      "偏好时间": ["周二1-2节", "周四3-4节"]
    }
  ]
}
```

### 教室 (classrooms)
```json
{
  "教室": [
    {
      "名称": "教学楼A101",
      "容量": 60,
      "类型": "普通教室",
      "设备": ["投影仪", "音响"],
      "不可用时间": ["周一1-2节", "周三1-2节"]
    }
  ]
}
```

### 课程 (courses)
```json
{
  "课程": [
    {
      "名称": "高等数学A",
      "课程号": "MATH101",
      "授课教师": ["张教授", "李教授"],
      "学生人数": 120,
      "课时": 2,
      "是否实验课": false,
      "需要设备": [],
      "需要连堂": true,
      "院系": "数学系",
      "偏好教室": ["综合楼C101"],
      "偏好时间": ["周一1-2节", "周三1-2节"],
      "备注": "公共基础课，需要大教室"
    }
  ]
}
```

### CSV格式说明
CSV格式使用相同的字段名，多值字段（如授课教师、不可用时间）使用分号 `;` 分隔。

## 冲突类型与严重程度

| 冲突类型 | 严重程度 | 说明 |
|---------|---------|------|
| 教师时间冲突 | 🔴 紧急 | 同一教师在同一时间段有多门课 |
| 教室使用冲突 | 🔴 紧急 | 同一教室在同一时间段被多门课占用 |
| 教室容量不足 | 🔴 紧急 | 学生人数超过教室容量 |
| 教师不可用 | 🔴 紧急 | 教师在该时间段标记为不可用 |
| 教室不可用 | 🔴 紧急 | 教室在该时间段不可用 |
| 实验设备不匹配 | 🟡 重要 | 实验室缺少所需设备 |
| 连堂被拆分 | 🟡 重要 | 实验课或需要连堂的课程无法安排连续时间 |
| 偏好违反 | 🟢 一般 | 未满足教师或课程的偏好设置 |

## 评分体系

综合评分 (满分100) 由以下5个维度加权计算：

| 评分项 | 权重 | 说明 |
|--------|------|------|
| 已排课率 | 40% | 成功排定的课程占总课程的比例 |
| 无硬冲突评分 | 30% | 硬约束违反的惩罚分数 |
| 软约束满足率 | 15% | 教师/课程偏好的满足程度 |
| 资源利用率 | 10% | 教室容量使用效率 (理想60%-90%) |
| 教师满意度 | 5% | 教师日程分布均匀度 (理想每天≤2节) |

### 冲突惩罚规则
| 冲突类型 | 惩罚分数 |
|---------|---------|
| 教师时间冲突 | -100分/次 |
| 教室容量不足 | -90分/次 |
| 连堂被拆分 | -70分/次 |
| 教室使用冲突 | -80分/次 |
| 实验设备不匹配 | -60分/次 |

## 项目结构

```
y11875/
├── main.py                    # 入口脚本
├── schedule_solver/           # 核心模块
│   ├── __init__.py
│   ├── models.py             # 数据模型定义
│   ├── loader.py             # 数据加载器
│   ├── solver.py             # 约束求解引擎
│   ├── scoring.py            # 评分和冲突解释
│   ├── reporter.py           # 报告生成器
│   ├── visualizer.py         # 可视化工具
│   └── cli.py                # 命令行接口
├── examples/                 # 示例数据
│   ├── courses.json/csv
│   ├── classrooms.json/csv
│   ├── teachers.json/csv
│   └── timeslots.json/csv
├── tests/                    # 测试用例
│   └── test_basic.py
├── output/                   # 输出目录
└── README.md
```

## 核心模块说明

### [models.py](file:///Users/mac/pro/solo/workspaces/y11875/schedule_solver/models.py)
定义核心数据类：`Course`, `Classroom`, `Teacher`, `TimeSlot`, `Conflict` 等。
所有模型都包含 `raw_name` 字段，保留原始数据名称便于追溯。

### [loader.py](file:///Users/mac/pro/solo/workspaces/y11875/schedule_solver/loader.py)
数据加载器，支持JSON和CSV格式。自动识别多种字段名（中英文），
保留所有原始名称，支持分号分隔的多值字段。

### [solver.py](file:///Users/mac/pro/solo/workspaces/y11875/schedule_solver/solver.py)
约束求解引擎，使用贪心算法：
1. 按课程约束复杂度排序，优先处理约束多的课程
2. 检查硬约束（教师时间、教室容量、设备等）
3. 评估软约束（偏好时间、偏好教室等）
4. 记录每一步决策，提供完整追溯

### [scoring.py](file:///Users/mac/pro/solo/workspaces/y11875/schedule_solver/scoring.py)
评分和冲突解释系统：
- `ScoreInterpreter`: 多维度评分计算，包含权重说明
- `ConflictExplainer`: 详细的冲突原因分析、影响评估、解决方案建议

### [reporter.py](file:///Users/mac/pro/solo/workspaces/y11875/schedule_solver/reporter.py)
报告生成器，支持三种输出格式：
- 终端摘要：带emoji和进度条的快速概览
- 人读报告：完整的Markdown文档，便于打印分享
- 机器可读JSON：结构化数据，包含完整的追溯信息

### [visualizer.py](file:///Users/mac/pro/solo/workspaces/y11875/schedule_solver/visualizer.py)
ASCII可视化工具：
- 评分明细柱状图
- 冲突类型分布饼图
- 教师课程分布柱状图
- 教室容量利用率柱状图
- 周课程分布热力图
- 每个图表都附带详细的数据关系解读

## 运行测试

```bash
# 运行基础测试
python3 tests/test_basic.py
```

## 设计理念

### 可追溯性
每个排课决策都有完整记录，从结果可以追溯到：
1. 为什么选择这个时间和教室
2. 考虑了多少个备选方案
3. 发现了哪些冲突
4. 评分是如何计算的

### 冲突透明化
未排定的课程不会只显示"排课失败"，而是列出：
- 所有尝试过的约束冲突
- 按类型分类的冲突分析
- 具体的建议解决方案

### 数据完整性
所有原始名称都被保留，输出报告中可以直接看到：
- 原始课程名称
- 原始教师姓名
- 原始教室名称
- 原始时间段名称

便于教务老师找同事核对材料时不需要猜测名称对应关系。

## 典型使用场景

1. **学期初排课** - 导入课程清单，自动生成无冲突的排课方案
2. **冲突排查** - 当发现排课冲突时，使用 `--explain` 查看详细原因
3. **方案评估** - 使用评分体系比较多个排课方案的优劣
4. **决策汇报** - 生成完整的Markdown报告，用于向领导汇报
5. **系统对接** - 导出JSON格式，供其他教务系统使用

## 常见问题

**Q: 为什么有些课程无法排定？**
A: 使用 `--explain <课程名称>` 查看详细的冲突原因，通常是因为：
- 实验室容量不足以容纳学生人数
- 需要4节连堂但没有足够的连续时间段
- 授课教师在可用时间段都有其他课程

**Q: 如何提高排课成功率？**
A: 可以考虑：
- 增加教室容量或增加实验室
- 调整教师不可用时间
- 放宽某些课程的连堂要求
- 拆分大班为小班上课

**Q: 评分低怎么办？**
A: 查看评分明细，针对性改进：
- 已排课率低 → 增加资源或减少约束
- 软约束满足率低 → 调整偏好设置
- 资源利用率低 → 优化教室分配

## License

MIT License

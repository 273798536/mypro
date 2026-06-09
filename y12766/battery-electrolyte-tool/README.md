# 电池电解液配比工具 (Battery Electrolyte Formulation Tool)

面向**环境监测员**的实验数据整合与谱图分析工具。

不用你先手工整理半天——反应条件在共享盘、实验记录在旧表、谱图数据夹着人工备注、补录备注散在各处，工具都能直接吃进去。

---

## 快速上手

### 1. 安装依赖

```bash
cd battery-electrolyte-tool
pip install -r requirements.txt
```

### 2. 跑样例数据（推荐先试这个）

```bash
python -m electrolyte_tool analyze --demo
```

样例数据里故意混了：旧表格式、温度漏填单位、SAMP-003温度写了"abc"、SAMP-004操作员漏填、谱图里夹着#和//注释行、补录备注另存一个txt、FEC批次有杂质怀疑——全是平时材料里会混进来的小麻烦。

跑出来会生成分析报告，告诉你哪几条复核后结论变了，谱峰重叠卡在哪份材料上。

### 3. 跑自己的数据

```bash
python -m electrolyte_tool analyze \
    --experiment data/实验记录旧表.csv \
    --spectrum   data/谱图数据.csv \
    --conditions data/反应条件.json \
    --notes      data/补录备注.txt \
    --output     分析报告.html
```

参数说明（用 `--help` 也能看）：

| 参数 | 简写 | 必填 | 说明 |
|------|------|------|------|
| `--experiment` | `-e` | 至少一项 | 实验记录CSV（旧表，可含漏填单位） |
| `--spectrum` | `-s` | 至少一项 | 谱图数据CSV（可夹#注释、人工备注行） |
| `--conditions` | `-c` | 否 | 共享盘上的反应条件JSON |
| `--notes` | `-n` | 否 | 补录备注文本文件 |
| `--demo` | | 否 | 用内置样例跑（测试用） |
| `--output` | `-o` | 否 | 输出报告路径，不填则打印控制台 |
| `--format` | `-f` | 否 | `html`(默认) / `txt` / `json` |
| `--overlap-threshold` | `-t` | 否 | 重叠判定阈值，默认0.08(ppm)，越小越严格 |
| `--verbose` | `-v` | 否 | 显示详细加载过程和警告 |

### 4. 查看典型边界案例（培训/复核演示用）

```bash
python -m electrolyte_tool show-cases
```

展示3个最常见的谱峰重叠边界陷阱，**每一个都会真实改变最终判定结论**：

| 案例 | 场景 | 卡在哪 |
|------|------|--------|
| CASE-001 | DMC(3.7ppm)与EMC(3.6ppm)峰位接近 | 原始漏判EMC |
| CASE-002 | FEC(2.5ppm)与杂质峰重合 | 把杂质误判为FEC，误判添加剂成功 |
| CASE-003 | LiPF6(3.5)/LiFSI(3.3)/EMC(3.6)三峰聚堆 | 三种材料互相干扰 |

也可以导出HTML给课题组看：

```bash
python -m electrolyte_tool show-cases --format html --output 重叠案例.html
```

---

## 工具处理的数据混乱场景

不用先整理，直接喂：

- **实验记录表**: 列名叫"温度/温 度/Temperature/T"都能认；温度写了"25"没写°C会警告并默认°C；写了"25摄氏度"也能扒出数字
- **配方列**: "EC:DMC=3:7"、"EC 30% DMC 70%"、单独的"EC(g)"列、JSON字符串——都能解析
- **谱图数据**: 中间夹着"# 以下为..."、"// 备注..."、"张工说..."这种文字行会自动归到备注里，不报错
- **补录备注**: 写在另一个txt里，"SAMP-005: xxx"格式会自动贴到对应样品上
- **反应条件**: 共享盘导出的JSON，自动按样品编号合并，填了旧表漏掉的字段
- **坏数据**: 温度写了"abc"、数值缺失、操作员漏填——会标红但不崩，让你在报告里一眼看见

---

## 报告怎么看（课题组视角）

打开HTML报告后：

1. **最上方总览**：一共几条、几条结论变了、几条有警告
2. **谱峰重叠材料总览表**：卡在哪份材料一目了然——比如FEC 2次、EMC 3次，不用翻每条
3. **每条样品卡片**：
   - 绿色=结论没改，红色=结论变了
   - "原始结论"划掉，"复核结论"红粗体标出
   - 谱峰表格中，归属有变化的会显示"旧归属 → 新归属"
   - 有变化的样品最下方会给出**复测建议**，里面明确写了前后差别是什么、重叠卡在哪种材料上、怎么调参数复测

---

## 项目结构

```
battery-electrolyte-tool/
├── electrolyte_tool/
│   ├── __init__.py
│   ├── __main__.py          # python -m electrolyte_tool 入口
│   ├── cli.py               # 命令行参数解析
│   ├── data_loader.py       # 多源数据加载（旧表、谱图、JSON、备注）
│   ├── spectrum_analyzer.py # 谱峰检测、重叠判定、复核逻辑、典型案例
│   ├── report_generator.py  # HTML/TXT/JSON报告生成
│   └── models.py            # 数据模型
├── examples/
│   ├── old_spreadsheet.csv   # 旧格式实验记录（故意混入各种问题）
│   ├── spectrum_data.csv     # 谱图数据（夹杂#注释、人工备注）
│   ├── reaction_conditions.json  # 共享盘反应条件
│   └── manual_notes.txt      # 补录备注
├── requirements.txt
└── README.md
```

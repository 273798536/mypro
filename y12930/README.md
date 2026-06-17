# OCR 文档问答校验工具

AI/ML 工作流工具，用于 OCR 问答训练样本的质量校验、版本追踪、安全拦截和报告导出。

## 功能特性

- 🔒 **安全拦截**：置信度检测、长度校验、敏感词过滤、乱码识别
- 📌 **版本追踪**：数据集版本管理、差异对比、样本变更历史
- 📊 **分组指标**：按来源、难度、数据类型多维度统计
- ⚠️  **偏科检测**：自动识别评测集偏科，标注是否可直接用于训练
- ✏️  **人工修正**：标注记录管理、复核审批工作流
- 📄 **报告导出**：HTML 格式报告，可追溯到来源材料（原始行号、图片名、来源备注）
- 🔗 **来源可溯**：每条样本保留 source_file / source_row / image_name / source_note

## 快速开始

### 1. 环境要求

- Python 3.9+
- pip

### 2. 安装依赖

```bash
cd /path/to/project
pip install -r requirements.txt
```

### 3. 初始化目录（可选，首次运行会自动创建）

```bash
python ocr_qa.py init
```

### 4. 加载演示样例

```bash
python ocr_qa.py seed-demo
```

三条演示样例：

| # | 类型 | 说明 |
|---|------|------|
| 1 | ✅ 顺利记录 | 高置信度正常样本，可直接用于训练 |
| 2 | ⚠️ 待确认记录 | 中等置信度，答案表述不规范，需人工复核 |
| 3 | 🚫 明显坏数据 | 低置信度脏数据，含敏感内容，被安全拦截 |

样例数据位置：`examples/demo_samples.json`

### 5. 执行校验

```bash
python ocr_qa.py validate
```

### 6. 查看报告

校验完成后会自动生成 HTML 报告，位置在：
```
output/reports/validation_report_<版本>_<时间戳>.html
```

也可以手动生成：
```bash
python ocr_qa.py report
```

## 常用命令

### 查看状态
```bash
python ocr_qa.py status
```

### 版本管理
```bash
# 列出所有版本
python ocr_qa.py version list

# 创建新版本
python ocr_qa.py version create v1.1 -d "修复了部分样本的答案错误"

# 对比两个版本
python ocr_qa.py version diff v1.0 v1.1
```

### 标注管理
```bash
# 列出标注记录
python ocr_qa.py annotation list

# 添加标注
python ocr_qa.py annotation add <sample_id> -a "张三" --answer "修正后的答案" -m "OCR识别错误"

# 应用修正
python ocr_qa.py annotation apply <annotation_id>
```

## 目录结构

```
├── ocr_qa_validator/       # 主代码包
│   ├── cli.py              # CLI 命令行入口
│   ├── config.py           # 配置加载
│   ├── models.py           # 数据模型
│   ├── storage.py          # JSON 持久化
│   ├── safety_filter.py    # 安全拦截模块
│   ├── version_tracker.py  # 版本追踪模块
│   ├── metrics.py          # 指标统计模块
│   ├── report.py           # 报告导出模块
│   ├── correction.py       # 人工修正工作流
│   ├── workflow.py         # 主工作流串联
│   └── examples.py         # 演示样例加载
├── data/                   # 数据目录
│   ├── samples/            # 样本数据
│   ├── annotations/        # 标注记录
│   └── versions/           # 版本元数据
├── examples/               # 演示样例
│   └── demo_samples.json   # 三条演示数据
├── output/reports/         # 报告输出
├── config.yaml             # 配置文件
├── requirements.txt        # 依赖
├── ocr_qa.py               # 便捷启动脚本
└── README.md               # 本文档
```

## 配置说明

配置文件：`config.yaml`

- `safety_filter.min_confidence`：最低置信度阈值，默认 0.6
- `safety_filter.forbidden_keywords`：敏感关键词列表
- `safety_filter.max_text_length_ratio`：答案/问题最大长度比
- `metrics.group_by`：分组统计的维度
- `report.include_raw_sample`：报告中是否包含原始样本内容
- `paths.*`：各数据目录路径

## 偏科检测说明

训练组拿到结果后，可通过偏科检测快速判断：

- **可直接用**：偏差在 ±20% 以内，样本质量稳定
- **需知识库运营复核**：偏差超过 20%，可能存在数据质量问题或样本分布不均

## 来源追踪说明

每条样本都保留以下来源信息，方便回溯：

- `source_file`：来源文件名（如 Excel 表名）
- `source_row`：原始行号
- `image_name`：对应图片名
- `source_note`：来源备注（人工标注说明等）

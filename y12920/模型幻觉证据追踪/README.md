# 模型幻觉证据追踪

AI/ML 工作流工具，用于追踪模型幻觉证据，串接样本、版本、人工修正和分组指标。

## 快速开始

### 1. 安装依赖

```bash
cd 模型幻觉证据追踪
pip install -r requirements.txt
```

### 2. 启动服务

```bash
python app.py
```

服务将在 `http://localhost:8501` 启动。

### 3. 查看第一份样例

启动后，首页会自动加载3条样例数据：
- `samples/example_records.json` - 样例记录文件
  - 顺利记录：已确认无幻觉的正常样本
  - 待确认记录：需要模型训练工程师复核的样本
  - 明显坏数据：存在明显幻觉/脏数据的样本

## 核心功能

| 模块 | 功能描述 |
|------|----------|
| 📝 提示词版本导入 | 支持导入多版本提示词，追踪版本变更 |
| 🔍 样本去重 | 自动检测重复/脏样本，关联来源材料 |
| 🛡️ 安全拦截 | 检测训练验证泄漏、数据污染等风险 |
| 📊 报告导出 | 生成业务方可读的报告，标记可用/待复核状态 |
| ✅ 人工修正 | 支持人工标注修正，记录修正轨迹 |
| 📈 分组指标 | 按维度聚合指标，追踪幻觉率变化趋势 |

## 目录结构

```
模型幻觉证据追踪/
├── app.py                 # 主入口 - Streamlit Web应用
├── requirements.txt       # Python依赖
├── pyproject.toml         # 项目配置
├── core/                  # 核心模块
│   ├── models.py          # 数据模型定义
│   ├── version_import.py  # 提示词版本导入
│   ├── deduplication.py   # 样本去重
│   ├── safety.py          # 安全拦截
│   ├── report.py          # 报告导出
│   └── metrics.py         # 分组指标计算
├── samples/               # 样例数据
│   ├── example_records.json
│   └── prompt_versions/
└── data/                  # 用户数据存储
    ├── records/
    ├── versions/
    └── exports/
```

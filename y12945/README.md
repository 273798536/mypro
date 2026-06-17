# 合规日志脱敏检查工具

面向 MLOps 工程师和训练组的合规日志脱敏检查工具。支持灰度对比、分布统计、评测回放三大核心能力，提供完整的人工反馈流转机制。

## 目录

- [快速开始](#快速开始)
- [核心功能](#核心功能)
- [命令行使用](#命令行使用)
- [Web 界面使用](#web-界面使用)
- [样例数据说明](#样例数据说明)
- [常见问题](#常见问题)

---

## 快速开始

### 从空目录开始，三步跑通第一份样例

**第一步：安装依赖**

```bash
# 进入项目目录
cd /path/to/compliance-log-check

# 安装依赖（推荐使用虚拟环境）
python -m venv venv
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt

# 安装项目（可选，方便全局使用 compliance-check 命令）
pip install -e .
```

**第二步：运行第一份样例**

```bash
# 方式一：使用模块方式运行
python -m compliance_check.cli demo

# 方式二：如果已 pip install -e .
compliance-check demo
```

看到输出"演示完成"即为成功。

**第三步：查看样例数据位置**

所有样例数据位于 `data/samples/` 目录：

| 文件 | 说明 |
|------|------|
| `sample_training_logs.txt` | 训练样本日志 - 金融客服对话 |
| `sample_production_logs.txt` | 生产环境日志 - 混合类型 |
| `sample_gray_logs_v1.txt` | 灰度版本 v1 - 旧版 |
| `sample_gray_logs_v2.txt` | 灰度版本 v2 - 新版 |
| `training_samples_with_metadata.csv` | 带来源备注和图片名的样本 |

规则配置位于 `data/rules/default_rules.json`。

---

## 核心功能

### 1. 灰度对比（最该跑稳的功能之一）

对比两个版本的检查结果，自动识别：

- **新增问题**：新版本新增的敏感信息
- **已解决**：新版本已修复的问题
- **严重度变化**：同一问题严重程度的变化

使用场景：提示词版本迭代、模型灰度发布、规则升级前后对比。

### 2. 分布统计（最该跑稳的功能之二）

多维度统计检查结果：

- 按严重程度分布（高/中/低/提示）
- 按类别分布（手机号、身份证、邮箱、银行卡等）
- 按来源文件分布
- 截断统计

使用场景：数据质量评估、脱敏效果趋势分析、问题优先级排序。

### 3. 评测回放（把结论拉回来源材料）

追溯每一条问题的原始上下文：

- 保留原始行号
- 展示上下文 N 位
- 保留来源备注（source_note）
- 保留关联图片名（image_name）

使用场景：问题溯源、人工复核、训练样本回溯到那张表或那条记录。

### 4. 人工反馈流转

训练组视角的四分类：

| 状态 | 颜色 | 含义 | 训练组能否直接用 |
|------|------|------|-----------------|
| `confirmed` | 绿色 | 已确认 | ✅ 可直接使用 |
| `needs_review` | 黄色 | 需复核 | ⚠️ 需找 MLOps 工程师复核 |
| `pending` | 灰色 | 待处理 | ⏳ 待定 |
| `rejected` | 红色 | 已驳回 | ✖ 不能用 |

### 5. 版本信息同轮复核

同一轮复核中可同时包含：
- 提示词版本（prompt_version）
- 训练样本批次（sample_batch）
- 版本回滚来源（rollback_from）
- 复核轮次编号（review_round）

让训练组一眼看出"这次处理的是眼前这批具体材料"。

### 6. 导出一致性

- 界面摘要和导出文件数据完全一致
- 导出文件包含完整可追溯信息（行号、文件名、来源备注、图片名）
- 支持 JSON 和 CSV 两种格式

---

## 命令行使用

所有命令都可以通过 `compliance-check --help` 或 `python -m compliance_check.cli --help` 查看帮助。

### 基础检查

```bash
# 检查单个文件
compliance-check check data/samples/sample_training_logs.txt

# 检查并保存结果
compliance-check check data/samples/sample_training_logs.txt -o results/result.json

# 携带版本信息（推荐每次都加）
compliance-check check data/samples/sample_training_logs.txt \
  --prompt-version v2.3.1 \
  --sample-batch batch-2024-06-001 \
  --review-round round-01 \
  --source-note "训练样本-金融客服对话" \
  -o results/train_check.json
```

**常用参数：**

| 参数 | 说明 | 示例 |
|------|------|------|
| `--prompt-version` | 提示词版本号 | `v2.3.1` |
| `--sample-batch` | 训练样本批次 | `batch-2024-06-001` |
| `--review-round` | 复核轮次 | `round-01` |
| `--source-note` | 来源备注 | `训练样本-金融客服对话` |
| `--image-name` | 关联图片名 | `batch001_img001.jpg` |
| `--rollback-from` | 回滚来源版本 | `v2.2.0` |
| `--data-source` | 数据来源类型 | `training_sample` |
| `--max-length` | 长文本截断阈值 | `500` |
| `--no-truncate` | 不截断长文本 | - |

### 灰度对比

```bash
# 对比两个结果文件
compliance-check compare results/baseline.json results/new_version.json

# 保存对比结果
compliance-check compare results/v1.json results/v2.json -o results/comparison.json

# 显示所有差异
compliance-check compare results/v1.json results/v2.json --show-all
```

### 分布统计

```bash
# 基本统计
compliance-check stats results/result.json

# 完整报告
compliance-check stats results/result.json --report

# 导出统计报告
compliance-check stats results/result.json -o stats_report.json --report
```

### 评测回放

```bash
# 对整个结果回放
compliance-check playback results/result.json

# 回放指定单条
compliance-check playback results/result.json --finding-id xxxxxxxx

# 指定上下文行数
compliance-check playback results/result.json --context 5

# 导出回放记录
compliance-check playback results/result.json -o playback_records.json
```

### 人工反馈

```bash
# 查看当前反馈状态
compliance-check feedback results/result.json

# 按训练组视角分类查看
compliance-check feedback results/result.json --categorize

# 标记所有截断项为待复核
compliance-check feedback results/result.json --mark-truncated -o results/reviewed.json

# 自动确认所有高危项
compliance-check feedback results/result.json --confirm-high -o results/reviewed.json

# 批量更新状态
compliance-check feedback results/result.json \
  --status confirmed \
  --finding-ids id1,id2,id3 \
  --comment "已确认，脱敏正确" \
  --reviewer "张三" \
  -o results/updated.json
```

### 导出

```bash
# 导出为 CSV
compliance-check export results/result.json

# 指定导出路径
compliance-check export results/result.json -o results/findings.csv
```

### Web 界面

```bash
# 启动 Web 界面
compliance-check web

# 指定端口
compliance-check web --port 8501
```

---

## Web 界面使用

启动后访问 `http://localhost:8501`，左侧导航包含六个模块：

1. **📋 检查执行** — 上传文件或使用样例数据执行检查
2. **📊 分布统计** — 多维度统计图表
3. **⚖️ 灰度对比** — 两个版本对比
4. **📼 评测回放** — 追溯原始来源
5. **✏️ 人工反馈** — 管理复核状态
6. **📦 结果导出** — 导出 JSON/CSV

---

## 样例数据说明

### 为什么长文本截断要复核？

长文本（默认超过 500 字符）会被截断处理。因为：

1. 截断后只能检查到前面部分，后面可能还有敏感信息没检测到
2. 截断的匹配结果可能不准确（比如敏感信息刚好在截断边界）
3. 上下文缺失可能导致误判

所以所有截断的记录都会自动标记为 `needs_review`，需要人工复核完整内容。

你可以用 `--no-truncate` 关闭截断，但大文件会变慢。

### 样例数据用途

- **sample_training_logs.txt**：典型的训练样本格式，包含对话记录，有一条很长的文本用来演示截断复核场景。

- **sample_production_logs.txt**：典型的生产日志格式，时间戳 + 日志级别 + 内容。

- **sample_gray_logs_v1.txt / sample_gray_logs_v2.txt**：用来演示灰度对比。
  - v1 有较多明文敏感信息
  - v2 大部分已脱敏，但又新增了一些问题
  - 用来展示"新增"、"已解决"、"严重度变化"三种差异

- **training_samples_with_metadata.csv**：带元数据的 CSV 样本，每一条都有 source_note 和 image_name，演示可追溯性。

---

## 常见问题

### Q: 导出的结果和页面上显示的对得上吗？

A: 对得上。界面摘要和导出文件使用同一份数据计算，保证一致性。

### Q: 怎么追溯到原始记录？

A: 每条 finding 都保留了 `line_number（原始行号）、`source_file（源文件名）、`source_note`（来源备注）、`image_name`（关联图片名），可以精准回溯。

### Q: 训练组拿到结果怎么区分能不能直接用？

A: 看 feedback 模块，绿色 confirmed 的可以直接用，黄色 needs_review 的需要找 MLOps 工程师复核。

### Q: 怎么加新的检查规则？

A: 编辑 `data/rules/default_rules.json`，按现有格式添加新规则即可。

### Q: 支持批量处理目录吗？

A: 支持。`compliance-check check /path/to/directory` 会自动处理目录下所有 .log、.txt、.csv 文件。

### Q: 结果文件能复用吗？

A: 可以。检查结果保存为 JSON 后，可以在 compare、stats、playback、feedback 等命令中重复使用，不用每次重新检查。

### Q: 同一轮复核包含哪些信息？

A: 同一轮（同一个 result）中包含：提示词版本、样本批次、回滚来源、复核轮次。让训练组知道这批结果对应的是哪一批具体材料。

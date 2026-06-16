# 训练集近重复清洗 CLI

AI/ML 工作流工具，串联样本去重、版本追踪、训练验证泄漏检测与安全拦截。
按算法产品经理的使用习惯组织结果，训练组拿到后能一眼分清：

- **clean**：可直接使用
- **needs_review**：找算法产品经理复核
- **bad / duplicate / leakage**：已拦截，不会进入训练

所有记录均保留 **原始行号、图片名、来源备注**，真要追问能回到那张表或那条记录。

---

## 快速开始（从空目录试一遍）

### 1. 环境要求

- Python 3.9+
- pip

### 2. 安装依赖

```bash
# 进入项目目录
cd /path/to/train-dedup-cli

# 推荐使用虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 升级 pip（老版本 pip 不支持 pyproject.toml 的 editable 安装）
pip install --upgrade pip

# 以可编辑模式安装
pip install -e .
```

安装完成后，`train-dedup` 命令就可以用了。

### 3. 第一份样例位置

示例数据位于 `examples/` 目录：

| 文件 | 用途 | 包含内容 |
|------|------|----------|
| `examples/sample_data.csv` | 综合演示 | 3 类样例 + 训练验证泄漏：正常记录、待确认记录、明显坏数据 |
| `examples/leakage_demo.jsonl` | 泄漏专项演示 | JSONL 格式，5 条训练 + 3 条验证，含 2 对泄漏 |

### 4. 启动命令（一键流水线）

```bash
# 最常用：跑完整流水线（去重 + 泄漏检测 + 安全拦截 + 报告）
train-dedup run-pipeline examples/sample_data.csv \
    --threshold 0.70 \
    --review-threshold 0.92 \
    --output final_result.csv \
    --report safety_report.txt
```

运行后会得到两个文件：

- `final_result.csv`：带状态标签的完整结果，每行都有 `status` 列
- `safety_report.txt`：面向人类可读的安全报告，含来源追溯信息

### 5. 结果怎么看

打开 `final_result.csv`，`status` 列有五种取值：

| status | 含义 | 训练组该怎么做 |
|--------|------|----------------|
| `clean` | 干净样本 | ✅ 直接导入训练 |
| `needs_review` | 疑似重复，需人工确认 | ⚠️ 找算法产品经理复核 |
| `duplicate` | 确认重复，已移除 | ❌ 已拦截 |
| `bad` | 坏数据（空内容/全重复/垃圾文本） | ❌ 已拦截 |
| `leakage` | 训练验证泄漏 | ❌ 已拦截 |

### 6. 版本管理快速上手

```bash
# 1. 初始化版本仓库，导入初始数据
train-dedup version init --repo ./dedup_repo examples/sample_data.csv -d "v1 初始导入"

# 2. 查看版本列表
train-dedup version list --repo ./dedup_repo

# 3. 基于最新版本跑一次去重 + 泄漏检测，生成新版本
train-dedup version snapshot --repo ./dedup_repo \
    -d "v2 去重+泄漏检测后" \
    --dedup --check-leakage \
    -t 0.70

# 4. 只导出 clean 状态的样本给训练组
train-dedup version export --repo ./dedup_repo \
    -o clean_for_training.csv \
    -s clean

# 5. 对比两个版本
train-dedup version diff --repo ./dedup_repo v1xxx v2xxx
```

---

## 命令一览

```
train-dedup --help

Commands:
  dedup          对训练样本执行近重复检测与清洗
  leakage        检测训练集与验证/测试集之间的数据泄漏
  run-pipeline   一键流水线：去重 + 泄漏检测 + 安全拦截 + 报告
  version        数据集版本管理（init / list / snapshot / diff / export）
```

### 1. `dedup` - 近重复清洗

```bash
train-dedup dedup INPUT_FILES... [OPTIONS]
```

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `--threshold, -t` | `0.85` | 相似度阈值，越高越严格 |
| `--review-threshold` | `0.95` | 待复核阈值：组内平均相似度低于此值时标记为 `needs_review` |
| `--method, -m` | `hybrid` | 算法：`hybrid` / `jaccard` / `sequence` / `exact` |
| `--output, -o` | `dedup_result.csv` | 输出文件 |
| `--format` | `csv` | `csv` / `jsonl` |
| `--report, -r` | - | 生成可读报告文件 |
| `--by-split/--no-by-split` | `True` | 按 split 分组去重（推荐），跨 split 的相似视为泄漏 |
| `--keep-strategy` | `first` | 保留策略：`first` / `longest` / `newest` |
| `--no-batch` | 关 | 禁用 TF-IDF 批量模式，强制两两比较 |
| `--require-source-ref` | 关 | 要求所有样本必须有来源引用 |

**示例：**

```bash
train-dedup dedup examples/sample_data.csv \
    -t 0.75 --review-threshold 0.90 \
    -r dedup_report.txt
```

### 2. `leakage` - 训练验证泄漏检测

```bash
train-dedup leakage INPUT_FILES... [OPTIONS]
```

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `--threshold, -t` | `0.80` | 泄漏判定阈值 |
| `--output, -o` | `leakage_result.csv` | 标注泄漏的完整输出 |
| `--report, -r` | - | 泄漏报告 |
| `--filter-output, -f` | - | 过滤泄漏后安全样本输出路径 |
| `--remove-from` | `val` | 从哪侧移除泄漏：`val` / `train` / `both` |

**示例：**

```bash
train-dedup leakage examples/leakage_demo.jsonl \
    -o leakage_result.csv \
    -f safe_val.csv \
    --remove-from val
```

### 3. `run-pipeline` - 一键流水线

**算法产品经理最常用的入口**，一次跑完整套流程。

```bash
train-dedup run-pipeline examples/sample_data.csv \
    -t 0.70 --review-threshold 0.88 \
    -o final_result.csv \
    -r safety_report.txt
```

### 4. `version` - 版本管理

```bash
# 初始化版本仓库
train-dedup version init --repo ./dedup_repo data.csv -d "初始版本"

# 列出版本
train-dedup version list --repo ./dedup_repo

# 创建新版本快照（串联去重 + 泄漏检测）
train-dedup version snapshot --repo ./dedup_repo \
    -d "去重后版本" \
    --dedup --check-leakage \
    -t 0.75

# 对比两个版本
train-dedup version diff --repo ./dedup_repo v2024... v2024...

# 导出指定状态的样本
train-dedup version export --repo ./dedup_repo \
    -o output.csv \
    -s clean -s needs_review
```

---

## 输入文件格式

支持 **CSV** 和 **JSONL** 两种格式，自动识别列名。

### 自动识别的列（CSV）

| 列名候选 | 含义 | 必填 |
|----------|------|------|
| `content` / `text` / `question` / `prompt` / `input` | 样本内容 | ✅ |
| `label` / `target` / `answer` / `output` | 标签/答案 | - |
| `split` / `dataset` / `set` | train/val/test | - |
| `id` / `sample_id` / `uuid` | 样本 ID | - |
| `image` / `image_name` / `img` | 关联图片名 | - |
| `remark` / `note` / `comment` / `备注` / `来源` | 备注信息 | - |

> 未在列中的其他字段会被放进 `metadata` 保留。

### JSONL 格式

每行一个 JSON 对象，字段同上。

---

## 来源追溯（安全拦截的核心）

每条记录都会保留以下信息，出了问题能直接回溯源文件：

- `source_file`：来源文件名
- `line_number`：原始行号（CSV 是表头后的行号，JSONL 是行号）
- `image_name`：关联的图片名
- `remark`：算法产品经理写的备注
- `content_hash`：内容指纹（SHA256 前 16 位）

在 `safety_report.txt` 中，每条记录都会展示完整的追溯链。

---

## 样例数据说明

### examples/sample_data.csv（12 条）

- **顺利记录（clean）**：s-003、s-005、s-007 等正常问答
- **待确认记录（needs_review）**：相似度在灰色地带的疑似重复对
- **明显坏数据（bad）**：s-006（测试占位文本）、s-010（全是重复字符）
- **近重复（duplicate）**：高相似度的重复对
- **训练验证泄漏（leakage）**：训练集和验证集都有的相似问题

### examples/leakage_demo.jsonl（8 条）

专项演示训练验证泄漏，包含 5 条训练 + 3 条验证，其中 2 对是泄漏。

---

## 目录结构

```
train-dedup-cli/
├── pyproject.toml          # 项目配置
├── README.md               # 本文档
├── train_dedup/
│   ├── __init__.py
│   ├── cli.py              # CLI 入口
│   ├── models.py           # 数据模型（Sample、Version、DedupRecord 等）
│   ├── dedup.py            # 近重复检测算法
│   ├── leakage.py          # 训练验证泄漏检测
│   ├── versioning.py       # 版本追踪
│   ├── safety.py           # 安全拦截 + 来源追溯
│   └── io_utils.py         # CSV/JSONL 读写
└── examples/
    ├── sample_data.csv     # 综合样例
    └── leakage_demo.jsonl  # 泄漏专项样例
```

---

## 常见问题

**Q: 为什么 needs_review 的记录不直接判定为重复？**
A: 相似度在阈值附近的，算法不敢拍板，留给算法产品经理人工确认最稳妥。可以通过 `--review-threshold` 调整这个灰色地带的宽窄。

**Q: 训练验证泄漏默认从哪一侧移除？**
A: 默认从 `val` 侧移除，保护训练集完整性。可通过 `--remove-from both` 两边都移除。

**Q: 版本快照会保留审计日志吗？**
A: 会的，`DatasetSnapshot.audit_log` 记录了每一次操作，包括谁、什么时候、对哪个样本做了什么。

**Q: 大文件跑起来慢怎么办？**
A: 20 条以上自动启用 TF-IDF 批量模式，速度比两两比较快一个数量级。如果还慢，可适当调高阈值。

**Q: 去重是在整个数据集里做吗？**
A: 默认 `--by-split` 开启，训练集内部去重、验证集内部去重，跨 split 的相似会被泄漏检测模块处理。如果不想要这个行为，加 `--no-by-split`。

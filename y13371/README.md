# 训练队列版本快照 (Training Queue Snapshot)

MLOps 训练数据质量管理工具，用于处理特征快照、版本对比、灰度发布标记和数据质量监控。

## 核心功能

### 1. 分开统计 CLI 输出
- **不再只有总数**：坏行、跳过行、已处理行、边界样本分别统计和展示
- 小样本不再被平均数掩盖，边界样本单独标记

### 2. 灰度标记全链路
- 灰度比例配置错误自动检测（超出 0-1 范围标记为错误）
- 筛选、详情、导出全链路保留灰度标记
- 灰度候选、灰度生效、灰度错误三种状态

### 3. 版本对比
- 样本变化（新增、删除、修改）
- 阈值变化（新增、删除、修改，区分手动设置）
- 人工修正记录
- 指标变化（均值、标准差、异常值等）
- 状态变化（坏行、跳过、已处理数量变化）
- 灰度变化（配置比例、实际比例、灰度样本变化）

### 4. 导出一致性
- JSON/CSV/Markdown 多格式导出
- 页面显示状态与文件内容完全一致
- 导出文件包含完整的状态映射表

## 快速开始

### 安装

```bash
# 安装依赖
pip install -e .
```

### 一键演示

```bash
# 运行完整演示（处理两个版本、对比、筛选、详情查询）
bash tests/run_demo.sh
```

### 运行测试

```bash
# 运行单元测试
python -m pytest tests/test_snapshot.py -v
```

## CLI 使用说明

命令行工具入口为 `tqs`（Training Queue Snapshot）。

### 1. 处理特征快照 (process)

```bash
tqs process <数据文件> [选项]
```

**选项：**
- `-n, --version-name`：版本名称
- `-d, --version-desc`：版本描述
- `-p, --parent-version`：父版本 ID
- `-g, --gray-ratio`：灰度比例 (0-1)
- `-t, --thresholds`：阈值配置，格式：`feature1:min:max[:manual],feature2:...`
- `-f, --feature-cols`：特征列名，逗号分隔
- `-l, --label-col`：标签列名
- `-s, --sample-id-col`：样本 ID 列名
- `-o, --output-dir`：输出目录，默认 `./output`
- `--detail-limit`：详情列表显示行数限制，默认 20

**示例：**
```bash
tqs process tests/test_data_v1.csv \
    --version-name "特征快照V1" \
    --gray-ratio 0.2 \
    --thresholds "feature1:0:50:manual,feature2:0:50" \
    --label-col label \
    --sample-id-col sample_id
```

**输出示例：**
```
┌──────────────────────────────────────────────────────────────────┐
│                         处理统计                                  │
├──────────┬──────────┬──────────┬──────────┬──────────┤
│   总数   │  已处理  │   坏行   │   跳过   │   边界   │
│   25     │   21     │    2     │    2     │    1     │
│          │ (84.00%) │  (8.00%) │  (8.00%) │  (4.00%) │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

### 2. 版本对比 (compare)

```bash
tqs compare <旧版本快照JSON> <新版本快照JSON> [选项]
```

**示例：**
```bash
tqs compare output/snapshot_v1.json output/snapshot_v2.json
```

**输出包含：**
- 样本变化（新增/删除/修改数量）
- 阈值变化（区分手动设置）
- 人工修正列表
- 指标变化详情（Top 10）
- 状态变化对比
- 灰度变化对比

### 3. 筛选样本 (filter)

```bash
tqs filter <快照JSON> [选项]
```

**选项：**
- `-s, --status`：按状态筛选 (processed/bad/skipped/boundary)，可多选
- `-g, --gray`：按灰度状态筛选 (normal/gray_candidate/gray_enabled/gray_error)，可多选
- `-m, --modification`：按修改类型筛选，可多选
- `--boundary-only`：仅显示边界样本
- `-n, --limit`：显示行数限制，默认 50

**示例：**
```bash
# 筛选所有坏行
tqs filter output/snapshot_v2.json --status bad

# 筛选所有灰度样本
tqs filter output/snapshot_v2.json --gray gray_candidate --gray gray_enabled

# 筛选人工修正的边界样本
tqs filter output/snapshot_v2.json --modification manual_correction --boundary-only
```

### 4. 查看样本详情 (detail)

```bash
tqs detail <快照JSON> <sample_id>
```

**示例：**
```bash
# 查看人工修正样本详情
tqs detail output/snapshot_v2.json sample_021

# 查看坏行样本详情
tqs detail output/snapshot_v2.json sample_016
```

## 测试数据说明

### V1 版本 (tests/test_data_v1.csv)
- 25 行数据，包含：
  - 15 行正常数据
  - 2 行坏行（缺失值过多、超出阈值）
  - 2 行跳过（sample_id 含 skip、note 含 skip）
  - 1 行边界样本
  - 1 行带修正说明的样本
  - 灰度比例：20%

### V2 版本 (tests/test_data_v2.csv)
- 28 行数据，包含：
  - 3 行新增样本
  - 1 行坏行修正（阈值调整后恢复正常）
  - 2 行人工修正（带 `_original` 列自动检测）
  - 1 行自动修复
  - 新增边界样本
  - 灰度比例：30%

## 输出文件说明

运行后在 `./output` 目录生成：

| 文件类型 | 命名格式 | 说明 |
|---------|---------|------|
| JSON | `snapshot_<快照ID>_<版本ID>.json` | 完整快照数据，可重新加载 |
| CSV | `snapshot_<快照ID>_<版本ID>.csv` | 带中文状态列的表格数据 |
| Markdown 报告 | `report_<快照ID>_<版本ID>.md` | 可读的分析报告 |
| 对比报告 | `diff_<旧版本>_vs_<新版本>.md` | 版本对比报告 |

## 状态映射

| 英文值 | 中文显示 | 说明 |
|-------|---------|------|
| processed | 已处理 | 正常处理的样本 |
| bad | 坏行 | 缺失值过多、超出阈值等 |
| skipped | 跳过 | 按规则跳过的样本 |
| boundary | 边界 | 接近分布边界的样本 |

## 灰度状态映射

| 英文值 | 中文显示 | 说明 |
|-------|---------|------|
| normal | 正常 | 非灰度样本 |
| gray_candidate | 灰度候选 | 等待灰度验证 |
| gray_enabled | 灰度生效 | 已进入灰度流量 |
| gray_error | 灰度错误 | 灰度比例配置错误 |

## 修改类型映射

| 英文值 | 中文显示 | 说明 |
|-------|---------|------|
| none | 无 | 未修改 |
| manual_correction | 人工修正 | 人工手动修正 |
| auto_fix | 自动修复 | 系统自动修复 |
| threshold_adjustment | 阈值调整 | 阈值调整导致的变化 |

## 目录结构

```
.
├── pyproject.toml              # 项目配置
├── README.md                   # 本文件
├── src/
│   └── training_queue_snapshot/
│       ├── __init__.py
│       ├── models.py           # 数据模型定义
│       ├── processor.py        # 数据处理核心逻辑
│       ├── diff.py             # 版本对比逻辑
│       ├── exporter.py         # 导出功能
│       └── cli.py              # CLI 入口
└── tests/
    ├── test_data_v1.csv        # V1 测试数据
    ├── test_data_v2.csv        # V2 测试数据
    ├── test_snapshot.py        # 单元测试
    └── run_demo.sh             # 一键演示脚本
```

## 灰度发布复核流程

1. **处理两个版本**：分别运行 `tqs process` 处理前一版和当前版
2. **版本对比**：运行 `tqs compare` 查看差异
3. **重点检查**：
   - 样本变化是否合理
   - 阈值调整是否正确标记为手动
   - 人工修正记录是否完整
   - 指标变化是否在预期范围
   - 灰度比例是否正确
4. **导出报告**：确认导出文件状态与页面显示一致
5. **复核人验证**：复核人可独立运行以上命令，无需询问材料位置

## 常见问题

**Q: 如何设置手动阈值？**
A: 在阈值配置后加 `:manual`，例如 `--thresholds "feature1:0:100:manual"`

**Q: 如何检测人工修正？**
A: 两种方式：1) `modification_note` 列包含"人工"或"manual"；2) 提供 `feature_original` 列，系统自动对比差异

**Q: 边界样本如何定义？**
A: 满足以下任一条件：1) Z-score 在 2.5-4.0 之间；2) 距离分布边界小于 1% 范围

**Q: 导出的 JSON 可以重新加载吗？**
A: 可以，`compare`、`filter`、`detail` 命令都直接使用导出的 JSON 文件

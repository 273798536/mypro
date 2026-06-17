# 上下文窗口预算器 - 快速开始指南

## 📋 依赖安装

```bash
# 方式1: 使用pip
pip install -r requirements.txt

# 方式2: 安装为包（推荐）
pip install -e .

# 方式3: 使用pyproject
pip install .
```

**依赖说明：**
- `tiktoken>=0.5.0`: OpenAI官方token计数库，用于精确计算上下文窗口占用
- Python >= 3.9

## 🚀 启动命令

### 从空目录开始的完整流程（推荐首次体验）

```bash
# 1. 先确认目录是空的（除了本项目文件）
ls -la

# 2. 安装依赖
pip install -r requirements.txt

# 3. 运行完整工作流（使用内置样例数据）
python -m context_window_budgeter.cli run

# 或者安装后直接用命令
cwb run
```

### 常用命令

```bash
# 仅生成样例数据（查看样例数据结构）
python -m context_window_budgeter.cli generate

# 指定输出目录
python -m context_window_budgeter.cli run --output ./my_output

# 使用外部样本文件
python -m context_window_budgeter.cli run --samples ./data/my_samples.json

# 自定义允许的标签列表
python -m context_window_budgeter.cli run --labels 正面 负面 中性 提问 指令
```

## 📁 第一份样例位置

运行 `generate` 或 `run` 命令后，样例数据会自动生成在：

```
./output/data/raw_samples.json
```

**样例数据包含 10 条记录，类型分布：**

| 序号 | 类型 | 标签 | 问题描述 |
|------|------|------|----------|
| 1 | ✅ 顺利记录 | 正面 | 干净可用，产品咨询 |
| 2 | ⚠️ 待确认 | 待确认_可能负面 | 含#TODO备注混写，标签不确定 |
| 3 | ❌ 坏数据 | (空) | prompt/response/label全为空 |
| 4 | ❌ 重复 | 正面 | 与第1条精确重复 |
| 5 | ❌ 泄漏 | 提问 | 含"验证集ground truth"泄漏关键词 |
| 6 | ❌ 标签混写 | 负面,投诉,物流 | 多标签用逗号分隔混写 |
| 7 | ⚠️ 待确认 | 正面 | prompt过短("好")，疑似不完整 |
| 8 | ⚠️ 待复合复核 | 中性,提问 | 同时涉及安全规则/模型日志/工具调用参数问题 |
| 9 | ✅ 顺利记录 | 中性 | 干净可用，5G网络咨询 |
| 10 | ✅ 顺利记录 | 提问 | 干净可用，物流查询 |

## 🔄 完整工作流说明

```
原始样本 → 去重检测 → 脏数据检测 → 版本追踪 → 人工复核
                                                          ↓
                                                  分组指标统计
                                                          ↓
                                                  安全拦截校验
                                                          ↓
                                                  导出验证 → JSON/JSONL/CSV
```

**每一步核心能力：**

1. **样本去重**：精确哈希去重 + 模糊匹配去重
2. **脏数据检测**：空值检测、泄漏检测、备注混写检测、标签格式检测
3. **版本追踪**：每次修改自动快照，支持版本对比
4. **人工复核**：安全规则+模型日志+工具调用参数 **同轮复核**
5. **分组指标**：按标签/状态/分组统计通过率、token分布
6. **安全拦截**：来源校验、完整性校验、泄漏拦截
7. **导出验证**：清单哈希、完整性校验、防篡改

## 📊 输出文件结构

```
./output/
├── data/
│   └── raw_samples.json          # 原始样例数据
├── exports/
│   ├── export_XXX_YYYYMMDD_HHMMSS.json    # 完整导出（含元数据）
│   ├── export_XXX_YYYYMMDD_HHMMSS.jsonl   # 训练用JSONL格式
│   └── export_XXX_YYYYMMDD_HHMMSS.csv     # CSV格式
├── review_queue.csv             # 复核队列详情
└── final_report.json            # 最终汇总报告
```

## 👁️ 模型评审会查看指引

运行完成后，按以下规则快速判断：

| 状态标记 | 颜色 | 含义 | 处理方式 |
|---------|------|------|----------|
| ✅ clean | 绿色 | 干净可用 | 直接用于训练 |
| ⚠️ pending_review | 黄色 | 待人工确认 | 找算法PM复核 |
| ❌ dirty | 红色 | 脏数据/已丢弃 | 已拦截，不可用 |
| 🔒 train_val_leak | 灰色 | 训练验证泄漏 | 禁止使用，追查来源 |

**每条复核记录都包含同轮复核信息：**
- 🔒 安全规则覆盖性检查
- 📝 模型日志参数核对
- ⚙️ 工具调用参数验证

## 🔍 遇到训练验证泄漏时的排查

```bash
# 1. 从空目录重新开始
rm -rf ./output

# 2. 重新生成样例
python -m context_window_budgeter.cli generate

# 3. 检查泄漏记录的来源溯源
# 在 final_report.json 中查看 security_blocked 部分
# 或在运行输出中查找 "🔒 拦截泄漏记录"
```

**泄漏记录会包含完整溯源信息：**
- 原始文件路径
- Excel行号 / JSONL行号
- 原始内容预览
- 提取时间戳

## 💡 常见问题

**Q: 导出时提示"记录未经过人工复核"怎么办？**
A: 这是安全拦截机制。如需强制导出，可先在 `exporter.py` 的 `can_export` 方法中临时跳过该检查，但不建议在生产环境使用。

**Q: 如何添加自定义样本？**
A: 参考 `output/data/raw_samples.json` 格式，准备好数据后用 `--samples` 参数指定。

**Q: token计数不准确？**
A: 安装 `tiktoken` 后会自动使用精确计数。如未安装，会回退到简单估算（字符数/4）。

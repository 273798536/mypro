# 凸包面积边界校验

教研编辑阿宁的凸包面积校验工具——给现场老师用的，不是给机器看的。

## 环境要求

- **Python 3.6+**（仅使用标准库，无需 `pip install` 任何依赖）
- 入口文件：`main.py`
- 核心模块：`convex_hull_verify.py`
- 示例数据：`data/` 目录下 3 份 CSV

## 先跑哪条命令

### 完整工作流（验证跨运行跳变归因）

```bash
# 步骤 1：清旧运行（可选）
python3 main.py --clear-runs

# 步骤 2：首次运行（跳过单位检测，打标签）
python3 main.py --skip-unit-check --label "原始参数"
# 终端会输出 RUN_ID，例如 20260617_135739

# 步骤 3：设为基准
python3 main.py --set-baseline 20260617_135739

# 步骤 4：换参数/改数据再跑，自动跨运行对比
# 例：换阈值
python3 main.py --skip-unit-check --threshold 0.10 --label "阈值0.10"
# 例：修改题目/改判记录后再跑
python3 main.py --skip-unit-check \
  --questions data/question_items_modified.csv \
  --overrides data/manual_overrides_modified.csv \
  --label "坐标修改+新增改判"

# 步骤 5：看结果
open output/verification_report.html
# 或启动本地服务器：
cd output && python3 -m http.server 8765 && open http://localhost:8765/verification_report.html
```

### 常用命令速查

| 命令 | 说明 |
|------|------|
| `python3 main.py` | 完整流程（检测到单位缺失会暂停并输出报告） |
| `python3 main.py --skip-unit-check` | 跳过单位检测，直接计算 |
| `python3 main.py --skip-unit-check --label "xxx"` | 运行并打标签，便于历史记录识别 |
| `python3 main.py --skip-unit-check --threshold 0.10` | 自定义跳变判定阈值（默认 0.05 = 5%） |
| `python3 main.py --skip-unit-check --questions data/my.csv --overrides data/ov.csv --notes data/n.csv` | 指定自己的材料文件 |
| `python3 main.py --list-runs` | 列出所有历史运行，看哪条是基准 |
| `python3 main.py --set-baseline <RUN_ID>` | 将指定运行设为对比基准 |
| `python3 main.py --clear-runs` | 清除所有历史运行存档 |

所有命令均从项目根目录执行，无其他前置步骤。

## 再看哪份CSV/HTML明细

跑完后 `output/` 目录下的产物，按重要性排序：

| 序号 | 文件 | 看什么 | 现场老师先看 |
|------|------|--------|-------------|
| 1 | `verification_report.html` | **Web 可视化报告**：状态卡片、对比表格、逐步骤追溯、跨运行归因面板 | ✅ 最先打开 |
| 2 | `verification_status.csv` | 哪些已处理、哪些待补证据、哪些单位缺失 | 快速总览 |
| 3 | `verification_results.csv` | 每条题目：基准面积、本次面积、相对变化、跳变归因、信息标签 | 明细核对 |
| 4 | `verification_trace.json` | 每一步输入输出快照，深度排查 | 技术追溯 |

单位缺失时额外生成 `unit_missing_report.json`，列出待确认原因和影响范围。

## 跳变归因逻辑（核心修复点）

**关键原则：只有凸包面积相对变化超过阈值，才标「待补证据」并归因。**
「有改判记录」只是信息标签，不直接触发待补证据。

| 场景 | 状态 | jump_causes（跳变归因） | info_tags（信息标签） |
|------|------|------------------------|----------------------|
| 面积没变，只是有改判记录 | **已处理** | (空) | 存在人工改判记录 |
| 面积跳变，且改判记录也变了 | **待补证据** | 人工改判导致跳变 | 存在人工改判记录 |
| 面积跳变，坐标变了 | **待补证据** | 坐标数据变化 | (空) |
| 面积跳变，阈值变了 | **待补证据** | 阈值调整 | (空) |
| 面积跳变，单位变了 | **待补证据** | 单位不一致 | (空) |
| 单位缺失 | **单位缺失-待确认** | (空) | (空) |

归因完整链条：先对比两次运行的参数、改判记录、题目数据差异 → 再看面积是否真的跳变 → 从差异中找出导致跳变的原因。

## 状态含义

| 状态 | 含义 |
|------|------|
| 已处理 | 凸包面积计算完成，与基准相比无显著跳变（即使有改判记录也没事） |
| 待补证据 | 面积与基准相比有显著跳变，需要补充证据说明变化原因 |
| 单位缺失-待确认 | 题目单位未标注，暂停计算，等确认后重跑 |

## 示例材料

`data/` 目录下三份示例材料：

- **question_items.csv**：6 条题目。Q003、Q006 故意缺单位；Q004 用 mm²，其余 cm²。
- **manual_overrides.csv**：2 条人工改判（Q002 补录遗漏顶点、Q005 歧义修正）。
- **supplementary_notes.csv**：3 条后补说明。

另有 `question_items_modified.csv` 和 `manual_overrides_modified.csv`，用于模拟修改后再跑的场景（Q001 新增改判、Q004 坐标改宽导致面积跳变）。

## 跨运行追溯原理

1. 每次运行自动存档到 `output/runs/run_<RUN_ID>.json`，含完整参数快照、每条题目的计算结果和逐步骤追溯。
2. 用 `--set-baseline` 标记基准运行后，后续运行自动加载基准，对同一 `item_id` 逐题对比。
3. 归因步骤：
   - 对比两次运行的运行参数（阈值、文件哈希等）→ 得出 `parameter_diffs`
   - 对比两次运行的改判记录（增/删/改）→ 得出 `override_diffs`
   - 对比两次运行的题目数据（数值、单位、坐标、题目级阈值）→ 得出 `data_diffs`
   - 计算面积相对变化，若超过阈值则从上述差异中匹配原因
4. 结果在 `verification_report.html` 中可视化展示，每道题有独立的「跨运行对比」面板。

# 风洞烟线参数回放（wind-tunnel-replay）

面向**复核人（小宋）**与**项目经理（日常脚本跑批）**的风洞烟线参数回放工具。
目标：一份传感器日志混着「旧版 / 撤回 / 备注 / 阈值篡改」也能分清谁影响了结论，并把「参数版本 + 异常点 + 解释 + 原始行」放在同一页。

## 快速开始

```bash
cd wind_tunnel_replay

# 1) 安装依赖（系统 Python 3.9+）
python3 -m pip install --user click pyyaml pandas numpy matplotlib jinja2

# 2) 自检配置里的稳定参数名 / 阈值
./wind-tunnel-replay check-config

# 3) 用样例数据试跑（包含：旧版 + 撤回 + 口头备注 + 阈值篡改 + 离群点）
./wind-tunnel-replay run -i data/sample/smoke_line_mixed.log --id daily
# 退出码：0=通过 2=有告警 3=有错误 4=输入错（脚本直接判断即可）

# 4) 退出码含义
./wind-tunnel-replay explain-exit
```

> 注：`wind-tunnel-replay` 是项目根目录下的启动脚本，会自动设置 `PYTHONPATH=src`。
> 如果 `pip install -e .` 能跑通（pip ≥ 21.3 支持 pyproject.toml 可编辑安装），也可以使用入口命令 `wind-tunnel-replay`（`pyproject.toml` 已声明）。

运行结束会在 `outputs/` 下生成两份文件：
- `replay_<run_id>.html`：**单页复核报告**（双击浏览器打开即可）
- `replay_<run_id>.json`：**结构化摘要**（日常脚本消费）

## 项目经理接手不用问

| 想做的事 | 去哪里 |
|---|---|
| 放传感器日志材料 | 任意路径，`run -i <日志路径>` 指定即可；推荐放 `data/` |
| 看异常 / 看证据 / 看参数版本 | 打开 `outputs/replay_*.html`，第 ② 节 + 第 ③ 节 |
| 溯源到传感器日志**原始行或具体对象** | HTML 第 ④ 节，每行带行号锚点 `#L<行号>`，参数表也有跳转 |
| 重新导出 / 日常脚本调度 | `wind-tunnel-replay run -i ... -o outputs --id daily` 可加定时任务 |
| 自检参数名 / 阈值有没有被改 | `wind-tunnel-replay check-config` 与配置 `config/default.yaml` 对比 |
| 判断本次跑批是否需要人工介入 | 退出码 0/2/3；或解析 stdout 的 JSON `exit` 字段 |

## 稳定参数名（`config/default.yaml` → replay.stable_param_names）

**这些参数名在脚本、日志、报告中完全不变**，项目经理排期依赖时不会踩坑：

| 稳定参数名 | 含义 |
|---|---|
| `SMOKE_LINE_VELOCITY` | 烟线流速（m/s） |
| `SMOKE_LINE_DENSITY` | 烟线密度（相对） |
| `WIND_TUNNEL_PRESSURE` | 风洞静压（kPa） |
| `WIND_TUNNEL_TEMPERATURE` | 风洞温度（℃） |
| `SAFETY_THRESHOLD_VELOCITY` | 安全阈值·流速（默认 120.0） |
| `SAFETY_THRESHOLD_PRESSURE` | 安全阈值·压力（默认 350.0） |

> 如需新增稳定参数，只改 `config/default.yaml` 的 `stable_param_names` 列表即可，代码无需改动。

## 日志行识别规则（parser）

| 行首标记 | 归类 | 对结论的影响 |
|---|---|---|
| `[V2] ...` | 新版数据（V2） | 正常参与计算 |
| `[V1] ...` | 旧版数据（V1） | 参与计算但产生「版本混合」告警；全旧版也告警 |
| `[WITHDRAW] ... 撤回 line N` | 撤回记录 | 排除第 N 行；目标不存在 / 未指定都会告警 |
| `[REMARK]` / `#` / `NOTE:` | 口头备注 / 说明 | 不参与计算，原样保存在报告里便于复盘 |
| 含 `NAME=数字` 但无版本前缀 | 未标版本数据 | 参与计算（标记「未标」） |

## 异常检测能力（anomaly）

- **安全阈值篡改**：`SAFETY_THRESHOLD_*` 与配置基线不一致即判 `error`，定位到具体行。
- **参数离群点**：Z-score ≥ 3 的点判 `warning`，给出均值/σ/版本与行号。
- **版本混合 / 全旧版**：提醒复核人新旧版含义可能不一致。
- **撤回记录无效**：没写目标行、目标行不存在都提醒。

## 报告结构（单页 HTML，零依赖离线可看）

1. **概览与结论**：一行结论 + 错误/告警计数 + 「放材料/看异常/重新导出」说明卡片。
2. **异常清单**：级别 / 类别 / 参数 / 说明 / 影响 / 溯源行号（点一下跳到第 ④ 节）。
3. **参数版本与取值轨迹**：每个稳定参数列出「最终值 · 基线 · 来源行 · 版本」，并附折线+散点图（颜色区分版本，虚线=基线，点上标注行号）。
4. **原始日志溯源**：分为「被排除行」与「有效数据行」两张表，每行带 `#L行号` 锚点，参数表 / 异常表可跳转查看原始文本。

## 目录

```
wind_tunnel_replay/
├── config/default.yaml           # 稳定参数名 / 阈值 / 解析规则
├── data/sample/smoke_line_mixed.log  # 自带混合脏数据样例
├── src/wind_tunnel_replay/
│   ├── cli.py                    # 命令行入口（脚本友好，退出码稳定）
│   ├── parser.py                 # 日志解析：行号溯源、版本/撤回/备注区分
│   ├── replay.py                 # 回放核心：稳定参数、基线、结论
│   ├── anomaly.py                # 异常检测：阈值篡改、离群、版本混合
│   ├── report.py                 # 单页 HTML 报告 + matplotlib 图表
│   ├── types.py                  # 数据结构
│   └── templates/report.html     # Jinja2 模板
└── outputs/                      # 产物输出（HTML + JSON）
```

## 脚本集成示例

```bash
#!/usr/bin/env bash
set -euo pipefail
wind-tunnel-replay check-config >/dev/null
wind-tunnel-replay run -i "data/$(date +%F).log" --id "daily-$(date +%F)" > outputs/latest_summary.json
code=$?
case $code in
  0) echo "OK: 通过" ;;
  2) echo "WARN: 有告警，人工查看 HTML" ;;
  3) echo "ERR: 有错误，阻塞交付" ;;
  *) echo "UNKNOWN" ;;
esac
```

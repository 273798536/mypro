# 剧场返场曲清单归档工具

一个零依赖（Python 3.7+ 标准库）的命令行小工具，用于剧场返场曲清单的归档、版本追踪、异常标记和页面摘要导出。

## 目录结构

```
.
├── cli.py                  # CLI 入口（值班脚本直接调用）
├── encore_archive/         # 核心模块
│   ├── __init__.py
│   ├── models.py           # 数据模型 + 存储
│   └── archive.py          # 归档逻辑、校验、摘要
├── demo/                   # 演示数据与脚本
│   ├── run_demo.py
│   ├── tracks_demo01_normal.txt
│   ├── tracks_demo02_messy.txt
│   └── tracks_demo03_mismatch.txt
└── data/                   # 归档数据（运行后自动生成）
    ├── index.json
    ├── records/
    │   └── {record_id}_v{n}.json
    └── summary_*.json
```

## 快速开始

```bash
# 1. 跑演示数据，看下效果
python3 demo/run_demo.py

# 2. 查看所有归档记录
python3 cli.py list

# 3. 提交一份新归档
python3 cli.py submit \
    --record-id encore-2025-0615-test \
    --filename "返场曲清单-曲目1-曲目2.xlsx" \
    --tracks demo/tracks_demo01_normal.txt \
    --supplementary "后补：第3首为现场加曲" \
    --verbal "小孟口头确认顺序不变"

# 4. 重扫同一条记录（补备注/排练/授权说明，自动生成新版本）
python3 cli.py submit \
    --record-id encore-2025-0615-test \
    --tracks demo/tracks_demo01_normal.txt \
    --rehearsal "曲目2授权到期（2025-05-31），本场替换" \
    --annotation "法务确认过期"

# 5. 导出页面摘要（供前端页面渲染，状态与文件内一致）
python3 cli.py summary --record-id encore-2025-0615-02 --output data/summary.json

# 6. 查看指定版本详情
python3 cli.py show --record-id encore-2025-0615-02 --version 1
```

## 统一输出格式

所有命令均输出 **JSON** 到 stdout，便于值班脚本解析。顶层必有 `ok` 字段：

```json
{
  "ok": true,
  "...": "..."
}
```

失败时：
```json
{
  "ok": false,
  "error": "错误原因"
}
```

### 退出码

| 值 | 含义 |
|---|---|
| 0 | 成功 |
| 1 | 归档过程异常 |
| 2 | 参数 JSON 解析失败 |
| 3 | 业务校验不通过（record_id 为空、曲目表为空等） |
| 4 | 记录不存在 |

## 状态说明

| status | status_label | 触发条件 |
|---|---|---|
| `ok` | 正常通过 | 文件名与曲目表匹配度 ≥ 50%，无到期/后补关键字 |
| `expired` | 授权到期 | 备注或曲目说明中检测到「授权到期 / 版权到期」等关键字 |
| `modified` | 口径已改 | 备注中检测到「后补 / 改口径 / 修订」，或与上一版本材料 hash 不一致 |
| `mismatch` | 曲目表与文件不符 | 文件名包含的曲目名命中数 < 50% |
| `pending` | 待确认 | 初始占位 |

**优先级**：`expired` > `modified` > `mismatch` > `ok`，授权到期不会被写成正常通过。

## 曲目表格式

`--tracks` 可以是文件路径或直接传文本，每行一首曲目，字段用 `|` `,` `，` 或制表符分隔：

```
序号. 标题 | 歌手 | 时长 | 备注
```

例如：
```
1. 夜曲 | 周杰伦 | 03:48 | 固定返场
2. 晴天 | 周杰伦 | 04:29 | 授权到期
```

## 版本追踪与对照

- 同一 `record_id` 多次 `submit` 会自动 `version + 1`。
- 每次都会计算 `filename_hash` / `tracks_hash` / `combined_hash`，版本对比看 `combined_hash` 是否变化。
- `change_log` 中会详细列出该版本相对上一版本改了什么（文件名、曲目表、后补备注、口头说明、排练授权备注）。
- `manual_annotations` 人工批注、`delivery_checklist` 交付清单会在版本间自动合并去重，新旧版本可互相对上。

## 页面摘要一致性

`summary` 命令导出的 `status` / `status_label` / `status_detail` 与存储在该版本 JSON 文件里的对应字段完全一致，不会出现页面上显示的状态和文件里对不上的情况。

## 供值班脚本调用的示例

```bash
#!/bin/bash
RECORD_ID="encore-$(date +%Y-%m%d)-01"
RESULT=$(python3 cli.py submit \
  --record-id "$RECORD_ID" \
  --filename "$FILENAME" \
  --tracks "$TRACKS_FILE" \
  --supplementary "$SUPP_NOTE" \
  --verbal "$VERBAL_NOTE" 2>/dev/null)

OK=$(echo "$RESULT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('ok',False))")
if [ "$OK" = "True" ]; then
  echo "归档成功"
else
  echo "$RESULT" | python3 -c "import sys,json;print('失败:',json.load(sys.stdin).get('error','未知'))"
  exit 1
fi
```

## 演示数据说明

`python3 demo/run_demo.py` 会重置 `data/` 目录并生成 3 条记录：

| record_id | 状态 | 说明 |
|---|---|---|
| `encore-2025-0615-01` | 正常通过 | 标准样例，文件名与曲目表匹配，无异常 |
| `encore-2025-0615-02` | 授权到期 | 不太干净的演示数据：含后补备注 + 授权到期，共 3 个版本（v1 首次归档、v2 补授权备注、v3 追加人工批注与交付清单） |
| `encore-2025-0615-03` | 曲目表与文件不符 | 文件名写着五月天，曲目表是薛之谦 |

演示跑完不会只展示正常样例，`encore-2025-0615-02` 最终状态为「授权到期」，可以在 `summary` 导出中看到。

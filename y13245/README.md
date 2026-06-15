# 播客片头版本复核

> 录音师老许不用再人工兜底了。曲目表里的授权、旧版母带、交付清单三者交叉复核，一目了然。

---

## 一、材料入口（新手也能一眼看懂）

程序接受 **三类输入材料**，前 1 个必填，后 2 个按需提供：

| # | 材料 | 传参方式 | 放什么内容 |
|---|---|---|---|
| 1 | **曲目表 CSV** | 第 1 个位置参数 | 按行列出所有曲目。至少 2 列：`曲目`、`版本`。建议再多 `时长`、`备注`、`交付单号`。**授权期限、排练说明、旧版标记通通写在备注里**，程序会自动抽取。 |
| 2 | **交付清单 CSV** | `--delivery delivery.csv` | 已经交付给客户/上线的曲目编号。有这货才能判定「交付已匹配」。 |
| 3 | **人工批注 JSON** | `--annotation annotations.json` | 接手同事对挂起/坏行的裁定。格式见下。 |

> 第 4 类输入是 **上次会话状态**，由程序自动从 `曲目表所在目录/.podcast_review_state/` 读取——你补完备注重扫即可，历史批注会自动对齐到同一行。

### 最小运行示例

```bash
python3 -m podcast_intro_review examples/tracklist.csv
```

带交付清单 + 详细模式：

```bash
python3 -m podcast_intro_review examples/tracklist.csv \
    --delivery examples/delivery.csv \
    --verbose
```

导出完整 JSON 报告：

```bash
python3 -m podcast_intro_review examples/tracklist.csv \
    --delivery examples/delivery.csv \
    --output report.json
```

---

## 二、异常出口（你会碰到的 4 种退出码）

| 退出码 | 含义 | 接手同事该干嘛 |
|---|---|---|
| **0** | ✅ 全部复核通过，没有挂起 / 待补 / 坏行 | 直接开录 |
| **1** | ℹ️  有**待补证据**或**坏行**（但没有旧版母带挂起） | 去曲目表补授权备注 / 修 CSV 格式，然后重扫同一条命令 |
| **2** | ⚠️  检测到 **旧版母带混入**，已挂起 | 这是最高优先级。先找录音师比对正确版本，在「备注」里补排练确认或授权说明，**或**用人工批注文件裁定，再重扫 |
| **3** | 参数/文件错误 | 检查文件路径、CSV 扩展名 |

> **设计原则：旧版母带宁可挂起，也不给假稳定结论。** 退出码 2 不会自动消失，必须由人工补证据或下批注才能解锁。

---

## 三、CLI 输出怎么读

程序把每一行归到 **7 类**里，按接手同事关心顺序展示（✅先、🆘后）：

```
━━━ 已处理 共 N 项 ━━━    版本确认 + 授权齐全 + 交付匹配，可以直接开录
━━━ 人工通过 共 N 项 ━━━  接手同事批注为 OK
━━━ 待补证据 共 N 项 ━━━  缺授权/排练备注，或没匹配交付单号
━━━ 挂起待确认 共 N 项 ━  疑似旧版母带混入，等人工
━━━ 人工驳回 共 N 项 ━━━  接手同事批注为 Reject
━━━ 坏行 共 N 项 ━━━━━━━  CSV 格式坏 / 必填列为空
━━━ 跳过行 共 N 项 ━━━━━  表头 / 空行 / 非片头 BGM
```

每一行都会带上：**行号 + 状态 + 《曲名》 + 版本号 + 授权/交付徽标**。加 `-v/--verbose` 还会再打印
原始 CSV 行、问题描述、修复建议、证据链、人工批注原文——**脏数据原封不动展示**，不会被修得看不出痕迹。

最后还有「📋 接手同事要点」，直接告诉你：
- 哪几项可以开录
- 哪几项要补证据
- 哪几项是挂起的旧版母带
- 重扫命令怎么敲（复制粘贴就行）

---

## 四、重扫 & 对齐（补完备注再跑一次）

工作流：**第 1 次扫描 → 发现待补/挂起 → 打开曲目表补备注 → 第 2 次扫描**

```bash
# 第一次扫，发现 3 项挂起 + 3 项待补（退出码 2）
python3 -m podcast_intro_review my_show.csv -d delivery.csv

# 打开 my_show.csv，在「备注」列补：
#   - 授权到期日（授权至YYYY-MM-DD / 授权期 YYYY/MM/DD）
#   - 排练确认（排练 / 彩排 / 排练通过）
#   - 旧版母带的版本号冲突会被自动识别，不必手动改

# 重扫——上次的挂起/批注会自动对齐（按「原始行哈希」对齐）
python3 -m podcast_intro_review my_show.csv -d delivery.csv
```

> 想从零开始、不要历史状态？加 `--no-resume`。

---

## 五、人工批注 JSON 格式

当你作为接手同事，需要裁定某条挂起的曲目是**可以用**还是**必须重做**时，写一个 JSON 文件：

```json
[
  {
    "row_hash": "abc123...从第1次扫描的verbose输出或JSON报告里复制",
    "annotator": "老许",
    "status": "ok",
    "comment": "确认已重录为v3，旧版已从发布清单移除"
  },
  {
    "row_hash": "def456...",
    "annotator": "接手同事A",
    "status": "reject",
    "comment": "母带底噪超标，必须重录"
  }
]
```

然后：

```bash
python3 -m podcast_intro_review my_show.csv \
    -d delivery.csv \
    --annotation my_notes.json
```

`status` 只能是 `ok` 或 `reject`。裁定一旦写入，重扫时会持久保存，下次不用再传 annotation 文件。

---

## 六、曲目表备注关键字速查

写备注时命中以下关键字，程序会自动识别：

| 你想表达 | 备注里这么写 | 效果 |
|---|---|---|
| 有授权 | `已授权`、`版权合同编号XXX`、`著作权`、`license` | 标记「有授权」 |
| 授权何时到期 | `授权至2026-12-31`、`到期 2027/01/01`、`有效期至2026年6月` | 额外展示到期日徽标 |
| 排练通过 | `排练确认`、`彩排通过`、`试演OK`、`走台` | 视为有效证据，不必再找授权 |
| 这是旧版 | `旧版`、`demo`、`初稿`、`v1`、`未修`、`draft`、`beta`、`rough` | ⚠️ 直接挂起 + 退出码 2，等人工确认 |
| 这是片头 | `片头`、`intro`、`开场`、`主题曲`、`片头曲`、`前奏` | 参与版本复核 |
| 已交付 | 在「交付单号」列填对应编号，或备注里写 `已交付`、`成品`、`final`、`定稿` | 标记「交付已匹配」 |

---

## 七、项目文件结构

```
podcast_intro_review/
├── __init__.py
├── __main__.py        CLI 入口 & 参数解析
├── exceptions.py      异常（旧版母带挂起 / 未解决）
├── models.py          数据模型（TrackRow / ReviewSession / 枚举）
├── parser.py          CSV 解析（保留原始行 + 授权备注抽取）
├── engine.py          版本比对引擎（旧版母带识别 / 交付匹配）
├── storage.py         会话持久化（.podcast_review_state/）
└── report.py          终端输出分组 & 统计

examples/
├── tracklist.csv          示例曲目表（故意做脏）
├── delivery.csv           示例交付清单
├── annotations.sample.json人工批注模板
└── smoke_test.py          冒烟测试（解析→复核→重扫全流程）
```

关键代码链接（可点击跳转）：
- 7 种复核状态枚举 [ReviewStatus](podcast_intro_review/models.py#L16-L24)
- 版本判定 & 旧版关键词列表 [OLD_VERSION_MARKERS](podcast_intro_review/models.py#L40-L44)
- 原始 CSV 行保留与哈希对齐 [TrackRow.compute_hash](podcast_intro_review/models.py#L118-L121)
- 授权备注抽取器 [_parse_authorization](podcast_intro_review/parser.py#L75-L92)
- 旧版母带挂起逻辑 [VersionReviewEngine.review](podcast_intro_review/engine.py#L116-L165)
- 7 类分组输出与接手同事要点 [report.py](podcast_intro_review/report.py)
- 退出码映射 [__main__.maybe_raise / exit](podcast_intro_review/__main__.py#L154-L173)

---

## 八、谁适合用这个工具？

- ✅ **老许（录音师）** —— 以前一条条看，现在 CLI 一眼看出哪几条可能是旧版母带。
- ✅ **接手同事（A/B/C）** —— 最后不是看功能表，是看哪些 `已处理`、哪些 `待补证据`、哪些 `挂起待确认`。
- ✅ **没参与开发的人** —— 3 种材料入口 + 4 种异常出口 + README 表格，照着跑就行。
- ❌ 想要全自动、不看就盖章的 —— 这个工具故意在旧版母带问题上「闹脾气」挂起，宁可让你确认，也不给假稳定。

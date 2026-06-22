# 微分方程课堂验算工具

给竞赛助教小岑用的。翻板书照片时，顺手写几笔，工具帮你兜着底。

---

## 一、安装（换台电脑也能跑）

需要 Python 3.8+。

```bash
# 1. 装依赖
pip install -r requirements.txt

# 2. 试一下能不能跑
python cli.py --help
```

就两步，不用配置别的。

---

## 二、样例在哪？怎么导入？

### 样例数据位置

```
samples/
├── generate_samples.py      # 生成样例的脚本
└── classroom_records.json   # 生成好的样例（跑一下脚本就有）
```

### 生成样例

```bash
# 方法一：直接生成样例数据到默认位置
python cli.py gen-samples

# 方法二：生成到指定文件，然后导入
python cli.py gen-samples -o my_samples.json
python cli.py import my_samples.json
```

### 样例里有什么？

故意做"乱"了，贴近真实课堂：

| 状态 | 数量 | 说明 |
|------|------|------|
| 正常 | 2 条 | 第 1 题（RK4，精确）、第 4 题（外推已放行） |
| 撤回 | 1 条 | 第 1 题欧拉法版本，步长太大误差超标被撤 |
| 旧版 | 1 条 | 第 2 题改进欧拉法，已被 RK4 版取代 |
| 草稿 | 1 条 | 第 3 题，上课抄的板书，还没核对 |

每条记录都带：方程、初值、方法、步长、计算结果、精确解、备注、时间戳。

---

## 三、常用命令

```bash
# 列出所有正常记录
python cli.py list

# 列出全部（含撤回、旧版、草稿）
python cli.py list --all

# 看单条记录的验算报告
python cli.py show <记录ID>

# 汇总报告（一眼看出哪些需要留意）
python cli.py summary

# 加备注（翻照片时随手写）
python cli.py note <记录ID> "板书第2张，符号换了个写法"

# 撤回一条记录
python cli.py withdraw <记录ID> "步长取错了，重算"

# 导出报告到文件
python cli.py report <记录ID> -o report.txt
```

不知道记录 ID？先 `list` 一下。

---

## 四、异常去哪看？

### 1. 超阈值的点

运行 `show <id>`，报告里会列出来：

```
⚠ 超过阈值的点: 3 个
  - t=1.5000, 绝对误差=0.0234
  - t=1.6000, 绝对误差=0.0278
  ...
```

阈值默认 0.001，想改：`python cli.py --threshold 0.01 show <id>`

### 2. 撤回的记录

```bash
python cli.py list --all
# 会显示 [撤回] 标记的记录
```

点进去看：`python cli.py show <id>`，最下面有"撤回原因"。

### 3. 外推越界

报告里单独一块：

```
【外推越界】⚠ 存在外推
  题目范围边界: t ≤ 5.0
  实际计算到  : t = 10.0
  越界点数    : 500
  状态: 已放行（非普通样本！）
  放行条件:
    1. 助教小岑复核确认...
    2. 该方程为指数增长，不存在奇点...
    3. 仅用于课堂演示...
```

放行过的外推会标清楚，不会混在普通样本里，同事接班不用再问一圈。

### 4. 草稿和旧版

`list --all` 能看到。草稿有 `[草稿]` 标，旧版有 `[旧版]` 标。

---

## 五、失败场景（踩过的坑，别再踩）

| 现象 | 原因 | 怎么办 |
|------|------|--------|
| `找不到记录: xxx` | ID 输错了 | 先 `list` 看一下正确的 ID |
| `ModuleNotFoundError: numpy` | 没装依赖 | `pip install -r requirements.txt` |
| 误差特别大 | 步长太大 / 方法太糙 | 换 RK4，步长改小（比如 0.01） |
| 导入后数据是空的 | 文件路径错了 | 检查 JSON 文件在不在，路径对不对 |
| `json.decoder.JSONDecodeError` | 数据文件格式坏了 | 重新 `gen-samples` 生成一份 |
| 外推被当成普通结果 | 没加放行条件 | 给记录补 `extrapolation_info.released = true` 和理由 |

---

## 六、术语大白话

| 术语 | 人话 |
|------|------|
| 阈值 | 及格线。误差超过这个数就算"有问题"，需要留意 |
| 误差传播 | 一步错步步错。前面的小误差往后传，越攒越大。步长越大、方法越糙，传得越快 |
| 外推越界 | 超纲答题。题目只问到 t=5，你硬算到 t=10。超出范围的结果可能完全不靠谱 |
| 单位换算 | 米换成厘米，数字差 100 倍。单位对不上，误差再小也是错的 |

---

## 七、目录结构

```
.
├── cli.py                     # 命令行入口
├── requirements.txt           # 依赖
├── ode_checker/
│   ├── __init__.py
│   ├── solver.py              # 数值求解器（欧拉、改进欧拉、RK4、scipy）
│   ├── error_analysis.py      # 误差分析、阈值、外推、单位换算
│   ├── data_store.py          # 数据存储、版本管理、撤回、备注
│   └── report.py              # 报告生成
├── samples/
│   ├── generate_samples.py    # 生成样例数据
│   └── classroom_records.json # 样例数据（生成后才有）
└── README.md                  # 你现在看的这个
```

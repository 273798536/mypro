# 公交港湾投诉回放

## 一、启动

从 `data/` 目录加载投诉记录和会议纪要，生成首次回放报告。

```bash
python main.py start
```

可选参数：
- `--data-dir, -d`：数据目录（默认 `data`）
- `--output, -o`：报告输出路径（默认 `report.md`）
- `--state-dir`：状态存储目录（默认 `.replay_state`）

## 二、重跑

清空历史状态，从头重新加载数据并生成报告。

```bash
python main.py rerun
```

参数同 `start`。当数据文件有更新时用这个。

## 三、查看报告

基于当前已保存的状态重新生成 Markdown 报告。

```bash
python main.py report
```

可选参数：
- `--output, -o`：报告输出路径
- `--view, -v`：在终端显示报告摘要
- `--state-dir`：状态存储目录
- `--data-dir, -d`：数据目录

---

### 其他命令

**查看待复核点位（三类分开）：**
```bash
python main.py review
```

**追溯某份会议纪要的原始说法：**
```bash
python main.py trace MIN-meeting_minutes-001
```

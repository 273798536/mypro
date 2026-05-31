# 播客配乐电平检查工具

自动检测播客音频中的人声静音、配乐过响和广告段漏标问题。

## 功能特性

- 🔊 **电平分析** - 逐帧RMS电平计算，精确到100ms
- 🎯 **段落识别** - 自动识别人声、静音、配乐、广告段
- 📍 **来源追溯** - 每条判断关联到原始音频和标记文件的具体位置
- 📋 **修正历史** - 记录人工修正，支持与上一次检查对比
- 📝 **报告生成** - 终端彩色摘要 + 可转发的文本报告 + JSON结构化数据

## 安装

```bash
pip install pydub numpy rich
```

需要系统安装 ffmpeg（已内置在Trae环境中）。

## 快速开始

### 1. 生成测试样例

```bash
python3 generate_test_samples.py
```

### 2. 运行检查

```bash
python3 -m podcast_level_checker.cli --input ./samples --output ./output
```

### 3. 查看报告

- 终端会显示彩色摘要
- 文本报告：`output/report.txt`（可直接转发给同事）
- JSON报告：`output/report.json`（用于程序处理）
- 历史记录：`output/.check_history/`

## 命令行参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--input, -i` | 输入目录（包含音频和标记文件） | 必填 |
| `--output, -o` | 输出目录（保存报告） | 必填 |
| `--silence-threshold` | 静音阈值(dB) | -40 |
| `--music-threshold` | 配乐过响阈值(dB) | -15 |
| `--frame-ms` | 分析帧长(毫秒) | 100 |
| `--min-silence-ms` | 最小静音段长度 | 500 |
| `--min-music-ms` | 最小配乐段长度 | 1000 |
| `--voice-reference` | 人声参考电平(dB) | 自动计算 |

## 支持的文件格式

### 音频文件
- `.wav`, `.mp3`, `.m4a`, `.aac`, `.ogg`, `.flac`

### 时间段标记文件
- **SRT** - 字幕格式（最常用）
- **VTT** - Web字幕格式
- **CSV** - 表格格式，需包含 `start`, `end`, `label` 列
- **TXT** - 纯文本格式，如 `00:02 - 00:05 广告赞助商`

### 标记文件命名规则
标记文件需要与音频文件同名，例如：
- 音频：`episode_01.wav`
- 标记：`episode_01.srt` 或 `episode_01.csv`

## 检测问题类型

| 类型 | 严重程度 | 说明 |
|------|----------|------|
| `long_silence` | HIGH | 超过2秒的长静音 |
| `loud_music` | HIGH | 配乐电平超过阈值，可能盖过人声 |
| `ad_missing_label` | HIGH | 有广告标记但未被识别为广告段 |
| `silence` | MEDIUM | 0.5-2秒的静音段 |
| `advertisement` | MEDIUM | 检测到广告段 |
| `low_voice` | MEDIUM | 人声音量偏低 |
| `music_segment` | LOW | 正常配乐段 |

## 测试样例说明

运行 `generate_test_samples.py` 会生成以下样例：

| 文件 | 场景 | 预期检测 |
|------|------|----------|
| `normal_podcast.wav` | 正常记录 | 少量小问题 |
| `dirty_sample.wav` | 人声静音脏样例 | 多处静音，包括2.5秒长静音 |
| `loud_music_sample.wav` | 配乐过响样例 | 2处配乐电平达到-10dB和-8dB |
| `ad_missing_sample.wav` | 广告段漏标样例 | 2处通过关键词识别的广告段 |

## 项目结构

```
podcast_level_checker/
├── __init__.py
├── cli.py              # CLI入口
├── audio_analyzer.py   # 音频电平分析
├── segment_identifier.py  # 段落识别
├── history_tracker.py  # 修正历史追踪
└── report_generator.py # 报告生成
```

## 示例输出

```
共发现 13 个问题:
  HIGH: 3 个
  MEDIUM: 6 个
  LOW: 4 个

--- 问题 #2 (HIGH) ---
类型: 静音
时间段: 00:02.000 - 00:04.500
消息: 检测到 00:02.500 的长静音, 可能需要剪辑
来源追溯:
  [音频文件] ./samples/dirty_sample.wav
  [标记文件] ./samples/dirty_sample.srt (第 2 行)
      label: [静音] 这里可能需要剪辑
```

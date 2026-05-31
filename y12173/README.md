# 歌词押韵辅助CLI

一个帮助词作者检查押韵、处理多音字、追踪版本的轻量工具。

## 快速开始

```bash
# 1. 初始化
python lyric_rhyme_cli.py init

# 2. 导入歌词
python lyric_rhyme_cli.py import examples/sample_lyrics.txt --name 初稿

# 3. 检查押韵
python lyric_rhyme_cli.py check

# 4. 生成报告
python lyric_rhyme_cli.py report
```

## 歌词草稿准备

### 格式要求
- 用 `【段落名】` 标记分段
- 每行为一句
- 空行分隔段落

### 示例：
```
【主歌1】
第一句歌词
第二句歌词

【副歌】
副歌第一句
副歌第二句
```

## 多音字复现

当遇到多音字（如"长"、"行"），工具会标记"歧义"提示。

**标记修正：
```bash
python lyric_rhyme_cli.py fix 5 chang --note "这里读 chang，不读 zhang"
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `init` | 初始化项目 |
| `import <file>` | 导入歌词版本 |
| `check` | 检查押韵 |
| `history` | 查看版本历史 |
| `diff v1 v2` | 对比两个版本 |
| `fix <行号> <拼音>` | 修正多音字 |
| `report` | 生成分析报告 |

## 目录结构

```
versions/    # 歌词版本
segments/    # 分段标记
fixes/       # 人工修正记录
reports/     # 输出报告
```

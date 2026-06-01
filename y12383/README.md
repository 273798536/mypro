# 爵士即兴Solo结构分析工具

命令行工具，用于分析和管理爵士即兴Solo演奏记录，特别关注节拍漂移的检测和处理。

## 核心功能

- ✅ **节拍漂移单独标记** - 坏行与正常记录分开显示，不混进正常明细
- ✅ **动机检测** - 自动识别常见爵士和声进行模式
- ✅ **和声对齐** - 检查和弦与旋律的对齐问题
- ✅ **片段回放** - 生成可回放的片段标记
- ✅ **手动修正入口** - 支持和弦进行的手动修正和并排对比
- ✅ **历史留痕** - 所有修改都有历史记录
- ✅ **导出对应关系** - 演奏音频、和弦进行、分析报告三者对应

## 快速开始

```bash
# 安装依赖
npm install

# 构建
npm run build

# 初始化样例数据
node dist/cli.js init-samples

# 查看所有记录
node dist/cli.js list
```

## 命令说明

### 1. 初始化样例数据

```bash
node dist/cli.js init-samples
```

生成5条样例记录，包括：
- **缺字段记录** - 演奏者或日期未填写
- **晚补记录** - 学生临时提交的补录
- **备注修改记录** - 老师评语有修改历史
- **节拍漂移记录** - 包含不同程度的节拍问题

### 2. 列出所有分析记录

```bash
# 列出所有记录（节拍漂移与正常分开显示）
node dist/cli.js list

# 只看有节拍漂移的记录
node dist/cli.js list -f drift

# 只看正常记录
node dist/cli.js list -f normal

# 只看草稿状态
node dist/cli.js list -f draft

# 只看已修正记录
node dist/cli.js list -f corrected
```

### 3. 查看详细分析报告

```bash
node dist/cli.js show <记录ID>
```

报告包含：
- 基本信息（音频、曲目、演奏者等）
- 和弦进行
- 检测到的动机
- **⚠️ 节拍漂移（单独列出）**
- 和声对齐问题
- 回放片段
- 备注
- 历史记录
- 导出复核信息

### 4. 分析新录音

```bash
node dist/cli.js analyze \
  -a "20240602_my_solo.wav" \
  -t "我的即兴练习" \
  -c "Am7 | D7 | Gmaj7 | Cmaj7" \
  -r "张三" \
  -d "2024-06-02"
```

### 5. 手动修正和弦进行

```bash
# 修正和弦进行
node dist/cli.js correct <记录ID> \
  -c "Am7 | D7 | Gmaj7 | Cmaj7 | Fmaj7 | Bdim7" \
  -a "李老师"

# 更新备注
node dist/cli.js correct <记录ID> \
  -n "第3小节节奏处理得很好"

# 并排对比视图会自动显示变更
```

### 6. 查看历史版本对比

```bash
node dist/cli.js diff <记录ID>
```

显示所有和弦进行的历史版本，并展示最新的变更对比。

### 7. 导出报告

```bash
# 导出为文本报告
node dist/cli.js export <记录ID>

# 导出为JSON
node dist/cli.js export <记录ID> -f json
```

### 8. 导出所有记录的对应关系表

```bash
node dist/cli.js export-all
```

生成一个包含以下信息的对应关系表：
- 序号
- 状态
- 节拍漂移数量
- 演奏音频文件名
- 和弦数量
- 报告文件名

### 9. 交互式修正模式

```bash
node dist/cli.js interactive
```

通过命令行交互方式选择记录并修正和弦进行。

## 数据结构

### 节拍漂移标记

每处节拍漂移包含：
- 小节号和拍号
- 漂移量（百分比）
- 严重程度：轻微/中等/严重
- 检测时间
- 描述

### 历史记录

每次操作都会记录：
- 时间戳
- 操作类型：创建/分析/修正/备注/导出
- 操作人
- 描述
- （修正和弦时）旧的和弦进行

## 目录结构

```
.
├── src/
│   ├── types.ts      # 数据类型定义
│   ├── analyzer.ts   # 核心分析引擎
│   ├── store.ts      # 数据存储
│   ├── samples.ts    # 样例数据
│   ├── corrector.ts  # 修正和对比
│   ├── exporter.ts   # 导出功能
│   ├── cli.ts        # 命令行接口
│   └── index.ts      # 入口
├── data/             # 数据存储目录
├── exports/          # 导出文件目录
├── package.json
└── tsconfig.json
```

## 使用示例

```bash
# 1. 初始化样例
node dist/cli.js init-samples

# 2. 查看列表（注意节拍漂移记录是红色的，正常是绿色的）
node dist/cli.js list

# 3. 查看某条有漂移的记录详情
node dist/cli.js show <ID>

# 4. 修正这条记录的和弦
node dist/cli.js correct <ID> -c "新和弦进行" -a "李老师"

# 5. 查看变更历史
node dist/cli.js diff <ID>

# 6. 导出报告
node dist/cli.js export <ID>

# 7. 导出所有对应关系表
node dist/cli.js export-all
```

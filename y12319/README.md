# 拓扑路径连通审计系统

一个用于拓扑图连通性分析和审计的工具，支持命令行和Web界面两种使用方式。

## 🔧 修复记录 (2026-06-03)

### 已修复的核心问题

**1. `ChangeReport.path_changes` 类型错误**
- 问题：`field(default_factory=dict)` 应为 `field(default_factory=list)`
- 影响：路径变更对比时报 `AttributeError: 'dict' object has no attribute 'append'`
- 修复位置：[change_detector.py#L25](file:///Users/mac/pro/solo/workspaces/y12319/src/change_detector.py#L25-L25)

**2. Web 端手动修正后无法保留历史版本**
- 问题：`previous_graph = current_graph` 只是引用赋值，修改时新旧版本同时变化
- 影响：变更对比功能无法正常工作
- 修复：添加 `TopologyGraph.deep_copy()` 方法，使用深拷贝保存历史版本
- 修复位置：
  - [graph_model.py#L155-L176](file:///Users/mac/pro/solo/workspaces/y12319/src/graph_model.py#L155-L176) (深拷贝方法)
  - [web_app.py#L195-L196](file:///Users/mac/pro/solo/workspaces/y12319/src/web_app.py#L195-L196) (调用深拷贝)

**3. 报告文件路径信息丢失**
- 问题：重新运行审计后 `source_file_nodes` 和 `source_file_edges` 被清空
- 修复：修改后从历史报告继承文件路径信息
- 修复位置：[web_app.py#L216-L217](file:///Users/mac/pro/solo/workspaces/y12319/src/web_app.py#L216-L217)

## 功能特性

### 核心功能
- **节点列表管理**：完整展示节点明细、层级、标签等信息
- **边关系管理**：展示边关系明细，支持手动编辑修正
- **连通性审计**：自动检测以下问题类型：
  - 孤立节点：无任何连接关系的节点
  - 跨层错连：层级顺序错误或层级标签不匹配
  - 方向边反：边方向定义为反向的情况
  - 路径中断：两点之间无连通路径

### 高级功能
- **变更对比**：修改边关系后自动对比新旧版本差异
- **断点定位**：检测连接丢失的断点位置
- **路径查询**：展示所有可达路径及途经层级
- **手动修正**：Web界面提供边关系编辑功能
- **报告导出**：支持文本、JSON、CSV三种格式导出

## 项目结构

```
.
├── src/
│   ├── __init__.py          # 包初始化
│   ├── graph_model.py       # 图数据模型
│   ├── connectivity_audit.py # 连通性审计逻辑
│   ├── change_detector.py   # 变更对比检测器
│   ├── report_exporter.py   # 报告导出工具
│   ├── cli.py              # 命令行工具
│   └── web_app.py          # Web应用
├── templates/
│   └── index.html          # Web界面模板
├── static/
│   ├── style.css           # 样式文件
│   └── app.js              # 前端脚本
├── data/
│   ├── nodes.csv           # 节点数据
│   └── edges.csv           # 边数据
├── reports/                # 报告输出目录
└── requirements.txt        # 依赖配置
```

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 准备数据

节点CSV格式示例 (`data/nodes.csv`):
```csv
id,name,layer,tags
A1,接入点A1,接入层,无障碍
B1,汇聚点B1,汇聚层,
C1,核心点C1,核心层,无障碍
```

边CSV格式示例 (`data/edges.csv`):
```csv
id,source,target,direction,layer
e1,A1,B1,forward,接入层
e2,B1,C1,forward,汇聚层
```

### 3. 使用命令行工具

#### 执行连通性审计
```bash
python3 src/cli.py audit --nodes data/nodes.csv --edges data/edges.csv
```

指定层级顺序：
```bash
python3 src/cli.py audit --nodes data/nodes.csv --edges data/edges.csv --layer-order 接入层,汇聚层,核心层,出口层
```

导出报告：
```bash
python3 src/cli.py audit --nodes data/nodes.csv --edges data/edges.csv --export --export-format text
```

#### 对比两个版本的差异
```bash
python3 src/cli.py compare \
  --old-nodes data/old_nodes.csv \
  --old-edges data/old_edges.csv \
  --new-nodes data/new_nodes.csv \
  --new-edges data/new_edges.csv
```

### 4. 使用Web界面

启动Web服务器：
```bash
python3 src/web_app.py
```

然后访问 `http://localhost:5001`

Web界面功能：
- **概览卡片**：快速查看统计信息
- **节点列表**：查看所有节点明细和状态
- **边关系**：查看边关系并支持编辑
- **问题详情**：分类展示各类问题
- **路径明细**：展示所有连通路径
- **变更对比**：查看修改前后的差异对比
- **数据上传**：上传新的节点和边数据文件
- **报告导出**：一键导出完整报告

## 代码参考

### 核心模块

- [graph_model.py](file:///Users/mac/pro/solo/workspaces/y12319/src/graph_model.py) - 图数据模型定义
- [connectivity_audit.py](file:///Users/mac/pro/solo/workspaces/y12319/src/connectivity_audit.py) - 连通性审计逻辑
- [change_detector.py](file:///Users/mac/pro/solo/workspaces/y12319/src/change_detector.py) - 变更检测功能
- [report_exporter.py](file:///Users/mac/pro/solo/workspaces/y12319/src/report_exporter.py) - 报告导出功能
- [cli.py](file:///Users/mac/pro/solo/workspaces/y12319/src/cli.py) - 命令行工具
- [web_app.py](file:///Users/mac/pro/solo/workspaces/y12319/src/web_app.py) - Web应用后端

### 前端文件

- [index.html](file:///Users/mac/pro/solo/workspaces/y12319/templates/index.html) - 主页面模板
- [style.css](file:///Users/mac/pro/solo/workspaces/y12319/static/style.css) - 样式文件
- [app.js](file:///Users/mac/pro/solo/workspaces/y12319/static/app.js) - 前端交互逻辑

## 数据来源说明

系统中的所有数据项都明确标注了来源：
- 节点信息：来源为"节点列表"
- 边关系信息：来源为"边关系"
- 孤立节点问题：来源为"节点列表分析"
- 跨层错连问题：来源为"边关系分析"
- 方向边反问题：来源为"边关系分析"
- 路径中断问题：来源为"路径查询"
- 层级汇总：来源为"层级汇总分析"
- 变更信息：来源为"版本对比"

## 报告格式

### 文本报告
包含完整的审计详情，适合人工阅读和复核。

### JSON报告
结构化数据格式，适合程序处理和集成。

### CSV报告
包含多个CSV文件：
- `*_nodes.csv` - 节点明细
- `*_edges.csv` - 边关系明细
- `*_issues.csv` - 问题明细
- `*_summary.csv` - 统计汇总

## ✅ 核心检查点

### CLI 基础审计
- [x] 能读取 `data/nodes.csv` 和 `data/edges.csv`
- [x] 分类输出孤立节点
- [x] 分类输出跨层错连
- [x] 分类输出方向边反
- [x] 坏行单独列出，不混入正常明细
- [x] 节点列表、边关系、报告各有来源标注

### 变更对比功能
- [x] 手动修正边关系后保留历史版本
- [x] 新旧结果并排展示
- [x] 路径查询变化后自动更新变更对比
- [x] 断点定位正确显示连接丢失位置
- [x] 边变更、节点变更、问题变更、路径变更分类展示

### 数据导出
- [x] 文本报告格式完整
- [x] JSON报告结构化导出
- [x] CSV报告分文件导出
- [x] 导出文件保留来源信息

### Web 界面功能
- [x] 概览卡片正确显示统计数据
- [x] 节点列表正常展示
- [x] 边关系列表正常展示
- [x] 问题详情分类展示
- [x] 路径明细完整展示
- [x] 变更对比页面正确加载
- [x] 边关系编辑功能正常
- [x] 报告导出功能可用

## ⚠️ 剩余风险

### 已知限制
1. **Web 服务器重启丢失历史**
   - 现象：Flask 开发服务器重启后，`previous_graph` 和 `previous_report` 会丢失
   - 影响：无法跨会话保留对比历史
   - 建议：重要对比使用 CLI compare 命令

2. **只保留单步历史**
   - 现象：每次修改只保留上一个版本，无法查看完整修改链
   - 影响：无法追溯多次修改的累积影响
   - 建议：重要修改分步进行，每步验证后再继续

3. **未处理并发修改**
   - 现象：多用户同时修改可能导致状态不一致
   - 影响：对比结果可能不准确
   - 建议：单用户使用，或修改前确认无人操作

4. **边删除功能未实现**
   - 现象：Web 界面只能修改边，无法删除
   - 影响：无法通过界面删除错误的边关系
   - 建议：直接修改 CSV 文件后重新上传

## 注意事项

1. 手动修改边关系后，系统会自动保存旧版本用于对比
2. 变更对比功能需要至少一次修改操作后才会显示数据
3. 导出的报告会自动保存在 `reports/` 目录下，文件名包含时间戳
4. Web 服务器重启会丢失对比历史，重要对比请使用 CLI 命令

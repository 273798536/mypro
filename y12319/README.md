# 拓扑路径连通审计系统

一个用于拓扑图连通性分析和审计的工具，支持命令行和Web界面两种使用方式。

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

## 注意事项

1. 手动修改边关系后，系统会自动保存旧版本用于对比
2. 变更对比功能需要至少一次修改操作后才会显示数据
3. 导出的报告会自动保存在 `reports/` 目录下，文件名包含时间戳

# 城市照明抢修重试补偿队列服务

## 功能概述

解决同一路段反复熄灯被拆成多个零散工单的问题，通过关联巡检照片、报修热线、备件批次、异常照片等线索，实现工单的统一管理和重试补偿机制。

## 核心特性

- **线索关联**：自动关联同一路段的多源数据（巡检照片、报修热线、备件批次、异常照片）
- **持久化队列**：外部回执提交、排队、限次重试、人工接管、补偿入账、关闭全程持久化
- **脏记录处理**：缺字段、跨日、改名、金额/数量冲突自动识别，保留原始内容
- **数据一致性**：导出文件、详情接口、历史查询使用同一数据源
- **统计报告**：可重试分类、死信处理、恢复后续跑可视化
- **CLI + API**：支持命令行操作和脚本自动化

## 快速开始

### 安装依赖

```bash
pip install -r requirements.txt
```

### CLI 使用

```bash
# 初始化数据库
python -m app.cli init

# 提交回执
python -m app.cli submit --type inspection --data '{"location":"人民路123号","photo_id":"P001"}'

# 查看队列
python -m app.cli queue

# 执行重试
python -m app.cli retry

# 查看统计
python -m app.cli stats

# 导出数据
python -m app.cli export --format excel --output report.xlsx
```

### API 使用

```bash
# 启动服务
python -m app.api

# 访问文档
open http://localhost:8000/docs
```

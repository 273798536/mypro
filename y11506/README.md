# 医疗器械巡检多源导入巡检 CLI

一个用于医疗器械巡检数据管理的命令行工具，支持巡检记录、校准证书、维修报价的导入、校验、修复和导出。

## 功能特性

- ✅ **多源数据导入**：支持巡检记录、校准证书、维修报价（后续支持退款流水）
- ✅ **三种导入模式**：追加 (append) / 覆盖 (overwrite) / 忽略 (ignore)
- ✅ **数据持久化**：SQLite 数据库存储，重启后数据不丢失
- ✅ **数据校验**：自动检查必填字段、日期格式、金额有效性
- ✅ **状态联动检查**：证书过期自动检测，停用状态联动检查
- ✅ **自动修复**：可自动修复常见数据问题
- ✅ **历史追踪**：记录所有数据变更，谁在什么时候改了什么
- ✅ **异步任务**：支持任务重试、人工处理、永久失败三种状态
- ✅ **报告导出**：原始行号、失败清单、修正数据一目了然
- ✅ **标准退出码**：便于脚本自动化调用

## 安装

```bash
npm install
npm link
```

## 快速开始

### 1. 初始化数据库

```bash
mdinspect init
```

### 2. 导入数据

```bash
# 导入巡检记录
mdinspect import -t inspection -f examples/inspection.csv

# 导入校准证书
mdinspect import -t calibration -f examples/calibration.csv

# 导入维修报价
mdinspect import -t repair -f examples/repair.csv

# 指定导入模式（覆盖模式）
mdinspect import -t inspection -f examples/inspection.csv -m overwrite
```

**数据类型**：
- `inspection` - 巡检记录
- `calibration` - 校准证书
- `repair` - 维修报价

**导入模式**：
- `append` - 追加（默认）
- `overwrite` - 覆盖已有记录
- `ignore` - 忽略已有记录

### 3. 检查数据

```bash
# 查看整体系统状态
mdinspect check

# 检查指定批次
mdinspect check <batch-id>

# 检查所有数据状态（含过期证书）
mdinspect check --all

# 按科室检查
mdinspect check --department 内科

# 输出 JSON 格式
mdinspect check --json
```

### 4. 修复数据

```bash
# 修复证书状态联动问题（过期证书自动标记为停用）
mdinspect fix --linkage

# 修复指定批次所有可自动修复的问题
mdinspect fix --batch <batch-id>

# 修复单个错误
mdinspect fix --error <error-id>

# 修复所有可自动修复的问题
mdinspect fix --all
```

### 5. 生成报告

```bash
# 生成批次报告
mdinspect report <batch-id>

# 生成系统状态报告
mdinspect report -t status

# 生成科室报告
mdinspect report -t department -d 内科

# 导出报告到文件
mdinspect report <batch-id> -o report.json
```

### 6. 查看历史

```bash
# 查看最近 7 天的变更历史
mdinspect history

# 按批次查看
mdinspect history -b <batch-id>

# 按操作人查看
mdinspect history -o username

# 按记录查看（类型:ID）
mdinspect history -r inspection:123

# 查看变更汇总
mdinspect history --summary
```

### 7. 导出数据

```bash
# 导出批次数据
mdinspect export <batch-id> -o ./output

# 只导出失败记录（便于修正后重导）
mdinspect export <batch-id> --failed -o ./output

# 导出台账状态
mdinspect export calibration --calibration-status -o ./output

# 只导过期的证书
mdinspect export calibration --calibration-status --expired -o ./output
```

### 8. 批次管理

```bash
# 查看导入批次列表
mdinspect batches
```

### 9. 任务管理

```bash
# 查看任务统计
mdinspect tasks --stats

# 列出待处理任务
mdinspect tasks --list

# 列出失败任务
mdinspect tasks --list --status failed

# 重试任务
mdinspect tasks --retry <task-id>

# 标记为需要人工处理
mdinspect tasks --manual <task-id>

# 恢复卡住的任务
mdinspect tasks --recover
```

## 退出码说明

| 退出码 | 说明 |
|--------|------|
| 0 | 成功 |
| 1 | 通用错误 |
| 2 | 存在验证错误 |
| 3 | 资源未找到 |
| 4 | 输入参数无效 |

## CSV 格式说明

### 巡检记录 (inspection.csv)

| 字段 | 必填 | 说明 |
|------|------|------|
| device_id | 是 | 设备编号 |
| device_name | 是 | 设备名称 |
| department | 否 | 科室 |
| inspection_date | 是 | 巡检日期 (YYYY-MM-DD) |
| inspector | 是 | 巡检人 |
| inspection_result | 否 | 巡检结果 |
| issues | 否 | 问题描述 |
| next_inspection_date | 否 | 下次巡检日期 |
| status | 否 | 状态 (active/inactive/maintenance) |

### 校准证书 (calibration.csv)

| 字段 | 必填 | 说明 |
|------|------|------|
| device_id | 是 | 设备编号 |
| device_name | 否 | 设备名称 |
| certificate_no | 是 | 证书编号 |
| calibration_date | 是 | 校准日期 |
| expiry_date | 是 | 有效期至 |
| calibration_agency | 否 | 校准机构 |
| calibration_result | 否 | 校准结果 |
| status | 否 | 状态 (valid/expired) |
| is_active | 否 | 是否启用 (1/0) |

### 维修报价 (repair.csv)

| 字段 | 必填 | 说明 |
|------|------|------|
| device_id | 是 | 设备编号 |
| device_name | 是 | 设备名称 |
| department | 否 | 科室 |
| fault_description | 是 | 故障描述 |
| quote_amount | 是 | 报价金额 |
| quote_date | 是 | 报价日期 |
| vendor | 否 | 供应商 |
| status | 否 | 状态 |
| approval_status | 否 | 审批状态 |

## 异步任务状态

| 状态 | 说明 | 自动处理 |
|------|------|----------|
| pending | 待处理 | 是 |
| processing | 处理中 | - |
| retry | 待重试 | 是（指数退避） |
| manual | 需人工处理 | 否 |
| failed | 永久失败 | 否 |
| completed | 已完成 | - |

## 项目结构

```
.
├── src/
│   ├── cli.js                 # CLI 入口
│   ├── index.js               # 模块导出
│   ├── db/
│   │   └── database.js        # 数据库操作
│   └── services/
│       ├── importService.js   # 数据导入
│       ├── validationService.js # 数据校验
│       ├── fixService.js      # 数据修复
│       ├── historyService.js  # 历史追踪
│       ├── reportService.js   # 报告生成
│       ├── exportService.js   # 数据导出
│       └── taskService.js     # 异步任务
├── examples/                  # 示例数据
└── package.json
```

## 脚本化示例

```bash
#!/bin/bash

# 自动化巡检数据处理流程

# 1. 初始化（首次运行）
mdinspect init

# 2. 导入数据
mdinspect import -t inspection -f inspection.csv
BATCH_ID=$(mdinspect batches --json | jq -r '.[0].batch_id')

# 3. 检查
mdinspect check $BATCH_ID
EXIT_CODE=$?

if [ $EXIT_CODE -eq 2 ]; then
    # 4. 有错误，自动修复
    mdinspect fix --batch $BATCH_ID
    
    # 5. 导出失败记录供人工处理
    mdinspect export $BATCH_ID --failed -o ./failed
fi

# 6. 生成最终报告
mdinspect report $BATCH_ID -o ./report.json

# 7. 导出完整数据
mdinspect export $BATCH_ID -o ./output
```

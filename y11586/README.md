# 法务合同履约多源导入巡检 CLI

一个专业的法务合同履约数据管理和巡检工具，支持多源数据导入、一致性校验、问题修复和全链路审计追踪。

## 核心功能

### 📥 多源数据导入
- **合同PDF**: 自动解析合同文本，提取关键信息和付款节点
- **付款节点**: CSV/Excel导入，支持按批次管理
- **验收邮件**: 解析验收结果和盘点差异
- **退款流水**: 关联合同，监控退款异常

### ✅ 数据校验
- 合同基本信息完整性检查
- 付款节点金额一致性校验
- 验收结果与付款条件匹配检查
- 退款金额与已付金额比对
- 补充协议变更提醒

### 🔧 问题修复
- 单条问题修复，记录修改原因
- 批量同类问题处理
- 修复前后对比追踪
- 支持修正后重新导入

### 📊 报告导出
- 原始行号追溯，定位问题来源
- 失败清单汇总，明确处理优先级
- 修正前后对比报告
- 完整数据归档导出

### 📜 历史追踪
- 所有状态变更记录时间、操作者、原因
- 版本化管理，支持回滚查看
- 补充协议变更前后对比
- 导入批次全程可追溯

### ⚡ 异步任务处理
- 失败自动重试（最多3次）
- 失败类型区分：等重试/等人工/永久失败
- 服务恢复后断点续传
- 同一批数据多次导入模式：忽略/覆盖/追加

## 安装

```bash
npm install
npm run build
npm link
```

## CLI 命令

### init - 初始化工作空间
```bash
contract-cli init
contract-cli init -w ./my-workspace
```

### import - 导入数据
```bash
# 导入合同PDF
contract-cli import -s contract_pdf -m overwrite -f ./contracts.json

# 导入付款节点（追加模式）
contract-cli import -s payment_node -m append -f ./payments.csv

# 导入退款记录
contract-cli import -s refund_record -m append -f ./refunds.xlsx
```

**参数说明：**
- `-s, --source`: 数据来源 `contract_pdf|payment_node|acceptance_email|refund_record`
- `-m, --mode`: 导入模式 `ignore|overwrite|append`
- `-f, --file`: 文件路径

### check - 执行数据校验
```bash
contract-cli check
contract-cli check -b <batch-id>
contract-cli check -f json
```

### fix - 修复问题
```bash
# 查看待修复清单
contract-cli fix -r "查看问题"

# 修复单条问题
contract-cli fix -i <check-id> -r "数据修正" -v "新值"

# 批量修复同类问题
contract-cli fix -t payment_amount -r "统一调整"
```

### report - 生成巡检报告
```bash
contract-cli report
contract-cli report -f json
```

### history - 查看变更历史
```bash
contract-cli history
contract-cli history -c HT2024001
contract-cli history -l 100
```

### export - 导出数据
```bash
# 导出检查报告（业务负责人重点关注）
contract-cli export -t check -o ./exports

# 导出单合同详情
contract-cli export -t contract -c HT2024001

# 导出导入历史
contract-cli export -t history

# 导出完整数据
contract-cli export -t full --raw
```

### retry - 重试失败任务
```bash
contract-cli retry
```

## 全局选项

- `-w, --workspace`: 工作目录（默认: ~/.contract-cli）
- `-u, --user`: 操作者名称
- `-f, --format`: 输出格式 `json|csv|table`

## 退出码说明

| 退出码 | 含义 |
|--------|------|
| 0 | 成功 |
| 1 | 通用错误 |
| 2 | 参数验证错误 |
| 3 | 导入错误 |
| 4 | 校验发现错误 |
| 5 | 无数据 |

## API 使用

### 完整流水线示例

```javascript
const { ContractComplianceAPI } = require('contract-compliance-cli');

const api = new ContractComplianceAPI('./workspace', 'user_name');

// 一键执行完整流程
const result = await api.runFullPipeline(
  [
    { path: './contracts.json', source: 'contract_pdf', mode: 'overwrite' },
    { path: './payments.csv', source: 'payment_node', mode: 'append' },
  ],
  './exports'
);

console.log('导入结果:', result.importResults);
console.log('校验报告:', result.checkReport);
console.log('导出路径:', result.exportPaths);
```

### 分步调用

```javascript
// 初始化
await api.init();

// 导入
const importResult = await api.import('./file.csv', 'payment_node', 'append');

// 校验
const report = await api.check();

// 修复
await api.fix(checkResultId, '修正原因', newValue);

// 导出
const path = await api.exportCheckReport({ format: 'json', outputDir: './exports' });
```

## 数据存储结构

```
workspace/
└── contract-data.json          # 核心数据文件
    ├── contracts               # 合同主数据
    ├── paymentNodes            # 付款节点
    ├── acceptanceRecords       # 验收记录
    ├── refundRecords           # 退款记录
    ├── importBatches           # 导入批次
    ├── statusChangeLogs        # 变更日志
    ├── checkResults            # 校验结果
    └── fixActions              # 修复记录
```

## 目录结构

```
src/
├── index.ts           # CLI 入口
├── api.ts             # API 封装
├── types/
│   └── index.ts       # 类型定义
└── utils/
    ├── store.ts       # 数据存储
    ├── import.ts      # 导入解析
    ├── check.ts       # 校验逻辑
    ├── fix.ts         # 修复处理
    └── export.ts      # 导出功能
```

## 脚本集成示例

```bash
#!/bin/bash
# 夜审自动化脚本

contract-cli init -w /data/contract-nightly

# 批量导入
contract-cli import -s contract_pdf -m overwrite -f /data/contracts.pdf
contract-cli import -s payment_node -m append -f /data/payments.csv
contract-cli import -s acceptance_email -m append -f /data/acceptances.json
contract-cli import -s refund_record -m append -f /data/refunds.xlsx

# 执行校验
contract-cli check -f json > check-result.json
EXIT_CODE=$?

# 导出报告
contract-cli export -t check -o /data/reports
contract-cli export -t full -o /data/archive

if [ $EXIT_CODE -ne 0 ]; then
  echo "发现校验错误，请查看报告"
  exit 1
fi

echo "夜审完成"
```

## 项目文件说明

- [src/types/index.ts](file:///Users/mac/pro/solo/workspaces/y11586/src/types/index.ts) - 核心数据类型定义
- [src/utils/store.ts](file:///Users/mac/pro/solo/workspaces/y11586/src/utils/store.ts) - 数据存储管理器
- [src/utils/import.ts](file:///Users/mac/pro/solo/workspaces/y11586/src/utils/import.ts) - 多源数据导入器
- [src/utils/check.ts](file:///Users/mac/pro/solo/workspaces/y11586/src/utils/check.ts) - 数据校验引擎
- [src/utils/fix.ts](file:///Users/mac/pro/solo/workspaces/y11586/src/utils/fix.ts) - 问题修复工具
- [src/utils/export.ts](file:///Users/mac/pro/solo/workspaces/y11586/src/utils/export.ts) - 数据导出器
- [src/index.ts](file:///Users/mac/pro/solo/workspaces/y11586/src/index.ts) - CLI 命令入口
- [src/api.ts](file:///Users/mac/pro/solo/workspaces/y11586/src/api.ts) - 可编程 API 封装

# 售后备件领用多源导入巡检 CLI 工具

售后备件领用多源导入巡检工具，用于处理维修单、备件扫码、客户签收照、手工改价表等多源数据的导入、检测、修复和分析。

## 功能特性

- 📥 **多源数据导入**：支持维修单、备件扫码、客户签收照、手工改价表、班次记录
- 🔍 **脏记录检测**：缺字段、跨日、改名、金额冲突、数量冲突
- 📊 **业务问题检测**：先领后补单、退回件和报废件混淆
- 🔧 **数据修复**：单条修复、批量自动修复
- 👥 **权限系统**：录入、复核、主管、只读查看四级权限
- 📈 **操作轨迹**：完整的操作历史记录
- 📤 **数据导出**：支持 Excel、CSV 格式导出

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 编译项目

```bash
npm run build
```

### 从空库启动

#### 1. 初始化数据库

```bash
# 首次初始化
npm run dev -- init

# 强制重置（会清除所有数据）
npm run dev -- init --force
```

初始化成功后会创建默认用户：

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 主管 | admin | admin123 |
| 复核 | reviewer | review123 |
| 录入 | operator | operate123 |
| 只读 | viewer | view123 |

#### 2. 登录系统

```bash
# 交互式登录
npm run dev -- login

# 命令行参数登录
npm run dev -- login -u admin -p admin123
```

#### 3. 查看当前用户

```bash
npm run dev -- whoami
```

### 准备样例数据

项目 `samples/` 目录包含了预设的样例数据，包含各种异常场景：

| 文件 | 说明 | 包含的异常 |
|------|------|-----------|
| repair_orders.csv | 维修单 | 缺工单日期、缺工程师 |
| spare_part_scans.csv | 备件扫码 | 先领后补、退回报废混淆、数量为0、缺工程师 |
| customer_receipts.csv | 客户签收 | 缺工单号、缺客户姓名 |
| manual_price_adjusts.csv | 手工改价 | 原价调整价相同、缺工单号、缺备件编码 |
| shift_records.csv | 班次记录 | 缺工程师、签退早于签到、跨天签到 |

## 主流程操作

### 1. 导入数据

```bash
# 导入维修单（自动检测类型）
npm run dev -- import samples/repair_orders.csv

# 导入指定类型
npm run dev -- import samples/spare_part_scans.csv -t spare_part_scan

# 批量导入所有样例
npm run dev -- import samples/repair_orders.csv
npm run dev -- import samples/spare_part_scans.csv
npm run dev -- import samples/customer_receipts.csv
npm run dev -- import samples/manual_price_adjusts.csv
npm run dev -- import samples/shift_records.csv
```

### 2. 数据检查

```bash
# 完整检查（数据完整性 + 业务问题）
npm run dev -- check

# 只检查数据完整性
npm run dev -- check --no-business

# 检查指定批次
npm run dev -- check -b <batchId>
```

### 3. 查看巡检报告

```bash
# 生成控制台报告
npm run dev -- report
```

报告内容包括：
- 数据导入概况
- 脏记录统计（按类型分类）
- 业务问题统计
- 问题工程师 TOP 5

### 4. 修复脏记录

```bash
# 交互式选择修复
npm run dev -- fix

# 修复指定记录
npm run dev -- fix -i <dirtyRecordId> -v "修复值"

# 批量自动修复所有可修复记录
npm run dev -- fix --all
```

### 5. 导出数据

```bash
# 导出巡检报告（包含汇总概览和失败清单）
npm run dev -- export report

# 导出脏记录清单
npm run dev -- export dirty

# 导出业务问题清单
npm run dev -- export business

# 导出源数据（需指定类型）
npm run dev -- export source -s repair_order
npm run dev -- export source -s spare_part_scan

# 指定导出格式和目录
npm run dev -- export report -f csv -o ./output
```

### 6. 查看操作历史

```bash
# 查看最近20条操作
npm run dev -- history

# 查看指定条数
npm run dev -- history -n 50

# 按操作类型过滤
npm run dev -- history -t import

# 按操作员过滤
npm run dev -- history -u admin
```

## 制造异常场景

### 制造"先领后补单"异常

样例数据中 `spare_part_scans.csv` 的前两条记录：
- 扫码时间：2024-04-30 16:00:00
- 对应工单 RO20240501001 的创建时间：2024-05-01 09:00:00

扫码时间早于工单创建时间，会被检测为"先领后补单"。

### 制造"退回件和报废件混淆"异常

样例数据中工单 RO20240501005 的 SP006 加热管：
- 第6行：领用 1 个
- 第7行：退回 1 个
- 第8行：报废 1 个

同一工单同一备件同时存在退回和报废操作，会被检测为"退回报废混淆"。

### 制造"缺字段"异常

删除任意一条记录的关键字段（如工单号、工程师姓名），重新导入即可。

### 制造"数量冲突"异常

同一工单同一备件导入多条不同数量的记录。

### 制造"跨日"异常

签到时间和签退时间跨越多天的班次记录。

## 权限说明

### 角色权限矩阵

| 操作 | 录入 (entry) | 复核 (review) | 主管 (supervisor) | 只读 (readonly) |
|------|-------------|--------------|------------------|----------------|
| init | ❌ | ❌ | ✅ | ❌ |
| import | ✅ | ✅ | ✅ | ❌ |
| check | ✅ | ✅ | ✅ | ❌ |
| fix | ✅ | ✅ | ✅ | ❌ |
| report | ❌ | ✅ | ✅ | ✅ |
| export | ✅ | ✅ | ✅ | ✅ |
| history | ✅ | ✅ | ✅ | ✅ |
| review | ❌ | ✅ | ✅ | ❌ |
| create_user | ❌ | ❌ | ✅ | ❌ |

### 字段级权限控制

不同角色对不同字段有不同的可见和编辑权限：

- **录入员**：可编辑业务字段，不可编辑金额、价格等敏感字段
- **复核员**：可编辑状态、备注，可见所有字段
- **主管**：可见并可编辑所有字段
- **只读**：仅可查看（敏感字段如客户电话会被隐藏）

### 用户管理

```bash
# 列出所有用户（需主管权限）
npm run dev -- users --list

# 创建新用户（需主管权限）
npm run dev -- users --create
```

## 数据存储

### 数据库位置

- macOS: `~/.spi-cli/spare_parts_inspection.db`
- Windows: `C:\Users\<用户名>\.spi-cli\spare_parts_inspection.db`
- Linux: `~/.spi-cli/spare_parts_inspection.db`

### 导出文件位置

默认导出到数据库同级目录 `~/.spi-cli/`，可通过 `-o` 参数指定输出目录。

## 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch
```

### 测试重点

1. **状态变化测试**：
   - 记录从 pending → dirty → fixed 的状态流转
   - 导入批次的状态变化

2. **幂等性测试**：
   - 重复导入相同数据的处理
   - 多次执行 check 命令的结果一致性
   - 重复修复同一条记录的行为

3. **权限测试**：
   - 不同角色的操作权限验证
   - 字段级权限过滤

4. **边界条件测试**：
   - 空文件导入
   - 极端日期数据
   - 超大文件导入

## 项目结构

```
.
├── src/
│   ├── commands/          # CLI 命令实现
│   │   └── index.ts
│   ├── config/            # 配置文件
│   │   ├── database.ts    # 数据库配置
│   │   └── permissions.ts # 权限配置
│   ├── entities/          # 数据库实体
│   │   ├── User.ts
│   │   ├── ImportBatch.ts
│   │   ├── DirtyRecord.ts
│   │   ├── BusinessIssue.ts
│   │   ├── OperationLog.ts
│   │   ├── RepairOrder.ts
│   │   ├── SparePartScan.ts
│   │   ├── CustomerReceipt.ts
│   │   ├── ManualPriceAdjust.ts
│   │   └── ShiftRecord.ts
│   ├── services/          # 业务服务
│   │   ├── AuthService.ts
│   │   ├── ImportService.ts
│   │   ├── FileParserService.ts
│   │   ├── DirtyRecordService.ts
│   │   ├── BusinessIssueService.ts
│   │   ├── ExportService.ts
│   │   └── OperationLogService.ts
│   ├── types/             # 类型定义
│   │   └── index.ts
│   └── index.ts           # 入口文件
├── samples/               # 样例数据
├── tests/                 # 测试用例
├── package.json
├── tsconfig.json
└── README.md
```

## 常见问题

### Q: 如何重置数据库？

```bash
npm run dev -- init --force
```

**注意**：这会删除所有数据，请谨慎操作。

### Q: 导入失败怎么办？

1. 检查文件格式是否正确（UTF-8 编码的 CSV 或 Excel）
2. 查看导入时显示的失败记录列表
3. 检查原始行号对应的行数据

### Q: 如何查看导出的文件？

```bash
# macOS
open ~/.spi-cli/

# Linux
xdg-open ~/.spi-cli/
```

### Q: 权限不足怎么办？

请联系主管为您分配更高权限的账号，或使用主管账号操作。

## License

MIT

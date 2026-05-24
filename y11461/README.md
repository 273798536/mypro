# 口腔门诊材料多源导入巡检 CLI

院区主任追批号专用工具，处理种植体批号、预约记录、供应商发票和历史压缩包里的脏记录，解决临时换型号后病历和库存扣容易脱节问题。

## 功能特性

- 多源数据导入：种植体批号、预约记录、供应商发票、临时补录单
- 脏记录检测：缺字段、跨日、改名、金额冲突、数量冲突
- 完整工作流：init → import → check → fix → report → history → export
- 状态追踪：每次状态变更记录时间、操作者和原因
- 权限控制：录入、复核、主管、只读查看四级权限
- 报告输出：原始行号、失败清单、修正后的再导入一目了然

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
npm install

# 构建项目
npm run build
```

### 2. 初始化数据库（从空库启动）

```bash
# 初始化，创建默认用户
npm run dev -- init

# 或指定管理员名称
npm run dev -- init --name "李主任"
```

默认创建 4 个用户：
- `admin` - 主管（全部权限）
- `entry` - 录入员（导入、检查、修正）
- `reviewer` - 复核员（检查、驳回、报告）
- `viewer` - 只读查看（报告、历史）

### 3. 准备样例数据

样例数据位于 `samples/` 目录：
- `implant_batch.csv` - 种植体批号（含缺字段脏数据）
- `appointment.csv` - 预约记录（含跨日脏数据）
- `supplier_invoice.csv` - 供应商发票（含金额冲突脏数据）
- `manual_entry.csv` - 临时补录单（含改名脏数据）
- `history-archive.zip` - 历史压缩包（内含4个CSV文件，自动识别数据源）

### 4. 走主流程

#### 方式一：逐个导入 CSV 文件
```bash
# 1. 导入种植体批号数据（用 entry 用户）
npm run dev -- -u entry import -f samples/implant_batch.csv -s implant

# 2. 导入预约记录
npm run dev -- -u entry import -f samples/appointment.csv -s appointment

# 3. 导入供应商发票
npm run dev -- -u entry import -f samples/supplier_invoice.csv -s invoice

# 4. 导入临时补录单
npm run dev -- -u entry import -f samples/manual_entry.csv -s manual

# 5. 检查所有记录
npm run dev -- -u entry check

# 6. 重新检查（强制重新检测）
npm run dev -- -u entry check --recheck
```

#### 方式二：导入历史压缩包（推荐批量处理）
```bash
# 直接导入 ZIP 压缩包，自动识别数据源（根据文件名）
npm run dev -- -u entry import -f samples/history-archive.zip

# 或强制指定数据源（所有文件按同一来源处理）
npm run dev -- -u entry import -f samples/history-archive.zip -s implant
```

### 5. 制造异常和修正

```bash
# 查看有问题的记录列表
npm run dev -- list -s dirty

# 自动修正金额冲突
npm run dev -- -u entry fix -i <记录ID> --auto

# 手动修正缺字段问题
npm run dev -- -u entry fix -i <记录ID> -f batchNumber -v "IMP-2024-099" -r "补录批号"

# 复核员驳回
npm run dev -- -u reviewer reject -i <记录ID> -r "数据来源不明"

# 主管审批通过
npm run dev -- -u admin approve -i <记录ID>
```

### 6. 查看报告

```bash
# 生成巡检报告（院区主任重点关注）
npm run dev -- -u admin report

# 查看状态变更历史
npm run dev -- -u admin history

# 查看单条记录历史
npm run dev -- -u admin history -i <记录ID>
```

### 7. 导出结果

```bash
# 导出全部为 CSV
npm run dev -- -u admin export

# 导出为 JSON
npm run dev -- -u admin export -f json

# 仅导出失败清单
npm run dev -- -u admin export --failed

# 指定输出目录
npm run dev -- -u admin export -o ./my-reports
```

## 权限说明

| 操作 | 录入员 | 复核员 | 主管 | 只读 |
|------|--------|--------|------|------|
| init | ❌ | ❌ | ✅ | ❌ |
| import | ✅ | ❌ | ✅ | ❌ |
| check | ✅ | ✅ | ✅ | ❌ |
| fix | ✅ | ❌ | ✅ | ❌ |
| reject | ❌ | ✅ | ✅ | ❌ |
| approve | ❌ | ❌ | ✅ | ❌ |
| report | ✅ | ✅ | ✅ | ✅ |
| history | ✅ | ✅ | ✅ | ✅ |
| export | ✅ | ✅ | ✅ | ❌ |

## 脏记录类型说明

1. **缺字段** - 必填字段为空或无效值（数量、单价≤0）
2. **跨日** - 同一批号预约日期跨天
3. **改名** - 同一批号材料名称不一致
4. **金额冲突** - 数量×单价≠总金额
5. **数量冲突** - 同一批号累计数量异常

## 测试

```bash
# 运行全部测试
npm test

# 运行测试并查看覆盖率
npm test -- --coverage
```

测试重点：
- 状态变化的完整性（时间、操作者、原因）
- 导入的幂等性（重复导入相同文件）
- 权限控制有效性
- 脏记录检测准确性

## 目录结构

```
.
├── src/
│   ├── index.ts          # CLI 入口
│   ├── types/            # 类型定义
│   ├── commands/         # 命令实现
│   │   ├── init.ts
│   │   ├── check.ts
│   │   ├── fix.ts
│   │   ├── report.ts
│   │   ├── history.ts
│   │   └── export.ts
│   └── utils/            # 工具函数
│       ├── database.ts   # 数据库操作
│       ├── permissions.ts# 权限控制
│       ├── detector.ts   # 脏记录检测
│       └── importer.ts   # 数据导入
├── samples/              # 样例数据
├── tests/                # 测试用例
└── .dmi/                 # 数据库文件（运行时生成）
```

## 数据存储

所有数据存储在 `.dmi/db.json` 文件中，包含：
- 用户信息
- 材料记录（含原始数据 rawData）
- 脏记录（保留原始内容和处理意见）
- 状态变更历史

如需重新初始化，删除 `.dmi` 目录后重新执行 `init` 命令。

# 加密钱包税务流水服务

Web3社群会计工具 - 整理链上收入，解决跨链重复记账、币价缺失、内部转账误算等问题。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 生成演示数据

```bash
npm run seed
```

自动生成包含以下场景的测试数据：
- 多链钱包地址（ETH、Polygon、BSC）
- 收入交易（自由职业收入）
- 支出交易
- 内部转账（钱包间互转）
- 跨链桥交易（含重复记账检测）
- 交易所提现
- Gas费用
- 2024全年币价快照

### 3. 处理数据

```bash
npm run process
```

一键执行：
- ✅ 内部转账识别
- ✅ 跨链桥检测
- ✅ 币价补全
- ✅ 收入/支出分类
- ✅ 税务计算

### 4. 查看报告

```bash
npm run report
```

查看数据概览、税务摘要、异常问题、审计追踪。

### 5. 导出报表

```bash
npm run export
```

导出到 `data/exports/` 目录：
- 交易流水 CSV
- 税务记录 CSV
- 完整数据 JSON
- 审计日志 JSON

---

## 核心功能

### 📍 地址归并

自动识别同一用户的多个钱包地址，支持：
- 手动归并地址到同一用户
- 自动检测交易所地址聚类

**操作：**
```bash
# 归并多个地址
npm run dev -- merge <addr_id1> <addr_id2> -n "用户名称"

# 查看地址归属
npm run list addresses
```

### 📈 币价快照

支持历史币价查询和补全：
- 稳定币自动按 $1 计算
- 缺失币价自动从最近日期估算
- 72小时内数据可信度较高

**操作：**
```bash
# 检查缺失币价
npm run prices missing

# 补全币价
npm run prices fill

# 查看币价快照
npm run prices list
```

### 🔄 内部转账识别

自动检测同一用户地址间的转账，排除在计税范围外：
- 同一Owner下地址互转标记为 internal_transfer
- 不产生应税收入/支出
- 保留完整交易记录用于对账

**异常提示：** 报告中显示内部转账数量，已自动排除计税

### 🌉 跨链桥重复检测

跨链桥最容易重复记账！系统会：
1. 检测与桥合约交互的交易
2. 匹配不同链上金额相近、时间相近的交易对
3. 标记 `bridge_duplicate` 警告
4. **不会自动合并**，需要人工审核确认

**异常路径处理：**
- 发现跨链重复后，交易不会计入税务计算
- 在报告中以 🔴 高优先级问题展示
- 需要人工确认哪笔是真实入账

### 💸 成本归集 (FIFO)

使用先进先出法计算资本利得：
- 每笔收入建立持仓记录
- 每笔支出按最早持仓计算成本
- 区分短期/长期持有（以365天为界）
- Gas费用单独列支

### 📊 税务摘要

自动分类：
- `income` - 应税收入（客户付款、赏金等）
- `capital_gain` - 资本利得
- `capital_loss` - 资本损失
- `expense` - 业务支出
- `gas_fee` - 链上手续费

---

## 完整命令清单

| 命令 | 说明 |
|------|------|
| `npm run seed` | 生成演示数据 |
| `npm run process` | 处理所有交易数据 |
| `npm run report` | 显示数据报告和异常 |
| `npm run check` | 运行完整性检查 |
| `npm run export` | 导出所有报表 |
| `npm run list owners` | 列出用户 |
| `npm run list addresses` | 列出地址 |
| `npm run list transactions` | 列出交易 |
| `npm run list warnings` | 列出警告交易 |
| `npm run list audit` | 列出审计日志 |
| `npm run prices fill` | 补全币价 |
| `npm run prices missing` | 检查缺失币价 |
| `npm run merge ...` | 归并地址 |
| `npm run clear -- --yes` | 清除所有数据 |

---

## 异常处理流程

### 🔴 高优先级问题

**1. 跨链重复记账 (bridge_duplicate)**
```
现象：同一笔资金在两条链上都显示为入账
处理：
  1. npm run list warnings 查看具体交易
  2. 核对跨链桥的实际到账记录
  3. 人工确认哪笔是有效的
  4. 将重复标记的交易类型改为 bridge
```

**2. 币价缺失 (price_missing)**
```
现象：交易发生时没有对应的USD价格
处理：
  1. npm run prices fill 尝试自动补全
  2. 如仍缺失，手动导入该日期币价
  3. 或使用最近可用价格估算
```

### 🟡 中优先级问题

**1. 未知地址 (address_unknown)**
```
现象：交易对手地址不在系统中
处理：
  1. 判断是外部客户/对手方（正常）
  2. 还是遗漏的自有地址（需要添加并归并）
  3. 自有地址添加后重新运行 process
```

**2. 需要人工审核 (needs_review)**
```
现象：交易无法自动分类
处理：
  1. 查看交易详情和上下文
  2. 手动设置 type 为 income/expense/internal_transfer
  3. 重新运行税务计算
```

---

## 数据结构

所有数据存在 `data/` 目录下的JSON文件中：

```
data/
├── addresses.json      # 钱包地址
├── prices.json         # 币价快照
├── transactions.json   # 交易记录
├── taxRecords.json     # 税务记录
├── owners.json         # 用户信息
├── auditLogs.json      # 审计日志
└── exports/            # 导出目录
```

### 审计追踪

**每一笔数据修改都留下痕迹：**
- 创建/更新/删除操作
- 修改前后的值对比
- 修改原因
- 操作人
- 时间戳

**查看：**
```bash
npm run list audit
```

---

## 典型工作流

### 场景1：新用户入账整理

```bash
# 1. 生成或导入数据
npm run seed

# 2. 自动处理
npm run process

# 3. 检查异常
npm run report

# 4. 处理异常（如跨链重复）
npm run list warnings
# 人工修正交易数据...

# 5. 再次运行确认
npm run process
npm run report

# 6. 导出报表
npm run export
```

### 场景2：添加新地址

```bash
# 1. 数据库中添加新地址
# （通过API或直接编辑 data/addresses.json）

# 2. 归并到对应用户
npm run dev -- merge <new_addr_id> -n "用户名"

# 3. 重新处理
npm run process
```

### 场景3：月度对账

```bash
# 1. 导入本月新交易
# ...

# 2. 处理并检查
npm run process
npm run check

# 3. 查看异常
npm run list warnings

# 4. 导出月报
npm run export
```

---

## 注意事项

⚠️ **重要提醒：**

1. **跨链桥交易必须人工审核** - 系统只做标记，不会自动删除重复
2. **内部转账依赖地址归并** - 地址必须先归并到同一Owner才能正确识别
3. **币价估算有误差** - 估算数据会标记 source，重要交易请手动核实
4. **税务计算仅供参考** - 请以会计师最终确认为准
5. **所有修改可追溯** - 审计日志永久保存，无法删除

---

## 开发说明

### 项目结构

```
src/
├── models/
│   ├── types.ts       # 类型定义
│   └── store.ts       # 数据存储层
├── services/
│   ├── AddressMerger.ts        # 地址归并
│   ├── PriceService.ts         # 币价服务
│   ├── TransactionClassifier.ts # 交易分类
│   ├── TaxCalculator.ts        # 税务计算
│   ├── ReportExporter.ts       # 报表导出
│   └── MockDataGenerator.ts    # 模拟数据
├── cli.ts           # 命令行入口
└── index.ts         # 库导出
```

### 核心模块关系

```
交易导入 → 地址归并 → 内部转账检测 → 跨链检测 → 币价补全 → 分类计税 → 报表导出
              ↓            ↓            ↓          ↓
           审计日志      审计日志      审计日志    审计日志
```

---

## FAQ

**Q: 为什么跨链交易不自动合并？**
A: 跨链桥可能有手续费、滑点、失败重试等情况，自动合并容易出错，由人工确认更安全。

**Q: 内部转账为什么还要保留记录？**
A: 虽然不计税，但对账时需要完整资金流向，而且可以计算真实成本。

**Q: 币价缺失时怎么办？**
A: 可以手动导入准确价格，或系统自动用最近3天内的数据估算。

**Q: 数据可以导入到Excel吗？**
A: 可以，导出的CSV文件可以直接用Excel打开。

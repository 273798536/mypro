# 体育会员会费递延工作台

本地Web工作台，用于管理体育会员会费的递延计算、差异分析、人工修正和报表导出。

## 功能特性

### 1. 会员合同管理
- 会员合同列表展示
- 合同详情查看
- 备注编辑
- 关联记录统计（入场、冻结、转让）

### 2. 递延计算
- 按月自动计算递延金额和确认收入
- 影响因素识别（冻结、补课、转让、已撤回补课）
- 人工修正功能
- 修正历史追踪

### 3. 差异分析
- 自动识别合同金额与递延金额的差异
- 差异原因定位（入场记录/冻结申请）
- 已撤回补课标记

### 4. 特殊业务处理
- **冻结跨月处理**：跨月冻结按实际天数分摊
- **转让追溯**：转让记录支持追溯调整历史月份
- **补课去重**：补课单不重复确认收入
- **补课撤回**：撤回后标记受影响的计算结果

### 5. 规则版本管理
- 递延规则版本化
- 规则生效日期管理
- 规则切换历史保留

### 6. 报表导出
- Excel报表导出
- 报表对比功能
- 规则版本差异分析

### 7. 修正历史
- 所有人工修正记录
- 前后数据对比
- 审计追踪

## 技术栈

- **后端**: Node.js + Express + SQLite + better-sqlite3
- **前端**: React + Vite + Ant Design + React Query
- **报表**: ExcelJS

## 快速开始

### 1. 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装后端依赖
cd server && npm install

# 安装前端依赖
cd ../client && npm install
```

### 2. 初始化数据库

```bash
cd server
npm run init-db
```

### 3. 启动开发服务

```bash
# 在项目根目录
npm run dev
```

- 前端地址: http://localhost:3000
- 后端地址: http://localhost:4000

## 项目结构

```
.
├── server/                 # 后端服务
│   ├── src/
│   │   ├── index.js       # 服务入口
│   │   ├── db.js          # 数据库连接
│   │   ├── services/
│   │   │   └── deferralEngine.js  # 递延计算引擎
│   │   └── routes/
│   │       ├── contracts.js      # 合同接口
│   │       ├── deferral.js       # 递延计算接口
│   │       ├── reports.js        # 报表接口
│   │       ├── rules.js          # 规则接口
│   │       └── records.js        # 记录管理接口
│   ├── scripts/
│   │   └── init-db.js    # 数据库初始化脚本
│   └── data/             # SQLite数据库文件
└── client/               # 前端应用
    ├── src/
    │   ├── App.jsx       # 主应用
    │   ├── api/
    │   │   └── client.js # API客户端
    │   └── pages/        # 页面组件
    │       ├── ContractsList.jsx
    │       ├── ContractDetail.jsx
    │       ├── DeferralList.jsx
    │       ├── ReportsPage.jsx
    │       ├── RulesPage.jsx
    │       └── HistoryPage.jsx
    └── index.html
```

## 核心业务逻辑

### 递延计算公式

```
每日费率 = 合同总额 / 合同总天数
当月服务天数 = 当月天数 - 冻结天数
当月确认收入 = 当月服务天数 × 每日费率
当月递延金额 = 月均费用 - 当月确认收入
```

### 影响因素处理

1. **冻结申请**: 从当月服务天数中扣除冻结天数
2. **跨月冻结**: 按实际冻结日期分摊到各月
3. **转让追溯**: 标记追溯月份，影响历史计算
4. **补课撤回**: 标记相关计算结果，提示重新计算

## 数据模型

- `membership_contracts`: 会员合同
- `entry_records`: 入场记录
- `freeze_applications`: 冻结申请
- `makeup_lessons`: 补课单
- `transfer_records`: 转让记录
- `rule_versions`: 规则版本
- `deferral_calculations`: 递延计算结果
- `correction_history`: 修正历史
- `report_exports`: 报表导出记录
- `discrepancy_analysis`: 差异分析

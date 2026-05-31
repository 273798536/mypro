## 1. 架构设计

```mermaid
graph TB
    A["React 前端应用"] --> B["状态管理 (useState/useReducer)"]
    A --> C["组件层"]
    C --> C1["筛选栏 FilterBar"]
    C --> C2["数据表格 DataTable"]
    C --> C3["详情面板 DetailPanel"]
    C --> C4["风险标签 RiskBadge"]
    C --> C5["操作栏 ActionBar"]
    A --> D["工具层"]
    D --> D1["导出工具 ExportUtils"]
    D --> D2["数据处理 DataUtils"]
    A --> E["Mock数据层"]
    E --> E1["项目档案数据"]
    E --> E2["补贴批次数据"]
    E --> E3["到账报告数据"]
```

---

## 2. 技术描述

- **前端框架**: React@18 + TypeScript
- **构建工具**: Vite@5
- **样式方案**: TailwindCSS@3
- **图标库**: Lucide React
- **导出功能**: 原生 CSV 导出（无第三方依赖）
- **数据**: 前端 Mock 数据，支持本地状态持久化

---

## 3. 路由定义

| 路由 | 用途 |
|-------|---------|
| / | 到账核对首页（唯一页面） |

---

## 4. 数据模型

### 4.1 数据结构定义

```mermaid
erDiagram
    PROJECT_ARCHIVE ||--o{ SUBSIDY_BATCH : "包含"
    SUBSIDY_BATCH ||--o{ PAYMENT_REPORT : "关联"
    SUBSIDY_BATCH ||--o{ RISK_RECORD : "产生"
    
    PROJECT_ARCHIVE {
        string projectId "项目ID"
        string projectName "项目名称"
        string gridConnectionDate "并网时间"
        number installedCapacity "装机容量(MW)"
        string province "省份"
        string projectType "项目类型"
        string gridCertificateNo "并网证明编号"
    }
    
    SUBSIDY_BATCH {
        string batchId "批次ID"
        string projectId "关联项目ID"
        string batchNo "批次号"
        string declarationDate "申报时间"
        number subsidyAmount "应补贴金额(元)"
        string invoiceNo "发票编号"
        string invoiceDate "开票日期"
        string status "批次状态"
    }
    
    PAYMENT_REPORT {
        string paymentId "到账ID"
        string batchId "关联批次ID"
        string paymentDate "到账日期"
        number paymentAmount "到账金额(元)"
        string bankSerialNo "银行流水号"
        string payer "付款方"
        string receiverAccount "收款账号"
    }
    
    RISK_RECORD {
        string riskId "风险ID"
        string batchId "关联批次ID"
        string riskType "风险类型"
        string riskLevel "风险等级"
        string description "风险描述"
        string suggestion "处理建议"
    }
    
    MATCH_RECORD {
        string recordId "记录ID"
        string batchId "批次ID"
        string projectId "项目ID"
        string paymentId "到账ID"
        string matchStatus "匹配状态"
        string confirmedBy "确认人"
        string confirmedAt "确认时间"
        string notes "备注"
    }
```

### 4.2 TypeScript 类型定义

```typescript
// 项目档案
interface ProjectArchive {
  projectId: string;
  projectName: string;
  gridConnectionDate: string;
  installedCapacity: number;
  province: string;
  projectType: string;
  gridCertificateNo: string;
}

// 补贴批次
interface SubsidyBatch {
  batchId: string;
  projectId: string;
  batchNo: string;
  declarationDate: string;
  subsidyAmount: number;
  invoiceNo: string;
  invoiceDate: string;
  status: 'pending' | 'processing' | 'paid' | 'delayed' | 'reversed' | 'merged';
  isInvoiceReversed: boolean;
  reverseReason?: string;
}

// 到账报告
interface PaymentReport {
  paymentId: string;
  batchId: string;
  paymentDate: string;
  paymentAmount: number;
  bankSerialNo: string;
  payer: string;
  receiverAccount: string;
}

// 风险类型
type RiskType = 'delay' | 'invoice_reverse' | 'project_merge';

interface RiskRecord {
  riskId: string;
  batchId: string;
  riskType: RiskType;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
  relatedBatches?: string[];
}

// 匹配记录（主记录）
interface MatchRecord {
  recordId: string;
  batchId: string;
  projectId: string;
  paymentId: string;
  matchStatus: 'unmatched' | 'matched' | 'confirmed' | 'exception';
  confirmedBy?: string;
  confirmedAt?: string;
  notes?: string;
  risks: RiskRecord[];
  project: ProjectArchive;
  batch: SubsidyBatch;
  payment: PaymentReport;
}

// 筛选条件
interface FilterConditions {
  projectName?: string;
  batchNo?: string;
  matchStatus?: string;
  riskType?: string;
  dateRange?: [string, string];
}
```

---

## 5. 核心功能实现思路

### 5.1 筛选功能
- 使用 React useState 管理筛选条件
- 实时过滤匹配记录列表
- 支持多条件组合筛选

### 5.2 确认功能
- 单条确认：更新单条记录状态
- 批量确认：更新选中记录状态
- 状态持久化：localStorage 存储确认结果

### 5.3 导出功能
- 生成 CSV 格式文件
- 包含完整记录信息和风险标记
- 支持导出筛选结果或全部数据

### 5.4 详情展开
- 三栏布局：项目档案 / 补贴批次 / 到账报告
- 风险分类展示：批次延迟 / 发票红冲 / 项目合并
- 数据来源可追溯，保留原始字段

---

## 6. 目录结构

```
src/
├── components/
│   ├── FilterBar.tsx      # 筛选栏
│   ├── DataTable.tsx      # 数据表格
│   ├── DetailPanel.tsx    # 详情面板
│   ├── RiskBadge.tsx      # 风险标签
│   └── ActionBar.tsx      # 操作栏
├── data/
│   └── mockData.ts        # Mock 数据
├── types/
│   └── index.ts           # 类型定义
├── utils/
│   ├── export.ts          # 导出工具
│   └── dataUtils.ts       # 数据处理
├── App.tsx                # 主应用
├── main.tsx               # 入口文件
└── index.css              # 全局样式
```

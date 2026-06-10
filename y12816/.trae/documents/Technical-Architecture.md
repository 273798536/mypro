## 1. 架构设计

```mermaid
graph TD
    A["前端 React 18 + TypeScript"] --> B["状态管理 Zustand"]
    A --> C["UI 组件层"]
    C --> C1["报告工作台组件"]
    C --> C2["计算工具组件"]
    C --> C3["图像标注对比组件"]
    C --> C4["质控流程组件"]
    C --> C5["边界案例组件"]
    C --> C6["新旧对比组件"]
    B --> D["业务逻辑层 Hooks"]
    D --> D1["useMutationCalculator 突变计算"]
    D --> D2["useQcWorkflow 质控流程"]
    D --> D3["useComparison 新旧对比"]
    B --> E["Mock 数据层"]
    E --> E1["样本清单数据"]
    E --> E2["边界案例数据"]
    E --> E3["坏数据样例"]
    A --> F["样式层 Tailwind CSS 3"]
```

## 2. 技术描述

- 前端：React@18 + TypeScript + Vite
- 初始化工具：vite-init react-ts 模板
- 后端：无（纯前端工具，所有数据使用本地 Mock）
- 状态管理：Zustand
- 样式：Tailwind CSS 3
- 图标：lucide-react
- 路由：react-router-dom

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 报告工作台（主页面，包含样本清单、计算结果、公式说明） |
| /calculator | 计算工具（参数配置、实时计算） |
| /image-annotation | 图像标注对比（显微照片标注前后对比） |
| /qc-workflow | 质控流程（重复运行、补录、人工确认三步测试） |
| /edge-cases | 边界案例库（条码重复、低质量读段案例） |
| /comparison | 新旧结论对比（样本清单变更前后对比） |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    SAMPLE {
        string barcode "样本条码"
        string type "样本类型"
        string source "录入来源"
        string status "状态"
        number totalReads "总读段数"
        number mutantReads "突变读段数"
        number coverage "覆盖深度"
        number qualityScore "质量分值"
        string conclusion "结论"
        string reviewNote "复核意见"
        string photoNote "显微照片备注"
    }
    
    CALCULATION_RESULT {
        string sampleBarcode "关联样本条码"
        number mutationFrequency "突变频率"
        number alleleFrequency "等位基因频率"
        string formula "计算公式"
        string unit "单位"
        string applicableRange "适用范围"
        string failureReason "失败原因（如有）"
        boolean isPass "是否通过阈值"
    }
    
    IMAGE_ANNOTATION {
        string sampleBarcode "关联样本条码"
        string beforeAnnotation "标注前判断"
        string afterAnnotation "标注后判断"
        string diffDescription "差异描述"
        string timestamp "修改时间"
        string operator "操作人"
    }
    
    QC_STEP {
        string name "步骤名称"
        string status "状态：pending/running/passed/failed"
        string description "步骤说明"
        string resultDetail "结果详情"
    }
    
    EDGE_CASE {
        string id "案例ID"
        string title "案例标题"
        string description "案例描述"
        string beforeResult "修改前结果"
        string afterResult "修改后结果"
        boolean doesChangeResult "是否改变判定结果"
    }
    
    SAMPLE_CHANGE_LOG {
        string sampleBarcode "样本条码"
        string fieldName "变更字段"
        string oldValue "旧值"
        string newValue "新值"
        string oldConclusion "旧结论"
        string newConclusion "新结论"
        string timestamp "变更时间"
    }
```

### 4.2 核心计算公式

突变频率(Mutation Frequency) = 突变读段数 / 总读段数 × 100%
等位基因频率(Allele Frequency) = 突变读段数 / (2 × 总读段数) × 100% （针对二倍体）
覆盖深度(Coverage) = 总读段数 / 目标区域长度

## 5. 目录结构

```
src/
├── components/
│   ├── SampleList.tsx          # 样本清单表格
│   ├── CalculationCard.tsx     # 突变计算卡片
│   ├── FormulaPanel.tsx        # 公式说明面板
│   ├── ParameterSlider.tsx     # 参数滑块
│   ├── ImageCompare.tsx        # 图像标注对比
│   ├── CorrectionDiff.tsx      # 人工修正差异
│   ├── QcSteps.tsx             # 质控三步流程
│   ├── EdgeCaseCard.tsx        # 边界案例卡片
│   ├── OldNewCompare.tsx       # 新旧结论并排对比
│   └── BadDataWarning.tsx      # 坏数据警告标识
├── pages/
│   ├── Workbench.tsx           # 报告工作台
│   ├── Calculator.tsx          # 计算工具页
│   ├── ImageAnnotation.tsx     # 图像标注页
│   ├── QcWorkflow.tsx          # 质控流程页
│   ├── EdgeCases.tsx           # 边界案例页
│   └── Comparison.tsx          # 新旧对比页
├── hooks/
│   ├── useMutationCalculator.ts # 突变计算逻辑
│   ├── useQcWorkflow.ts        # 质控流程逻辑
│   └── useSampleComparison.ts  # 样本对比逻辑
├── store/
│   └── useReportStore.ts       # Zustand 全局状态
├── data/
│   ├── mockSamples.ts          # Mock 样本数据
│   ├── mockEdgeCases.ts        # Mock 边界案例
│   └── mockBadData.ts          # Mock 坏数据样例
├── types/
│   └── index.ts                # TypeScript 类型定义
├── utils/
│   └── calculator.ts           # 计算工具函数
├── App.tsx
├── main.tsx
└── index.css
```

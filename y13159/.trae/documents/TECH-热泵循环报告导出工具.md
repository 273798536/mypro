## 1. 架构设计

```mermaid
graph TB
    subgraph "前端 React SPA"
        A["报告概览页面"]
        B["设备铭牌面板"]
        C["计算过程面板"]
        D["异常审查面板"]
        E["P-h图表复核区"]
        F["状态管理 Context"]
    end
    subgraph "数据层"
        G["Mock 数据 (JSON)"]
        H["本地状态 useReducer"]
        I["导入解析器"]
    end
    subgraph "工具函数"
        J["单位换算引擎"]
        K["符号错误检测"]
        L["报告导出 (JSON/打印)"]
    end
    F --> A
    F --> B
    F --> C
    F --> D
    F --> E
    I --> G
    G --> F
    H --> F
    J --> C
    K --> D
    L --> A
```

## 2. 技术描述
- 前端：React@18 + Vite@5 + TypeScript
- 样式：TailwindCSS@3 + 自定义CSS变量（工业深蓝主题）
- 图表：原生 SVG 绘制 P-h 压焓图（零依赖，便于交接）
- 状态管理：React Context + useReducer（简单场景，避免 Redux 复杂度）
- 数据：内置 Mock JSON 数据，支持导入外部 JSON
- 字体：Google Fonts - Space Mono + JetBrains Mono

## 3. 路由定义
| Route | 用途 |
|-------|------|
| / | 报告概览（默认页，含导入+摘要+快捷操作） |
| /nameplate | 设备铭牌面板 |
| /calculation | 计算过程面板（参数对照+单位换算） |
| /anomaly | 异常审查面板（符号错误+撤回记录） |
| /chart | P-h 图表复核区 |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    NAMEPLATE {
        int row_no "原始行号"
        string device_id "设备编号"
        string param_name "参数名称"
        float param_value "参数值"
        string unit "单位"
        string alarm_flag "报警标记"
        string remark "人工备注"
        string remark_status "备注对齐状态: matched/mismatched/missing"
        string bad_data_flag "坏数据标记"
        string bad_data_reason "坏数据原因"
    }
    SYMBOL_ERROR {
        int id "错误ID"
        int nameplate_row "关联铭牌行号"
        string param_name "参数名"
        float original_value "原值(符号错误)"
        float corrected_value "修正值"
        string direction "方向描述"
        string impact_scope "影响范围"
    }
    WITHDRAW_RECORD {
        int id "记录ID"
        string timestamp "时间戳"
        string operator "操作人"
        string reason "撤回原因"
        string supplementary_note "后补说明"
        string related_device "关联设备"
    }
    CALCULATION_STEP {
        int step_no "步骤号"
        string description "计算描述"
        string formula "公式"
        float param_a "A组参数值"
        float param_b "B组参数值"
        string from_unit "来源单位"
        string to_unit "目标单位"
        float result_a "A组中间结果"
        float result_b "B组中间结果"
    }
    REPORT_META {
        string report_date "报告日期"
        int withdraw_count "撤回记录数"
        int symbol_error_count "符号错误数"
        int bad_data_count "坏数据数"
        float remark_match_rate "备注对齐率"
    }
```

### 4.2 Mock 数据结构（内置示例）
- 设备铭牌：5-8 条记录，含 1 条坏数据、2 条备注未对齐
- 符号错误：2 条记录（如蒸发压力方向写反）
- 撤回记录：初始 1 条（演示用），支持新增
- 计算过程：6-8 步换算，含 A/B 两组参数对照

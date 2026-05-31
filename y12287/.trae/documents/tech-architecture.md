## 1. 架构设计

```mermaid
graph TB
    subgraph "前端层"
        A["React App"] --> B["3D牙模视窗<br/>@react-three/fiber"]
        A --> C["输入面板"]
        A --> D["诊断提示面板"]
        A --> E["手动修正页面"]
        A --> F["新旧对比视图"]
    end

    subgraph "状态管理层"
        G["Zustand Store"] --> H["牙模数据状态"]
        G --> I["诊断提示状态"]
        G --> J["修正历史状态"]
        G --> K["冲突数据状态"]
    end

    subgraph "数据处理层"
        L["数据解析器"] --> M["牙模解析"]
        L --> N["磨改建议解析"]
        L --> O["接触报告解析"]
        P["冲突检测器"] --> Q["数据完整性检查"]
        P --> R["材料冲突检测"]
        P --> S["错位/重叠/过量检测"]
    end

    A --> G
    G --> L
    L --> P
```

## 2. 技术说明

- **前端**：React@18 + TypeScript + tailwindcss@3 + vite
- **初始化工具**：vite-init（react-ts模板）
- **3D渲染**：three + @react-three/fiber + @react-three/drei + @react-three/postprocessing
- **状态管理**：zustand
- **路由**：react-router-dom
- **后端**：无（纯前端，使用模拟数据）
- **数据**：本地模拟数据，无数据库

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| `/` | 咬合评审主页面：3D牙模视窗 + 输入面板 + 诊断面板 |
| `/correction` | 手动修正页面：咬合点编辑 + 新旧对比 |

## 4. 数据模型

### 4.1 核心数据模型定义

```mermaid
erDiagram
    DentalModel {
        string id PK
        string name
        string jawType "upper | lower"
        float[][] vertices
        int[][] faces
        string source
        boolean isComplete
    }

    ContactPoint {
        string id PK
        string toothNumber
        float positionX
        float positionY
        float positionZ
        float intensity
        boolean isOverlapping
        string jawType "upper | lower"
    }

    GrindingSuggestion {
        string id PK
        string toothNumber
        float depth "mm"
        string area
        float recommendedMax
        boolean isExcessive
    }

    DiagnosticAlert {
        string id PK
        string alertType "misalignment | overlap | excessive | dataGap | conflict"
        string severity "info | warning | critical"
        string toothNumber
        string materialName
        string description
        string sourceA
        string sourceB
    }

    CorrectionRecord {
        string id PK
        string contactPointId FK
        float originalX
        float originalY
        float originalZ
        float correctedX
        float correctedY
        float correctedZ
        string timestamp
    }

    DentalModel ||--o{ ContactPoint : "has"
    ContactPoint ||--o{ CorrectionRecord : "modified_by"
    GrindingSuggestion ||--o{ DiagnosticAlert : "triggers"
    DentalModel ||--o{ DiagnosticAlert : "has"
```

### 4.2 模拟数据说明

项目使用内置模拟数据，包含：
- 上颌+下颌各16颗牙齿的简化3D网格数据
- 8个接触点（含2个重叠点、1个错位点）
- 3条磨改建议（含1条过量建议）
- 对应的诊断提示数据

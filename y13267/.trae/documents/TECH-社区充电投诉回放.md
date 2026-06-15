## 1. 架构设计

```mermaid
graph TB
    subgraph "Frontend 前端层"
        A["React 18 主应用"]
        B["Three.js + @react-three/fiber 3D渲染"]
        C["状态管理 Zustand"]
        D["TailwindCSS 3 样式层"]
        E["组件层: 时间轴/筛选/CSV表格/历史抽屉/引导层"]
    end
    subgraph "Data 数据层"
        F["Mock数据 (模拟GIS点位/投诉/历史)"]
        G["字段自适应映射器"]
        H["本地存储 LocalStorage (历史判断留痕)"]
    end
    subgraph "Service 服务层"
        I["时间轴回放引擎"]
        J["点位冲突检测算法"]
        K["CSV导入/导出服务"]
        L["照片补录服务"]
    end
    A --> C
    A --> E
    B --> A
    C --> I
    C --> J
    E --> K
    E --> L
    F --> G
    G --> C
    H --> C
```

## 2. 技术描述

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **3D渲染**: three@0.160 + @react-three/fiber@8 + @react-three/drei@9 + @react-three/postprocessing@2
- **状态管理**: zustand@4（轻量，支持时间旅行调试）
- **样式**: tailwindcss@3 + postcss + autoprefixer
- **UI组件**: lucide-react@0.312（线性图标库）+ framer-motion@11（动画）
- **CSV处理**: papaparse@5
- **后端**: 无后端，全部用Mock数据 + LocalStorage持久化
- **数据库**: 无服务端数据库，浏览器端IndexedDB/LocalStorage

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主工作台（唯一页面，所有功能在此呈现） |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    COMPLAINT_POINT ||--o{ COMPLAINT_RECORD : has
    COMPLAINT_POINT ||--o{ JUDGMENT_HISTORY : has
    COMPLAINT_POINT ||--o{ PHOTO_ATTACHMENT : has
    
    COMPLAINT_POINT {
        string id PK "点位ID"
        number lng "经度"
        number lat "纬度"
        string source "来源 (保底字段)"
        string status "处理状态 (保底字段)"
        string address "地址描述"
        boolean is_conflict "是否街口冲突"
        boolean is_duplicate "是否重复投诉"
        object raw_fields "原始GIS字段(自适应)"
        datetime created_at
        datetime updated_at
    }
    
    COMPLAINT_RECORD {
        string id PK
        string point_id FK
        string complaint_content "投诉内容"
        string complainant "投诉人"
        datetime complaint_time
        string timeline_tag "时间轴阶段标签"
    }
    
    JUDGMENT_HISTORY {
        string id PK
        string point_id FK
        string judgment_before "修改前判断"
        string judgment_after "修改后判断"
        string operator "操作人(规划师)"
        datetime modified_at
        string change_reason "修改原因"
    }
    
    PHOTO_ATTACHMENT {
        string id PK
        string point_id FK
        string photo_url "照片数据(base64或URL)"
        string uploader "补录人"
        datetime uploaded_at
        string remark "补录说明"
    }
```

### 4.2 字段自适应映射规则

由于复核人提供的GIS字段名前后不一致，系统需实现映射器：

```typescript
// 保底字段映射（必保）
const GUARANTEED_FIELDS = {
  source: ['来源', '投诉来源', 'source', 'from_channel', '渠道来源'],
  status: ['处理状态', 'status', 'state', '处理结果', '当前状态']
} as const;

// 其余字段尝试模糊匹配，匹配不上归入 raw_fields 原样展示
```

### 4.3 处理结果措辞规范

```typescript
// 禁止使用"通过/正常通过"类措辞，替换为:
const RESULT_WORDS = {
  approved: '准予备案',
  rejected: '驳回·存在冲突',
  duplicate: '重复投诉·不予受理',
  pending: '待复核'
} as const;
```

## 5. 核心模块职责

| 模块 | 文件路径 | 职责 |
|------|----------|------|
| 3D场景 | src/components/Scene3D/ | Three.js场景、点位渲染、相机控制、冲突高亮 |
| 时间轴 | src/components/Timeline/ | 回放控制、时间切片、动画帧调度 |
| 筛选面板 | src/components/FilterPanel/ | 保底字段高亮、多条件过滤、字段自适应 |
| CSV明细 | src/components/DetailTable/ | 联动高亮、重复投诉标注、补录标记、CSV导入导出 |
| 判断历史 | src/components/HistoryDrawer/ | 时间线展示、前后对比、不可删除 |
| 操作引导 | src/components/GuideLayer/ | 材料入口提示、异常出口提示、新手引导 |
| 状态存储 | src/store/ | Zustand store、时间轴状态、选中等全局状态 |
| 数据服务 | src/services/ | Mock数据生成、字段映射、本地持久化 |

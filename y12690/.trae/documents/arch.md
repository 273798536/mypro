## 1. 架构设计
```mermaid
graph TB
    subgraph "前端应用"
        A["React 组件层"]
        B["状态管理 (useState/useContext)"]
        C["3D 渲染引擎 (@react-three/fiber)"]
        D["UI 组件 (Tailwind CSS)"]
    end
    
    subgraph "数据层"
        E["本地存储 (localStorage)"]
        F["模拟数据 (Mock Data)"]
    end
    
    A --> B
    B --> C
    B --> D
    B --> E
    E --> F
```

## 2. 技术描述
- 前端框架：React@18 + TypeScript
- 构建工具：Vite
- UI 框架：Tailwind CSS@3
- 3D 渲染：@react-three/fiber, @react-three/drei, three.js
- 状态管理：React Context API + useState
- 数据存储：localStorage（存储视角、记录等）

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 主工作台页面 |

## 4. 数据模型
### 4.1 数据模型定义
```mermaid
erDiagram
    RECORD ||--o{ VIEWPOINT : has
    RECORD ||--o{ COLLISION : has
    RECORD {
        string id
        string name
        string status
        datetime created_at
        boolean has_duplicates
        boolean has_empty_values
        boolean has_coordinate_issues
    }
    VIEWPOINT {
        string id
        string name
        float position_x
        float position_y
        float position_z
        float rotation_x
        float rotation_y
        float rotation_z
    }
    COLLISION {
        string id
        string type
        string description
        string color_code
        boolean is_critical
    }
```

### 4.2 数据结构定义
```typescript
interface Viewpoint {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  fov: number;
}

interface Collision {
  id: string;
  type: 'collision' | 'boundary' | 'warning';
  description: string;
  position: [number, number, number];
  colorCode: string;
  isCritical: boolean;
}

interface Record {
  id: string;
  name: string;
  status: 'valid' | 'needs_review' | 'invalid';
  createdAt: Date;
  hasDuplicates: boolean;
  hasEmptyValues: boolean;
  hasCoordinateIssues: boolean;
  viewpoints: Viewpoint[];
  collisions: Collision[];
  modelData: any;
}
```

## 1. 架构设计

```mermaid
graph TB
    subgraph "前端层"
        A["React 组件"] --> B["状态管理 (Zustand)"]
        B --> C["画布渲染 (Canvas API)"]
        A --> D["路由管理 (React Router)"]
    end
    subgraph "数据层"
        E["关卡数据"]
        F["操作历史栈"]
        G["标注状态"]
    end
    B <--> E
    B <--> F
    B <--> G
```

## 2. 技术描述
- 前端: React@18 + TypeScript + Tailwind CSS + Vite
- 初始化工具: vite-init
- 后端: 无（纯前端应用）
- 数据库: 无（使用 localStorage 存储状态）

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 关卡选择页面 |
| /workspace | 标注工作区主界面 |
| /summary | 结算报告页面 |

## 4. API 定义
无后端 API

## 5. 服务架构图
不适用（无后端）

## 6. 数据模型
### 6.1 数据模型定义

```mermaid
erDiagram
    LEVEL {
        string id
        string name
        string description
        object deckConfig
        array cargoList
        array issues
    }
    CARGO {
        string id
        string name
        number width
        number height
        number weight
        string unit
    }
    PLACEMENT {
        string id
        string cargoId
        number x
        number y
        boolean isValid
        string issue
    }
    HISTORY {
        string id
        string action
        object stateBefore
        object stateAfter
        string timestamp
    }
```

### 6.2 数据定义语言
不适用（无数据库）

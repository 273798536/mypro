## 1. 架构设计

```mermaid
graph TB
    subgraph "前端应用 (React)"
        A["UI层<br/>页面组件"] --> B["状态管理层<br/>Zustand"]
        B --> C["业务逻辑层<br/>Hooks/Services"]
        C --> D["数据层<br/>LocalStorage/Mock"]
    end
    
    subgraph "核心模块"
        E["排名计算引擎"]
        F["版本控制服务"]
        G["申诉管理服务"]
        H["数据导入导出"]
    end
    
    C --> E
    C --> F
    C --> G
    C --> H
    
    D --> I["本地存储<br/>localStorage"]
```

## 2. 技术栈说明

- **前端框架**：React@18 + TypeScript
- **构建工具**：Vite@5
- **样式方案**：TailwindCSS@3
- **状态管理**：Zustand
- **图标库**：Lucide React
- **数据持久化**：LocalStorage
- **日期处理**：date-fns

## 3. 路由定义

| 路由路径 | 页面名称 | 功能说明 |
|----------|----------|----------|
| / | 仪表盘 | 数据概览、待办事项 |
| /data | 数据管理 | 选手列表、数据导入 |
| /ranking | 排名中心 | 排名表、规则配置 |
| /tiebreak | 同分确认 | 待确认并列列表 |
| /appeal | 申诉中心 | 申诉记录、处理流程 |
| /history | 版本历史 | 修改日志、版本对比 |
| /report | 报告导出 | 排名报告、数据导出 |

## 4. 数据模型

### 4.1 数据关系图

```mermaid
erDiagram
    CONTESTANT ||--o{ SCORE : has
    CONTESTANT ||--o{ SUBMISSION : has
    SCORE ||--o{ SCORE_ITEM : contains
    RANKING_VERSION ||--o{ RANKING_ENTRY : contains
    RANKING_VERSION ||--o{ CHANGE_LOG : has
    APPEAL ||--o{ RANKING_VERSION : triggers
    
    CONTESTANT {
        string id
        string name
        string team
        string category
    }
    
    SCORE {
        string id
        string contestantId
        number totalScore
        datetime calculatedAt
    }
    
    SCORE_ITEM {
        string id
        string scoreId
        string category
        number points
        number weight
    }
    
    SUBMISSION {
        string id
        string contestantId
        datetime submitTime
        string fileHash
    }
    
    RANKING_VERSION {
        string id
        number version
        string ruleConfig
        datetime createdAt
        string createdBy
        string changeReason
    }
    
    RANKING_ENTRY {
        string id
        string versionId
        string contestantId
        number rank
        number score
        boolean isTied
        string tieBreakStatus
    }
    
    CHANGE_LOG {
        string id
        string versionId
        string actionType
        string fieldChanged
        string oldValue
        string newValue
        string operator
        datetime timestamp
    }
    
    APPEAL {
        string id
        string contestantId
        string type
        string reason
        string status
        string reviewer
        datetime createdAt
        datetime resolvedAt
    }
```

### 4.2 排名规则配置

```typescript
interface RankingRule {
  id: string;
  name: string;
  description: string;
  scoreWeights: {
    category: string;
    weight: number;
  }[];
  tieBreakRules: {
    order: number;
    rule: 'submissionTime' | 'specificCategory' | 'headToHead' | 'manual';
    category?: string;
    ascending: boolean;
  }[];
}
```

### 4.3 版本记录格式

```typescript
interface VersionRecord {
  id: string;
  version: number;
  timestamp: string;
  operator: string;
  changeType: 'score' | 'rule' | 'appeal' | 'manual';
  description: string;
  affectedContestants: string[];
  rankingSnapshot: RankingEntry[];
}
```

## 5. 核心算法

### 5.1 排名计算算法

1. **加权总分计算**：根据规则配置的权重计算每位选手的加权总分
2. **初步排序**：按加权总分降序排序
3. **同分检测**：识别总分相同的选手组
4. **TieBreak处理**：按规则配置依次应用同分打破规则
5. **排名分配**：使用标准竞赛排名法（如1,2,2,4）

### 5.2 版本对比算法

1. 提取两个版本的排名快照
2. 对比每位选手的排名变化
3. 识别新增/移除的选手
4. 生成变更摘要和影响分析

## 6. 状态管理设计

### 6.1 Store结构

```typescript
interface AppState {
  // 选手数据
  contestants: Contestant[];
  scores: Score[];
  submissions: Submission[];
  
  // 排名数据
  currentRanking: RankingEntry[];
  rankingVersions: RankingVersion[];
  currentRule: RankingRule;
  availableRules: RankingRule[];
  
  // 同分处理
  pendingTieBreaks: TieBreakGroup[];
  
  // 申诉数据
  appeals: Appeal[];
  
  // UI状态
  currentPage: string;
  loading: boolean;
}
```

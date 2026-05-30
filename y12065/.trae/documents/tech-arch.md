## 1. 架构设计

```mermaid
graph TD
    A["React 前端层"] --> B["状态管理（Zustand）"]
    A --> C["路由（React Router）"]
    A --> D["UI组件（Tailwind CSS）"]
    B --> E["游戏核心逻辑"]
    E --> F["线索组合引擎"]
    E --> G["错因分析引擎"]
    E --> H["来源追溯模块"]
    E --> I["报告生成模块"]
    J["Mock 数据层"] --> E
    K["音频播放模块"] --> A
```

## 2. 技术描述
- **前端**：React@18 + TypeScript + Vite
- **状态管理**：Zustand
- **路由**：react-router-dom@6
- **样式**：Tailwind CSS@3
- **图标**：lucide-react
- **后端**：无后端，纯前端Mock数据
- **数据库**：无数据库，使用TypeScript定义数据模型，Mock数据内置

## 3. 路由定义
| Route | 用途 |
|-------|------|
| / | 案件大厅首页 |
| /case/:id | 侦探推理页面 |
| /case/:id/review | 结算复盘页面 |

## 4. 数据模型

### 4.1 数据模型定义
```mermaid
erDiagram
    CASE ||--o{ CLUE : contains
    CASE ||--o{ AUDIO_CLUE : contains
    CASE ||--o{ ANSWER_OPTION : has
    USER_JUDGMENT ||--|| CASE : belongs_to
    USER_JUDGMENT ||--o{ CLUE_COMBINATION : has
    USER_JUDGMENT ||--|| ANSWER_OPTION : selects
    CLUE_COMBINATION ||--o{ CLUE : includes
    CLUE_COMBINATION ||--o{ AUDIO_CLUE : includes
    ERROR_ANALYSIS ||--|| USER_JUDGMENT : for
    SOURCE_TRACE ||--o{ CLUE : points_to
    SOURCE_TRACE ||--o{ AUDIO_CLUE : points_to
    
    CASE {
        string id
        string title
        string description
        number difficulty
        string targetConcept
        string[] tags
    }
    
    CLUE {
        string id
        string caseId
        string content
        string type
        string source
        boolean isKey
        string[] relatedConcepts
    }
    
    AUDIO_CLUE {
        string id
        string caseId
        string name
        string audioUrl
        string description
        string chordInfo
        boolean isKey
        number duration
    }
    
    ANSWER_OPTION {
        string id
        string caseId
        string label
        string value
        boolean isCorrect
        string explanation
    }
    
    USER_JUDGMENT {
        string id
        string caseId
        string selectedAnswerId
        number score
        string timestamp
    }
    
    CLUE_COMBINATION {
        string id
        string userJudgmentId
        string[] clueIds
        string[] audioClueIds
        string reasoning
    }
    
    ERROR_ANALYSIS {
        string id
        string userJudgmentId
        string errorType
        string description
        string suggestion
    }
    
    SOURCE_TRACE {
        string id
        string userJudgmentId
        string targetType
        string targetId
        string referenceText
    }
```

### 4.2 核心数据结构（TypeScript）
```typescript
// 案件
interface Case {
  id: string;
  title: string;
  description: string;
  difficulty: 1 | 2 | 3;
  targetConcept: string;
  tags: string[];
  brief: string;
  correctReasoning: string[];
}

// 文字线索
interface Clue {
  id: string;
  caseId: string;
  content: string;
  type: 'theory' | 'hint' | 'trap';
  source: string;
  isKey: boolean;
  relatedConcepts: string[];
  fingerprint: string; // 用于检测重复
}

// 音频线索
interface AudioClue {
  id: string;
  caseId: string;
  name: string;
  audioUrl: string; // 使用Web Audio API生成或Mock
  description: string;
  chordInfo: string;
  isKey: boolean;
  duration: number;
  fingerprint: string; // 用于检测重复
}

// 答案选项
interface AnswerOption {
  id: string;
  caseId: string;
  label: string;
  value: string;
  isCorrect: boolean;
  explanation: string;
}

// 用户判断
interface UserJudgment {
  id: string;
  caseId: string;
  selectedAnswerId: string;
  selectedClueIds: string[];
  selectedAudioClueIds: string[];
  isCorrect: boolean;
  score: number;
  timestamp: number;
}

// 错因分析
interface ErrorAnalysis {
  type: 'inversion_misjudgment' | 'enharmonic_confusion' | 'duplicate_clue' | 'wrong_combination' | 'other';
  description: string;
  suggestion: string;
  sourceTrace: {
    type: 'clue' | 'audio_clue';
    id: string;
    reference: string;
  }[];
}

// 结案报告
interface CaseReport {
  caseId: string;
  caseTitle: string;
  userJudgment: UserJudgment;
  correctAnswer: AnswerOption;
  errorAnalysis?: ErrorAnalysis;
  clueCombinationAnalysis: {
    userCombination: string[];
    correctCombination: string[];
    missingClues: string[];
    redundantClues: string[];
    duplicateClues: string[];
  };
  timestamp: number;
}
```

## 5. 核心模块设计

### 5.1 线索组合引擎
- 功能：验证用户选择的线索组合是否合理
- 检测：重复线索检测（基于fingerprint）、必要线索缺失检测、冗余线索检测
- 输出：组合得分 + 组合分析

### 5.2 错因分析引擎
- 功能：根据用户答案和线索组合，精准定位错误类型
- 错误类型：
  - `inversion_misjudgment`: 转位误判
  - `enharmonic_confusion`: 同名调混淆
  - `duplicate_clue`: 线索重复（系统检测到重复但用户未识别）
  - `wrong_combination`: 线索组合错误
- 输出：错误原因 + 改进建议 + 来源追溯

### 5.3 来源追溯模块
- 功能：为每条判断建立与原始线索的关联
- 实现：每个错因点都带有sourceTrace数组，可跳转至对应原始线索

### 5.4 报告生成模块
- 功能：生成结构化结案报告
- 导出格式：Markdown格式，包含完整推理链、错因分析、来源追溯

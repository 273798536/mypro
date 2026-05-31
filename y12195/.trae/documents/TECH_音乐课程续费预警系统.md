## 1. 架构设计

```mermaid
graph TD
    subgraph "前端层"
        A["React 应用"]
        A1["预警仪表盘"]
        A2["学员样本页"]
        A3["版本追踪页"]
        A4["人工修正页"]
        A5["分组指标页"]
        A6["缺课补录页"]
        A7["数据导入页"]
        A --> A1 & A2 & A3 & A4 & A5 & A6 & A7
    end
    
    subgraph "服务层"
        B["Node.js + Express API"]
        B1["认证中间件"]
        B2["数据清洗服务"]
        B3["预警引擎服务"]
        B4["版本管理服务"]
        B5["人工修正服务"]
        B6["分组统计服务"]
        B7["文件导入服务"]
        B --> B1 & B2 & B3 & B4 & B5 & B6 & B7
    end
    
    subgraph "数据层"
        C["SQLite 数据库"]
        C1["学员档案表"]
        C2["上课记录表"]
        C3["练习打卡表"]
        C4["家长反馈表"]
        C5["预警版本表"]
        C6["预警评分表"]
        C7["人工修正表"]
        C8["跟进记录表"]
        C9["用户角色表"]
        C --> C1 & C2 & C3 & C4 & C5 & C6 & C7 & C8 & C9
    end
    
    subgraph "AI/ML层"
        D["Python 预警引擎"]
        D1["特征工程模块"]
        D2["评分算法模块"]
        D3["归因分析模块"]
        D4["模型自学习模块"]
        D --> D1 & D2 & D3 & D4
    end
    
    A -->|REST API| B
    B -->|SQL| C
    B -->|gRPC/HTTP| D
    D -->|读写| C
```

## 2. 技术描述

- **前端**：React@18 + TypeScript + Vite + TailwindCSS@3 + Recharts + React Router@6
- **后端**：Node.js + Express@4 + TypeScript
- **AI/ML引擎**：Python@3.10 + scikit-learn + pandas + numpy
- **数据库**：SQLite3（本地部署，零配置）
- **数据导入**：xlsx（Excel解析）+ csv-parse（CSV解析）+ multer（文件上传）
- **跨进程通信**：Node.js通过child_process调用Python脚本，使用JSON格式传递数据
- **初始化工具**：Vite 脚手架初始化前端项目，Express Generator 初始化后端项目

## 3. 路由定义

| 路由 | 页面/用途 |
|------|----------|
| `/` | 重定向到 `/dashboard` |
| `/dashboard` | 预警仪表盘 |
| `/students` | 学员样本列表页 |
| `/students/:id` | 学员详情页（含预警、跟进、历史） |
| `/versions` | 版本追踪列表页 |
| `/versions/compare` | 版本对比页 |
| `/corrections` | 人工修正列表页 |
| `/groups` | 分组指标页 |
| `/makeup` | 缺课补录页 |
| `/import` | 数据导入页 |
| `/login` | 登录页 |
| `/api/*` | API接口前缀 |

## 4. API 定义

```typescript
// 通用响应结构
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 学员相关类型
interface Student {
  id: string;
  name: string;
  age: number;
  courseType: string;
  teacherId: string;
  remainingLessons: number;
  totalLessons: number;
  renewalDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// 上课记录类型
interface AttendanceRecord {
  id: string;
  studentId: string;
  lessonDate: string;
  status: 'attended' | 'absent' | 'late' | 'makeup';
  absentReason?: 'sick' | 'leave' | 'tired' | 'other' | null;
  makeupRecordId?: string;
  notes?: string;
  rawData?: Record<string, any>; // 存储原始脏数据
  hasMissingFields: boolean;
}

// 练习打卡类型
interface PracticeRecord {
  id: string;
  studentId: string;
  practiceDate: string;
  submittedDate: string; // 可能晚于practiceDate
  durationMinutes: number;
  completionRate: number;
  teacherComment?: string;
  isLate: boolean;
}

// 家长反馈类型
interface FeedbackRecord {
  id: string;
  studentId: string;
  feedbackDate: string;
  content: string;
  sentimentScore: number; // -1 到 1
  isDuplicate: boolean;
  duplicateOfId?: string;
}

// 预警版本类型
interface WarningVersion {
  id: string;
  version: string; // 如 v2024.05.31.1
  createdAt: string;
  dataDateRange: { start: string; end: string };
  studentCount: number;
  trigger: 'auto' | 'manual' | 'makeup' | 'correction';
  description: string;
}

// 预警评分类型
interface WarningScore {
  id: string;
  studentId: string;
  versionId: string;
  overallScore: number; // 0-100，越高风险越大
  level: 'red' | 'yellow' | 'green';
  dimensions: {
    absence: number;
    practice: number;
    feedback: number;
    lessonProgress: number;
  };
  attribution: string[]; // 主要归因
  changeFromPrev?: {
    scoreDiff: number;
    reasons: string[];
  };
}

// 人工修正类型
interface ManualCorrection {
  id: string;
  studentId: string;
  versionId: string;
  originalScore: number;
  correctedScore: number;
  originalLevel: string;
  correctedLevel: string;
  reason: string;
  correctedBy: string;
  createdAt: string;
  renewalResult?: 'renewed' | 'not_renewed' | 'pending';
}

// 跟进记录类型
interface FollowUpRecord {
  id: string;
  studentId: string;
  followUpDate: string;
  followUpBy: string;
  method: 'phone' | 'wechat' | 'in_person' | 'other';
  content: string;
  nextAction?: string;
  parentResponse?: string;
}

// API 端点列表
interface APIRoutes {
  // 认证
  'POST /api/auth/login': { req: { username: string; password: string }; res: { token: string; user: User } };
  
  // 学员
  'GET /api/students': { req: QueryParams; res: { list: Student[]; total: number } };
  'GET /api/students/:id': { req: null; res: Student & { latestScore: WarningScore } };
  'POST /api/students': { req: Partial<Student>; res: Student };
  
  // 上课记录
  'GET /api/students/:id/attendance': { req: null; res: AttendanceRecord[] };
  'PATCH /api/attendance/:id': { req: Partial<AttendanceRecord>; res: AttendanceRecord };
  
  // 缺课补录
  'GET /api/makeup/pending': { req: null; res: AttendanceRecord[] };
  'POST /api/makeup': { req: MakeupRequest; res: { record: AttendanceRecord; newScore: WarningScore; conclusion: string } };
  
  // 预警
  'GET /api/warnings/current': { req: QueryParams; res: { list: WarningScore[]; total: number } };
  'GET /api/warnings/student/:id': { req: { versionId?: string }; res: WarningScore[] };
  'POST /api/warnings/recalculate': { req: { studentId?: string; reason: string }; res: WarningVersion };
  
  // 版本
  'GET /api/versions': { req: QueryParams; res: { list: WarningVersion[]; total: number } };
  'GET /api/versions/:id': { req: null; res: WarningVersion & { scores: WarningScore[] } };
  'GET /api/versions/compare/:v1/:v2': { req: null; res: VersionComparison };
  
  // 人工修正
  'GET /api/corrections': { req: QueryParams; res: { list: ManualCorrection[]; total: number } };
  'POST /api/corrections': { req: CreateCorrectionRequest; res: ManualCorrection };
  'GET /api/corrections/effectiveness': { req: null; res: CorrectionEffectiveness };
  
  // 分组统计
  'GET /api/groups': { req: { dimension: string }; res: GroupStats[] };
  
  // 数据导入
  'POST /api/import/upload': { req: FormData; res: ImportPreview };
  'POST /api/import/confirm': { req: ImportConfirm; res: ImportResult };
  
  // 跟进记录
  'GET /api/students/:id/followups': { req: null; res: FollowUpRecord[] };
  'POST /api/followups': { req: FollowUpRecord; res: FollowUpRecord };
}
```

## 5. 服务端架构图

```mermaid
graph TD
    subgraph "路由层 (Routes)"
        R1["auth.routes.ts"]
        R2["students.routes.ts"]
        R3["attendance.routes.ts"]
        R4["warnings.routes.ts"]
        R5["versions.routes.ts"]
        R6["corrections.routes.ts"]
        R7["groups.routes.ts"]
        R8["import.routes.ts"]
        R9["followups.routes.ts"]
    end
    
    subgraph "中间件层 (Middleware)"
        M1["auth.middleware.ts (JWT认证)"]
        M2["validation.middleware.ts (参数校验)"]
        M3["error.middleware.ts (错误处理)"]
    end
    
    subgraph "服务层 (Services)"
        S1["auth.service.ts"]
        S2["student.service.ts"]
        S3["attendance.service.ts"]
        S4["data-clean.service.ts"]
        S5["warning.service.ts"]
        S6["version.service.ts"]
        S7["correction.service.ts"]
        S8["group-stats.service.ts"]
        S9["import.service.ts"]
        S10["followup.service.ts"]
    end
    
    subgraph "AI引擎层 (Python)"
        P1["feature_engine.py - 特征提取"]
        P2["scoring_model.py - 评分算法"]
        P3["attribution.py - 归因分析"]
        P4["model_learning.py - 自学习"]
    end
    
    subgraph "数据层 (Database)"
        D1["SQLite DB"]
        D2["db.ts - 数据库连接"]
        D3["migrations/ - 数据库迁移"]
    end
    
    R1 & R2 & R3 & R4 & R5 & R6 & R7 & R8 & R9 --> M1
    M1 --> M2
    M2 --> S1 & S2 & S3 & S4 & S5 & S6 & S7 & S8 & S9 & S10
    S5 & S6 & S7 -->|调用| P1 & P2 & P3 & P4
    S1 & S2 & S3 & S4 & S5 & S6 & S7 & S8 & S9 & S10 --> D2
    D2 --> D1
    M3 --> R1 & R2 & R3 & R4 & R5 & R6 & R7 & R8 & R9
```

## 6. 数据模型

### 6.1 数据模型ER图

```mermaid
erDiagram
    USER ||--o{ MANUAL_CORRECTION : makes
    USER ||--o{ FOLLOW_UP_RECORD : creates
    STUDENT ||--o{ ATTENDANCE_RECORD : has
    STUDENT ||--o{ PRACTICE_RECORD : has
    STUDENT ||--o{ FEEDBACK_RECORD : has
    STUDENT ||--o{ WARNING_SCORE : has
    STUDENT ||--o{ MANUAL_CORRECTION : has
    STUDENT ||--o{ FOLLOW_UP_RECORD : has
    WARNING_VERSION ||--o{ WARNING_SCORE : contains
    WARNING_VERSION ||--o{ MANUAL_CORRECTION : references
    ATTENDANCE_RECORD ||--o| ATTENDANCE_RECORD : "补录关联"
    FEEDBACK_RECORD ||--o| FEEDBACK_RECORD : "重复关联"
    
    USER {
        string id PK
        string username
        string password_hash
        string role
        string name
        datetime created_at
    }
    
    STUDENT {
        string id PK
        string name
        int age
        string course_type
        string teacher_id FK
        int remaining_lessons
        int total_lessons
        date renewal_date
        text notes
        datetime created_at
        datetime updated_at
    }
    
    ATTENDANCE_RECORD {
        string id PK
        string student_id FK
        date lesson_date
        string status
        string absent_reason
        string makeup_record_id FK
        text notes
        json raw_data
        boolean has_missing_fields
        datetime created_at
        datetime updated_at
    }
    
    PRACTICE_RECORD {
        string id PK
        string student_id FK
        date practice_date
        date submitted_date
        int duration_minutes
        float completion_rate
        text teacher_comment
        boolean is_late
        datetime created_at
    }
    
    FEEDBACK_RECORD {
        string id PK
        string student_id FK
        date feedback_date
        text content
        float sentiment_score
        boolean is_duplicate
        string duplicate_of_id FK
        datetime created_at
    }
    
    WARNING_VERSION {
        string id PK
        string version
        datetime created_at
        date data_start_date
        date data_end_date
        int student_count
        string trigger
        text description
    }
    
    WARNING_SCORE {
        string id PK
        string student_id FK
        string version_id FK
        float overall_score
        string level
        json dimensions
        json attribution
        json change_from_prev
        datetime created_at
    }
    
    MANUAL_CORRECTION {
        string id PK
        string student_id FK
        string version_id FK
        float original_score
        float corrected_score
        string original_level
        string corrected_level
        text reason
        string corrected_by FK
        string renewal_result
        datetime created_at
    }
    
    FOLLOW_UP_RECORD {
        string id PK
        string student_id FK
        date follow_up_date
        string follow_up_by FK
        string method
        text content
        text next_action
        text parent_response
        datetime created_at
    }
```

### 6.2 DDL 语句

```sql
-- 用户表
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'consultant')),
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 学员表
CREATE TABLE students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    course_type TEXT,
    teacher_id TEXT REFERENCES users(id),
    remaining_lessons INTEGER DEFAULT 0,
    total_lessons INTEGER DEFAULT 0,
    renewal_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 上课记录表
CREATE TABLE attendance_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id),
    lesson_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('attended', 'absent', 'late', 'makeup')),
    absent_reason TEXT CHECK (absent_reason IN ('sick', 'leave', 'tired', 'other', NULL)),
    makeup_record_id TEXT REFERENCES attendance_records(id),
    notes TEXT,
    raw_data TEXT, -- JSON格式存储原始数据
    has_missing_fields BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 练习打卡表
CREATE TABLE practice_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id),
    practice_date DATE NOT NULL,
    submitted_date DATE NOT NULL,
    duration_minutes INTEGER DEFAULT 0,
    completion_rate REAL DEFAULT 0,
    teacher_comment TEXT,
    is_late BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 家长反馈表
CREATE TABLE feedback_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id),
    feedback_date DATE NOT NULL,
    content TEXT NOT NULL,
    sentiment_score REAL DEFAULT 0,
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of_id TEXT REFERENCES feedback_records(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 预警版本表
CREATE TABLE warning_versions (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_start_date DATE NOT NULL,
    data_end_date DATE NOT NULL,
    student_count INTEGER NOT NULL,
    trigger TEXT NOT NULL CHECK (trigger IN ('auto', 'manual', 'makeup', 'correction')),
    description TEXT
);

-- 预警评分表
CREATE TABLE warning_scores (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id),
    version_id TEXT NOT NULL REFERENCES warning_versions(id),
    overall_score REAL NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('red', 'yellow', 'green')),
    dimensions TEXT NOT NULL, -- JSON
    attribution TEXT NOT NULL, -- JSON
    change_from_prev TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, version_id)
);

-- 人工修正表
CREATE TABLE manual_corrections (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id),
    version_id TEXT NOT NULL REFERENCES warning_versions(id),
    original_score REAL NOT NULL,
    corrected_score REAL NOT NULL,
    original_level TEXT NOT NULL,
    corrected_level TEXT NOT NULL,
    reason TEXT NOT NULL,
    corrected_by TEXT NOT NULL REFERENCES users(id),
    renewal_result TEXT CHECK (renewal_result IN ('renewed', 'not_renewed', 'pending')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 跟进记录表
CREATE TABLE follow_up_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id),
    follow_up_date DATE NOT NULL,
    follow_up_by TEXT NOT NULL REFERENCES users(id),
    method TEXT NOT NULL CHECK (method IN ('phone', 'wechat', 'in_person', 'other')),
    content TEXT NOT NULL,
    next_action TEXT,
    parent_response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_attendance_student ON attendance_records(student_id);
CREATE INDEX idx_attendance_date ON attendance_records(lesson_date);
CREATE INDEX idx_attendance_status ON attendance_records(status);
CREATE INDEX idx_practice_student ON practice_records(student_id);
CREATE INDEX idx_practice_date ON practice_records(practice_date);
CREATE INDEX idx_feedback_student ON feedback_records(student_id);
CREATE INDEX idx_warning_score_student ON warning_scores(student_id);
CREATE INDEX idx_warning_score_version ON warning_scores(version_id);
CREATE INDEX idx_warning_score_level ON warning_scores(level);
CREATE INDEX idx_correction_student ON manual_corrections(student_id);
CREATE INDEX idx_followup_student ON follow_up_records(student_id);

-- 初始数据 - 默认管理员账号
INSERT INTO users (id, username, password_hash, role, name) VALUES 
('admin-001', 'admin', '$2b$10$default_password_hash_change_me', 'admin', '系统管理员');
```

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
    raw_data TEXT,
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
    dimensions TEXT NOT NULL,
    attribution TEXT NOT NULL,
    change_from_prev TEXT,
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

-- 初始数据 - 默认管理员账号 (密码: admin123)
INSERT INTO users (id, username, password_hash, role, name) VALUES 
('user-admin-001', 'admin', '$2b$10$7Yt4xq1z9w8v7u6t5s4r3q2p1o0n9m8l7k6j5h4g3f2e1d0c9b8a7', 'admin', '系统管理员');

-- 初始教师账号
INSERT INTO users (id, username, password_hash, role, name) VALUES 
('user-teacher-001', 'teacher1', '$2b$10$7Yt4xq1z9w8v7u6t5s4r3q2p1o0n9m8l7k6j5h4g3f2e1d0c9b8a7', 'teacher', '张老师'),
('user-teacher-002', 'teacher2', '$2b$10$7Yt4xq1z9w8v7u6t5s4r3q2p1o0n9m8l7k6j5h4g3f2e1d0c9b8a7', 'teacher', '李老师');

-- 初始课程顾问账号
INSERT INTO users (id, username, password_hash, role, name) VALUES 
('user-consultant-001', 'consultant1', '$2b$10$7Yt4xq1z9w8v7u6t5s4r3q2p1o0n9m8l7k6j5h4g3f2e1d0c9b8a7', 'consultant', '王顾问');

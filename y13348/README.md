# 代码审查误判回放系统

## 项目概述

这是一个用于管理代码审查误判回放的全栈应用系统，旨在解决人工修正记录被覆盖、样本泄漏处理、灰度报告拆分等核心业务问题。

## 核心需求实现

### ✅ 1. 人工修正持久化
- 每条人工修正记录永久保存，包含原始判断和新判断
- 新结果不会覆盖历史修正，旧修正标记为 `is_overridden`
- 支持查看同一条目的完整修正历史

### ✅ 2. 状态保持
- 服务重启后，会话状态、页面快照、处理进度自动恢复
- `page_snapshot` 表保存页面状态，`last_processed_at` 记录最后处理时间
- 排班同事打开页面即可看到前一次处理状态

### ✅ 3. 修正备注要求
- 每条人工修正 **必须** 填写 `reason`（改变了哪些判断）
- 记录 `changed_fields`（哪些字段发生了变化）
- 记录 `original_judgment` 和 `new_judgment` 的完整对比

### ✅ 4. 样本泄漏处理
- 检测到样本泄漏时，系统自动暂停处理（状态变为 `waiting_confirm`）
- 先给出疑似原因、影响范围、受影响样本列表
- 必须经过「检测 → 确认原因 → 处理解决」三阶段流程
- 所有泄漏处理完成前，无法标记会话完成

### ✅ 5. 灰度报告拆分
- 报告自动拆分为三个独立组件：
  - 📊 **样本变化**：训练/测试集样本统计变化
  - 🎚️ **阈值变化**：判定阈值配置变化
  - ✏️ **人工改判**：所有人工修正记录
- 支持单独查看每个组件，支持按组件导出

### ✅ 6. 数据一致性保证
- 所有操作自动生成 `SessionComment` 记录（系统备注）
- 重跑时可选择是否保留历史修正
- 历史备注、当前状态、页面摘要三者互相关联

### ✅ 7. 操作指引（排班同事友好）
系统预置5条操作指引，分别显示在界面对应位置：

| 位置 | 指引 | 说明 |
|------|------|------|
| 📁 侧边栏顶部 | 材料上传区 | 告知哪里放材料 |
| ⚠️ 主内容顶部 | 异常查看区 | 告知哪里看异常 |
| ✏️ 主内容中间 | 人工修正区 | 操作说明 |
| 📤 侧边栏底部 | 报告导出区 | 告知哪里重新导出 |
| 📊 主内容右侧 | 状态跟踪区 | 状态查看说明 |

## 技术架构

### 后端
- **框架**: FastAPI 0.104.1
- **数据库**: PostgreSQL
- **ORM**: SQLAlchemy 2.0
- **认证**: JWT (python-jose)
- **密码**: bcrypt

### 前端
- **框架**: React 18
- **UI组件**: Ant Design 5
- **路由**: React Router 6
- **HTTP**: Axios
- **日期**: Day.js

## 项目结构

```
y13348/
├── backend/                    # 后端服务
│   ├── app/
│   │   ├── main.py            # FastAPI 入口
│   │   ├── config.py          # 配置
│   │   ├── database.py        # 数据库连接
│   │   ├── models.py          # 数据模型
│   │   ├── schemas.py         # Pydantic 模型
│   │   ├── auth.py            # 认证逻辑
│   │   ├── init_data.py       # 初始化数据
│   │   └── routers/           # API 路由
│   │       ├── auth.py        # 认证接口
│   │       ├── sessions.py    # 审查会话接口
│   │       ├── corrections.py # 人工修正接口
│   │       ├── leaks.py       # 样本泄漏接口
│   │       ├── reports.py     # 灰度报告接口
│   │       ├── guides.py      # 操作指引接口
│   │       ├── comments.py    # 备注评论接口
│   │       └── snapshots.py   # 页面快照接口
│   ├── requirements.txt
│   ├── .env.example
│   └── start.sh
└── frontend/                   # 前端应用
    ├── src/
    │   ├── pages/
    │   │   ├── Login.js
    │   │   ├── SessionList.js
    │   │   ├── SessionDetail.js
    │   │   ├── ReportList.js
    │   │   └── GuideManagement.js
    │   ├── components/
    │   │   └── MainLayout.js
    │   ├── services/
    │   │   └── api.js
    │   ├── App.js
    │   ├── index.js
    │   └── index.css
    ├── package.json
    └── public/
```

## 数据库设计

### 核心表结构

| 表名 | 说明 | 关键设计 |
|------|------|----------|
| `users` | 用户表 | 三种角色：admin/reviewer/scheduler |
| `review_sessions` | 审查会话 | 状态机：pending → processing → waiting_confirm → completed |
| `manual_corrections` | 人工修正 | `is_overridden` 标记覆盖，保留历史 |
| `sample_leak_alerts` | 样本泄漏 | 状态：detected → confirmed → resolved |
| `gray_reports` + `report_components` | 灰度报告 | 一对多，三种组件类型 |
| `session_comments` | 备注记录 | 区分 system/alert/note 三种类型 |
| `page_snapshots` | 页面快照 | 保存页面状态，支持恢复 |
| `operation_guides` | 操作指引 | 按 position_hint 显示在不同位置 |

## 快速开始

### 环境要求
- Python 3.9+
- Node.js 16+
- PostgreSQL 12+

### 数据库准备
```sql
CREATE DATABASE review_replay;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE review_replay TO postgres;
```

### 后端启动
```bash
cd backend
cp .env.example .env
chmod +x start.sh
./start.sh
```

或者手动执行：
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

后端启动后访问：http://localhost:8000/docs 查看 API 文档

### 前端启动
```bash
cd frontend
npm install
npm start
```

前端启动后访问：http://localhost:3000

### 测试账号

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| `admin` | `admin123` | 管理员 | 系统管理、用户管理 |
| `xiaomeng` | `123456` | 评测同事 | 小孟，处理人工修正 |
| `scheduler` | `123456` | 排班同事 | 查看状态、导出报告 |

## API 接口概览

### 认证
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户
- `GET /api/auth/users` - 用户列表（管理员）
- `POST /api/auth/users` - 创建用户（管理员）

### 审查会话
- `GET /api/sessions` - 会话列表
- `POST /api/sessions` - 创建会话
- `GET /api/sessions/{id}` - 会话详情
- `PUT /api/sessions/{id}` - 更新会话
- `POST /api/sessions/{id}/process` - 开始处理
- `POST /api/sessions/{id}/complete` - 标记完成
- `POST /api/sessions/{id}/rerun` - 重跑会话

### 人工修正
- `GET /api/corrections` - 修正列表
- `POST /api/corrections` - 添加修正
- `DELETE /api/corrections/{id}` - 覆盖修正
- `GET /api/corrections/session/{id}/history` - 修正历史

### 样本泄漏
- `GET /api/leaks` - 泄漏警告列表
- `POST /api/leaks?session_id={id}` - 上报泄漏
- `POST /api/leaks/{id}/confirm` - 确认原因
- `POST /api/leaks/{id}/resolve` - 处理解决
- `POST /api/leaks/{id}/dismiss` - 驳回警告
- `GET /api/leaks/session/{id}/impact-analysis` - 影响分析

### 灰度报告
- `GET /api/reports` - 报告列表
- `POST /api/reports` - 创建报告
- `POST /api/reports/generate/{session_id}` - 自动生成报告
- `GET /api/reports/{id}` - 报告详情
- `GET /api/reports/{id}/component/{type}` - 查看报告组件
- `POST /api/reports/{id}/export` - 导出报告

### 其他
- `GET /api/guides` - 操作指引列表
- `GET /api/comments/session/{id}` - 会话备注
- `GET /api/snapshots/session/{id}/latest` - 最新页面快照

## 业务流程

### 正常流程
```
创建会话 → 开始处理 → 人工修正 → 生成报告 → 标记完成
    ↓           ↓
  保存快照    检查泄漏
```

### 样本泄漏流程
```
检测到泄漏 → 状态变为 waiting_confirm → 确认原因 →
处理解决 → 所有泄漏处理完毕 → 继续处理
```

### 重跑流程
```
触发重跑 → 选择是否保留修正 → 生成系统备注 →
重置状态 → 重新开始处理
```

## 核心设计亮点

### 1. 人工修正不被覆盖
- 新修正不会删除旧修正，只是标记旧的为 `is_overridden = True`
- 同一条目 `target_item_id` 的修正历史完整保留
- 支持 `GET /history` 查看完整变更轨迹

### 2. 样本泄漏防误操作
- 处理会话时自动检查是否有未解决的泄漏
- 有泄漏时自动暂停，状态变为 `waiting_confirm`
- 必须按「检测 → 确认 → 解决」流程处理
- 所有泄漏未解决前，无法完成会话

### 3. 灰度报告三组件拆分
- 报告生成时自动计算三类变更
- 每个组件独立存储，可单独查询和导出
- 支持按组件筛选导出内容

### 4. 操作指引位置化
- 指引按 `position_hint` 分类
- 前端根据位置自动渲染到对应区域
- 排班同事无需询问即可知道各区域功能

### 5. 状态可追溯
- 所有重要操作自动生成系统备注
- 包含操作人、时间、操作内容
- 便于审计和交接

## 权限矩阵

| 功能 | 管理员 | 评测同事 | 排班同事 |
|------|--------|----------|----------|
| 创建会话 | ✅ | ✅ | ❌ |
| 处理会话 | ✅ | ✅ | ❌ |
| 人工修正 | ✅ | ✅ | ❌ |
| 上报/处理泄漏 | ✅ | ✅ | ❌ |
| 生成报告 | ✅ | ✅ | ❌ |
| 查看会话列表 | ✅ | ✅ | ✅ |
| 查看会话详情 | ✅ | ✅ | ✅ |
| 查看报告 | ✅ | ✅ | ✅ |
| 导出报告 | ✅ | ✅ | ✅ |
| 添加备注 | ✅ | ✅ | ✅ |
| 管理操作指引 | ✅ | ❌ | ❌ |
| 用户管理 | ✅ | ❌ | ❌ |

## 扩展建议

1. **Excel导出**: 安装 `openpyxl` 库，完善 `/export` 接口
2. **邮件通知**: 泄漏检测或状态变更时发送邮件通知
3. **WebSocket**: 实时推送处理进度和泄漏警告
4. **数据可视化**: 集成 ECharts 展示修正趋势和报告图表
5. **审计日志**: 记录所有操作的完整审计日志

## 问题反馈

如有问题，请联系开发团队。

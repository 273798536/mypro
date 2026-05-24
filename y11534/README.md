# 银行网点排班权限追责台账 API

## 系统概述

本系统是一个完整的银行网点排班权限追责台账管理系统，支持柜员排班、请假单、业务量预测和供应商对账单的全生命周期管理。

## 核心功能

### 1. 数据接入模块
- 柜员排班管理
- 请假单管理
- 业务量预测管理
- 供应商对账单管理

### 2. 工作流引擎
- 草稿 → 提交 → 驳回/二次确认 → 审批 → 归档
- 完整的操作轨迹记录

### 3. 数据质量管理
- 脏记录自动识别（缺字段、跨日、改名、金额/数量冲突）
- 保留原始内容和处理意见
- 修正后重新汇总

### 4. 权限控制系统
| 角色 | 权限 |
|------|------|
| 录入员 (data_entry) | 创建草稿、修改草稿、提交审批 |
| 复核员 (reviewer) | 审批、驳回、二次确认、处理脏记录 |
| 主管 (supervisor) | 全部权限、可修改任何状态记录 |
| 只读查看 (view_only) | 查看列表、详情、历史、行长视图 |

### 5. 重复数据处理
- 支持忽略策略：重复数据不处理，汇总数字不变
- 支持覆盖策略：更新已有记录，历史中注明覆盖

### 6. 审计与导出
- 完整的操作审计日志
- 脱敏Excel导出（敏感字段自动掩码）
- 行长专属视图

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 初始化数据库
```bash
npm run init-db
```

### 3. 启动服务
```bash
npm start
# 或开发模式
npm run dev
```

服务地址: http://localhost:3000

## 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 主管 |
| entry1 | entry123 | 录入员 |
| reviewer1 | review123 | 复核员 |
| viewer1 | view123 | 支行行长(只读) |

## API 接口

### 认证接口
```
POST /api/auth/login    - 登录获取token
POST /api/auth/logout   - 登出
GET  /api/auth/me       - 获取当前用户信息
```

### 排班管理
```
GET    /api/schedules              - 排班列表
GET    /api/schedules/:id          - 排班详情
POST   /api/schedules              - 创建单条排班
PUT    /api/schedules/:id          - 修改排班
POST   /api/schedules/batch        - 批量导入排班
POST   /api/schedules/:id/action   - 状态操作 (submit/approve/reject/second_confirm)
GET    /api/schedules/:id/history  - 操作历史
GET    /api/schedules/dirty/list   - 脏记录列表
POST   /api/schedules/export       - 导出Excel
```

### 请假单管理
```
GET    /api/leaves              - 请假单列表
POST   /api/leaves/batch        - 批量导入请假单
... 同上模式
```

### 业务量预测
```
GET    /api/forecasts           - 预测列表
POST   /api/forecasts/batch     - 批量导入预测
... 同上模式
```

### 供应商对账单
```
GET    /api/bills               - 对账单列表
POST   /api/bills/batch         - 批量导入对账单
... 同上模式
```

### 行长视图
```
GET    /api/manager/overview       - 总览统计
GET    /api/manager/changes/recent - 最近变更
GET    /api/manager/role-distribution - 角色分布
GET    /api/manager/branch/stats   - 分行统计
GET    /api/manager/conflicts/list - 冲突记录列表
```

### 审计日志
```
GET    /api/audit/logs         - 审计日志列表
GET    /api/audit/stats        - 审计统计
```

## 批量导入示例

### 请求示例 (柜员排班)
```bash
curl -X POST http://localhost:3000/api/schedules/batch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {
        "teller_id": "T001",
        "teller_name": "张三",
        "branch": "朝阳支行",
        "schedule_date": "2026-05-25",
        "shift_type": "早班",
        "start_time": "08:00",
        "end_time": "16:00",
        "window_no": "W1"
      }
    ],
    "duplicateStrategy": "ignore"
  }'
```

### 重复策略说明
- `ignore`: 忽略重复记录，汇总数不重复计算
- `overwrite`: 覆盖已有记录，在历史中注明覆盖

## 脏记录类型

| 类型 | 说明 |
|------|------|
| missing_fields | 缺少必填字段 |
| cross_date | 跨日异常 |
| name_changed | 姓名不一致 |
| amount_conflict | 金额冲突 |
| quantity_conflict | 数量冲突 |

## 状态流转

```
草稿 (draft)
    ↓ submit
已提交 (submitted)
    ↓ approve / ↓ reject / ↓ second_confirm
已批准 (approved) / 已驳回 (rejected) / 二次确认 (second_confirm)
                                                     ↓ approve / ↓ reject
                                                  已批准 / 已驳回
```

## 项目结构

```
├── src/
│   ├── app.js                 # 应用入口
│   ├── config/                # 配置文件
│   │   └── index.js
│   ├── database/              # 数据库相关
│   │   ├── connection.js
│   │   └── init.js
│   ├── middleware/            # 中间件
│   │   ├── auth.js
│   │   └── permission.js
│   ├── services/              # 业务服务
│   │   ├── auditService.js
│   │   ├── workflowService.js
│   │   ├── dataQualityService.js
│   │   ├── batchService.js
│   │   └── exportService.js
│   └── routes/                # 路由
│       ├── auth.js
│       ├── baseRoute.js
│       ├── managerView.js
│       └── audit.js
├── tests/                     # 测试数据
├── data/                      # 数据库文件 (自动生成)
└── package.json
```

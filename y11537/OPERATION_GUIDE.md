# 企业培训签到重试补偿队列系统 - 操作指南

## 一、系统启动

### 1.1 环境要求
- PostgreSQL 14+
- Redis 6+
- Node.js 18+

### 1.2 启动步骤

```bash
# 1. 启动 PostgreSQL 和 Redis
# 2. 创建数据库
createdb training_signin

# 3. 数据库迁移
cd backend
npm run db:migrate

# 4. 初始化测试用户
npm run db:seed

# 5. 启动后端服务 (终端1)
npm run dev:backend

# 6. 启动前端服务 (终端2)
npm run dev:frontend
```

### 1.3 测试账号
| 用户名 | 密码 | 角色 | 权限说明 |
|--------|------|------|----------|
| admin | 123456 | 主管 | 全部操作权限 |
| reviewer | 123456 | 复核 | 审核、人工接管、重试 |
| entry | 123456 | 录入 | 数据提交、导出 |
| viewer | 123456 | 只读 | 仅查看和导出 |

---

## 二、五大数据源接入样例

### 2.1 报名表提交

**API**: `POST /api/data/registration`

**样例数据**:
```json
{
  "registrationNo": "REG20240524001",
  "employeeId": "E001",
  "employeeName": "张三",
  "department": "技术部",
  "trainingId": "TRAIN001",
  "trainingName": "2024年度安全培训",
  "trainingDate": "2024-05-24",
  "trainingLocation": "A栋3楼会议室",
  "trainer": "李老师",
  "source": "registration_form",
  "batchNo": "BATCH001",
  "remark": "年度必修课程"
}
```

**成功响应**:
```json
{
  "success": true,
  "message": "报名表提交成功",
  "data": { "id": 1, "registrationNo": "REG20240524001" }
}
```

---

### 2.2 签到二维码提交

**API**: `POST
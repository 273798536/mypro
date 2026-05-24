# 水务抢修材料重试补偿队列服务

## 功能特性

### 核心功能
- ✅ **持久化队列**: 所有队列数据存储在SQLite，重启不丢失
- ✅ **限次重试**: 默认5次重试，失败后进入死信队列
- ✅ **人工接管**: 支持标记为人工处理，记录处理意见
- ✅ **补偿入账**: 自动创建补偿记录，支持复核验证
- ✅ **完整追踪**: 每条记录可追溯完整操作历史
- ✅ **报表导出**: 支持CSV导出，坏数据不进汇总

### 权限系统（4种角色）
| 角色 | 权限说明 |
|------|----------|
| **录入员 (data_entry)** | 创建派工单、提交队列、上传照片，字段受限 |
| **复核员 (reviewer)** | 复核补偿、查看失败清单、人工处理，字段较全 |
| **主管 (supervisor)** | 死信恢复、关闭任务、查看审计日志，全部字段 |
| **只读 (read_only)** | 仅查看基础信息，无操作权限 |

### 站点负责人重点关注
- **可重试分类统计**: `/api/queue/classification` - 按分类展示可重试、死信、人工处理数量
- **失败清单详情**: `/api/queue/failed` - 带派工单信息和失败原因
- **历史追踪**: `/api/queue/item/:id/history` - 每条记录的完整状态流转

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
```

服务地址: http://localhost:3000

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 主管 | admin | admin123 |
| 复核 | reviewer1 | review123 |
| 录入 | entry1 | entry123 |
| 只读 | viewer1 | view123 |

## 快速测试流程

### 方式一：使用测试脚本
```bash
chmod +x test_flow.sh
./test_flow.sh
```

### 方式二：手动执行curl命令

#### 1. 登录获取Token
```bash
# 主管登录
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo $TOKEN
```

#### 2. 创建派工单
```bash
WORK_ORDER=$(curl -s -X POST http://localhost:3000/api/workorders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "order_no": "WO-TEST-001",
    "repair_type": "水管爆裂抢修",
    "site_address": "东区大道123号",
    "old_caliber": "DN100",
    "new_caliber": "DN150",
    "shift_record": "夜班"
  }')
echo $WORK_ORDER
WORK_ORDER_ID=$(echo $WORK_ORDER | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
```

#### 3. 提交补偿任务到队列
```bash
curl -s -X POST http://localhost:3000/api/queue/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "work_order_id": "'$WORK_ORDER_ID'",
    "item_type": "material_compensation",
    "payload": {
      "workOrderId": "'$WORK_ORDER_ID'",
      "materials": [
        {"material_name": "DN150闸阀", "quantity": 2, "unit_price": 850.00}
      ]
    }
  }'
```

#### 4. 查看队列状态
```bash
curl -s http://localhost:3000/api/queue/status \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

#### 5. 查看重试分类统计（重点）
```bash
curl -s http://localhost:3000/api/queue/classification \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

#### 6. 查看失败清单
```bash
curl -s http://localhost:3000/api/queue/failed \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

#### 7. 查看补偿报表
```bash
curl -s "http://localhost:3000/api/compensation/report?include_unverified=true" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

#### 8. 导出CSV报表
```bash
curl -s "http://localhost:3000/api/compensation/export" \
  -H "Authorization: Bearer $TOKEN" -o report.csv
```

#### 9. 查看历史追踪
```bash
# 先获取队列项ID
QUEUE_ITEMS=$(curl -s "http://localhost:3000/api/queue/items/completed?limit=1" \
  -H "Authorization: Bearer $TOKEN")
QUEUE_ITEM_ID=$(echo $QUEUE_ITEMS | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# 查看历史
curl -s "http://localhost:3000/api/queue/item/$QUEUE_ITEM_ID/history" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

## 验证重启持久化

```bash
# 1. 停止服务 (Ctrl+C)
# 2. 重新启动
npm start

# 3. 再次查询队列状态和历史，数据应该都还在
curl -s http://localhost:3000/api/queue/status \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

## API 端点总览

### 认证
- `POST /api/auth/login` - 登录

### 派工单
- `POST /api/workorders` - 创建派工单
- `GET /api/workorders` - 查询派工单列表
- `GET /api/workorders/:id` - 查询单个派工单
- `PUT /api/workorders/:id` - 更新派工单
- `POST /api/workorders/:id/inventory` - 添加库存记录
- `GET /api/workorders/:id/inventory` - 查询库存记录

### 队列
- `POST /api/queue/submit` - 提交任务到队列
- `GET /api/queue/status` - 队列状态统计
- `GET /api/queue/classification` - 重试分类统计
- `GET /api/queue/failed` - 失败清单
- `GET /api/queue/items/:status` - 按状态查询队列项
- `GET /api/queue/item/:id/history` - 队列项历史
- `POST /api/queue/item/:id/manual` - 人工接管
- `POST /api/queue/item/:id/retry` - 死信恢复重试
- `POST /api/queue/item/:id/close` - 关闭任务
- `POST /api/queue/item/:id/process` - 手动处理

### 补偿
- `GET /api/compensation/report` - 补偿报表
- `GET /api/compensation/export` - 导出CSV
- `POST /api/compensation/:id/verify` - 复核补偿
- `GET /api/compensation/workorder/:id` - 按派工单查询

### 照片
- `POST /api/photos/:workOrderId` - 上传现场照片
- `GET /api/photos/:workOrderId` - 查询照片列表

### 审计
- `GET /api/audit` - 审计日志
- `GET /api/audit/users` - 用户列表

## 项目结构

```
├── src/
│   ├── index.js              # 主入口
│   ├── config/
│   │   └── config.js         # 配置文件
│   ├── database/
│   │   └── db.js             # 数据库连接
│   ├── middleware/
│   │   └── auth.js           # 认证和权限中间件
│   ├── services/
│   │   ├── queueService.js   # 队列服务
│   │   └── compensationService.js # 补偿服务
│   ├── routes/
│   │   ├── auth.js
│   │   ├── workOrders.js
│   │   ├── queue.js
│   │   ├── compensation.js
│   │   ├── photos.js
│   │   └── audit.js
│   └── scripts/
│       └── initDB.js         # 数据库初始化
├── data/
│   └── repair_queue.db       # SQLite数据库
├── uploads/
│   └── photos/               # 照片上传目录
├── package.json
├── test_flow.sh              # 测试脚本
└── README.md
```

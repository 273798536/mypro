# 医疗器械巡检验收回放链路服务

一套完整的医疗器械巡检、校准、维修全链路管理系统，支持数据导入、状态联动、权限控制、审计追踪和脚本回放。

## 功能特性

### 🔗 状态联动引擎
- 校准证书过期自动检测，设备状态自动更新
- 设备停用/启用状态管理
- 所有状态变更记录时间、操作者和原因

### 🔐 四级权限体系
| 角色 | 权限 |
|------|------|
| **录入员** (data_entry) | 创建、编辑、提交记录 |
| **复核员** (reviewer) | 查看、复核、退回记录 |
| **主管** (supervisor) | 全部操作权限 + 导出 + 设备管理 |
| **只读** (read_only) | 仅查看权限，敏感字段隐藏 |

### 📊 数据管理
- 巡检记录导入/导出
- 校准证书管理
- 维修报价审批
- 二次确认单关联
- 导入失败数据追踪（可查看失败原因）

### 🎯 审计追踪
- 所有状态变更完整记录
- 报表数字可追溯到单条记录
- 失败数据单独列表展示

### 🛠️ CLI 与 API
- 完整的 REST API 接口
- 强大的 CLI 命令行工具
- 脚本化回放支持

## 快速开始

### 安装依赖

```bash
npm install
```

### 构建项目

```bash
npm run build
```

### 生成测试数据

```bash
# 生成所有测试数据
npm run cli -- mock --all

# 或单独生成
npm run cli -- mock --users
npm run cli -- mock --devices 20
npm run cli -- mock --inspections 50
npm run cli -- mock --certificates 30
```

### 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务启动后访问:
- 健康检查: http://localhost:3000/health
- API 地址: http://localhost:3000/api

## CLI 命令使用

### 查看仪表盘

```bash
npm run cli -- dashboard
```

### 状态联动检查

```bash
# 全量检查
npm run cli -- status-check

# 检查指定设备
npm run cli -- status-check --device ECG-0001
```

### 数据导入

```bash
# 导入巡检记录
npm run cli -- import inspection ./data/inspections.csv

# 导入校准证书
npm run cli -- import calibration ./data/certificates.csv

# 导入维修报价
npm run cli -- import maintenance_quote ./data/quotes.csv

# 导入二次确认单
npm run cli -- import secondary_confirm ./data/confirms.csv
```

### 对账检查

```bash
npm run cli -- reconcile
```

### 数据导出

```bash
# 导出设备状态报表
npm run cli -- export devices ./reports/devices.csv

# 导出巡检记录
npm run cli -- export inspections ./reports/inspections.csv

# 导出校准证书
npm run cli -- export certificates ./reports/certificates.csv

# 导出对账报告
npm run cli -- export reconciliation ./reports/reconciliation.csv
```

### 发送 API 请求

```bash
# 获取设备列表（以 admin 身份）
npm run cli -- request GET /devices --user admin

# 创建巡检记录
npm run cli -- request POST /inspections \
  --user entry01 \
  --data '{"recordNo":"INSP-000001","deviceCode":"ECG-0001","inspector":"张三","inspectionDate":"2024-01-15","inspectionItems":{},"conclusion":"合格"}'
```

### 脚本回放

创建回放脚本 `replay.json`:

```json
[
  {
    "type": "http",
    "description": "获取设备列表",
    "content": {"method": "GET", "url": "/devices"},
    "verbose": true
  },
  {
    "type": "http",
    "description": "创建巡检记录",
    "content": {
      "method": "POST",
      "url": "/inspections",
      "data": {
        "recordNo": "INSP-TEST-001",
        "deviceCode": "ECG-0001",
        "inspector": "测试员",
        "inspectionDate": "2024-01-20",
        "inspectionItems": {"外观": "正常", "功能": "良好"},
        "conclusion": "合格"
      }
    },
    "delay": 500
  },
  {
    "type": "http",
    "description": "获取仪表盘统计",
    "content": {"method": "GET", "url": "/dashboard"},
    "verbose": true
  }
]
```

执行回放:

```bash
npm run cli -- replay ./replay.json --user admin
```

## API 接口文档

### 身份认证

所有请求需要在 Header 中携带用户身份:
```
X-User: admin
```

预设用户:
- `admin` - 主管
- `reviewer01` - 复核员
- `entry01` - 录入员
- `viewer01` - 只读

### 设备管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/devices` | 获取设备列表 |
| GET | `/api/devices/:code` | 获取设备详情 |
| PUT | `/api/devices/:code/status` | 更新设备状态 |

### 巡检记录

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/inspections` | 获取巡检记录 |
| POST | `/api/inspections` | 创建巡检记录 |
| PUT | `/api/inspections/:id/status` | 更新记录状态 |

### 校准证书

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/certificates` | 获取校准证书 |
| POST | `/api/certificates` | 创建校准证书 |

### 维修报价

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/quotes` | 获取维修报价 |
| POST | `/api/quotes` | 创建维修报价 |

### 二次确认

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/confirms` | 获取二次确认单 |
| POST | `/api/confirms` | 创建二次确认单 |

### 报表与统计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard` | 仪表盘统计 |
| GET | `/api/reconciliation` | 设备对账 |
| POST | `/api/status-check` | 执行状态检查 |

### 导入导出

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/import` | 数据导入 |
| GET | `/api/import-failures` | 获取导入失败记录 |
| GET | `/api/export/:type` | 导出报表 |

### 审计与回放

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/status-logs` | 状态变更日志 |
| POST | `/api/replay/sessions` | 创建回放会话 |
| GET | `/api/replay/sessions` | 获取回放会话列表 |
| POST | `/api/replay/sessions/:id/execute` | 执行回放会话 |

## 退出码说明

| 退出码 | 说明 |
|--------|------|
| 0 | 成功 |
| 1 | 执行错误 |
| 2 | 对账发现问题 |
| 3 | HTTP 请求失败 |
| 4 | 回放命令失败 |

## 项目结构

```
src/
├── models/           # 数据模型
├── types/            # TypeScript 类型定义
├── permissions/      # 权限控制系统
├── db/               # 数据库连接与服务
├── engine/           # 状态联动引擎
├── imports/          # 数据导入与测试数据生成
├── reports/          # 报表与对账
├── http/             # HTTP 客户端
├── server/           # API 服务
├── cli/              # 命令行工具
└── utils/            # 工具函数
```

## 数据库

使用 SQLite 数据库，文件位于 `./data/medical_device.db`

## 技术栈

- **TypeScript** - 类型安全
- **Express** - Web 框架
- **TypeORM** - ORM 框架
- **SQLite** - 嵌入式数据库
- **Yargs** - CLI 框架
- **Axios** - HTTP 客户端
- **Day.js** - 日期处理
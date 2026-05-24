# 法务合同履约权限追责台账API

## 系统概述

针对返工扣款争议场景，从合同PDF、付款节点、验收邮件和历史压缩包中还原证据链，追踪补充协议变更后的处理流程。

## 核心特性

### 数据模型
- **合同主数据**: 合同基本信息、版本、状态、冻结标记
- **付款节点**: 多版本管理，保留原始行号和原始值
- **验收邮件**: 邮件内容、验证状态、来源追踪
- **补充协议**: 变更内容对比、应用状态
- **导入源**: 文件哈希、解析统计、错误记录
- **变更记录**: 完整证据链，新旧值对比
- **审计日志**: 所有操作留痕，只读访问也记录
- **人工改判**: 保留原始证据和改判理由

### 状态机
```
草稿 → 已提交 → 已驳回 → 草稿
            ↓        ↓
         二次确认  重新提交
            ↓
        已冻结/已归档
```

### 边界场景覆盖
- ✅ 重复提交检测（合同号唯一约束）
- ✅ 撤回后再提交流程
- ✅ 部分失败导入（成功/失败分别统计）
- ✅ 人工改判（保留原始证据）
- ✅ 导出前冻结（冻结后无法修改）
- ✅ 异常不吞噬（详细错误信息）

### 角色视图
- **合同管理员**: 草稿、驳回状态合同
- **法务人员**: 已提交待审核合同
- **财务人员**: 已确认、冻结合同
- **业务负责人**: 全局视图 + 重点变更
- **审计人员**: 只读审计访问

## 快速开始

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 初始化数据库和样例数据
```bash
python init_db.py
```

### 3. 启动服务
```bash
uvicorn app.main:app --reload
```

### 4. 访问API文档
```
http://localhost:8000/docs
```

### 5. 运行边界场景测试
```bash
pip install requests
python test_scenarios.py
```

## 核心API接口

### 合同管理
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/contracts` | 创建合同 |
| GET | `/api/v1/contracts` | 合同列表 |
| GET | `/api/v1/contracts/{id}` | 合同详情 |
| PUT | `/api/v1/contracts/{id}` | 更新合同 |
| POST | `/api/v1/contracts/{id}/status` | 状态流转 |
| POST | `/api/v1/contracts/{id}/freeze` | 冻结合同 |

### 付款节点
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/contracts/{id}/payment-nodes` | 添加节点 |
| GET | `/api/v1/contracts/{id}/payment-nodes` | 节点列表 |
| PUT | `/api/v1/payment-nodes/{id}` | 更新节点（版本递增） |

### 证据链管理
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/import` | 导入文件（PDF/邮件/压缩包） |
| GET | `/api/v1/import-sources` | 导入源列表 |
| POST | `/api/v1/manual-judgments` | 人工改判 |
| GET | `/api/v1/contracts/{id}/changes` | 变更记录 |
| GET | `/api/v1/contracts/{id}/audit-logs` | 审计日志 |

### 导出与分析
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/export` | 脱敏导出 |
| GET | `/api/v1/role-view/{role}` | 角色视图 |
| GET | `/api/v1/contracts/{id}/change-analysis` | 变更分析 |

## 样例数据说明

初始化脚本会创建3份典型合同：

1. **HT-2024-001 XX系统开发服务合同**
   - 状态：草稿
   - 4个付款节点
   - 1封验收邮件

2. **HT-2024-002 YY平台运维服务合同**
   - 状态：已提交
   - 存在节点变更争议（补充协议变更未同步）
   - 1份未生效补充协议

3. **HT-2024-003 ZZ硬件采购合同**
   - 状态：已冻结
   - 模拟审计导出前场景

## 证据链设计原则

### 原始证据不覆盖
- 所有导入数据保留 `original_line_no`（原始行号）
- 所有导入数据保留 `original_value`（原始值）
- 所有来源关联 `source_file_id`（源文件ID）

### 变更完整追踪
- 付款节点更新创建新版本（旧版本保留）
- 变更记录保存 `old_value` / `new_value`
- 人工改判标记 `is_manual_revision = True`

### 审计不可篡改
- 所有操作写入 `audit_logs`
- 只读访问标记 `is_readonly_access = True`
- 记录操作人角色 `operator_role`

## 目录结构

```
.
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI入口
│   ├── config.py         # 配置
│   ├── database.py       # 数据库连接
│   ├── models.py         # 数据模型
│   ├── schemas.py        # Pydantic模式
│   ├── services.py       # 业务逻辑
│   └── routers.py        # API路由
├── init_db.py            # 初始化脚本
├── test_scenarios.py     # 边界场景测试
├── requirements.txt      # 依赖
└── README.md             # 说明文档
```

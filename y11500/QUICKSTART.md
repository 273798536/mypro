# 售后备件领用异常回执状态机 API - 快速开始

## 🚀 三步启动项目

### 1. 安装依赖
```bash
npm install
```

### 2. 初始化数据库和用户
```bash
npm run seed
```

### 3. 启动服务
```bash
npm run start:dev
```

## 📋 验收测试

启动服务后，在另一个终端运行：
```bash
npm run test:acceptance
```

## 🔑 默认用户

运行 `npm run seed` 后会创建以下用户，记录它们的 ID 用于 API 调用：

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| operator1 | 123456 | 录入员 | 创建批次、提交复核 |
| reviewer1 | 123456 | 复核员 | 复核通过/驳回 |
| manager1 | 123456 | 主管 | 冻结、结算、撤回归档 |
| viewer1 | 123456 | 只读查看 | 只能查看 |

## 🌐 API 文档

启动服务后访问: http://localhost:3000/api

在 Swagger UI 中点击 "Authorize"，输入用户 ID (从 seed 输出中获取) 作为 `x-user-id` 的值。

## 📊 测试场景说明

验收测试包含以下场景：

1. **正常链路测试**：创建 → 提交复核 → 复核通过 → 冻结 → 解冻 → 结算 → 归档
2. **重复提交测试**：验证状态机防止非法状态转换
3. **坏数据测试**：缺字段、跨日、改名、金额/数量冲突的识别和处理
4. **服务经理视图**：冻结前后状态、人工理由、统计数据
5. **权限控制**：不同角色的可见字段和可操作动作
6. **重启后历史查询**：验证数据持久化

## 🛠️ 核心功能模块

### 状态流转
```
草稿(DRAFT) → 待复核(PENDING_REVIEW) → 已通过(APPROVED) → 结算(SETTLED) → 归档(ARCHIVED)
                        ↓                    ↓
                     驳回(REJECTED)        冻结(FROZEN)
                        ↓
                   撤销(CANCELLED)
```

### 脏记录类型
- `missing_field` - 缺字段
- `cross_day` - 跨日
- `name_changed` - 改名
- `amount_conflict` - 金额冲突
- `quantity_conflict` - 数量冲突

### API 端点示例

```bash
# 创建批次 (用录入员 ID)
curl -X POST http://localhost:3000/batches \
  -H "x-user-id: <operator-id>" \
  -H "Content-Type: application/json" \
  -d '{"description":"测试批次"}'

# 获取经理视图 (用主管 ID)
curl -H "x-user-id: <manager-id>" \
  http://localhost:3000/export/manager-view

# 导出 CSV
curl -H "x-user-id: <manager-id>" \
  http://localhost:3000/export/csv -o batches.csv
```

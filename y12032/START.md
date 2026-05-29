# 数据标注计件工资系统 - 启动说明

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 启动服务（自动初始化数据库）
npm start

# 3. 新开终端，插入演示数据
npm run demo

# 4. 运行API测试样例
chmod +x test-curls.sh
./test-curls.sh
```

## 系统架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  标注员管理  │────▶│  任务记录   │────▶│  质检结果   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  补贴记录   │     │  扣罚记录   │     │  返工单     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
                    ┌─────────────┐
                    │ 工资汇总计算 │
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  报表导出   │
                    └─────────────┘
```

## 核心业务流程

1. **数据录入主线**: 标注员 → 任务记录 → 质检结果 → 返工单（补录）
2. **工资计算主线**: 计件数量 × 单价 + 补贴 - 扣罚 = 实发工资
3. **质检追溯主线**: 任务号 → 追溯路径 → 待确认分支 → 下一步联系人

## 关键API端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/annotators` | 标注员列表 |
| GET | `/api/tasks` | 任务记录列表 |
| GET | `/api/inspections/pending` | 待确认质检 |
| GET | `/api/reworks/task/:id/changes` | 返工变更记录 |
| GET | `/api/trace/task/:task_no` | 质检追溯（含待确认分支） |
| GET | `/api/trace/annotator/:emp_id/trace` | 标注员追溯 |
| POST | `/api/salary/calculate` | 计算工资 |
| GET | `/api/salary/summaries` | 工资汇总 |
| GET | `/api/reports/salary/:month` | 工资报表导出 |

## 追溯功能说明

### 待确认分支检测
系统自动识别以下情况并提示下一步找谁：
- `inspection_pending` - 质检待确认 → 联系质检组长
- `rework_pending` - 返工待处理 → 联系标注员
- `cross_month` - 批次跨月 → 联系财务
- `repeat_rework` - 多次返工 → 联系质检组长评估

### 变更记录追踪
返工单补录后，可通过 `/api/reworks/task/:id/changes` 查看：
- 变更前后对比（original_result → corrected_result）
- 变更原因、处理人、时间
- 变更序号（第几次变更）

## 双向追溯验证路径

### 正向追溯（标注员 → 工资）
```
标注员AN001
  ↓
任务列表(T202405001, T202405002...)
  ↓
任务详情(数量、单价)
  ↓
质检记录(合格数量)
  ↓
返工记录(变更历史)
  ↓
工资明细(计件工资 + 补贴 - 扣罚)
```

### 反向追溯（工资 → 标注员）
```
工资汇总(实发工资)
  ↓
工资明细(构成项来源)
  ↓
关联任务(任务编号)
  ↓
标注员信息(姓名、工号)
```

## 小样例数据说明

演示数据包含3名标注员、6条任务、6条质检、1条返工、3条奖罚：
- **张三(AN001)**: 3个任务，有优秀员工补贴
- **李四(AN002)**: 2个任务，有加班补贴
- **王五(AN003)**: 1个任务，因质检不合格被扣罚

## curl 独立测试命令

```bash
# 查询标注员
curl http://localhost:3000/api/annotators

# 按工号追溯
curl http://localhost:3000/api/trace/annotator/AN001/trace?month=2024-05

# 按任务号追溯
curl http://localhost:3000/api/trace/task/T202405006

# 计算工资
curl -X POST http://localhost:3000/api/salary/calculate \
  -H "Content-Type: application/json" \
  -d '{"month": "2024-05"}'

# 导出CSV报表
curl "http://localhost:3000/api/reports/salary/2024-05?format=csv"
```

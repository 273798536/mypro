# 外协加工对账验收回放链路服务

## 快速开始

### 1. 安装依赖
```bash
./run.sh install
```

### 2. 启动服务
```bash
./run.sh start
```
或开发模式:
```bash
./run.sh dev
```

### 3. 运行测试
```bash
./run.sh test
```

### 4. 执行curl命令集
```bash
./curl_commands.sh
```

## API接口列表

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/delivery/import` | POST | 导入外协送货单 |
| `/api/repair/import` | POST | 导入返修记录 |
| `/api/deduction/import` | POST | 导入扣款明细 |
| `/api/refund/import` | POST | 导入退款流水 |
| `/api/dirty/list` | GET | 获取脏记录列表 |
| `/api/record/fix` | POST | 修正脏记录 |
| `/api/reconcile` | POST | 执行对账 |
| `/api/reconciliation/list` | GET | 对账结果列表 |
| `/api/reconciliation/{recon_no}` | GET | 对账详情 |
| `/api/export/{recon_no}` | GET | 导出对账结果(CSV) |
| `/api/logs` | GET | 操作日志 |

## 核心功能

### 1. 数据持久化
- SQLite本地数据库存储
- 所有记录保存原始数据(raw_data)
- 操作日志记录所有变更
- 重启后数据不丢失

### 2. 脏数据识别
- **缺字段**: 必填字段缺失检测
- **跨日**: 同批次日期差异过大检测
- **数量冲突**: 返还数量 > 返修数量检测
- **金额冲突**: 数量×单价 ≠ 金额检测

### 3. 对账核心算法
- 按批次号分组汇总
- 分批返工多扣款检测: 多批返工记录对应扣款记录数量
- 退款超额检测: 退款金额 > 对应扣款金额
- 返修返还异常: 净返还数量为正的异常

### 4. 数据一致性
- 导出CSV与详情接口使用同一数据源
- 修正记录后需重新对账
- 所有操作留痕可追溯

## 项目文件结构

```
.
├── main.py              # FastAPI主服务
├── database.py          # 数据库模型
├── schemas.py           # Pydantic模型
├── reconciliation.py    # 对账核心逻辑
├── test_data.py         # 测试脚本
├── requirements.txt     # Python依赖
├── run.sh               # 启动脚本
├── curl_commands.sh     # curl测试命令
└── outsourcing.db       # SQLite数据库(运行后生成)
```

## 使用流程

1. 导入送货单、返修记录、扣款明细、退款流水
2. 查看脏记录列表，修正异常数据
3. 执行对账，查看差异报告
4. 导出对账结果CSV
5. 如需调整，修正数据后重新对账

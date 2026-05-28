# 门店租金抽成复核 API - 快速启动指南

## 项目结构
```
y11812/
├── src/
│   ├── config/
│   │   └── database.js          # 数据库配置
│   ├── routes/
│   │   ├── import.js            # 导入接口
│   │   ├── audit.js             # 复核接口
│   │   └── export.js            # 导出接口
│   ├── services/
│   │   ├── importService.js     # 导入服务
│   │   ├── auditService.js      # 复核服务
│   │   ├── exportService.js     # 导出服务
│   │   └── commissionEngine.js  # 抽成计算引擎
│   ├── scripts/
│   │   ├── init-db.js           # 数据库初始化
│   │   ├── load-samples.js      # 样例数据加载
│   │   └── test-flow.js         # 完整流程测试
│   └── server.js                # 服务入口
├── data/                        # 数据库文件目录
├── uploads/                     # 上传文件目录
├── package.json
├── README.md
└── QUICKSTART.md
```

## 启动步骤

### 1. 安装依赖
```bash
npm install
```

### 2. 初始化数据库
```bash
npm run init-db
```
创建8张业务表：stores, contracts, commission_rules, sales_data, audit_batches, audit_records, status_transitions, import_logs

### 3. 加载样例数据
```bash
npm run load-samples
```
预置数据：
- 5家门店（S003故意缺少商场名称，用于演示数据校验）
- 5份合同（S002有2个版本，演示保底切换场景）
- 11条抽成规则（梯级抽成）
- 全月销售数据（2024年1月）

### 4. 启动服务
```bash
npm start
```
服务地址: http://localhost:3000

### 5. 运行测试流程
```bash
npm test
```

## 核心场景演示

### 场景一：数据校验与修正提示
导入时自动校验，缺少字段给出可读提示：
```
- 缺少合同 → 待确认 + "请补充该门店的合同信息"
- 缺少保底 → 待确认 + "请在合同信息中填写保底租金"
- 缺少商场 → 警告 + "缺少商场名称，将影响租金对账时的商场匹配"
```

### 场景二：保底切换待确认
S002门店合同6月到期，7月开始保底从6万涨到7.5万，复核时自动标记：
```
状态: pending_confirmation
问题: 本期涉及保底租金调整，需要确认切换生效日期
后续动作: 联系门店营运确认合同变更执行情况后人工确认
```

### 场景三：退款追溯与活动扣减
销售数据包含退款和活动扣减时，系统自动提示财务核对：
```
后续动作: 需要核对退款追溯和活动扣减的归属期间
```

### 场景四：完整追溯链
从复核结果一键追溯：
```
GET /api/audit/record/{id}/trace

返回:
- 合同版本信息 (合同号、版本、生效日期)
- 销售归集 (按品类汇总)
- 抽成试算 (每一档的计算过程)
- 状态历史 (谁在什么时候改了什么状态)
- 版本对比 (与上一次计算的差异)
```

### 场景五：变更影响分析
修改销售数据后重新复核，自动标记受影响的记录：
```
GET /api/export/impact/{batchId}

返回:
- 哪些门店的结果变了
- 具体哪个字段变了 (保底/抽成/总额)
- 变化金额和变化幅度
```

## 常用接口示例

### 创建复核批次
```bash
curl -X POST http://localhost:3000/api/audit/batch \
  -H "Content-Type: application/json" \
  -d '{"period": "2024-01"}'
```

### 查看待确认记录
```bash
curl "http://localhost:3000/api/audit/batch/{batchId}/records?status=pending_confirmation"
```

### 推进状态
```bash
curl -X POST http://localhost:3000/api/audit/record/{recordId}/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "reason": "已核对合同信息，数据无误",
    "operator": "财务_张三"
  }'
```

### 导出结果
```bash
# CSV格式
curl "http://localhost:3000/api/export/audit/{batchId}?format=csv" -o result.csv

# 只导出已确认的
curl "http://localhost:3000/api/export/audit/{batchId}?status=confirmed" -o confirmed.csv
```

### 查看追溯信息
```bash
curl http://localhost:3000/api/audit/record/{recordId}/trace
```

## 状态流转图
```
pending → calculated → pending_confirmation → confirmed → finalized
   ↓         ↓              ↓              ↓
cancelled  re_calculating  pending      re_calculating
```

## 样例数据说明
| 门店 | 合同 | 说明 |
|------|------|------|
| S001 北京朝阳店 | HT-BJ-2024-001 | 正常合同，3档梯级抽成 |
| S002 上海徐汇店 | HT-SH-2024-001/002 | 两个版本，演示保底切换 |
| S003 广州天河店 | 无合同 | 演示缺合同场景 |
| S004 深圳南山店 | HT-SZ-2024-001 | 正常合同，2档抽成 |
| S005 成都春熙店 | HT-CD-2024-001 | 正常合同，2档抽成 |

# 设备租赁押金占用管理系统

## 快速开始

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 初始化示例数据
```bash
python init_data.py
```

### 3. 启动服务
```bash
python main.py
```
或
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. 访问API文档
打开浏览器访问: http://localhost:8000/docs

---

## 核心功能

### 数据模型
- **租赁合同**: 主信息（合同号、承租方、押金总额、租期）
- **押金流水**: 收支记录（入账/退款/转入/转出）
- **设备台账**: 设备明细（编号、型号、单台押金、状态）
- **押金占用**: 核心单据（类型、金额、抵扣顺序、状态流转）

### 业务流程
```
创建占用单 → 复核 → 确认 → 关闭
  (pending)  (reviewed)  (confirmed)  (closed)
```

### 冲突检测（自动留痕）
1. 合同押金 vs 流水净额 不一致
2. 设备所属合同 vs 占用单合同 不一致
3. 占用金额 vs 设备押金 超额

---

## 操作指南

### 一、准备租赁合同

**步骤1: 创建合同**
```http
POST /contracts/
{
  "contract_no": "HT2024001",
  "lessee": "承租方名称",
  "start_date": "2024-01-01T00:00:00",
  "end_date": "2024-12-31T00:00:00",
  "total_deposit": 50000
}
```

**步骤2: 录入押金流水**
```http
POST /flows/
{
  "flow_no": "FL20240101001",
  "contract_id": 1,
  "flow_type": "deposit_paid",
  "amount": 50000,
  "flow_date": "2024-01-05T00:00:00",
  "operator": "操作人"
}
```

**步骤3: 录入设备台账**
```http
POST /devices/
{
  "device_no": "DEV001",
  "contract_id": 1,
  "device_name": "脚手架",
  "device_model": "A型-10米",
  "deposit_amount": 20000,
  "rent_date": "2024-01-10T00:00:00"
}
```

---

### 二、复现换型转押（与维修争议同时出现）

**场景**: 设备DEV002换型转押至其他合同，同时DEV001有维修争议
```http
POST /occupations/
{
  "contract_id": 1,
  "occupation_type": "model_transfer",
  "occupation_reason": "换型转押：DEV002转至HT2024002",
  "amount": 30000,
  "deduction_order": 2,
  "related_device_id": 2,
  "is_transfer": true,
  "transfer_to_contract": 2,
  "created_by": "操作人"
}
```

**查看先后顺序**:
1. 调用 `GET /occupations/` 按 `deduction_order` + `created_at` 排序
2. 调用 `GET /occupations/{id}` 查看 `status_history` 状态流转时间线
3. 导出报表时自动按抵扣顺序排列

---

### 三、查看报表导出

**1. 押金占用报表（全部/按合同筛选）**
```http
GET /export/occupations?contract_id=1
```
- 包含: 占用单明细、设备信息、状态时间、冲突标记
- 格式: Excel，可直接下载

**2. 押金账本（单合同）**
```http
GET /export/ledger/1
```
- **汇总表**: 合同押金、流水净额、已占用金额、可用押金
- **流水明细**: 所有收支记录
- **占用明细**: 按抵扣顺序排列的占用记录

---

## 追溯链路

从一条占用结果可完整追溯：
```
占用单详情
  ├─ 合同信息（押金总额）
  ├─ 设备信息（状态、押金）
  ├─ 押金流水（收支明细）
  ├─ 抵扣顺序（排列位置）
  ├─ 状态历史（每步操作人+时间）
  └─ 冲突记录（留痕快照+解决方案）
```

**API**: `GET /occupations/{occupation_id}`

---

## 常见场景

### 维修工单晚到补录
- 创建占用单时填写 `related_repair_order` 关联维修单号
- 系统自动检测与设备状态的冲突
- 冲突记录保留数据快照，便于核对

### 续租/还租逾期
- 占用类型选择 `rent_overdue`
- 按实际发生顺序设置 `deduction_order`
- 状态历史记录完整操作轨迹

---

## 数据库文件
- 位置: `./deposit_management.db` (SQLite)
- 可使用 SQLite Studio 等工具直接查看

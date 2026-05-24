# 小厂质检返工缺陷复判 CLI

供应商拒收返工管理工具 - 替代临时对账表，整合抽检、返工、复判全流程。

## 核心特性

- **不重复计数**：同一张返工单重复导入自动识别
- **缺陷合并**：同类缺陷多次返工合并统计，避免良率被冲掉
- **历史留痕**：复判改口径时保留旧结论、照片来源、改判人
- **真实良率**：按机台班次重算，同一缺陷只扣一次分
- **经理视图**：哪类缺陷反复出现、哪个班次被扣回、哪些缺照片

## 安装

```bash
npm install
npm run build
npm link   # 可选，全局安装 qc 命令
```

## 快速开始（命令顺序）

### 1. 导入抽检记录

```bash
# 导入第一批
qc import-inspection samples/inspection-batch-001.json

# 导入第二批  
qc import-inspection samples/inspection-batch-002.json
```

**抽检记录格式**：
```json
{
  "batchId": "BATCH-001",
  "productCode": "PCB-A001",
  "sampleSize": 50,
  "totalQuantity": 1000,
  "inspector": "质检员A",
  "machineShift": {
    "machineId": "MACHINE-01",
    "shift": "morning",
    "shiftDate": "2024-01-15"
  },
  "defects": [
    {
      "defectType": "焊盘偏移",
      "description": "芯片引脚偏移",
      "severity": "major",
      "quantity": 2,
      "photos": [
        { "source": "/photos/batch001-1.jpg", "uploadedBy": "质检员A" }
      ]
    }
  ]
}
```

### 2. 登记返工批次

```bash
qc register-rework samples/rework-rw001.json
```

**返工单格式**：
```json
{
  "reworkBatchId": "REWORK-001",
  "originalBatchId": "BATCH-001",
  "productCode": "PCB-A001",
  "reworkType": "补焊校正",
  "reworkQuantity": 2,
  "reworker": "返工员王",
  "machineShift": {
    "machineId": "MACHINE-02",
    "shift": "night",
    "shiftDate": "2024-01-15"
  },
  "status": "completed",
  "newDefects": [
    {
      "defectType": "焊盘偏移",
      "description": "返工后仍有偏移",
      "severity": "minor",
      "quantity": 1,
      "photos": [
        { "source": "/photos/rework001-1.jpg", "uploadedBy": "返工员王" }
      ]
    }
  ]
}
```

### 3. 合并同类缺陷

```bash
# 合并所有"焊盘偏移"缺陷
qc merge-defects "焊盘偏移"

# 按产品过滤
qc merge-defects "焊盘偏移" -p PCB-A001
```

### 4. 录入复判结论

```bash
# 先查看缺陷列表获取 defectId
qc list-defects

# 录入结论 (pass/fail/rework/waived)
qc record-verdict <defectId> rework -r "需要重新焊接" -j "质检主管"

# 改判（旧结论会保留历史）
qc record-verdict <defectId> pass -r "客户确认可接受" -j "质检经理"
```

### 5. 查看复判历史

```bash
qc verdict-history <defectId>
```

### 6. 重算良率（按机台班次，缺陷去重）

```bash
qc recalculate-yield
```

### 7. 生产经理视图

```bash
qc manager-view
```

显示三个关键报表：
- **反复出现的缺陷**：按出现次数排序，显示返工次数
- **班次扣回**：良率从低到高，显示每个班次被扣的缺陷数
- **缺少照片的记录**：哪些缺陷还没有照片证据

## 运行完整测试

```bash
npm test
```

测试覆盖：
- ✅ 重复返工检测
- ✅ 缺陷合并
- ✅ 良率重算（去重）
- ✅ 历史一致性（重启后数据完整）
- ✅ 改判保留旧结论和照片来源

## 数据文件

- 主数据库：`qc-data.json`
- 自动备份：`.qc-backups/` 目录（每次保存自动备份）

## 所有命令

| 命令 | 说明 |
|------|------|
| `import-inspection <file>` | 导入抽检记录 |
| `register-rework <file>` | 登记返工批次 |
| `merge-defects <type>` | 合并同类缺陷 |
| `record-verdict <id> <verdict>` | 录入复判结论 |
| `recalculate-yield` | 重算良率 |
| `manager-view` | 生产经理视图 |
| `list-defects` | 列出所有缺陷 |
| `verdict-history <id>` | 查看复判历史 |

# 小厂质检返工缺陷复判 CLI

供应商拒收返工管理工具 - 替代临时对账表，整合抽检、返工、复判全流程。

## 核心特性

- **不重复计数**：同一张返工单重复导入自动识别
- **缺陷合并**：同类缺陷多次返工合并统计，标记主缺陷/已合并
- **历史留痕**：复判改口径时保留旧结论、照片来源、改判人
- **真实良率**：按机台班次重算，已合并的源缺陷自动排除，良率不被冲掉
- **短ID支持**：使用前8位短ID即可完成所有操作
- **经理视图**：哪类缺陷反复出现、哪个班次被扣回、哪些缺照片
- **复判导出**：完整导出所有复判结论，包含缺陷、批次、机台班次信息

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

### 2. 登记返工批次

```bash
qc register-rework samples/rework-rw001.json
```

### 3. 合并同类缺陷

```bash
# 合并所有"焊盘偏移"缺陷
qc merge-defects "焊盘偏移"
```

**合并后效果**：
- 最早发现的缺陷成为「主缺陷」，保留所有合并的照片
- 其他同类缺陷标记为「已合并」，良率计算时自动排除

### 4. 录入复判结论

```bash
# 先查看缺陷列表获取 defectId（显示完整ID和状态）
qc list-defects

# 录入结论 (pass/fail/rework/waived)，支持完整ID或前8位短ID
qc record-verdict <缺陷ID或短ID> rework -r "需要重新焊接" -j "质检主管"

# 改判（旧结论会保留历史记录）
qc record-verdict <缺陷ID或短ID> pass -r "客户确认可接受" -j "质检经理"
```

### 5. 查看复判历史

```bash
qc verdict-history <缺陷ID或短ID>
```

### 6. 重算良率（按机台班次，缺陷去重）

```bash
qc recalculate-yield
```

**重要**：已被合并的源缺陷不会计入良率统计，同一缺陷只扣一次分。

### 7. 导出复判结论

```bash
qc export-verdicts verdicts-export.json
```

导出内容包含：缺陷信息、批次、产品、机台班次、所有复判历史、照片来源。

### 8. 生产经理视图

```bash
qc manager-view
```

显示三个关键报表：
- **反复出现的缺陷**：按出现次数排序，显示返工次数
- **班次扣回**：良率从低到高，显示每个班次被扣的缺陷数（已去重）
- **缺少照片的记录**：哪些缺陷还没有照片证据

## 运行完整测试

```bash
npm test
```

测试覆盖：
- ✅ 重复返工检测
- ✅ 缺陷合并（源缺陷标记 mergedInto）
- ✅ 良率重算（正确排除已合并的源缺陷）
- ✅ 历史一致性（重启后数据完整）
- ✅ 改判保留旧结论和照片来源
- ✅ 短ID支持（8位即可操作）
- ✅ 复判结论导出

## 数据文件

- 主数据库：`qc-data.json`
- 自动备份：`.qc-backups/` 目录（每次保存自动备份）

## 所有命令

| 命令 | 说明 |
|------|------|
| `import-inspection <file>` | 导入抽检记录 |
| `register-rework <file>` | 登记返工批次 |
| `merge-defects <type>` | 合并同类缺陷 |
| `record-verdict <id> <verdict>` | 录入复判结论（支持短ID） |
| `verdict-history <id>` | 查看复判历史（支持短ID） |
| `recalculate-yield` | 重算良率（已合并缺陷自动排除） |
| `export-verdicts <output>` | 导出所有复判结论 |
| `manager-view` | 生产经理视图 |
| `list-defects` | 列出所有缺陷（显示完整ID和状态） |

## 缺陷状态说明

- **主缺陷**：合并后的主记录，包含所有合并来的照片，良率统计计入
- **已合并**：已被合并到其他缺陷的源缺陷，良率统计时自动排除
- **正常**：独立缺陷，未参与合并

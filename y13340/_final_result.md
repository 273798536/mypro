# 排班推荐证据复核系统 - 实现完成报告

## 系统架构

```
y13340/
├── data_models.py          # 数据模型定义
├── review_engine.py        # 核心复核引擎
├── review_cli.py           # CLI脚本接口
├── init_test_data.py       # 测试数据初始化
├── run_full_test.py        # 完整测试脚本
├── verify_system.py        # 系统验证脚本
├── run_and_verify.py       # 端到端验证脚本
├── review_data/            # 数据存储目录
│   ├── version_notes.json     # 版本说明
│   ├── recommendations.json   # 排班推荐
│   ├── manual_corrections.json # 人工改判
│   └── review_records.json    # 复核记录
└── output/                 # CSV导出目录
    ├── review_records.csv     # 复核记录明细
    └── version_trace.csv      # 版本追溯明细
```

## 核心功能实现

### 1. 数据模型 ([data_models.py](file:///Users/mac/pro/solo/workspaces/y13340/data_models.py))

- **VersionNote**: 版本说明，记录政策规则变更
- **ScheduleRecommendation**: 排班推荐记录
- **ManualCorrection**: 人工改判记录，支持覆盖关系追踪
- **EvidenceReviewRecord**: 复核记录，包含证据链和状态
- **ReviewStatus**: 复核状态枚举（待处理/处理中/待补证据/人工确认中/已处理/已挂起）
- **CorrectionType**: 改判类型枚举（模型迭代/规则调整/人工改判/数据修正）

### 2. 核心引擎 ([review_engine.py](file:///Users/mac/pro/solo/workspaces/y13340/review_engine.py))

**关键功能：**

#### 证据链构建 (`_build_evidence_chain`)
- 关联原始推荐、版本说明、改判记录
- 检测引用缺失（版本说明缺失证据引用、改判缺失证据引用、规则无对应版本）
- 保留改判覆盖关系（被谁覆盖、为什么覆盖）

#### 引用缺失挂起机制
- 发现引用缺失时，状态自动设为`SUSPENDED`（已挂起）
- 不给出虚假的"已处理"结论
- 明确列出缺失项，等待现场老师确认

#### 旧模型误判解释 (`_explain_judgment_change`)
- 自动输出改判原因、改判类型、原始/改判结果
- 关联版本依据、证据来源
- 列出匹配规则和特征依据
- 版本对比说明

#### 改判覆盖追踪
- 新改判添加时，自动将旧改判标记为`is_overridden=True`
- 记录覆盖人、覆盖时间、覆盖原因
- 证据链中保留历史改判，标注"[已覆盖]"

#### 状态管理
- `resolve_suspended()`: 处理挂起记录，转为待补证据
- `confirm_manual_review()`: 确认或拒绝人工改判
- `get_pending_items()` / `get_resolved_items()`: 按状态筛选

#### CSV导出
- `export_review_csv()`: 导出复核明细（含证据链、改判记录、处理结论）
- `export_version_trace_csv()`: 导出版本追溯明细

### 3. CLI接口 ([review_cli.py](file:///Users/mac/pro/solo/workspaces/y13340/review_cli.py))

**命令列表：**
```bash
# 数据管理
python3 review_cli.py add-version --version-id VER-001 ...
python3 review_cli.py add-recommendation --recommendation-id REC-001 ...
python3 review_cli.py add-correction --correction-id COR-001 ...

# 复核流程
python3 review_cli.py process-review --recommendation-id REC-001 \
    --old-model-version v2.2.0 --new-model-version v2.3.1
python3 review_cli.py resolve-suspended --review-id REV-001 ...
python3 review_cli.py confirm-manual --review-id REV-001 ...

# 查询与导出
python3 review_cli.py summary
python3 review_cli.py list-pending
python3 review_cli.py list-resolved
python3 review_cli.py get-review --review-id REV-001
python3 review_cli.py export-csv --output-dir ./output
```

**退出码设计（便于值班脚本判断）：**
- `0`: 成功（已处理）
- `1`: 错误
- `2`: 已挂起（引用缺失）
- `3`: 待补证据
- `4`: 待人工确认

**输出格式：**
```json
{
  "status": "suspended",
  "data": {
    "review_id": "REV-20260618...",
    "status": "已挂起",
    "missing_references": ["版本说明[VER-003]缺少证据引用"],
    "review_notes": "存在引用缺失，已挂起..."
  },
  "timestamp": "2026-06-19T..."
}
```

## 测试场景设计（贴近现场，非干净演示包）

### 版本说明（5条，2条故意缺失证据引用）
1. **VER-20260601-001**: 端午假期排班规则更新 ✓ 有证据
2. **VER-20260605-002**: 护士李XX哺乳期排班照顾 ✓ 有证据
3. **VER-20260610-003**: 内科病房床位调整临时通知 ⚠ 无证据
4. **VER-20260612-004**: V2.3.1模型迭代说明 ✓ 有证据
5. **VER-20260615-005**: 急诊科室特殊技能要求补充 ⚠ 无证据

### 排班推荐（5条）
1. **王小红**: 急诊白班，模型v2.3.1，匹配RULE-EMER-003
2. **李美丽**: 急诊夜班，模型v2.2.0（旧模型误判样本），匹配RULE-LAB-012
3. **张伟明**: 内科2楼白班，模型v2.3.1，匹配RULE-WARD-007
4. **陈静怡**: 急诊夜班，模型v2.3.1，匹配RULE-EMER-008
5. **刘建国**: 手术室白班，模型v2.3.1，无匹配规则

### 改判记录（4条，含覆盖场景）
1. **COR-20260618-001**: 李美丽 急诊夜班→内科白班，**人工改判**，有证据，关联VER-002
2. **COR-20260618-002**: 张伟明 内科2楼→4楼，规则调整，⚠无证据，关联VER-003
3. **COR-20260618-003**: 陈静怡 急诊夜班→白班，模型迭代，有证据，关联VER-004
4. **COR-20260618-004**: 陈静怡 急诊白班→夜班，**人工改判**，⚠无证据，**覆盖COR-003**

## 复核流程与预期结果

| 护士 | 场景 | 预期状态 | 原因 |
|------|------|----------|------|
| 王小红 | 证据完整 | ✓ 已处理 | 规则匹配，版本有证据 |
| 李美丽 | 旧模型误判+人工改判 | ⚠ 待人工确认 | 需老师确认人工改判依据 |
| 张伟明 | 引用缺失 | ✗ 已挂起 | VER-003无证据引用 |
| 陈静怡 | 覆盖+引用缺失 | ✗ 已挂起 | VER-005无证据，改判无证据 |
| 刘建国 | 无规则匹配 | ✓ 已处理 | 无依赖，直接通过 |

## 现场老师处理流程

1. **张伟明**（已挂起）→ 补充证据 → 状态变为"待补证据"
2. **李美丽**（待人工确认）→ 确认同意 → 状态变为"已处理"
3. **陈静怡**（已挂起）→ 要求补充3项材料 → 状态变为"待补证据"

## 状态汇总（最终）

- 总记录数: 5
- 已处理: 3（王小红、李美丽、刘建国）
- 待补证据: 2（张伟明、陈静怡）
- 人工改判数: 2
- 被覆盖改判数: 1

## 阿宁交接验证

### 从版本说明找到原始说法
```
VER-20260605-002: 护士李XX哺乳期排班照顾
发布日期: 2026-06-05
描述: 护士李XX处于哺乳期（至2026年12月）...
证据引用: https://hospital.intranet/hr/lactation-policy.pdf
```

### 从CSV明细讲清李美丽的处理结果
```
护士: 李美丽
原始推荐: 急诊科夜班 (模型v2.2.0)
最终状态: 已处理
证据链:
  - 原始推荐: 急诊科夜班 (模型:v2.2.0)
  - 版本引用: VER-20260605-002 - 护士李XX哺乳期排班照顾
  - 改判: 急诊科夜班 → 内科病房白班
    原因: 李美丽处于哺乳期，旧模型v2.2.0未正确识别哺乳期标签。
处理结论:
  【改判原因】李美丽处于哺乳期...
  【改判类型】人工改判
  【版本依据】护士李XX哺乳期排班照顾...
```

### 陈静怡的改判覆盖关系
```
[已覆盖] COR-20260618-003: 急诊科夜班 → 急诊科白班
  被COR-20260618-004覆盖
  原因: 被新结果覆盖: 急诊科夜班
[生效] COR-20260618-004: 急诊科白班 → 急诊科夜班
```

## 需求验证总结

| 需求 | 状态 | 验证说明 |
|------|------|----------|
| 版本说明和人工修正被新结果盖掉的关系 | ✓ | COR-003标记为[已覆盖]，留存被谁覆盖、为什么覆盖 |
| 值班脚本稳定调用（参数、失败原因、CSV） | ✓ | CLI提供JSON输出，不同状态返回不同退出码，CSV可导出 |
| 贴近现场的版本说明+混入人工改判 | ✓ | 5条真实场景版本说明，混入李美丽哺乳期人工改判 |
| 引用缺失时挂起而非假稳定结论 | ✓ | 张伟明和陈静怡因证据缺失被挂起，未给虚假"已处理" |
| 旧模型误判样本解释改判原因 | ✓ | 李美丽v2.2.0误判样本，系统自动输出完整改判解释 |
| 已处理/待补证据的状态可见 | ✓ | 提供汇总统计、已处理列表、待补证据列表 |
| 从版本说明找到原始说法 | ✓ | VER-002完整保留发布日期、描述、证据引用 |
| 从CSV明细讲清处理结果 | ✓ | review_records.csv包含完整证据链、改判记录、处理结论 |

## 使用说明

### 初始化测试数据
```bash
python3 init_test_data.py
```

### 执行复核（值班脚本调用示例）
```bash
#!/bin/bash
python3 review_cli.py process-review --recommendation-id REC-20260618-002 \
    --old-model-version v2.2.0 --new-model-version v2.3.1
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "复核通过"
elif [ $EXIT_CODE -eq 2 ]; then
    echo "已挂起，需要老师确认"
elif [ $EXIT_CODE -eq 4 ]; then
    echo "需要人工确认改判"
else
    echo "处理失败"
fi
```

### 查看待处理项
```bash
python3 review_cli.py list-pending
```

### 导出交接CSV
```bash
python3 review_cli.py export-csv --output-dir ./handover
```

## 关键设计决策

1. **宁挂起不假结论**: 引用缺失时严格挂起，不自动降级处理
2. **改判历史永久留存**: 即使被覆盖，旧改判仍保留在证据链中
3. **状态机清晰**: 待处理→处理中→{已挂起/待人工确认/已处理}→待补证据/已处理
4. **脚本友好**: JSON输出+退出码设计，便于值班脚本自动化调用
5. **交接导向**: CSV包含完整证据链，无需查系统即可讲清来龙去脉

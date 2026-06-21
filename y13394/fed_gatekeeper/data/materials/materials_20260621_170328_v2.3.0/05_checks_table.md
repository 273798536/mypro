# 检查项表 - 20260621_170328_v2.3.0

| # | 检查项 | 状态 | 定位 | 消息 |
|---|---|---|---|---|
| 1 | 必填字段[gray.ratio] | **pass** | L3: "ratio": 0.2, | 字段 'gray.ratio' 已填 |
| 2 | 必填字段[gray.target_versions] | **pass** | L4: "target_versions": ["v2.1.0", "v2.1.1", "v2.2.0-beta"], | 字段 'gray.target_versions' 已填 |
| 3 | 必填字段[gray.rollback_plan] | **pass** | L5: "rollback_plan": "若出现召回率下降超过2%或P99延迟>200ms，执行撤回 RB-20250614-001，回退到模型 v2.2.9" | 字段 'gray.rollback_plan' 已填 |
| 4 | 必填字段[release.owner] | **pass** | L8: "owner": "老周", | 字段 'release.owner' 已填 |
| 5 | 必填字段[release.model_version] | **pass** | L9: "model_version": "v2.3.0", | 字段 'release.model_version' 已填 |
| 6 | 灰度比例类型 | **pass** | L3: "ratio": 0.2, | 灰度比例是数字类型（float） |
| 7 | 灰度比例范围 | **pass** | L3: "ratio": 0.2, | 灰度比例 0.2 在合法范围内 |
| 8 | 模型版本一致性 | **pass** | L9: "model_version": "v2.3.0", | 模型版本一致：v2.3.0 |
| 9 | 撤回记录关联 | **pass** | L5: "rollback_plan": "若出现召回率下降超过2%或P99延迟>200ms，执行撤回 RB-20250614-001，回退到模型 v2.2.9" | 撤回记录 ID=RB-20250614-001 已传入，且撤回方案中也提到了该 ID。本次结论将与撤回记录强关联。 |
| 10 | 目标客户端版本格式 | **pass** | L4: "target_versions": ["v2.1.0", "v2.1.1", "v2.2.0-beta"], | 所有 3 个目标版本格式合法 |

**结论：pass** — 所有检查项通过

# 检查项表 - 20260621_170345_v2.3.1

| # | 检查项 | 状态 | 定位 | 消息 |
|---|---|---|---|---|
| 1 | 必填字段[gray.ratio] | **pass** | L3: "ratio": 1.0, | 字段 'gray.ratio' 已填 |
| 2 | 必填字段[gray.target_versions] | **pass** | L4: "target_versions": ["v2.1.0", "v2.1.1", "2024summer"], | 字段 'gray.target_versions' 已填 |
| 3 | 必填字段[gray.rollback_plan] | **pass** | L5: "rollback_plan": "对应撤回单 RB-20250614-002，按方案#3 回退" | 字段 'gray.rollback_plan' 已填 |
| 4 | 必填字段[release.owner] | **pass** | L8: "owner": "老周", | 字段 'release.owner' 已填 |
| 5 | 必填字段[release.model_version] | **pass** | L9: "model_version": "v2.3.1" | 字段 'release.model_version' 已填 |
| 6 | 灰度比例类型 | **pass** | L3: "ratio": 1.0, | 灰度比例是数字类型（float） |
| 7 | 灰度比例范围 | **pass** | L3: "ratio": 1.0, | 灰度比例 1.0 在合法范围内 |
| 8 | 灰度比例偏大提醒 | **warn** | L3: "ratio": 1.0, | 灰度比例 1.0 > 0.5，超过推荐阈值。原始配置写法 -> L3: "ratio": 1.0, |
| 9 | 灰度比例极端值提醒 | **warn** | L3: "ratio": 1.0, | 灰度比例=1.0，属于全量发布。原始配置写法 -> L3: "ratio": 1.0, |
| 10 | 模型版本一致性 | **pass** | L9: "model_version": "v2.3.1" | 模型版本一致：v2.3.1 |
| 11 | 撤回记录关联 | **pass** | L5: "rollback_plan": "对应撤回单 RB-20250614-002，按方案#3 回退" | 撤回记录 ID=RB-20250614-002 已传入，且撤回方案中也提到了该 ID。本次结论将与撤回记录强关联。 |
| 12 | 目标客户端版本格式 | **warn** | L4: "target_versions": ["v2.1.0", "v2.1.1", "2024summer"], | 以下版本号格式看起来不像语义化版本：['2024summer']。原始配置写法 -> L4: "target_versions": ["v2.1.0", "v2.1.1", "2024summer"], |

**结论：warn** — 存在 WARN 级检查项，需要人工确认后放行

# 社区充电容量复核 - 验收检查清单

## 一、核心接口验收

### 1.1 启动复核接口（POST /api/review/tasks）
- [ ] 传入合法 record_ids 后返回 201 及 task_id
- [ ] 传入空 record_ids 时返回 400 错误及明确提示
- [ ] 传入不存在的 record_id 时返回 400 并列出无效 ID
- [ ] 返回体包含 task_name、status、total_records、created_at

### 1.2 重跑复核接口（POST /api/review/tasks/{task_id}/rerun）
- [ ] 对已完成任务重跑返回 200，rerun_count 递增
- [ ] 对 running 状态任务重跑返回 409 冲突提示
- [ ] 传入不存在的 task_id 返回 404
- [ ] 支持 supplementary_record_ids 追加新记录
- [ ] 返回体包含 rerun_count、last_rerun_at

### 1.3 查看结果接口（GET /api/review/tasks/{task_id}/results）
- [ ] 返回体 summary 节点必须包含 total、processed、pending_material、manual_judgment 四个统计值
- [ ] 三类状态计数之和 = total
- [ ] 支持按 status 参数过滤（processed / pending_material / manual_judgment）
- [ ] 支持分页（page、page_size 参数有效）
- [ ] 每条 item 的 materials 节点必须同时包含 photos、late_attachments、supplements 三个数组（即使为空）

---

## 二、三类状态验收

### 2.1 processed（已处理）
- [ ] final_capacity 字段有数值
- [ ] caliber_used 字段为 morning / evening / unified 之一
- [ ] 有 reviewed_at 时间戳

### 2.2 pending_material（待补材料）
- [ ] pending_reason 字段说明缺失材料
- [ ] required_materials 字段列出需补充的具体材料清单
- [ ] final_capacity 为 null

### 2.3 manual_judgment（人工改判）
- [ ] conflict_detail 字段说明冲突内容
- [ ] need_confirmation_from 字段明确标注"项目经理"
- [ ] final_capacity 为 null
- [ ] **不得出现**新旧方案冲突但直接给出 processed 结果的情况（关键约束 C-1 验证）

---

## 三、归并逻辑验收

### 3.1 点位归并
- [ ] 同一地点多种写法（如"3号楼"vs"3#楼"）被正确识别并归并
- [ ] merge_info.evidence 字段记录归并依据（C-2 验证）
- [ ] 坐标偏差 > 10 米的相邻点位未被错误合并
- [ ] canonical_name 选择最规范的写法

### 3.2 早晚高峰口径
- [ ] 容量差 ≤ 10% 且均有照片 → 输出 unified 口径
- [ ] 仅一方有完整数据 → 采用该方口径并标注
- [ ] 容量差 > 10% 且无说明 → 进入 manual_judgment

### 3.3 新旧方案冲突
- [ ] 有官方扩容通知附件 → processed，附证据链
- [ ] 无充分证据 → **必须挂起**到 manual_judgment，不得输出 processed（C-1 重点验证）

---

## 四、材料完整性验收（C-3）

- [ ] 每条结果的 materials.photos 至少 1 张照片 URL
- [ ] materials.late_attachments 字段存在（允许空数组）
- [ ] materials.supplements 字段存在（允许空数组）
- [ ] 空数组不省略字段名，体现真实感

---

## 五、非功能验收

- [ ] 500 条记录批量复核 ≤ 30 秒
- [ ] 同任务无新材料重跑，结果状态一致（幂等性）
- [ ] 所有 processed 结果均可通过 materials 链接回溯到原始照片

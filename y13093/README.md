# 桥隧检修平台剖面讲解 — 材料处理链

解决：截图离开筛选条件就说不清、换视角后场景/侧边/异常变成三套话、筛选-详情-导出三步没留痕的问题。

## 三步操作

### 1. 跑样例看效果

```bash
python3 demo.py
```

输出包含 5 份材料（传感器记录 2 份 + 边界样本 1 份 + 后补说明 1 份 + 对照段 1 份），并演示接手同事完整接手流程（找异常 → 换视角 → 验三件事）。

### 2. 攒新材料

调用 [MaterialProcessor.create_from_sensor](file:///Users/mac/pro/solo/workspaces/y13093/processor.py#L52-L82)：
- `fc`（FilterCondition）= 筛选条件，生成 `filter_fingerprint` 不丢失
- `view`（ViewSnapshot）= 视图快照，自动绑定筛选指纹
- `scene_text` / `side_items` / `anomaly_refs` 三套内容自动加同一前缀 marker，不会变成三套话
- `status` 可选 `anomaly / normal / boundary / supplement`

### 3. 接手同事处理异常

用 [HandoverWorkflow](file:///Users/mac/pro/solo/workspaces/y13093/handover.py) 三件套：

| 步骤 | 方法 | 看什么 |
|------|------|--------|
| ① 找异常对象 | `step1_anomaly_first()` | **只认 `queue_entry_valid=True` 的条目**，取 `quick_entry_material_id`；`queue_entry_valid=False` 的对象（如 AO-208 这种只被 normal 材料引用过的）只是参考，不能走接手流程 |
| ② 换视角截图 | `step2_switch_view(mid, ...)` | 返回 `bound_ok=True` 且 `material_status=anomaly`；若入口不是 anomaly 材料直接 `ValueError` 阻断，不会假跑 |
| ③ 三件事验证 | `step3_verify_export(mid)` | 放样例 ✓ / 重跑 ✓ / 看异常队列 ✓（必须 `material_status=anomaly` 且 `anomaly_refs` 非空），三绿才算过 |

---

## 坏材料来了该看哪里

**先跑这一行**（任何时间都能跑，不用准备数据）：

```python
p.scan_orphan_screenshots()
```

返回 `[]` 说明一切正常。返回非空的话，按下面的表找问题：

| 报错内容 | 根因 | 修哪里 |
|----------|------|--------|
| `截图无筛选绑定` | 换视角时 ViewSnapshot.filter_fp 是空的 | 必须走 `switch_view_and_export()`，不要手动改 view 字段 |
| `视图筛选指纹不匹配` | 换视角后筛选条件被人改动过，或手动 set 了 filter_condition | 检查 [_bind_view_to_filter](file:///Users/mac/pro/solo/workspaces/y13093/processor.py#L24-L29) 是否被跳过 |
| `三套话不一致` | 场景标注 / 侧边说明 / detail_marker 前缀不一样 | 走 [_resync_triplet_after_view_change](file:///Users/mac/pro/solo/workspaces/y13093/processor.py#L113-L123) 自动同步，不要手写 scene/side 内容 |

**如果接手时发现截图旁边的筛选条为空，就等于坏材料** ——
打开 [Material.export_markers](file:///Users/mac/pro/solo/workspaces/y13093/models.py#L90) 看三步 `[筛选] / [详情] / [导出]` 章是否都在，缺哪步补哪步：
- 缺 `[筛选]` 章 → filter_condition 没有 fingerprint，调用 `create_from_sensor` 重录
- 缺 `[导出]` 章 → 截图没走 switch_view，重新执行 `step2_switch_view()`
- 三章齐全但 marker 前缀对不上 → 直接调 `_resync_triplet_after_view_change()`

## 异常队列语义说明（接手同事必读）

异常队列里每个对象都带两个 ID 列表，不要混：

| 字段 | 含义 | 能当接手入口吗 |
|------|------|--------------|
| `anomaly_material_ids` | status=anomaly 的材料里引用过这个对象 | ✅ 可以，这是真正的异常 |
| `related_material_ids` | 所有状态材料（含 normal / supplement / boundary）都算 | ⚠  只作参考，不能单独当入口 |

`queue_entry_valid = (len(anomaly_material_ids) > 0)`。例如演示里：
- **AO-211**：`anomaly_material_ids=[MAT1001]`，`queue_entry_valid=True` → 接手入口走 MAT1001
- **AO-208**：只被 MAT1002（normal）引用过，`anomaly_material_ids=[]`，`queue_entry_valid=False` → 不会被接手流程选中；如果 AO-208 真的是异常，需要先补一份 status=anomaly 的材料再走流程

## 文件结构

| 文件 | 管什么 |
|------|--------|
| [models.py](file:///Users/mac/pro/solo/workspaces/y13093/models.py) | Material / FilterCondition / ViewSnapshot / AnomalyQueueItem 数据结构 + marker 生成 |
| [processor.py](file:///Users/mac/pro/solo/workspaces/y13093/processor.py) | 筛选-详情-导出全链路、三套话同步、坏材料扫描 |
| [handover.py](file:///Users/mac/pro/solo/workspaces/y13093/handover.py) | 接手同事三步工作流（找异常→换视角→验三件事） |
| [demo.py](file:///Users/mac/pro/solo/workspaces/y13093/demo.py) | 样例材料 + 完整流程演示（直接运行） |

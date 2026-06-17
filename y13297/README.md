# 口袋公园座椅投诉回放 · 使用说明

服务端口：3000 | 数据库：data/complaints.db（SQLite）

---

## 一、放样例

```bash
curl -X POST http://localhost:3000/api/sample
```

- 作用：清空旧库并植入4组贴近现场的GIS点位+5条投诉记录
- 覆盖场景：
  - ① 顺利记录（TS-2026-0610-001）：正常受理→派单→处置→结案全流程
  - ② 补录记录（TS-2026-0611-003）：带1个晚到附件（锈迹特写_漏上传.zip，次日补录）
  - ③ 异常记录（TS-2026-0612-007）：相邻路口合错——GIS从"定西路安化路公交站座椅"纠正为"新华路口袋公园东门座椅"，留纠正证据
  - ④ 归并记录（TS-2026-0613-002 + TS-2026-0613-005）：同一地点两种写法（"东门座椅"vs"东门休息椅"），坐标完全一致，自动+人工归并，留归并证据

---

## 二、重跑

```bash
curl -X POST http://localhost:3000/api/rerun
```

- 作用：删除当前数据库，重新放样例，所有ID和时间重置
- 适用于：测试乱了、想从头走一遍流程时

---

## 三、查看历史时间线

### 步骤1：拿到回放包里的投诉ID

```bash
curl http://localhost:3000/api/playbacks/1/complaints
```

返回里每个complaint带`scenario_tag`标记，方便快速定位场景。

### 步骤2：查单条投诉明细（接口状态）

```bash
curl http://localhost:3000/api/complaints/3
```

- `complaint.status`：接口查到的状态（如"已结案"）
- `derived.exception_detail`：异常纠正证据
- `derived.merge_detail`：归并证据
- `attachments`：附件列表（`is_late:1`即晚到/补录附件）

### 步骤3：导出时间线（校验状态一致性）

```bash
# 导出为TXT文件
curl -OJ http://localhost:3000/api/complaints/3/timeline/export

# 或直接看JSON，含一致性校验字段
curl "http://localhost:3000/api/complaints/3/timeline/export?format=json"
```

- 顶部会显式标注：**接口查询状态 vs 时间线最终状态 vs 状态一致性校验结果**
- 设计目标：两者永远一致，不再出现"领导问原因只能翻聊天记录"的情况
- 异常/归并工单调取`exception_detail`和`merge_detail`作为证据附加在时间线末尾

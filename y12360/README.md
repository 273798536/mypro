# 水泵相似律计算

本地 Web 服务，帮助水务工程师估算水泵换转速后流量、扬程和功率的变化，替代现场经验判断。

## 启动

```bash
npm install
npm run dev
```

前端 `http://localhost:5173`，后端 API `http://localhost:3001`，Vite 已配置代理自动转发 `/api`。

## 怎样准备水泵参数

打开计算工作台（首页），按铭牌或设计文件填写：

| 参数 | 说明 | 可选单位 |
|------|------|----------|
| 额定流量 Q₁ | 铭牌标称流量 | m³/h, L/s, gpm |
| 额定扬程 H₁ | 铭牌标称扬程 | m, ft, kPa |
| 额定功率 P₁ | 铭牌标称轴功率 | kW, hp |
| 额定转速 n₁ | 铭牌标称转速 | rpm |
| 目标转速 n₂ | 拟调整到的转速 | rpm |

展开"来源与备注"填写数据出处（如"设备铭牌"），便于后续追溯。

点击"计算并保存"，系统按相似律三公式给出结果：

- Q₂ = Q₁ × (n₂/n₁)
- H₂ = H₁ × (n₂/n₁)²
- P₂ = P₁ × (n₂/n₁)³

## 怎样复现单位混用

1. 在计算工作台将流量单位改为 **gpm**（英制），扬程保持 **m**（公制），功率保持 **kW**（公制）
2. 点击"计算并保存"
3. 结果区域出现红色边框警告：`单位制混用：流量[gpm]属于imperial制，扬程[m]属于metric制，功率[kW]属于metric制，计算结果可能不具备工程参考价值`
4. 受影响的结果卡片（目标流量/扬程/功率）显示琥珀色高亮边框
5. 校验不会阻止计算，但明确标注了哪几个结果字段受影响

同理，将目标转速设为 50000 rpm（超出 100–10000 rpm 范围），会触发 `SPEED_OUT_OF_RANGE` 警告，标注受影响字段。

## 怎样查看报告导出

1. 进入"报告导出"页面
2. 按状态筛选或直接勾选记录
3. 选择格式：
   - **CSV**：适合 Excel 打开，每条记录一行
   - **JSON**：保留完整结构，含校验警告详情和状态流转记录
4. 点击导出按钮，浏览器下载文件

也可在计算记录列表点击单条记录的导出图标，或在详情页点击 JSON/CSV 按钮。

## 核心流程

```
计算工作台 → 输入参数 → 校验（单位混用/转速越界/工况缺失）→ 相似律计算 → 保存草稿
     ↓
计算记录列表 → 查看详情 → 状态推进（草稿→已审核→已批准→已归档）
     ↓
报告导出 → 选记录 → 选格式 → 下载
```

从任意结果可追溯到：相似律计算 → 效率校验 → 状态流转 → 来源版本。

## 验证命令

启动服务后，用 curl 走一遍关键流程：

```bash
# 1. 健康检查
curl -s http://localhost:3001/api/health
# 期望: {"success":true,"message":"ok"}

# 2. 正常计算
curl -s -X POST http://localhost:3001/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "ratedFlow":100,"ratedFlowUnit":"m3/h",
    "ratedHead":30,"ratedHeadUnit":"m",
    "ratedPower":15,"ratedPowerUnit":"kW",
    "ratedSpeed":1450,"targetSpeed":960,
    "speedUnit":"rpm","source":"铭牌"
  }'
# 期望: success=true, targetFlow≈66.21, targetHead≈13.15, targetPower≈4.35, warnings=[]

# 3. 单位混用（流量用 gpm，扬程用 m，功率用 kW）
curl -s -X POST http://localhost:3001/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "ratedFlow":100,"ratedFlowUnit":"gpm",
    "ratedHead":30,"ratedHeadUnit":"m",
    "ratedPower":15,"ratedPowerUnit":"kW",
    "ratedSpeed":1450,"targetSpeed":960,
    "speedUnit":"rpm","source":"混用测试"
  }'
# 期望: warnings 包含 {"code":"UNIT_MIX","affectedFields":["targetFlow","targetHead","targetPower"]}

# 4. 转速越界
curl -s -X POST http://localhost:3001/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "ratedFlow":100,"ratedFlowUnit":"m3/h",
    "ratedHead":30,"ratedHeadUnit":"m",
    "ratedPower":15,"ratedPowerUnit":"kW",
    "ratedSpeed":1450,"targetSpeed":50000,
    "speedUnit":"rpm","source":"越界测试"
  }'
# 期望: warnings 包含 {"code":"SPEED_OUT_OF_RANGE",...}

# 5. 查看记录列表
curl -s "http://localhost:3001/api/records?pageSize=3"
# 期望: success=true, data.data 为数组

# 6. 状态推进（用步骤2返回的 id 替换 <ID>）
curl -s -X PATCH http://localhost:3001/api/records/<ID>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"reviewed","operator":"审核人","comment":"参数核实无误"}'
# 期望: status 变为 "reviewed", statusHistory 增加一条

# 7. 导出 CSV
curl -s "http://localhost:3001/api/export/<ID>?format=csv" | head -2
# 期望: 第一行为表头，第二行为数据

# 8. 导出 JSON
curl -s "http://localhost:3001/api/export/<ID>?format=json" | head -10
# 期望: JSON 结构含 报告信息、输入参数、计算结果、校验警告、状态流转
```

## 技术栈

- 前端: React 18 + Vite + TailwindCSS + Zustand
- 后端: Express 4 + TypeScript (ESM) + better-sqlite3
- 数据库: SQLite（`data/pump.db`，首次启动自动创建）
- 类型: `shared/types.ts` 前后端共用

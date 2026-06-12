# 滩涂贝类采样日程 - 操作指南

## 一、启动系统

### 前置条件
- Node.js >= 18
- npm 或 pnpm

### 从空目录开始

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（前端 + 后端）
npm run dev
```

启动后：
- 前端地址：http://localhost:5173/
- 后端 API：http://localhost:3001/
- 数据库文件自动创建：`data/tidal_sampling.db`（SQLite 本地文件）

### 重置数据库

```bash
# 删除现有数据库，重新初始化（含种子数据）
bash scripts/reset-db.sh
# 然后重启服务
npm run dev
```

---

## 二、数据导入

### 方式 1：通过前端页面
1. 打开 http://localhost:5173/records
2. 点击「批量导入」按钮
3. 粘贴 JSON 数组格式数据

### 方式 2：通过 curl

```bash
# 导入单条记录
curl -X POST http://localhost:3001/api/records \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-06-13",
    "area": "北滩D区",
    "species": "青蛤",
    "wind_wave_forecast": "东风3级，浪高0.6m",
    "tide_data": "大潮汐，潮差4.0m",
    "water_quality": "pH 8.0, DO 7.0mg/L"
  }'

# 批量导入
curl -X POST http://localhost:3001/api/records/import \
  -H "Content-Type: application/json" \
  -d '[
    {
      "date": "2026-06-14",
      "area": "东滩E区",
      "species": "花蛤",
      "wind_wave_forecast": null,
      "tide_data": "中潮汐，潮差3.0m",
      "water_quality": null
    }
  ]'
```

### 方式 3：运行示例脚本

```bash
bash scripts/curl-examples.sh
```

---

## 三、查看异常

### 风险分级规则
| 等级 | 标签颜色 | 含义 |
|------|----------|------|
| 顺利 | 绿色 | 所有数据完备，无异常 |
| 待确认 | 黄色 | 存在数据缺失（风浪预报晚到、水质记录缺失等） |
| 异常 | 红色 | 禁航区越界、风浪超标、水质异常 |

### 查看操作
1. 打开 http://localhost:5173/anomalies
2. 点击「查看影响」按钮，查看哪些结论受数据缺失影响
3. 系统不会悄悄覆盖旧结果，数据补录后结论自动更新

### 影响链说明
当水质记录或风浪预报晚到时，系统会明确标注：
- 受影响的具体结论（如：采样航行安全评估）
- 缺失的数据项（如：风浪预报）
- 影响说明（如：风浪条件缺失，无法评估航行安全）

---

## 四、数据补录

### 补录操作
1. 在任一页面点击「编辑/补录」按钮
2. 填写缺失的字段
3. 保存后系统自动：
   - 重新计算风险等级
   - 更新受影响结论
   - 同步刷新报告导出内容

### 补录示例（curl）

```bash
# 补录潮汐表
curl -X PUT http://localhost:3001/api/records/2 \
  -H "Content-Type: application/json" \
  -d '{"tide_data": "大潮汐，潮差4.1m"}'

# 补录风浪预报
curl -X PUT http://localhost:3001/api/records/2 \
  -H "Content-Type: application/json" \
  -d '{"wind_wave_forecast": "南风3级，浪高0.6m"}'

# 复核确认
curl -X PUT http://localhost:3001/api/records/2 \
  -H "Content-Type: application/json" \
  -d '{"confirmed": true}'
```

---

## 五、导出报告

### 方式 1：前端导出
1. 打开 http://localhost:5173/export
2. 预览报告内容（含结论溯源说明）
3. 点击「导出 JSON」或「导出 CSV」

### 方式 2：curl 导出

```bash
# 导出 JSON 报告
curl -s http://localhost:3001/api/export?format=json -o report.json

# 导出 CSV 报告
curl -s http://localhost:3001/api/export?format=csv -o report.csv
```

### 报告内容说明
- 每条结论标注数据来源（风浪预报/潮汐数据/水质记录）
- 待确认记录附有风险说明：
  > 风浪预报晚到期间，采样航行安全、贝类污染风险评估结论为暂定值，可能存在偏差。
- 异常记录说明拦截原因，海事处可直接查看
- 数据补录后重新导出，报告结论自动更新

---

## 六、种子数据说明

系统启动后自动生成 3 条示例：

| ID | 日期 | 区域 | 品种 | 状态 | 风险因素 |
|----|------|------|------|------|----------|
| 1 | 2026-06-10 | 东滩A区 | 缢蛏 | 顺利 | 无 |
| 2 | 2026-06-11 | 西滩B区 | 泥蚶 | 待确认 | 风浪预报晚到、水质记录缺失 |
| 3 | 2026-06-12 | 南滩C区 | 文蛤 | 异常 | 禁航区越界、水质异常 |

---

## 七、常用 curl 命令速查

```bash
# 健康检查
curl http://localhost:3001/api/health

# 所有记录
curl http://localhost:3001/api/records

# 筛选待确认
curl "http://localhost:3001/api/records?risk_level=pending"

# 异常分组
curl http://localhost:3001/api/anomalies

# 查看影响链
curl http://localhost:3001/api/anomalies/impact/2

# 报告预览
curl http://localhost:3001/api/export/preview
```

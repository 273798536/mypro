# 无人机航片拼接复核系统

专为安全培训师设计的无人机航片拼接复核工具，省去反复查讲解备注、问同事、改评分表的繁琐步骤。

## ✨ 核心特性

- **异常标注（日常入口）**：快速查看、筛选、导入异常标注记录
- **图、表、文字说明三者对得上**：可视化图表与数据表格联动，信息一致
- **缩放平移复核（月底/课前）**：交互式验证异常点的缩放和平移准确性
- **追溯倒查**：从复核结果一路回溯到原始来源和处理记录
- **防重复导入**：基于哈希+唯一约束双重检测，同一件事不会出现两份结论
- **补录不混乱**：更新操作走补录流程，保留完整变更历史
- **导出一致性**：界面摘要与导出文件内容严格校验，避免"页面通过、文件待确认"

## 🚀 快速开始（从空目录开始）

### 1. 安装依赖

```bash
cd /Users/mac/pro/solo/workspaces/y12613
npm install
```

**依赖说明**：
- `express` - Web服务器框架
- `sqlite3` - 嵌入式数据库（无需额外安装数据库服务）
- `cors` - 跨域支持
- `json2csv` - CSV导出

### 2. 初始化样例数据

```bash
npm run init-sample
```

**样例数据位置**：
- 数据库文件：`data/uav_review.db`
- 第一份样例：批次 `UAV-2026-001`，图片 `DJI_0001`，异常类型 `拼接错位`
- 测试重复数据：ID=1 的记录（坐标: 116.397128, 39.916527）

**样例初始化完成后会看到**：
```
成功导入: 7 条
重复跳过: 2 条
已有复核: 3 条
补录测试: 1 条
```

### 3. 启动服务

```bash
npm start
```

启动成功后会显示：
```
服务地址: http://localhost:3000
```

### 4. 访问系统

打开浏览器访问：**http://localhost:3000**

## 📋 验收测试清单

### 🎯 测试1：重复导入检测
```
操作：导入一条与ID=1完全相同的记录（批次UAV-2026-001，图片DJI_0001，坐标116.397128,39.916527）
预期：系统提示"重复标注"，数据库中该记录仍只有1条
```

### 🎯 测试2：追溯链路完整性
```
操作：在"追溯倒查"页面输入ID=1查询
预期：
  1. 看到原始来源节点（来源文件、标注人、标注时间）
  2. 看到处理过程节点（导入、复核操作记录）
  3. 看到复核结论节点（结果、评分、备注）
  4. 点击"验证数据一致性"按钮显示"验证通过"
```

### 🎯 测试3：图、表、文字说明一致
```
操作：在"异常标注"页面
预期：
  1. 柱状图显示各异常类型数量
  2. 鼠标悬停图表显示通过/不通过/待复核明细
  3. 下方表格数据与图表完全对应
  4. 顶部统计卡片数字与表格汇总一致
```

### 🎯 测试4：缩放平移复核
```
操作：
  1. 进入"缩放平移复核"页面
  2. 选择批次UAV-2026-001，点击"加载待复核数据"
  3. 点击左侧红色异常点
  4. 使用缩放按钮（+/-）或键盘+/-键缩放
  5. 使用方向键平移
  6. 填写复核表单并提交
预期：异常点颜色变为绿色（通过）或红色（不通过），状态同步更新
```

### 🎯 测试5：导出一致性校验
```
操作：
  1. 进入"导出报告"页面
  2. 点击"预览导出内容"
  3. 查看"一致性校验"区域
  4. 点击"导出CSV"
预期：
  1. 显示"一致性校验通过"
  2. 导出的CSV文件中，每条记录的状态与界面显示完全一致
  3. CSV文件头包含"复核结论"字段，与页面结论一致
```

### 🎯 测试6：补录不产生重复
```
操作：
  1. 在异常列表中点击ID=4的"补录"按钮
  2. 修改描述和缩放级别后提交
  3. 查看异常列表
预期：记录仍只有1条，ID不变，更新时间变为最新
```

## 📁 项目结构

```
.
├── package.json              # 项目配置
├── server.js                 # 服务器入口
├── README.md                 # 本文档
├── data/                     # 数据库目录
│   └── uav_review.db         # SQLite数据库（运行后生成）
├── src/                      # 后端源码
│   ├── db.js                 # 数据库连接与初始化
│   ├── services.js           # 核心业务逻辑
│   └── export.js             # 导出服务
├── scripts/                  # 脚本
│   └── init-sample.js        # 样例数据初始化脚本
└── public/                   # 前端静态资源
    ├── index.html            # 主页面
    ├── css/
    │   └── style.css         # 样式文件
    └── js/
        └── app.js            # 前端业务逻辑
```

## 🔌 API接口文档

### 基础路径：`/api`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/annotations` | 获取标注列表（支持?batch_no=&status=&anomaly_type=筛选） |
| GET | `/annotations/:id` | 获取单条标注详情（含追溯链路） |
| POST | `/annotations` | 单条导入标注 |
| POST | `/annotations/batch` | 批量导入标注 |
| PUT | `/annotations/:id/supplement` | 补录更新标注 |
| POST | `/reviews` | 提交复核结果 |
| GET | `/summary` | 获取汇总统计 |
| GET | `/trace/:id` | 获取追溯链路 |
| POST | `/check-duplicate` | 检查重复 |
| GET | `/export/summary` | 获取导出摘要（用于一致性校验） |
| GET | `/export` | 导出CSV报告 |

### 批量导入请求格式

```json
{
  "operator": "张三",
  "records": [
    {
      "batch_no": "UAV-2026-001",
      "image_id": "DJI_0001",
      "anomaly_type": "拼接错位",
      "anomaly_desc": "道路错位约5米",
      "coordinate_x": 116.397128,
      "coordinate_y": 39.916527,
      "zoom_level": 18,
      "pan_offset_x": 125,
      "pan_offset_y": 89,
      "operator": "李四",
      "source_file": "UAV-2026-001/DJI_0001.JPG"
    }
  ]
}
```

## 🗄️ 数据库设计

### annotation_records（标注记录表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| batch_no | TEXT | 批次号 |
| image_id | TEXT | 图片ID |
| anomaly_type | TEXT | 异常类型 |
| anomaly_desc | TEXT | 异常描述 |
| coordinate_x | REAL | 坐标X |
| coordinate_y | REAL | 坐标Y |
| zoom_level | REAL | 缩放级别 |
| pan_offset_x | REAL | 平移X偏移 |
| pan_offset_y | REAL | 平移Y偏移 |
| operator | TEXT | 标注人员 |
| operate_time | TEXT | 标注时间 |
| source_file | TEXT | 来源文件 |
| import_hash | TEXT | 导入哈希（用于重复检测） |
| status | TEXT | 状态：pending/pass/fail |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

**唯一约束**：(batch_no, image_id, anomaly_type, coordinate_x, coordinate_y)

### review_results（复核结果表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| annotation_id | INTEGER | 关联标注ID |
| reviewer | TEXT | 复核人 |
| review_result | TEXT | 复核结果：pass/fail/pending |
| review_comment | TEXT | 复核备注 |
| score | INTEGER | 评分0-100 |
| review_time | TEXT | 复核时间 |
| zoom_verify_passed | INTEGER | 缩放验证是否通过 |
| pan_verify_passed | INTEGER | 平移验证是否通过 |
| traceability_chain | TEXT | 追溯链路JSON快照 |

### process_logs（处理日志表）

用于追溯链路构建，记录每一次变更的前后值。

## 🔍 重复检测机制

采用**双重检测**确保不会重复导入：

1. **应用层检测**：导入前计算 `import_hash = md5(batch_no + image_id + anomaly_type + coordinate_x + coordinate_y)`，查询是否存在相同哈希
2. **数据库层检测**：表级唯一约束 `UNIQUE(batch_no, image_id, anomaly_type, coordinate_x, coordinate_y)`

即使应用层检测被绕过，数据库层也会拒绝重复插入。

## 📤 导出一致性保障

导出前通过 `/api/export/summary` 接口获取导出摘要，前端再单独请求 `/api/annotations` 获取界面数据，两者比对：

```javascript
// 关键校验逻辑
const isConsistent = 
  uiPassCount === exportPassCount &&
  uiFailCount === exportFailCount &&
  uiPendingCount === exportPendingCount;
```

校验不通过时显示醒目的错误提示，防止导出不一致的数据。

## ⌨️ 快捷键（缩放平移复核页面）

| 快捷键 | 功能 |
|--------|------|
| `+` / `=` | 放大 |
| `-` | 缩小 |
| `↑` | 向上平移 |
| `↓` | 向下平移 |
| `←` | 向左平移 |
| `→` | 向右平移 |

## 🛠️ 常见问题

### Q: 数据库文件在哪里？可以直接查看吗？
A: 数据库文件在 `data/uav_review.db`，可以使用 SQLite 客户端（如 DB Browser for SQLite）直接打开查看。

### Q: 如何重置所有数据？
A: 删除 `data/uav_review.db` 文件，然后重新运行 `npm run init-sample`。

### Q: 如何修改端口？
A: 启动时指定端口：`PORT=8080 npm start`

### Q: 导出的CSV用Excel打开乱码？
A: 导出文件已带UTF-8 BOM头，Excel 2016及以上版本可直接打开。如遇乱码，请用记事本打开后另存为ANSI格式。

## 📝 更新日志

### v1.0.0 (2026-06-04)
- 初始版本发布
- 实现异常标注管理
- 实现缩放平移交互复核
- 实现完整追溯链路
- 实现重复导入检测
- 实现导出一致性校验
- 提供可复现的样例数据集

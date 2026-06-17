# 客服机器人意图漂移检测 - API 使用示例

## 🚀 快速开始（从空目录跑通流程）

### 1. 环境准备

```bash
# 克隆或创建项目目录
mkdir intent-drift-detection
cd intent-drift-detection

# 安装依赖
npm install
```

### 2. 初始化数据库

```bash
# 初始化数据库表结构 + 基础数据（提示词版本、材料批次）
npx tsx scripts/init-db.ts

# 导入样例数据（包含20条对话、版本历史、坏数据等）
npx tsx scripts/seed-sample-data.ts
```

### 3. 启动服务

```bash
# 前端 (Vite) + 后端 (Express) 同时启动
npm run dev
```

服务启动后：
- 前端：http://localhost:5173
- 后端 API：http://localhost:3001

---

## 📡 CURL 示例

### 1. 获取仪表盘统计

```bash
curl -X GET "http://localhost:3001/api/stats/dashboard" \
  -H "Content-Type: application/json"
```

**预期响应：**
```json
{
  "success": true,
  "data": {
    "total": 20,
    "reviewed": 8,
    "pending": 12,
    "driftRate": 35,
    "riskDistribution": {
      "high": 3,
      "medium": 7,
      "low": 8,
      "none": 2
    },
    "bySource": {
      "annotation": 8,
      "segmentation": 7,
      "training": 5
    },
    "byIntent": {
      "refund": 5,
      "inquiry": 6,
      "complaint": 3,
      "praise": 2,
      "suggestion": 2,
      "other": 2
    },
    "recentDrifts": [...]
  }
}
```

---

### 2. 获取对话列表（支持筛选）

```bash
# 获取所有对话（分页，每页20条）
curl -X GET "http://localhost:3001/api/conversations?page=1&pageSize=20" \
  -H "Content-Type: application/json"

# 只查看有漂移的对话
curl -X GET "http://localhost:3001/api/conversations?hasDrift=true" \
  -H "Content-Type: application/json"

# 按风险等级筛选
curl -X GET "http://localhost:3001/api/conversations?riskLevel=high" \
  -H "Content-Type: application/json"

# 按来源筛选
curl -X GET "http://localhost:3001/api/conversations?sourceType=segmentation" \
  -H "Content-Type: application/json"

# 关键词搜索
curl -X GET "http://localhost:3001/api/conversations?search=退款" \
  -H "Content-Type: application/json"

# 组合筛选：高风险 + 有漂移 + 切分清单来源
curl -X GET "http://localhost:3001/api/conversations?riskLevel=high&hasDrift=true&sourceType=segmentation" \
  -H "Content-Type: application/json"
```

---

### 3. 获取单条对话详情

```bash
# 注意：将 CONVERSATION_ID 替换为实际的对话ID，例如 BAD-001, S007 等
curl -X GET "http://localhost:3001/api/conversations/{CONVERSATION_ID}" \
  -H "Content-Type: application/json"

# 示例：获取坏数据 BAD-001（空字段）的详情
curl -X GET "http://localhost:3001/api/conversations/BAD-001" \
  -H "Content-Type: application/json"

# 示例：获取标注错误 S007 的详情
curl -X GET "http://localhost:3001/api/conversations/S007" \
  -H "Content-Type: application/json"
```

---

### 4. 获取对话的版本历史

```bash
curl -X GET "http://localhost:3001/api/conversations/{CONVERSATION_ID}/versions" \
  -H "Content-Type: application/json"

# 示例：查看 S007 的版本历史（包含人工修正记录）
curl -X GET "http://localhost:3001/api/conversations/S007/versions" \
  -H "Content-Type: application/json"
```

**预期响应包含：**
- 原始标注（annotation）
- AI预测（prediction）
- 人工修正（manual）
- 版本回滚（rollback，如果有）

---

### 5. 人工复核修正意图

```bash
curl -X PUT "http://localhost:3001/api/conversations/{CONVERSATION_ID}/review" \
  -H "Content-Type: application/json" \
  -d '{
    "correctedIntent": "inquiry",
    "reviewRemark": "用户只是询问退款流程，没有明确的退款请求，应该归为咨询类",
    "operator": "张工程师"
  }'

# 示例：修正 S008 的意图
curl -X PUT "http://localhost:3001/api/conversations/S008/review" \
  -H "Content-Type: application/json" \
  -d '{
    "correctedIntent": "refund",
    "reviewRemark": "用户明确要求退款，之前标注为other是错误的",
    "operator": "李主管"
  }'
```

**预期响应：**
```json
{
  "success": true,
  "data": {
    "conversation": {...},
    "versionRecord": {...},
    "reviewRecord": {...}
  }
}
```

> **重要：** 复核后会自动创建新版本记录和复核记录，版本追踪完整可追溯。

---

### 6. 版本回滚

```bash
curl -X POST "http://localhost:3001/api/conversations/{CONVERSATION_ID}/rollback" \
  -H "Content-Type: application/json" \
  -d '{
    "versionId": "{VERSION_ID}",
    "operator": "王工程师"
  }'

# 示例：回滚 T010 到之前的版本
curl -X POST "http://localhost:3001/api/conversations/T010/rollback" \
  -H "Content-Type: application/json" \
  -d '{
    "versionId": "ver_abc123",
    "operator": "赵主管"
  }'
```

---

### 7. 版本对比

```bash
curl -X GET "http://localhost:3001/api/conversations/versions/compare?v1={VERSION_ID_1}&v2={VERSION_ID_2}" \
  -H "Content-Type: application/json"
```

---

### 8. 获取截断说明（非技术友好）

```bash
curl -X GET "http://localhost:3001/api/conversations/truncations/info" \
  -H "Content-Type: application/json"
```

**预期响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "conversationId": "BAD-002",
      "technicalReason": "max_tokens_exceeded: context length > 4096 tokens",
      "humanReadableReason": "对话内容过长，为保证分析准确性，系统自动保留了核心内容，省略了部分历史聊天记录",
      "truncatedLength": 5234,
      "maxLength": 4096
    }
  ]
}
```

> ✅ `humanReadableReason` 是给业务方看的通俗解释，不是技术字段名。

---

### 9. 获取工具调用错误（定位到具体文件和行号）

```bash
curl -X GET "http://localhost:3001/api/conversations/tool-errors/info" \
  -H "Content-Type: application/json"
```

**预期响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "conversationId": "BAD-003",
      "toolName": "parse_amount",
      "errorType": "missing_unit",
      "technicalMessage": "Unit field is empty, value: '元'",
      "humanReadableMessage": "金额字段缺少单位，请检查：金额只写了'元'，没有填写具体数字",
      "sourceFile": "切分清单 CSV",
      "lineNumber": 7,
      "parameterName": "amount"
    }
  ]
}
```

> ✅ 业务方看报告时，能直接知道是「切分清单 CSV 第7行」的金额字段有问题。

---

### 10. 生成报告

```bash
# 生成 Excel 报告
curl -X POST "http://localhost:3001/api/report/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "excel",
    "includeRawData": true,
    "includeVersions": true,
    "generatedBy": "张工程师"
  }'

# 生成 PDF 报告（带日期范围）
curl -X POST "http://localhost:3001/api/report/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "pdf",
    "startDate": "2026-06-01",
    "endDate": "2026-06-30",
    "includeRawData": true,
    "includeVersions": true,
    "generatedBy": "李运营"
  }'

# 生成 Word 报告
curl -X POST "http://localhost:3001/api/report/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "word",
    "includeRawData": false,
    "includeVersions": true,
    "generatedBy": "王主管"
  }'
```

---

### 11. 下载报告

```bash
# 将 REPORT_ID 替换为上一步返回的 reportId
curl -X GET "http://localhost:3001/api/report/download/{REPORT_ID}" \
  -o "intent-drift-report.xlsx"
```

---

### 12. 材料导入（上传文件）

```bash
# 导入 CSV 文件
curl -X POST "http://localhost:3001/api/material/import" \
  -F "file=@/path/to/your/data.csv" \
  -F "sourceType=segmentation" \
  -F "operator=李运营"

# 导入 JSON 文件（训练样本）
curl -X POST "http://localhost:3001/api/material/import" \
  -F "file=@/path/to/your/training_data.json" \
  -F "sourceType=training" \
  -F "operator=王工程师"

# 导入 Excel 文件（标注记录）
curl -X POST "http://localhost:3001/api/material/import" \
  -F "file=@/path/to/your/annotations.xlsx" \
  -F "sourceType=annotation" \
  -F "operator=张主管"
```

**支持的来源类型：**
- `annotation` - 标注记录
- `segmentation` - 切分清单
- `training` - 训练样本

---

### 13. 提示词版本管理

```bash
# 获取所有提示词版本
curl -X GET "http://localhost:3001/api/prompt-versions" \
  -H "Content-Type: application/json"

# 获取当前激活的提示词版本
curl -X GET "http://localhost:3001/api/prompt-versions/active" \
  -H "Content-Type: application/json"

# 创建新的提示词版本
curl -X POST "http://localhost:3001/api/prompt-versions" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "v2.1.0",
    "content": "你是一个客服机器人，请准确识别用户意图...",
    "description": "优化了退款意图的判断逻辑，增加了单位校验",
    "createdBy": "王工程师",
    "isActive": false
  }'

# 激活某个提示词版本（会自动停用旧版本）
curl -X PUT "http://localhost:3001/api/prompt-versions/{PROMPT_ID}/activate" \
  -H "Content-Type: application/json"
```

---

## 📜 完整脚本示例

### 一键初始化并启动（脚本）

创建 `start.sh`：

```bash
#!/bin/bash

echo "=========================================="
echo "  客服机器人意图漂移检测系统 - 启动脚本"
echo "=========================================="

echo ""
echo "[1/4] 安装依赖..."
npm install

echo ""
echo "[2/4] 初始化数据库..."
npx tsx scripts/init-db.ts

echo ""
echo "[3/4] 导入样例数据..."
npx tsx scripts/seed-sample-data.ts

echo ""
echo "[4/4] 启动开发服务器..."
echo ""
echo "前端: http://localhost:5173"
echo "后端: http://localhost:3001"
echo ""
npm run dev
```

使用方法：
```bash
chmod +x start.sh
./start.sh
```

---

### 批量复核脚本（Node.js）

创建 `batch-review.js`：

```javascript
import { conversationApi } from './src/utils/api';

// 需要复核的对话列表
const reviews = [
  {
    id: 'S007',
    correctedIntent: 'inquiry',
    reviewRemark: 'S007原标注错误，用户只是询问退款政策，属于咨询类',
    operator: '批量复核脚本'
  },
  {
    id: 'S008',
    correctedIntent: 'refund',
    reviewRemark: 'S008原标注错误，用户明确要求退款，属于退款类',
    operator: '批量复核脚本'
  }
];

async function batchReview() {
  console.log('开始批量复核...');

  for (const review of reviews) {
    try {
      const result = await conversationApi.review(review.id, {
        correctedIntent: review.correctedIntent,
        reviewRemark: review.reviewRemark,
        operator: review.operator
      });
      console.log(`✅ ${review.id}: 复核成功`);
    } catch (error) {
      console.error(`❌ ${review.id}: 复核失败 -`, error.message);
    }
  }

  console.log('\n批量复核完成！');
}

batchReview();
```

运行：
```bash
npx tsx batch-review.js
```

---

## 🎯 样例数据说明

### 故意设计的坏数据（贴近日常场景）

| 会话ID | 问题类型 | 描述 |
|--------|----------|------|
| BAD-001 | 空字段 | 用户输入为空，像日常漏填的数据 |
| BAD-002 | 超长文本 | 对话内容超过4096 token，被自动截断 |
| BAD-003 | 漏填单位 | 金额只写了"元"，没有具体数字，像切分清单里的小错误 |
| BAD-004 | 敏感词 | 包含需要清理的敏感内容 |
| S007 | 标注错误 | 原标注 refund 实际应为 inquiry |
| S008 | 标注错误 | 原标注 other 实际应为 refund |
| T010 | 版本回滚 | 包含完整的版本回滚记录 |

### 每条对话都包含

1. ✅ **训练样本关联** - training_sample_id 字段
2. ✅ **提示词版本关联** - prompt_version_id 字段
3. ✅ **完整版本链** - 原始标注 → AI预测 → 人工修正 → 版本回滚
4. ✅ **材料来源** - 标注记录 / 切分清单 / 训练样本
5. ✅ **旧备注保留** - 如「【旧备注】2026-05-10 王主管已审核...」

---

## 🔍 日常使用流程

### 完整工作流

1. **材料导入** → 上传标注记录、切分清单、训练样本
2. **自动检测** → 系统自动检测意图漂移
3. **人工复核** → 对漂移的对话进行人工修正
4. **版本追踪** → 查看变更历史，支持对比和回滚
5. **报告导出** → 生成 Excel/PDF/Word 报告给业务方

### 业务方拿到的报告包含

- 📊 数据概览统计
- ⚠️ 漂移列表（含人工修正记录）
- 📝 截断原因的**通俗解释**（不是技术字段名）
- 🎯 错误精确定位（**切分清单第7行** 这种）
- 📜 完整版本历史
- 🔗 关联的提示词版本和训练样本

---

## 💡 常见问题

### Q: 数据库文件在哪？
A: `./data/intent_drift.db`（SQLite 本地文件，无需额外服务）

### Q: 如何重置数据库？
A: 删除 `./data/intent_drift.db`，然后重新运行 `npx tsx scripts/init-db.ts`

### Q: 报告里的截断原因是给谁看的？
A: `humanReadableReason` 是给业务方看的通俗语言，`technicalReason` 是给工程师看的技术详情。

### Q: 版本回滚会丢失数据吗？
A: 不会。回滚操作会创建一条新的版本记录（type=rollback），所有历史版本都会保留。

### Q: 同一轮复核能看到训练样本、提示词版本和回滚记录吗？
A: 可以。每条对话的版本历史中包含所有关联信息，让业务方能看出处理的是**眼前这批具体材料**。

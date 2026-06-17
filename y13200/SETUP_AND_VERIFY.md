# 巡演耳返版本复核系统 - 分步安装与验证指南

## ⚠️ 重要：在开始之前

请按照以下步骤**严格顺序执行**，每一步都需要看到预期结果再继续下一步。

---

## 步骤 1：环境检查（必须先通过这一步）

### 1.1 检查 Node.js 版本

```bash
node -v
```

**预期输出**：`v18.x.x` 或更高（推荐 v18.17+ 或 v20.x）

**如果版本太低**：请升级 Node.js，推荐使用 [nvm](https://github.com/nvm-sh/nvm)：
```bash
nvm install 20
nvm use 20
```

### 1.2 检查 npm 版本

```bash
npm -v
```

**预期输出**：`9.x.x` 或更高

### 1.3 进入项目目录

```bash
cd /Users/mac/pro/solo/workspaces/y13200
```

---

## 步骤 2：安装根目录依赖

```bash
npm install
```

**预期结果**：
- 没有 `ERR!` 开头的错误信息
- 最后会显示安装了多少个包
- 项目根目录会出现 `node_modules` 文件夹

**常见问题**：
- 如果安装慢，可以使用镜像：`npm config set registry https://registry.npmmirror.com`

---

## 步骤 3：安装后端依赖并验证构建

### 3.1 安装后端依赖

```bash
cd server
npm install
```

**预期结果**：
- 没有 `ERR!` 错误
- `server/node_modules` 被创建
- **特别确认**：`server/node_modules/.bin/nest` 文件存在（这是关键！）

**验证 nest CLI 是否可用**：
```bash
cd /Users/mac/pro/solo/workspaces/y13200/server
npx nest --version
```

**预期输出**：`10.x.x`（比如 `10.3.2`）

**如果提示 `nest: command not found`**：
```bash
# 重新安装 nest cli
npm install --save-dev @nestjs/cli@^10.3.2
# 再次验证
npx nest --version
```

### 3.2 验证后端构建

```bash
cd /Users/mac/pro/solo/workspaces/y13200/server
npm run build
```

**预期结果**：
- 没有 TypeScript 编译错误
- 最后输出类似：
  ```
  > nest build
  ✔  TSC  compiled successfully in 1234 ms
  ```
- `server/dist` 目录被创建，包含编译后的 JS 文件

---

## 步骤 4：安装前端依赖并验证构建

### 4.1 安装前端依赖

```bash
cd /Users/mac/pro/solo/workspaces/y13200/client
npm install
```

**预期结果**：
- 没有错误
- `client/node_modules` 被创建

### 4.2 验证前端 TypeScript 类型检查

```bash
cd /Users/mac/pro/solo/workspaces/y13200/client
npx tsc --noEmit
```

**预期结果**：
- 没有任何输出（表示没有类型错误）
- 或者输出 0 errors

### 4.3 验证前端构建

```bash
cd /Users/mac/pro/solo/workspaces/y13200/client
npm run build
```

**预期结果**：
- 构建成功，没有错误
- `client/dist` 目录被创建

---

## 步骤 5：启动后端服务（端口 3001）

### 5.1 开发模式启动（推荐用于验证）

打开一个**新的终端窗口**，执行：

```bash
cd /Users/mac/pro/solo/workspaces/y13200/server
npm run start:dev
```

**预期输出**（等待 5-10 秒）：
```
[Nest] 12345  - 2026/06/18 10:30:00     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 2026/06/18 10:30:00     LOG [InstanceLoader] AppModule dependencies initialized
...
🚀 Server is running on http://localhost:3001
📡 API prefix: /api
```

**保持这个终端窗口打开！** 不要关闭。

### 5.2 验证后端 API 是否可用

在浏览器中打开或在新终端执行：

```bash
curl http://localhost:3001/api/tracks?page=1&limit=5
```

**预期返回**（JSON 格式）：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "data": [...至少 5 首曲目...],
    "total": 5,
    "page": 1,
    "limit": 5
  },
  "timestamp": "..."
}
```

---

## 步骤 6：启动前端服务（端口 3000）

打开**另一个新的终端窗口**（不要关闭后端终端！），执行：

```bash
cd /Users/mac/pro/solo/workspaces/y13200/client
npm run dev
```

**预期输出**（等待 3-5 秒）：
```
  VITE v5.1.4  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**保持这个终端窗口打开！**

---

## 步骤 7：验证关键流程

在浏览器中打开：**http://localhost:3000/**

### 7.1 巡演看板页验证

**验证点**：
1. ✅ 页面加载无报错，控制台（F12）没有红色错误
2. ✅ 顶部 4 个统计卡片显示正确数字（20 首曲目、4 待处理、3 挂起等）
3. ✅ 状态饼图正确显示各状态占比
4. ✅ 时码偏差柱状图有数据，±500ms 有红色虚线
5. ✅ 待办清单有 3 个标签页可切换
6. ✅ 点击饼图的某个扇区，列表会自动筛选该状态

**调试技巧**：
- 打开浏览器开发者工具（F12）→ Network 标签
- 刷新页面，应该能看到请求：`/api/tracks`, `/api/tours/1/stats` 等
- 这些请求的状态应该是 **200**，不是 **404** 或 **500**

### 7.2 曲目列表页验证

点击左侧导航的「曲目列表」，或访问：http://localhost:3000/tracks

**验证点**：
1. ✅ 表格显示 20 首模拟曲目
2. ✅ 状态标签颜色正确（绿色=已通过，橙色=复核中，红色=挂起等）
3. ✅ 筛选工具栏可用（状态筛选、搜索框）
4. ✅ 每行最后有「查看」和「操作」按钮
5. ✅ 分页正常

### 7.3 曲目详情页验证

在曲目列表中，点击第一行（夜曲）的「查看」按钮

**验证点**：
1. ✅ 5 个标签页可正常切换：材料信息、版本历史、复核记录、备注历史、审计日志
2. ✅ 「备注历史」标签页显示变更链（3 条备注，从初版→v2→挂起）
3. ✅ 「版本历史」标签页可点击「对比差异」按钮
4. ✅ 全链路追溯面包屑显示正确的导航路径

### 7.4 CSV 导出页验证（⭐ 核心功能）

点击左侧导航的「CSV 导出」，或访问：http://localhost:3000/export

**验证点**：
1. ✅ 4 个模板卡片正常显示：
   - 现场沟通版（7 字段）
   - 运营核对版（13 字段）
   - 完整明细版（21 字段）
   - 时码专项版（12 字段）
2. ✅ 点击「完整明细版」卡片，会选中它
3. ✅ 数据预览区域显示前 10 行数据
4. ✅ 点击右上角「导出 CSV」按钮
5. ✅ 浏览器会下载一个 CSV 文件

**验证导出文件**：
打开下载的 CSV 文件，检查：
- 第一行是表头：`trackNo,title,artist,expectedDuration,expectedTimecode,...`
- 数据行有 20 行（20 首曲目）
- 状态字段是中文（已通过、挂起、待处理等）
- noteChain 字段显示完整的备注变更链

### 7.5 文件上传页验证（⭐ 真实后端调用）

点击左侧导航的「文件上传」，或访问：http://localhost:3000/upload

**验证点**：
1. ✅ 页面加载时，如果后端正常，不会报错
2. ✅ 如果后端没启动，会提示：`加载曲目列表失败: xxx，请确认后端服务是否启动`
3. ✅ 源批次号自动生成
4. ✅ 拖拽区域可点击

**真实上传测试（可选）**：
1. 找一个音频文件（mp3/wav 都可以，文件名叫 `01_夜曲_周杰伦.mp3` 最好）
2. 拖到上传区域
3. 上传进度条走到 100%
4. 点击「开始匹配分析」按钮
5. **应该会真实调用后端 `/api/matching/batch` 接口**
6. 分析完成后，显示匹配度、建议曲目、异常列表

---

## 步骤 8：命令行 API 验证（可选，深度验证）

### 8.1 验证时码挂起算法

```bash
curl -X POST http://localhost:3001/api/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "trackId": "1",
    "reviewType": "timecode",
    "reviewerId": "teacher-001",
    "reviewerName": "张老师"
  }'
```

**预期结果**：返回的 `timecodeCheck.status` 应该是 `suspend`（因为时码偏差 620ms > 500ms）

### 8.2 验证文件名匹配算法

```bash
curl -X POST http://localhost:3001/api/matching/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "materialId": "test-material-1",
    "fileName": "01_夜曲_立体声_v3.wav",
    "actualDuration": 225,
    "candidates": [
      {"trackId": "1", "trackNo": 1, "title": "夜曲", "artist": "周杰伦", "expectedDuration": 225, "score": 0},
      {"trackId": "2", "trackNo": 2, "title": "七里香", "artist": "周杰伦", "expectedDuration": 298, "score": 0},
      {"trackId": "3", "trackNo": 3, "title": "青花瓷", "artist": "周杰伦", "expectedDuration": 245, "score": 0}
    ]
  }'
```

**预期结果**：
- `matchType` 应该是 `"auto"`
- `trackId` 应该是 `"1"`（匹配「夜曲」）
- `confidence` 应该 > 0.9

### 8.3 验证 CSV 导出 API

```bash
curl -X POST http://localhost:3001/api/export \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "scene_communication",
    "exportedBy": "operator-001",
    "exportedByName": "小孟"
  }'
```

**预期结果**：返回导出任务信息，包含 `fileName` 和 `downloadUrl`

---

## 常见问题排查

### 问题 1：`nest: command not found`

**原因**：`@nestjs/cli` 没有正确安装在 devDependencies 中

**解决方法**：
```bash
cd /Users/mac/pro/solo/workspaces/y13200/server
rm -rf node_modules package-lock.json
npm install
# 再次验证
npx nest --version
```

### 问题 2：前端页面白屏，控制台 404 错误

**原因**：后端没启动，或者代理配置错误

**解决方法**：
1. 确认后端服务在端口 3001 运行
2. 检查 `client/vite.config.ts` 中的代理配置，确认 target 是 `http://localhost:3001`
3. 刷新前端页面

### 问题 3：上传文件时报错

**原因**：uploads 目录没有创建权限

**解决方法**：
```bash
cd /Users/mac/pro/solo/workspaces/y13200/server
mkdir -p uploads/audio uploads/image uploads/document uploads/other
chmod 755 uploads
```

### 问题 4：CSV 导出字段是英文不是中文

**原因**：这是设计如此，字段名是英文但值是中文。如需中文表头，修改：
- `server/src/modules/export/export.service.ts` 中的 `templates` 定义
- 在 `Papa.unparse` 时传入自定义表头映射

---

## 验证清单总结

在完成以上所有步骤后，请勾选以下内容：

- [x] Node.js >= 18 已安装
- [x] 根目录 `npm install` 成功
- [x] 后端 `npm install` 成功，`npx nest --version` 能输出版本号
- [x] 后端 `npm run build` 成功，无 TypeScript 错误
- [x] 后端 `npm run start:dev` 成功，监听 3001 端口
- [x] `curl http://localhost:3001/api/tracks` 返回 JSON 数据
- [x] 前端 `npm install` 成功
- [x] 前端 `npx tsc --noEmit` 无类型错误
- [x] 前端 `npm run dev` 成功，监听 3000 端口
- [x] 浏览器访问 http://localhost:3000 能看到巡演看板
- [x] 曲目列表页显示 20 首曲目
- [x] 曲目详情页 5 个标签页正常
- [x] CSV 导出页能下载文件，内容正确
- [x] 文件名匹配 API 返回正确结果
- [x] 时码偏差 >500ms 时返回 `suspend` 状态

---

## 端口说明

| 服务 | 端口 | 访问地址 |
|------|------|----------|
| 前端 (Vite) | 3000 | http://localhost:3000 |
| 后端 (NestJS) | 3001 | http://localhost:3001 |
| API 前缀 | - | http://localhost:3001/api |

前端 Vite 已配置代理：`/api/*` → `http://localhost:3001/api/*`

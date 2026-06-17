# 巡演耳返版本复核系统 - 快速开始指南

## 🚀 一键安装（推荐）

```bash
# 进入项目目录
cd /Users/mac/pro/solo/workspaces/y13200

# 赋予脚本执行权限
chmod +x install.sh start.sh

# 一键安装所有依赖并初始化数据库
./install.sh

# 一键启动前后端
./start.sh
```

---

## 📋 分步安装

如果一键脚本有问题，请按以下步骤手动安装：

### 步骤1: 安装根目录依赖

```bash
cd /Users/mac/pro/solo/workspaces/y13200
npm install
```

### 步骤2: 安装后端依赖并初始化数据库

```bash
cd server
npm install

# 生成 Prisma Client
npx prisma generate

# 初始化数据库（创建表结构）
npx prisma migrate dev --name init

# 填充模拟数据
npm run seed

cd ..
```

### 步骤3: 安装前端依赖

```bash
cd client
npm install
cd ..
```

### 步骤4: 启动服务

```bash
# 同时启动前后端（推荐）
npm run dev

# 或者分别启动
# 终端1: 启动后端
npm run dev:server

# 终端2: 启动前端
npm run dev:client
```

---

## 🌐 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端应用 | http://localhost:5173 | 主应用界面 |
| 后端API | http://localhost:3001/api | RESTful API |
| API文档 | http://localhost:3001/api/docs | Swagger API文档 |

---

## ✅ 功能验证清单

### 1. 巡演看板页 (`/`)

- [ ] 显示巡演名称和场次信息
- [ ] 4个统计卡片正常显示（总数、待处理、复核中、已通过）
- [ ] 状态分布饼图正常渲染，可点击筛选
- [ ] 时码偏差柱状图正常显示，±500ms红线标注
- [ ] 待办清单3个标签页可切换
- [ ] 点击待办项可跳转到曲目详情页

### 2. 曲目列表页 (`/tracks`)

- [ ] 表格显示20首曲目数据
- [ ] 状态标签颜色编码正确（挂起-红色、已通过-绿色等）
- [ ] 时码偏差列颜色编码正确（>500ms红色警告）
- [ ] 搜索框可按曲名、序号搜索
- [ ] 状态下拉筛选正常工作
- [ ] 点击行或"详情"按钮可跳转到曲目详情
- [ ] 分页控件正常工作

### 3. 曲目详情页 (`/tracks/:id`)

- [ ] 5个标签页可切换：材料信息、版本历史、复核记录、备注历史、审计日志
- [ ] **材料信息**标签页：
  - [ ] 显示当前版本材料完整信息
  - [ ] 6项证据清单可勾选
  - [ ] 快速操作按钮可用
- [ ] **版本历史**标签页：
  - [ ] 垂直时间线显示所有版本
  - [ ] 点击"查看差异"可弹出对比模态框
  - [ ] 非活跃版本有"激活此版本"按钮
- [ ] **复核记录**标签页：
  - [ ] 显示历次复核记录
  - [ ] 挂起状态显示处理表单
  - [ ] 3个单选选项：确认通过、驳回、保留挂起
- [ ] **备注历史**标签页：
  - [ ] 显示所有备注历史
  - [ ] 可添加新备注
  - [ ] 备注变更diff对比正常显示
- [ ] **审计日志**标签页：
  - [ ] 显示所有操作记录
  - [ ] 包含操作人、时间、详情

### 4. 文件上传页 (`/upload`)

- [ ] 源批次号自动生成
- [ ] 拖拽上传区域可用
- [ ] 上传后自动解析文件名
- [ ] 匹配预览表显示解析结果和置信度
- [ ] 异常项显示警告图标和说明
- [ ] 可手动调整匹配曲目
- [ ] 批量确认匹配功能可用

### 5. CSV导出页 (`/export`)

- [ ] 4个导出模板卡片可选择
- [ ] 选中模板高亮显示
- [ ] 字段配置器可勾选/取消字段
- [ ] 筛选面板可按状态、日期筛选
- [ ] 数据预览显示前5条数据
- [ ] 点击导出按钮可下载CSV文件
- [ ] 导出历史列表显示过往导出记录

### 6. 核心算法验证

#### 文件名匹配验证

```bash
# 测试文件名解析
curl -X POST http://localhost:3001/api/matching/analyze \
  -H "Content-Type: application/json" \
  -d '{"fileName": "01_夜曲_周杰伦_立体声_v3.wav", "duration": 225.3}'

# 预期输出:
# - 解析出曲目号: 1
# - 解析出曲名: 夜曲
# - 解析出艺人: 周杰伦
# - 解析出版本: v3
# - 匹配置信度 ≥ 90%
```

#### 时码偏差检测验证

```bash
# 测试时码偏差 > 500ms (半拍)
curl -X POST http://localhost:3001/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"trackId": "track-1", "reviewType": "timecode", "reviewerId": "teacher-001", "reviewerName": "张老师", "decision": "suspend", "comment": "测试"}'

# 预期输出:
# - timecodeCheck.status = "suspend"
# - deviation > 500ms
```

#### CSV导出示例

**现场沟通版CSV内容示例:**
```csv
trackNo,title,artist,expectedTimecode,timecodeDeviation,status,latestNote
1,夜曲,周杰伦,00:03:45.000,620,挂起,时码偏半拍，待现场老师确认
2,七里香,周杰伦,00:04:59.000,50,已通过,时码准确，音质良好，通过。
3,青花瓷,周杰伦,00:03:59.000,-200,不匹配,文件名缺少序号，待重新命名
```

---

## 🔧 常见问题

### 问题1: 端口被占用

```bash
# 查找占用端口的进程
lsof -ti:3001 | xargs kill -9  # 后端端口
lsof -ti:5173 | xargs kill -9   # 前端端口
```

### 问题2: 数据库损坏

```bash
# 删除旧数据库重新初始化
rm -f server/prisma/dev.db server/prisma/dev.db-journal
cd server
npx prisma migrate dev --name init
npm run seed
```

### 问题3: 依赖安装失败

```bash
# 清理缓存重新安装
rm -rf node_modules server/node_modules client/node_modules
rm -f package-lock.json server/package-lock.json client/package-lock.json
npm run install:all
```

### 问题4: Prisma Client 类型错误

```bash
cd server
npx prisma generate
```

---

## 📁 项目结构说明

```
y13200/
├── client/                 # 前端 React 应用
│   ├── src/
│   │   ├── api/           # API 接口定义
│   │   ├── components/    # 公共组件
│   │   │   ├── charts/    # 图表组件
│   │   │   └── common/    # 通用组件
│   │   ├── pages/         # 页面组件
│   │   ├── store/         # Zustand 状态管理
│   │   ├── types/         # TypeScript 类型
│   │   └── utils/         # 工具函数
│   └── package.json
├── server/                 # 后端 NestJS 应用
│   ├── src/
│   │   ├── common/        # 公共模块（过滤器、拦截器）
│   │   ├── modules/       # 业务模块
│   │   │   ├── tour/      # 巡演模块
│   │   │   ├── track/     # 曲目模块
│   │   │   ├── material/  # 材料模块
│   │   │   ├── matching/  # 匹配引擎
│   │   │   ├── review/    # 复核模块
│   │   │   ├── note/      # 备注模块
│   │   │   ├── audit/     # 审计模块
│   │   │   ├── file/      # 文件模块
│   │   │   └── export/    # 导出模块
│   │   └── prisma/        # Prisma Schema 和数据库
│   └── package.json
├── .trae/documents/       # 设计文档
│   ├── prd.md           # 产品需求文档
│   └── tech-arch.md     # 技术架构文档
├── install.sh             # 一键安装脚本
├── start.sh               # 一键启动脚本
└── README.md              # 项目说明
```

---

## 🎯 核心功能实现状态

| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 文件名智能匹配 | ✅ 完成 | Jaro-Winkler相似度算法，多维度匹配 |
| 版本管理 | ✅ 完成 | 多版本保留，覆盖确认，diff对比 |
| 时码偏差检测 | ✅ 完成 | >500ms自动挂起，强制人工确认 |
| 备注历史 | ✅ 完成 | 字段级历史，变更链，diff对比 |
| 全链路追溯 | ✅ 完成 | 图表→列表→详情→材料→历史 |
| 状态看板 | ✅ 完成 | 三栏布局，待办优先 |
| CSV多模板导出 | ✅ 完成 | 4种场景模板，自定义字段 |
| 审计日志 | ✅ 完成 | 所有操作留痕，不可篡改 |

---

## 📞 技术支持

如遇到问题，请检查：
1. Node.js 版本 ≥ 18.x
2. npm 版本 ≥ 9.x
3. 端口 3001 和 5173 未被占用
4. 有足够的磁盘空间（至少 1GB）

Enjoy! 🎉

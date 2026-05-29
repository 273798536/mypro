# AI训练损失地形 (Loss Landscape Visualizer)

面向机器学习讲师和学生的Web3D可视化教学工具，将抽象的损失函数、学习率和参数扰动转化为可交互的3D地形。

## 功能特性

### 核心功能
- 🌄 **3D损失地形可视化**：将损失函数转化为可旋转缩放的3D地形
- 📈 **训练轨迹动画**：动态展示训练过程在损失面上的移动路径
- 🎯 **异常检测**：自动识别三类常见训练异常：
  - ⏱️ **日志缺步**：检测训练日志中的数据缺失
  - 💥 **损失爆炸**：识别损失值突然飙升的发散点
  - 📏 **坐标尺度误读**：提示损失值跨度过大导致的视觉失真
- 💾 **视角管理**：保存和恢复典型教学视角
- 📸 **截图导出**：一键导出3D场景截图用于课件
- 🎛️ **显示控制**：线框模式、对数缩放切换

### 异常标注系统
- 异常点使用清晰的图标和文字标注，不依赖颜色识别
- 标注始终面向摄像机，保证可读性
- 不同类型异常使用不同颜色区分：
  - 黄色：日志缺步
  - 红色：损失爆炸
  - 橙色：坐标尺度问题

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173 即可查看应用。

### 构建生产版本

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

## 训练日志格式

### 样例日志位置

第一份训练日志样例位于：
```
src/data/sample-log.json
```

### 日志文件格式

应用接受JSON格式的训练日志，每条记录格式如下：

```json
{
  "step": 0,
  "loss": 7.9234,
  "learningRate": 0.01,
  "params": {
    "layer1_weight_std": 0.5,
    "layer2_weight_std": 0.48,
    "gradient_norm": 1.98
  },
  "valLoss": 8.7123
}
```

### 字段说明
- `step`: 训练步数 (number)
- `loss`: 训练损失值 (number)
- `learningRate`: 当前学习率 (number)
- `params`: 模型参数统计 (object，可包含任意参数)
- `valLoss`: 验证集损失 (可选，number)

## 使用说明

### 3D交互控制
- **鼠标拖拽**：旋转视角
- **滚轮**：缩放
- **右键拖拽**：平移
- **双击**：重置视角

### 上传自定义日志
1. 点击左侧面板的"上传日志文件"按钮
2. 选择符合格式的JSON文件
3. 系统自动解析并检测异常
4. 生成对应的3D损失地形

### 保存教学视角
1. 调整到合适的3D视角
2. 在左侧"视角管理"输入视角名称
3. 点击保存按钮
4. 后续可快速恢复该视角

### 导出截图
1. 调整到需要的视角和状态
2. 点击左侧"导出截图"按钮
3. 自动下载PNG格式的截图

## 项目结构

```
src/
├── components/
│   ├── three3d/          # 3D渲染组件
│   │   ├── LossTerrain.tsx      # 损失地形网格
│   │   ├── TrainingPath.tsx     # 训练轨迹线
│   │   ├── Annotations.tsx      # 异常标注系统
│   │   ├── AxisGrid.tsx         # 坐标轴网格
│   │   └── SceneSetup.tsx       # 场景/光照/相机
│   ├── control/           # 控制面板
│   │   ├── LeftPanel.tsx       # 左侧：日志上传、视角管理
│   │   ├── RightPanel.tsx      # 右侧：异常报告、统计数据
│   │   └── Timeline.tsx        # 底部：训练进度控制
│   └── upload/
├── store/                # 状态管理
│   ├── useLogStore.ts         # 日志数据状态
│   ├── useSceneStore.ts       # 3D场景状态
│   └── useViewStore.ts        # 视角管理状态
├── utils/                # 工具函数
│   ├── anomalyDetector.ts     # 异常检测算法
│   ├── terrainGenerator.ts    # 地形生成算法
│   └── colorMap.ts            # 颜色映射
├── types/                # TypeScript类型定义
├── data/                 # 样例数据
│   └── sample-log.json        # 第一份训练日志样例
├── pages/
│   └── Home.tsx               # 主页面
├── App.tsx
├── main.tsx
└── index.css
```

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: TailwindCSS
- **3D引擎**: Three.js
- **React Three生态**:
  - @react-three/fiber (React渲染器)
  - @react-three/drei (辅助组件)
- **状态管理**: Zustand
- **图表**: Recharts

## 常见问题

### Q: 损失地形显示过于平坦或过于陡峭？
A: 启用左侧面板的"对数缩放"选项，这会对损失值进行对数变换，改善视觉可读性。

### Q: 如何导入自己的训练日志？
A: 将训练数据保存为JSON数组格式，按照上述日志格式，然后点击上传按钮即可。

### Q: 保存的视角在哪里？
A: 视角数据保存在浏览器localStorage中，刷新页面不会丢失。

### Q: 截图导出包含UI元素吗？
A: 截图只导出3D视口内容，不包含控制面板，适合用于课件和报告。

## 开发说明

### 代码检查
```bash
npm run check
```

### Lint检查
```bash
npm run lint
```

## License

MIT

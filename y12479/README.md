# 音乐会场疏散棋

音乐会场疏散棋 - 安保人员疏散模拟训练系统

## 快速启动

### 安装依赖（无需额外依赖，使用 Node.js 即可运行

```bash
# 查看系统介绍
node src/index.js

# 运行功能演示
npm run demo

# 运行全部测试
npm test

# 只运行顺利材料测试
npm run test:smooth

# 只运行广播冷却材料测试
npm run test:broadcast
```

## 核心功能

### 1. 详细错误反馈
- **问题：学生或新人玩完就能明白错在哪里
- 不只显示分数，还显示：
  - 错误发生时间
  - 问题说明
  - 改进建议
  - 实际影响

### 2. 设备车补救模式
- 设备车缺列时不整批失败
- 进入补救模式继续补材料
- 补充完成后恢复游戏

### 3. 出口拥堵独立检测
- 出口拥堵问题独立检测
- 不影响后续广播冷却、设备阻挡的判断
- 可配置密度阈值

### 4. 暂停重开状态干净
- 重置后人流模拟和回放记录无残影
- 所有状态完全清理
- 可以重新开始

### 5. 材料分类报告
- 先跑顺利材料，再跑广播冷却材料
- 报告把两类情况完全分开
- 统计数据独立汇总

## 出口拥堵样例

### 样例1：单出口集中
- 场景：所有观众涌向单一出口
- 验证：
  1. 从观众棋子查到结果
  2. 查看观众轨迹记录
  3. 从出口反查回观众

### 样例2：瓶颈效应
- 场景：过道狭窄导致出口前形成瓶颈
- 验证：拥堵位置、拥堵时间、影响人数

### 样例3：设备阻挡
- 场景：设备车停放位置不当
- 验证：设备位置对出口拥堵加剧

## 验收方法

### 从观众查到结果：
```javascript
const trace = game.getAudienceTrace(audienceId)
// trace 包含每一步的位置和时间
```

### 从出口反查回观众：
```javascript
const audiences = game.traceBackFromExit(exitY, exitX)
// 返回所有从该出口疏散的观众列表
```

## 项目结构

```
.
├── src/
│   ├── index.js          # 主入口
│   ├── game.js         # 核心游戏逻辑
│   ├── board.js        # 棋盘类
│   ├── audience.js     # 观众类
│   ├── constants.js    # 常量定义
│   ├── testMaterials.js # 测试材料
│   ├── reportGenerator.js # 报告生成
│   └── demo.js         # 功能演示
├── tests/
│   └── run-tests.js    # 测试运行器
└── package.json
```

## API 示例

```javascript
const { EvacuationGame } = require('./src')

// 创建游戏
const game = new EvacuationGame({
  audienceCount: 50
})

// 设置棋盘
game.setupBoard('standard')
game.addEquipment(1, 2)
game.addEquipment(1, 5)
game.addEquipment(1, 8)
game.spawnAudiences(50)

// 运行模拟
game.runFullSimulation()

// 查看报告
console.log(game.generateReport()
```

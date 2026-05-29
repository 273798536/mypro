# 节奏维修工 - 技术架构文档

## 1. 技术选型

### 1.1 核心技术栈
- **HTML5** - 页面结构
- **CSS3** - 样式与动画
- **Vanilla JavaScript (ES6+)** - 游戏逻辑
- **Web Audio API** - 节拍音效
- **Canvas API** - 游戏渲染（可选优化）

### 1.2 架构模式
- **MVC架构**：
  - Model：游戏状态、数据管理
  - View：DOM渲染、动画效果
  - Controller：用户输入、游戏循环

---

## 2. 项目结构

```
y11833/
├── index.html              # 主页面
├── css/
│   └── style.css           # 样式文件
├── js/
│   ├── main.js             # 入口文件
│   ├── game/
│   │   ├── GameEngine.js   # 游戏引擎核心
│   │   ├── NoteManager.js  # 音符管理
│   │   └── Judge.js        # 判定系统
│   ├── data/
│   │   └── sampleData.js   # 示例节拍数据
│   └── ui/
│       ├── HUD.js          # 抬头显示
│       ├── PendingArea.js  # 待确认区
│       └── Report.js       # 结算报告
└── .trae/
    └── documents/
        ├── PRD.md
        └── tech-design.md
```

---

## 3. 核心模块设计

### 3.1 GameEngine - 游戏引擎

```javascript
class GameEngine {
  constructor() {
    this.state = 'idle'; // idle, playing, paused, finished
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.machineHealth = 100;
    this.currentBPM = 120;
    this.startTime = 0;
    this.noteManager = null;
    this.judge = null;
  }
  
  start() { /* 启动游戏 */ }
  update(timestamp) { /* 游戏主循环 */ }
  handleInput(trackIndex) { /* 处理玩家输入 */ }
  finish() { /* 结束游戏，生成报告 */ }
}
```

**职责**：
- 管理游戏生命周期
- 维护全局状态
- 协调各模块工作
- 主循环调度

---

### 3.2 NoteManager - 音符管理器

```javascript
class NoteManager {
  constructor(notes, speedCurve) {
    this.rawNotes = notes;
    this.cleanNotes = [];
    this.dirtyNotes = [];
    this.activeNotes = [];
    this.speedCurve = speedCurve;
  }
  
  processData() {
    // 脏数据处理核心逻辑
    this.rawNotes.forEach((note, index) => {
      if (this.isValidNote(note)) {
        this.cleanNotes.push(this.normalizeNote(note, index));
      } else {
        this.dirtyNotes.push({
          note,
          index,
          reason: this.analyzeDirtyReason(note)
        });
      }
    });
  }
  
  isValidNote(note) {
    // 验证规则：time必须是数字，track在0-3范围内
    return note && 
           typeof note.time === 'number' && 
           !isNaN(note.time) &&
           note.track !== null &&
           note.track !== undefined &&
           note.track >= 0 && note.track < 4;
  }
  
  analyzeDirtyReason(note) {
    if (!note) return '空数据';
    if (note.time === null || typeof note.time !== 'number') return '时间值缺失/无效';
    if (note.track === null || note.track === undefined) return '轨道未指定';
    if (note.track < 0 || note.track >= 4) return '轨道编号超出范围';
    if (note.type === null) return '音符类型为空';
    return '未知格式问题';
  }
  
  normalizeNote(note, index) {
    return {
      id: `note_${index}`,
      time: note.time,
      track: note.track,
      type: note.type || 'quarter',
      remark: note.remark || '',
      hitTime: null,
      judgment: null,
      errorReason: null
    };
  }
  
  getActiveNotes(currentTime) {
    // 返回当前应该显示的音符
  }
}
```

**脏数据处理策略**：
1. **null/undefined**：直接标记为脏数据
2. **无效数值**：NaN、Infinity标记
3. **越界数据**：track不在0-3范围内标记
4. **空字符串**：视为有效空值（不影响）
5. **备注保留**：所有remark字段原样保留

---

### 3.3 Judge - 判定系统

```javascript
class Judge {
  constructor() {
    this.windows = {
      PERFECT: 50,  // ms
      GREAT: 100,
      GOOD: 150
    };
    this.judgments = [];
    this.pendingJudgments = [];
  }
  
  judge(note, hitTime) {
    const timeDiff = hitTime - note.time * 1000; // 转换为ms
    const absDiff = Math.abs(timeDiff);
    
    let judgment, errorReason = null;
    
    if (absDiff <= this.windows.PERFECT) {
      judgment = 'PERFECT';
    } else if (absDiff <= this.windows.GREAT) {
      judgment = 'GREAT';
    } else if (absDiff <= this.windows.GOOD) {
      judgment = 'GOOD';
    } else {
      judgment = 'MISS';
      errorReason = timeDiff < 0 ? '早按' : '晚按';
    }
    
    // 检查是否为待确认情况
    if (this.isPendingCase(note, timeDiff)) {
      this.pendingJudgments.push({
        note,
        judgment,
        timeDiff,
        reason: this.getPendingReason(note, timeDiff)
      });
    }
    
    const result = { note, judgment, timeDiff, errorReason };
    this.judgments.push(result);
    return result;
  }
  
  isPendingCase(note, timeDiff) {
    // 切分音漏拍
    if (note.type === 'syncopated' && timeDiff > 100) return true;
    // 速度变化区间
    if (note.inSpeedChangeZone) return true;
    // 连击临界值
    if (note.comboCritical) return true;
    return false;
  }
  
  getPendingReason(note, timeDiff) {
    if (note.type === 'syncopated') return '切分音判定待确认';
    if (note.inSpeedChangeZone) return '速度变化区间判定';
    if (note.comboCritical) return '连击临界判定';
    return '特殊判定待确认';
  }
  
  miss(note) {
    const result = {
      note,
      judgment: 'MISS',
      timeDiff: null,
      errorReason: note.type === 'syncopated' ? '切分音漏拍' : '漏拍'
    };
    this.judgments.push(result);
    
    // 切分音漏拍自动加入待确认区
    if (note.type === 'syncopated') {
      this.pendingJudgments.push({
        note,
        judgment: 'MISS',
        reason: '切分音漏拍 - 请确认'
      });
    }
    return result;
  }
}
```

---

### 3.4 PendingArea - 待确认区

```javascript
class PendingArea {
  constructor() {
    this.items = [];
    this.container = null;
  }
  
  addItem(item) {
    this.items.push({
      ...item,
      confirmed: false,
      userDecision: null // 'confirm' | 'reject'
    });
    this.render();
  }
  
  handleDecision(itemId, decision) {
    const item = this.items.find(i => i.note.id === itemId);
    if (item) {
      item.confirmed = true;
      item.userDecision = decision;
      this.render();
    }
  }
  
  getFinalDecisions() {
    return this.items.map(item => ({
      noteId: item.note.id,
      originalJudgment: item.judgment,
      userDecision: item.userDecision,
      confirmed: item.confirmed
    }));
  }
}
```

---

### 3.5 Report - 结算报告

```javascript
class Report {
  constructor(gameData, pendingDecisions) {
    this.gameData = gameData;
    this.pendingDecisions = pendingDecisions;
    this.statistics = this.calculateStatistics();
  }
  
  calculateStatistics() {
    const stats = {
      total: 0,
      perfect: 0,
      great: 0,
      good: 0,
      miss: 0,
      combo: this.gameData.maxCombo,
      score: this.gameData.score,
      accuracy: 0,
      errorReasons: {
        '早按': 0,
        '晚按': 0,
        '漏拍': 0,
        '切分音漏拍': 0
      },
      dirtyDataCount: 0,
      pendingCount: this.pendingDecisions.length,
      userModifiedCount: 0
    };
    
    this.gameData.judgments.forEach(j => {
      stats.total++;
      stats[j.judgment.toLowerCase()]++;
      if (j.errorReason) {
        stats.errorReasons[j.errorReason] = 
          (stats.errorReasons[j.errorReason] || 0) + 1;
      }
    });
    
    // 计算准确率
    const weighted = stats.perfect * 100 + stats.great * 80 + stats.good * 50;
    stats.accuracy = stats.total > 0 ? (weighted / (stats.total * 100) * 100).toFixed(1) : 0;
    
    // 统计用户修改
    stats.userModifiedCount = this.pendingDecisions.filter(d => d.userDecision === 'reject').length;
    
    return stats;
  }
  
  generateHTML() {
    // 生成报告HTML
  }
}
```

---

## 4. 数据流程

```
用户输入
    ↓
GameEngine.handleInput()
    ↓
NoteManager.getActiveNotes() → 获取当前音符
    ↓
Judge.judge() → 判定
    ├─→ 正常判定 → 更新分数/连击
    └─→ 待确认判定 → PendingArea.addItem()
    ↓
View.update() → 视觉反馈
    ↓
游戏结束
    ↓
Report.generate() → 生成结算报告
    ├─→ 基础统计
    ├─→ 错因分析
    └─→ 待确认区决策汇总
```

---

## 5. 性能优化

### 5.1 渲染优化
- 使用 `requestAnimationFrame` 进行游戏循环
- 音符DOM复用（对象池模式）
- CSS transform 实现动画（GPU加速）

### 5.2 时间精度
- 使用 `performance.now()` 获取高精度时间戳
- 音频Context时间同步

---

## 6. 兼容性

- 支持现代浏览器（Chrome 60+, Firefox 54+, Safari 12+）
- 响应式设计，支持不同屏幕尺寸
- 键盘操作优先，触摸屏兼容

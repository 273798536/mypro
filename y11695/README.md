# 数独生成难度控制台

小而完整的数独题目生成、校验、解题步骤分析与题库管理系统。

---

## 启动

```bash
# 安装依赖（首次）
pip install flask

# 启动 Web 服务
python api.py
# 打开 http://localhost:5001
```

```bash
# 命令行使用
python cli.py generate --difficulty Medium --symmetry rotational
python cli.py verify --puzzle "000100000000000000..."
python cli.py solve --puzzle "000100000000000000..."
python cli.py steps --puzzle "000100000000000000..."
python cli.py score --puzzle "000100000000000000..."
python cli.py bank list
python cli.py bank stats
python cli.py bank duplicates
python cli.py bank export --format json --output bank.json
```

---

## 主要功能

### 生成题目

- **难度档**：Easy / Medium / Hard / Expert / Master（或 Any 不限）
- **对称性**：rotational（旋转180°）/ horizontal（水平镜像）/ vertical（垂直镜像）/ none
- **提示数范围**：min_givens ~ max_givens
- **评分区间**：target_score_range（可选）

生成过程：随机填满完整解 → 按对称性挖空 → 校验唯一解 → 步骤评分 → 匹配难度。

### 校验唯一解

对题目进行回溯求解，统计解的数量：
- 0 解：题目无效
- 1 解：题目有效（唯一解）
- 2+ 解：题目无效（多解题）

**多解题会被明确标记，不会悄悄进入正常结果。**

### 解题步骤

使用人类技巧逐步推理：
- Naked Single / Hidden Single（简单）
- Naked Pair / Hidden Pair（中等）
- Pointing Pair / Box-Line Reduction（困难）
- X-Wing（专家）
- Brute Force（大师，无技巧可用时回退）

每个步骤记录技巧名、描述、涉及的格子、消除的候选数。点击步骤可在棋盘上高亮涉及的格子。

### 难度评分

综合使用的技巧种类和次数，计算评分并归入难度档：

| 难度 | 评分区间 |
|------|---------|
| Easy | 0-50 |
| Medium | 50-120 |
| Hard | 120-250 |
| Expert | 250-400 |
| Master | 400+ |

### 题库管理

- 生成的题目自动存入题库（可关闭）
- 重复检测：通过规范哈希（旋转+镜像最小化）判断是否重复
- 修正记录：每次重复检测、手动修正都会留下痕迹（corrections 字段）
- 导出格式：JSON / CSV / 网格文本

### 异常路径

| 异常 | 表现 | 处理 |
|------|------|------|
| 多解题 | 生成结果标记 `error`，UI 红色提示 | 不入库，重新生成 |
| 难度误判 | 警告中提示评分超出目标区间 | 继续尝试直到匹配 |
| 对称挖空失败 | 某些格子无法成对挖空 | 自动跳过，不影响结果 |
| 生成超时 | 达到 max_attempts 仍未满足 | 返回失败，不产生记录 |
| 题目重复 | 记录中添加 `duplicate_detected` 修正，UI 黄色提示 | 记录但不静默覆盖 |

---

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/generate` | 生成题目（body: difficulty, symmetry, min_givens, max_givens, seed, target_score_range） |
| POST | `/api/verify` | 校验唯一解（body: grid 或 puzzle） |
| POST | `/api/solve` | 求解（返回完整解） |
| POST | `/api/steps` | 解题步骤分析 |
| POST | `/api/score` | 难度评分 |
| GET | `/api/bank` | 题库列表 |
| GET | `/api/bank/stats` | 题库统计 |
| GET | `/api/bank/duplicates` | 重复检测 |
| GET | `/api/bank/export?format=json\|csv\|grid` | 导出题库 |
| POST | `/api/bank/<id>/correction` | 添加修正记录 |
| DELETE | `/api/bank/<id>` | 删除题目 |

请求体示例：
```json
{
  "difficulty": "Medium",
  "symmetry": "rotational",
  "min_givens": 24,
  "max_givens": 40
}
```

或使用 81 位字符串：
```json
{
  "puzzle": "00010500014000000000000000000000000000000000000000000000000000000000000000000000000"
}
```

---

## 目录结构

```
y11695/
├── sudoku/
│   ├── board.py        # 棋盘与候选数管理
│   ├── solver.py       # 回溯求解 + 唯一解校验
│   ├── techniques.py   # 人类推理技巧
│   ├── steps.py        # 步骤分析 + 难度评分
│   ├── generator.py    # 题目生成（挖空策略）
│   └── bank.py         # 题库存储与管理
├── templates/
│   └── index.html      # Web UI
├── data/
│   └── bank.json       # 题库数据
├── api.py              # Flask API 服务
├── cli.py              # 命令行工具
└── README.md           # 本文件
```

---

## 快速上手

1. 运行 `python api.py`，浏览器打开 `http://localhost:5001`
2. 点击"生成题目"，观察棋盘和评分
3. 点击"解题步骤"查看技巧分析，点击步骤高亮格子
4. 点击"校验唯一解"确认题目有效性
5. 题库区域查看已保存题目，点击"加载"可重新载入

命令行快速生成：
```bash
python cli.py generate -d Medium -s rotational --save
```

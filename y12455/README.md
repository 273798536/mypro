# 量子密钥护送队

BB84 量子密钥分发科普教学系统 — 玩完就知道错在哪。

## 快速开始

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 启动服务
python run.py

# 3. 打开浏览器
#    http://localhost:5000

# 4. 玩一局 → 导出课堂报告
#    报告生成在 exports/ 目录
```

## 项目结构

```
├── run.py              启动入口
├── requirements.txt    依赖（Flask）
├── game/
│   ├── engine.py       BB84 协议引擎
│   ├── analyzer.py     分类错误分析
│   ├── state.py        游戏状态管理
│   ├── report.py       课堂报告生成
│   └── server.py       Flask 路由
├── templates/
│   └── index.html      主页面
├── static/
│   ├── style.css       样式
│   └── app.js          前端逻辑
├── data/               原始事件数据（JSON）
└── exports/            导出的课堂报告
```

## 导出成绩

在界面点击「导出报告」按钮，系统会在 `exports/` 目录生成一份 HTML 报告，内含：

- 密钥生成全流程追踪（每一步的原始数据）
- 分类错误说明（测量基混淆 / 误码超限 / 重复传输）
- 事件回放时间线

## 玩法说明

1. **设置参数**：选择光子数量（8~64）和误码阈值（默认 11%）
2. **观察传输**：Alice 发送光子，Bob 随机选基测量
3. **选择策略**：你可以选择是否拦截、用哪个基测量
4. **查看结果**：系统分三类解释每个错误，不笼统打分
5. **导出报告**：生成课堂用的小型完整报告

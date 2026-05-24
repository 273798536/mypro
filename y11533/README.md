# 银行网点排班验收回放链路服务

## 概述
本系统用于银行网点排班验收的全链路回放，支持柜员排班、请假单、业务量预测、班次记录的数据接入，处理临时外出培训后窗口人手和午休规则冲突的口径变化。

## 核心功能
1. **数据导入**：支持Excel/CSV导入，保留来源文件、原始行号、解析后标准值
2. **状态管理**：所有状态变化记录时间、操作者、原因
3. **异步任务**：区分等重试、等人工、永久失败，支持断点续处理
4. **回放链路**：造数 → 启动服务 → 发请求 → 对账 → 导出 → 回放异常
5. **自动化检查**：重复导入、权限拦截、异常保留、重启后历史、导出一致性

## 目录结构
```
bank_scheduling/
├── app/
│   ├── __init__.py
│   ├── main.py              # API入口
│   ├── config.py            # 配置
│   ├── database.py          # 数据库连接
│   ├── models/              # 数据模型
│   ├── schemas/             # Pydantic模式
│   ├── crud/                # 数据库操作
│   ├── services/            # 业务逻辑
│   └── api/                 # API路由
├── tests/                   # 测试
├── data/                    # 数据目录
├── exports/                 # 导出目录
└── requirements.txt
```

## 启动服务
```bash
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API文档
访问 http://localhost:8000/docs 查看Swagger文档

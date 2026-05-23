#!/bin/bash

echo "=========================================="
echo "  社区团购售后重试补偿队列服务"
echo "=========================================="
echo ""

echo "检查依赖..."
if ! python -c "import fastapi" 2>/dev/null; then
    echo "安装依赖包..."
    pip install -r requirements.txt
fi

echo ""
echo "初始化数据库..."
python init_db.py

echo ""
echo "启动服务..."
echo "API文档: http://localhost:8000/docs"
echo "健康检查: http://localhost:8000/health"
echo ""
echo "默认账号:"
echo "  主管: admin / admin123"
echo "  复核: reviewer / reviewer123 (北京)"
echo "  录入: entry / entry123 (北京)"
echo "  只读: readonly / readonly123"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

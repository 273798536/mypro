#!/bin/bash
cd "$(dirname "$0")"

echo "=========================================="
echo "  代码审查误判回放系统 - 后端启动"
echo "=========================================="

if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件，正在从 .env.example 复制..."
    cp .env.example .env
    echo "✅ 已创建默认 .env，请根据需要修改数据库配置"
fi

if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

echo "🔧 激活虚拟环境..."
source venv/bin/activate

echo "📚 安装依赖..."
pip install -r requirements.txt

echo ""
echo "🚀 启动服务..."
echo "📄 API 文档: http://localhost:8000/docs"
echo "🔌 服务地址: http://localhost:8000"
echo ""
echo "测试账号:"
echo "  管理员:    admin / admin123"
echo "  评测同事:  xiaomeng / 123456"
echo "  排班同事:  scheduler / 123456"
echo ""
echo "按 Ctrl+C 停止服务"
echo "=========================================="

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

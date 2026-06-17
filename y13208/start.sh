#!/bin/bash
# 录音棚时码异常提醒 - 启动脚本

set -e

echo "========================================"
echo "  🎙️  录音棚时码异常提醒后端服务"
echo "========================================"
echo ""

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 python3，请先安装 Python 3.8+"
    exit 1
fi

# 检查依赖
echo "📦 检查依赖..."
python3 -c "import fastapi, uvicorn, pydantic" 2>/dev/null || {
    echo "📦 安装依赖..."
    pip3 install -r requirements.txt
}

# 创建必要目录
mkdir -p uploads reports static

# 设置环境变量
export TIMECODE_DB="timecode_anomaly_api.db"
export TIMECODE_UPLOAD_DIR="uploads"
export TIMECODE_REPORT_DIR="reports"
export TIMECODE_STATIC_DIR="static"

echo ""
echo "🚀 启动服务..."
echo "   API 文档:  http://localhost:8000/docs"
echo "   前端页面:  http://localhost:8000/static/index.html"
echo "   健康检查:  http://localhost:8000/api/health"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

exec python3 -m uvicorn main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload

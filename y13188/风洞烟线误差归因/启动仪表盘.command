#!/bin/bash
# ============================================
# 风洞烟线误差归因 · 一键启动仪表盘
# 双击此文件即可启动（Mac）
# ============================================

cd "$(dirname "$0")"

PORT=8765

# 检查端口是否被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "端口 $PORT 已被占用，正在打开浏览器..."
else
    echo "启动本地HTTP服务器 (端口 $PORT)..."
    python3 -m http.server $PORT &
    SERVER_PID=$!
    echo "服务器已启动 (PID: $SERVER_PID)"
    sleep 1
fi

# 打开浏览器
URL="http://localhost:$PORT/dashboard.html"
echo "打开浏览器: $URL"

if command -v open >/dev/null 2>&1; then
    open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL"
else
    echo "请手动在浏览器中打开: $URL"
fi

echo ""
echo "========================================"
echo "  仪表盘已启动！"
echo "  地址: $URL"
echo ""
echo "  关闭方法：按 Ctrl+C 停止服务器"
echo "========================================"
echo ""

# 等待用户按Ctrl+C
if [ -n "$SERVER_PID" ]; then
    trap "echo '正在关闭服务器...'; kill $SERVER_PID 2>/dev/null; exit" INT
    wait $SERVER_PID 2>/dev/null
fi

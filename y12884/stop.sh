#!/bin/bash

if [ -f "app.pid" ]; then
    PID=$(cat app.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "服务已停止 (PID: $PID)"
        rm -f app.pid
    else
        echo "服务未运行"
        rm -f app.pid
    fi
else
    echo "未找到服务进程文件"
fi

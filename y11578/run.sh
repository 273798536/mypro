#!/bin/bash

echo "=========================================="
echo "外协加工对账验收回放链路服务"
echo "=========================================="

case "$1" in
    install)
        echo "安装依赖..."
        pip3 install -r requirements.txt
        ;;
    start)
        echo "启动服务..."
        python3 main.py
        ;;
    dev)
        echo "启动开发模式..."
        uvicorn main:app --reload --host 0.0.0.0 --port 8000
        ;;
    test)
        echo "运行测试脚本..."
        python3 test_data.py
        ;;
    clean)
        echo "清理数据库..."
        rm -f outsourcing.db
        rm -f export_*.csv
        ;;
    *)
        echo "用法: $0 {install|start|dev|test|clean}"
        echo ""
        echo "命令说明:"
        echo "  install  - 安装Python依赖"
        echo "  start    - 启动服务"
        echo "  dev      - 开发模式(自动重载)"
        echo "  test     - 运行测试脚本"
        echo "  clean    - 清理数据库和导出文件"
        ;;
esac

#!/bin/bash
cd "$(dirname "$0")"
echo "========================================"
echo "  工业视觉灰度对比系统 - 运行脚本"
echo "========================================"
echo ""
echo "当前目录: $(pwd)"
echo "Python版本: $(python3 --version 2>&1)"
echo ""
echo "开始运行主程序..."
echo "----------------------------------------"
python3 main.py
EXIT_CODE=$?
echo "----------------------------------------"
echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ 程序运行成功！"
else
    echo "❌ 程序运行失败，退出码: $EXIT_CODE"
fi
echo ""
echo "输出文件位于: $(pwd)/output/"
exit $EXIT_CODE

#!/bin/bash
# 采样包素材清单归档 - 一键运行脚本
# 双击或在终端运行即可生成最新报告

cd "$(dirname "$0")"

echo "========================================"
echo "  采样包素材清单归档系统"
echo "========================================"
echo ""
echo "正在生成报告..."
echo ""

python3 run_archive.py

echo ""
echo "========================================"
echo "  报告生成完成！"
echo "========================================"
echo ""
echo "报告位置: output/最新报告.md"
echo "数据目录: data/"
echo ""

read -p "按回车键打开报告文件夹..." -n1 -s
echo ""

open "output" 2>/dev/null || xdg-open "output" 2>/dev/null || start "output" 2>/dev/null

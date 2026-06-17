#!/bin/bash

set -e

echo "=========================================="
echo "舆情聚类灰度对比 - 快速测试脚本"
echo "=========================================="
echo ""

echo "[1/5] 安装依赖..."
pip install -q -r requirements.txt
echo "依赖安装完成"
echo ""

echo "[2/5] 测试 1: 正常数据对比 (v1 vs v2)..."
python -m src.cli compare \
  --old data/samples/v1.json \
  --new data/samples/v2.json \
  --old-version v1 \
  --new-version v2 \
  --threshold 0.5 \
  --detail
echo ""
echo "测试 1 完成"
echo ""

echo "[3/5] 测试 2: 含坏行数据的解析统计..."
python -m src.cli compare \
  --old data/samples/bad_lines_test.json \
  --new data/samples/v1.json \
  --old-version bad_test \
  --new-version v1 \
  --threshold 0.5
echo ""
echo "测试 2 完成"
echo ""

echo "[4/5] 测试 3: 添加人工修正并重新对比..."
python -m src.cli correction add \
  --cluster-id C003 \
  --field sentiment \
  --old-value neutral \
  --new-value negative \
  --operator 老唐 \
  --remark "社区公示前临时修正，缺引用但需谨慎" \
  --version v2

python -m src.cli correction list
echo ""
echo "测试 3 完成"
echo ""

echo "[5/5] 测试 4: 导出结果 (JSON + CSV)..."
python -m src.cli compare \
  --old data/samples/v1.json \
  --new data/samples/v2.json \
  --old-version v1 \
  --new-version v2 \
  --threshold 0.5 \
  --export both \
  --output-dir output \
  --operator 老唐
echo ""
echo "测试 4 完成"
echo ""

echo "=========================================="
echo "查看历史记录..."
echo "=========================================="
python -m src.cli history
echo ""

echo "=========================================="
echo "查看导出文件..."
echo "=========================================="
ls -la output/
echo ""

echo "=========================================="
echo "所有测试完成！"
echo "=========================================="
echo ""
echo "快速上手指南: python -m src.cli guide"

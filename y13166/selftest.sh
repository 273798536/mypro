#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PY="${PYTHON:-python3}"

echo "=============================="
echo "  电机扭矩阈值预警 · 自检脚本  "
echo "=============================="
echo

echo "[1/3] 初次运行 (参数档 L1, 阈值调整 ±0%)"
echo "------------------------------------------------------------"
$PY "$ROOT/run_torque_warning.py" \
  --input-dir "$ROOT/sample_input" \
  --output-dir "$ROOT/output" \
  --param-level 1
echo
echo "  已生成:"
ls -la "$ROOT/output" | grep -v total || true
echo

echo "[2/3] 调一档复算 (参数档 L2, 阈值收紧 +5%)"
echo "------------------------------------------------------------"
$PY "$ROOT/run_torque_warning.py" \
  --input-dir "$ROOT/sample_input" \
  --output-dir "$ROOT/output" \
  --param-level 2 \
  --threshold-adjust +5.0
echo
echo "  已生成:"
ls -la "$ROOT/output" | grep -v total || true
echo

echo "[3/3] 再调一档复算 (参数档 L3, 阈值放宽 -10%)"
echo "------------------------------------------------------------"
$PY "$ROOT/run_torque_warning.py" \
  --input-dir "$ROOT/sample_input" \
  --output-dir "$ROOT/output" \
  --param-level 3 \
  --threshold-adjust -10.0
echo
echo "  最终输出:"
ls -la "$ROOT/output" | grep -v total || true
echo

echo "=============================="
echo "  自检完成。在浏览器打开以下文件查看页面摘要:"
echo "  file://$ROOT/output/page_summary.html"
echo "=============================="

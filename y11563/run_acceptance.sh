#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

source venv/bin/activate

echo "========================================"
echo "  酒店夜审验收测试流程（完整链路）"
echo "========================================"
echo ""

echo "[1/5] 检查服务状态..."
python3 -m scripts.cli health
echo ""

BATCH_NO="BATCH-ACCEPT-$(date +%Y%m%d%H%M%S)"
echo "[2/5] 造数并导入数据 (批次: $BATCH_NO)..."
python3 -m scripts.cli ingest -c 5 -b "$BATCH_NO"
echo ""

echo "[3/5] 执行对账..."
python3 -m scripts.cli reconcile -b "$BATCH_NO"
echo ""

echo "[4/5] 导出并冻结数据..."
python3 -m scripts.cli export -b "$BATCH_NO" -t all --freeze -o "财务夜审"
echo ""

echo "[5/5] 审计追溯..."
python3 -m scripts.cli audit -b "$BATCH_NO"
echo ""

echo "========================================"
echo "  基础验收测试完成"
echo "  批次号: $BATCH_NO"
echo "========================================"
echo ""
echo "运行完整验收测试（含撤回、人工改判）："
echo "  python3 -m scripts.cli acceptance --repeat --bad-data --revoke --manual -b $BATCH_NO"

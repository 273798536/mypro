#!/usr/bin/env bash
set -euo pipefail

WORKDIR="$(cd "$(dirname "$0")" && pwd)"
DB="$WORKDIR/tissue_scoring.db"
CLI="python3 $WORKDIR/tissue_scoring.py --db $DB"

echo "=== 组织染色强度评分 — 从空目录启动 ==="
echo "Workdir: $WORKDIR"
echo "DB:      $DB"
echo ""

if [ -f "$DB" ]; then
    echo "[!] 数据库已存在，跳过初始化。如需重建请先删除 $DB"
else
    echo "[1] 初始化数据库..."
    $CLI init
    echo ""
fi

echo "[2] 导入一条评分记录..."
$CLI import --batch SEQ-2025-001 --sample Tumor-A --score 3.0 --boundary unclear --conclusion "中度阳性"
echo ""

echo "[3] 再次导入同批同样本 — 验证重复导入被拦截..."
$CLI import --batch SEQ-2025-001 --sample Tumor-A --score 4.0 --boundary clear --conclusion "强阳性" || true
echo ""

echo "[4] 用 --force 覆盖导入（历史保留）..."
$CLI import --batch SEQ-2025-001 --sample Tumor-A --score 4.0 --boundary clear --conclusion "强阳性" --force
echo ""

echo "[5] 异常复核 — 提交修正意见..."
$CLI review --batch SEQ-2025-001 --sample Tumor-A --score 2.5 --reason "标注边界不清，复核后降级" --reviewer Dr.Wang --conclusion "弱-中度阳性" --boundary unclear
echo ""

echo "[6] 关联显微照片..."
$CLI link-photo --batch SEQ-2025-001 --sample Tumor-A --path "/data/photos/SEQ-2025-001_Tumor-A_HE_40x.tif" --desc "HE染色 40x"
echo ""

echo "[7] 查看完整记录（含照片+复核历史）..."
$CLI show --batch SEQ-2025-001 --sample Tumor-A
echo ""

echo "[8] 列出所有标注边界不清的记录（异常复核日常入口）..."
$CLI list --boundary unclear
echo ""

echo "[9] 差异分析（月底/课前）..."
$CLI diff --batch SEQ-2025-001
echo ""

echo "=== CLI 流程走完 ==="
echo ""
echo "--- 如需 HTTP API，运行以下命令 ---"
echo "    pip3 install flask  # 仅首次需要"
echo "    TISSUE_SCORING_DB=$DB python3 $WORKDIR/tissue_scoring_api.py"
echo ""
echo "--- curl 示例 ---"
cat <<'CURL'
# 初始化数据库
curl -s -X POST http://localhost:5230/api/init | python3 -m json.tool

# 导入评分记录
curl -s -X POST http://localhost:5230/api/import \
  -H 'Content-Type: application/json' \
  -d '{"batch_id":"SEQ-2025-002","sample_id":"Tumor-C","score":2.0,"annotation_boundary":"clear","conclusion":"弱阳性"}'

# 重复导入同一 batch+sample（不会产生两份结论）
curl -s -X POST http://localhost:5230/api/import \
  -H 'Content-Type: application/json' \
  -d '{"batch_id":"SEQ-2025-002","sample_id":"Tumor-C","score":3.5,"annotation_boundary":"clear","conclusion":"中度阳性","force":true}'

# 异常复核 — 提交修正意见
curl -s -X POST http://localhost:5230/api/review \
  -H 'Content-Type: application/json' \
  -d '{"batch_id":"SEQ-2025-002","sample_id":"Tumor-C","score":2.0,"reason":"照片模糊，复核降级","reviewer":"Dr.Li","conclusion":"弱阳性","annotation_boundary":"unclear"}'

# 关联显微照片
curl -s -X POST http://localhost:5230/api/link-photo \
  -H 'Content-Type: application/json' \
  -d '{"batch_id":"SEQ-2025-002","sample_id":"Tumor-C","file_path":"/data/photos/SEQ-2025-002_Tumor-C_IHC_20x.tif","description":"IHC 20x"}'

# 查看单条完整记录（照片+复核历史 双向追溯）
curl -s http://localhost:5230/api/records/SEQ-2025-002/Tumor-C | python3 -m json.tool

# 列出所有标注边界不清的记录（异常复核日常入口）
curl -s "http://localhost:5230/api/records?annotation_boundary=unclear" | python3 -m json.tool

# 差异分析（月底/课前）
curl -s "http://localhost:5230/api/diff?batch_id=SEQ-2025-002" | python3 -m json.tool
CURL

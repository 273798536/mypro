#!/bin/bash

set -e

echo "========================================"
echo "  训练队列版本快照 - 完整演示流程"
echo "========================================"
echo ""

cd "$(dirname "$0")/.."

echo "[1/5] 安装依赖..."
pip install -e . > /dev/null 2>&1
echo "✓ 依赖安装完成"
echo ""

echo "[2/5] 处理 V1 版本数据 (灰度比例 0.2)..."
tqs process tests/test_data_v1.csv \
    --version-name "特征快照V1" \
    --version-desc "第一版特征快照，基线版本" \
    --gray-ratio 0.2 \
    --thresholds "feature1:0:50:manual,feature2:0:50,feature3:0:50,feature4:0:50" \
    --label-col label \
    --sample-id-col sample_id \
    --output-dir ./output \
    --detail-limit 10

echo ""
echo "[3/5] 处理 V2 版本数据 (灰度比例 0.3，阈值调整)..."
tqs process tests/test_data_v2.csv \
    --version-name "特征快照V2" \
    --version-desc "第二版特征快照，包含人工修正和阈值调整" \
    --gray-ratio 0.3 \
    --thresholds "feature1:0:100:manual,feature2:0:100,feature3:0:100,feature4:0:100" \
    --label-col label \
    --sample-id-col sample_id \
    --output-dir ./output \
    --detail-limit 10

echo ""
echo "[4/5] 版本对比..."
V1_JSON=$(ls output/snapshot_*_*.json | head -1)
V2_JSON=$(ls output/snapshot_*_*.json | tail -1)
tqs compare "$V1_JSON" "$V2_JSON" --output-dir ./output

echo ""
echo "[5/5] 筛选和详情查询演示..."
echo "--- 筛选所有坏行 ---"
tqs filter "$V2_JSON" --status bad

echo ""
echo "--- 筛选所有灰度样本 ---"
tqs filter "$V2_JSON" --gray gray_candidate --gray gray_enabled

echo ""
echo "--- 查看样本详情 (sample_021 人工修正样本) ---"
tqs detail "$V2_JSON" sample_021

echo ""
echo "--- 查看样本详情 (sample_016 坏行样本) ---"
tqs detail "$V2_JSON" sample_016

echo ""
echo "========================================"
echo "  演示完成！输出文件在 ./output 目录"
echo "========================================"
echo ""
echo "生成的文件："
ls -la output/ | grep -v "^d"

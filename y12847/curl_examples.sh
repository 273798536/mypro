#!/bin/bash
BASE_URL="http://localhost:5001/api"
BATCH_ID="BATCH-2026-001"

echo "========================================"
echo "海藻样本生长记录 - 完整流程 curl 示例"
echo "========================================"

echo -e "\n=== 1. 创建批次（关联试剂批号和显微照片批次）==="
curl -s -X POST "$BASE_URL/batches" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "'$BATCH_ID'",
    "reagent_lot": "REAGENT-2026-SEA-0427",
    "microscope_batch": "MICRO-BATCH-2026-0611-003",
    "created_by": "张研究员",
    "description": "2026年6月海藻样本生长记录复核，包含试剂批号REAGENT-2026-SEA-0427处理的所有样本"
  }' | python3 -m json.tool

echo -e "\n=== 2. 导入复核意见（包含试剂批号、阴性对照、低质量读段）==="
curl -s -X POST "$BASE_URL/reviews/import" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "'$BATCH_ID'",
    "created_by": "张研究员",
    "reviews": [
      {
        "sample_id": "SW-2026-001",
        "species": "海带",
        "collection_site": "青岛海域A区",
        "initial_growth_stage": "5",
        "reviewer": "李生态调查员",
        "opinion": "生长正常，藻体完整，细胞排列规则",
        "conclusion": "正常",
        "is_negative_control": false
      },
      {
        "sample_id": "SW-2026-002",
        "species": "海带",
        "collection_site": "青岛海域A区",
        "initial_growth_stage": "15",
        "reviewer": "李生态调查员",
        "opinion": "生长速率偏高，细胞有轻度异常增生",
        "conclusion": "异常",
        "is_negative_control": false,
        "low_quality_reads_passed": true,
        "change_reason": "低质量读段经人工复核，确认异常为真实生长状态",
        "low_quality_reads": [
          {
            "read_id": "READ-002-LQ001",
            "quality_score": 12.5,
            "reason": "测序质量低，碱基识别模糊"
          },
          {
            "read_id": "READ-002-LQ002",
            "quality_score": 15.3,
            "reason": "接头序列残留"
          }
        ]
      },
      {
        "sample_id": "SW-2026-NC01",
        "species": "海带（阴性对照）",
        "collection_site": "实验室对照",
        "initial_growth_stage": "12",
        "reviewer": "李生态调查员",
        "opinion": "阴性对照组，无海藻生长抑制处理",
        "conclusion": "正常",
        "is_negative_control": true
      },
      {
        "sample_id": "SW-2026-003",
        "species": "紫菜",
        "collection_site": "烟台海域B区",
        "initial_growth_stage": "8",
        "reviewer": "李生态调查员",
        "opinion": "标注边界不清，需结合显微照片进一步确认",
        "conclusion": "待定",
        "is_negative_control": false
      },
      {
        "sample_id": "SW-2026-NC02",
        "species": "紫菜（阴性对照）",
        "collection_site": "实验室对照",
        "initial_growth_stage": "5",
        "reviewer": "李生态调查员",
        "opinion": "阴性对照组，生长状态良好",
        "conclusion": "正常",
        "is_negative_control": true
      }
    ]
  }' | python3 -m json.tool

echo -e "\n=== 3. 创建图像标注（与同一批次关联，边界不清记录）==="
curl -s -X POST "$BASE_URL/annotations" \
  -H "Content-Type: application/json" \
  -d '{
    "sample_id": "SW-2026-003",
    "batch_id": "'$BATCH_ID'",
    "image_path": "/images/micro/SW-2026-003_20260611.tif",
    "annotation_data": {
      "regions": [
        {"type": "cell_boundary", "confidence": 0.45, "notes": "边缘模糊，无法准确判断细胞边界"},
        {"type": "growth_zone", "confidence": 0.52, "notes": "生长区域与背景对比度低"}
      ],
      "image_scale": "400x"
    },
    "annotated_by": "王标注员",
    "boundary_confidence": 0.45,
    "boundary_note": "标注边界不清，细胞边缘与背景对比度低，需复核"
  }' | python3 -m json.tool

echo -e "\n=== 4. 阴性对照异常复核（自动检测生长值超过阈值）==="
curl -s -X POST "$BASE_URL/negative-control/review" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "'$BATCH_ID'",
    "growth_threshold": 10,
    "reviewer": "张研究员"
  }' | python3 -m json.tool

echo -e "\n=== 5. 修改复核意见（修改后自动记录历史）==="
curl -s -X PUT "$BASE_URL/reviews/3" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewer": "张研究员",
    "opinion": "标注边界经二次复核，结合显微照片和多序列比对，确认生长正常，边界不清为染色不均匀导致",
    "conclusion": "正常",
    "low_quality_reads_passed": false,
    "change_reason": "边界不清记录复核完成：调整结论为正常，低质量读段不予通过"
  }' | python3 -m json.tool

echo -e "\n=== 6. 查看复核意见新旧版本并排对比==="
curl -s "$BASE_URL/reviews/compare/5" | python3 -m json.tool

echo -e "\n=== 7. 查看样本复核历史==="
curl -s "$BASE_URL/reviews/history/SW-2026-003" | python3 -m json.tool

echo -e "\n=== 8. 异常回溯（从异常样本查到复核和处理意见）==="
curl -s "$BASE_URL/anomaly/trace/SW-2026-002" | python3 -m json.tool

echo -e "\n=== 9. 查看批次详情（统计与标注共用同一批记录）==="
curl -s "$BASE_URL/batches/$BATCH_ID" | python3 -m json.tool

echo -e "\n=== 10. 导出JSON格式报告（含普通话解释）==="
curl -s "$BASE_URL/export/report/$BATCH_ID" | python3 -m json.tool

echo -e "\n=== 11. 导出TXT格式报告（可直接复制给同事）==="
curl -s "$BASE_URL/export/report/$BATCH_ID?format=txt"

echo -e "\n=== 12. 导出Excel格式报告 ==="
curl -s -o "seaweed_report_$BATCH_ID.xlsx" "$BASE_URL/export/report/$BATCH_ID?format=excel"
echo "已导出到 seaweed_report_$BATCH_ID.xlsx"

echo -e "\n========================================"
echo "流程执行完成！"
echo "========================================"

#!/bin/bash
BASE_URL="http://localhost:3000"

echo "=========================================="
echo "  图论割点课堂验算 - 快速复核指南"
echo "=========================================="
echo ""
echo "【临时接班操作手册】"
echo "------------------------"
echo "第一步：启动服务"
echo "  npm start"
echo ""
echo "第二步：跑主流程（本脚本）"
echo "  ./scripts/quick_start.sh"
echo ""
echo "第三步：查看异常"
echo "  ./scripts/review.sh"
echo ""
echo "=========================================="
echo ""
echo "正在检查服务状态..."
if ! curl -s "$BASE_URL/api/health" > /dev/null; then
    echo "❌ 服务未启动，请先运行: npm start"
    exit 1
fi
echo "✅ 服务运行正常"
echo ""
echo "=========================================="
echo "  主流程演示"
echo "=========================================="
echo ""

echo "【1/6】提交正常验算记录（带单位）"
RECORD1=$(curl -s -X POST "$BASE_URL/api/records" \
    -H "Content-Type: application/json" \
    -H "X-Operator: 小孟" \
    -d '{
        "package_no": "小包-2026-06-001",
        "graph_data": {"edges": [[1,2],[2,3],[3,4],[2,4]], "nodes": [1,2,3,4]},
        "expected_cut_points": [2],
        "unit": "个",
        "threshold": 2,
        "parameter_version": "v1.0"
    }')
echo "$RECORD1" | python3 -m json.tool 2>/dev/null || echo "$RECORD1"
REC_ID1=$(echo "$RECORD1" | python3 -c "import sys,json; print(json.load(sys.stdin)['record_id'])" 2>/dev/null || echo "REC-DEMO-1")
echo ""

echo "【2/6】提交脏数据（单位缺失，自动保留原样+给建议）"
RECORD2=$(curl -s -X POST "$BASE_URL/api/records" \
    -H "Content-Type: application/json" \
    -H "X-Operator: 小孟" \
    -d '{
        "package_no": "小包-2026-06-001",
        "graph_data": {"edges": [[1,2],[2,3],[1,3],[3,4],[4,5],[3,5]], "nodes": [1,2,3,4,5]},
        "expected_cut_points": [3],
        "threshold": 2,
        "parameter_version": "v1.0"
    }')
echo "$RECORD2" | python3 -m json.tool 2>/dev/null || echo "$RECORD2"
REC_ID2=$(echo "$RECORD2" | python3 -c "import sys,json; print(json.load(sys.stdin)['record_id'])" 2>/dev/null || echo "REC-DEMO-2")
echo ""

echo "【3/6】复核第一条记录"
curl -s -X POST "$BASE_URL/api/records/$REC_ID1/review" \
    -H "Content-Type: application/json" \
    -H "X-Operator: 复核人-老王" \
    -d '{
        "reviewer": "老王",
        "comment": "割点验算正确，节点2移除后图分成两部分",
        "status": "reviewed"
    }' | python3 -m json.tool 2>/dev/null
echo ""

echo "【4/6】提交撤回申请（需要人工判断）"
WITHDRAW=$(curl -s -X POST "$BASE_URL/api/records/$REC_ID1/withdraw" \
    -H "Content-Type: application/json" \
    -H "X-Operator: 小孟" \
    -d '{"reason": "课堂例题编号写错了，应该是例题3不是例题2"}')
echo "$WITHDRAW" | python3 -m json.tool 2>/dev/null || echo "$WITHDRAW"
ACTION_ID=$(echo "$WITHDRAW" | python3 -c "import sys,json; print(json.load(sys.stdin)['action_id'])" 2>/dev/null || echo "1")
echo ""

echo "【5/6】人工判断撤回申请"
curl -s -X POST "$BASE_URL/api/records/$REC_ID1/withdraw/judge" \
    -H "Content-Type: application/json" \
    -H "X-Operator: 复核人-老王" \
    -d '{
        "action_id": '"$ACTION_ID"',
        "approved": true,
        "judgment_note": "确认例题编号有误，同意撤回，重新提交"
    }' | python3 -m json.tool 2>/dev/null
echo ""

echo "【6/6】参数变更记录（单位换算+阈值调整）"
curl -s -X POST "$BASE_URL/api/records/$REC_ID2/parameter" \
    -H "Content-Type: application/json" \
    -H "X-Operator: 小孟" \
    -d '{
        "param_name": "unit_conversion",
        "old_value": "null",
        "new_value": "个",
        "old_unit": null,
        "new_unit": "个",
        "conversion_factor": 1.0,
        "threshold_old": 2,
        "threshold_new": 1,
        "reason": "课堂要求变更：阈值从2调整为1，单位补充为个"
    }' | python3 -m json.tool 2>/dev/null
echo ""

echo "=========================================="
echo "  数据追溯查询"
echo "=========================================="
echo ""
echo "【查询完整记录详情】"
echo "curl -s \"$BASE_URL/api/records/$REC_ID1\" | python3 -m json.tool"
echo ""
echo "【查询状态历史】"
echo "curl -s \"$BASE_URL/api/records/$REC_ID1/history\" | python3 -m json.tool"
echo ""
echo "【查询参数版本】"
echo "curl -s \"$BASE_URL/api/records/$REC_ID2/parameters\" | python3 -m json.tool"
echo ""
echo "【查询异常记录】"
echo "curl -s \"$BASE_URL/api/records/$REC_ID2/exceptions\" | python3 -m json.tool"
echo ""
echo "【查询复核动作】"
echo "curl -s \"$BASE_URL/api/records/$REC_ID1/review-actions\" | python3 -m json.tool"
echo ""
echo "【异常总览】"
echo "curl -s \"$BASE_URL/api/exceptions/summary\" | python3 -m json.tool"
echo ""
echo "=========================================="
echo "  主流程跑完！异常数据已标记，撤回记录已留痕"
echo "  服务重启后可通过记录ID继续查询"
echo "=========================================="

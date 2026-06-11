#!/bin/bash
set -e

BASE_URL="${BASE_URL:-http://127.0.0.1:5000}"
CURL="curl -s -H 'Content-Type: application/json'"

echo "=============================================="
echo "  组织切片批注导出系统 - CURL 示例脚本"
echo "  API Base: $BASE_URL"
echo "=============================================="
echo ""

section() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

wait_prompt() {
    echo ""
    read -p "→ 按回车继续执行下一个示例... (输入 s 跳过此段) " ans
    if [[ "$ans" == "s" || "$ans" == "S" ]]; then
        echo "→ 跳过本段"
        return 1
    fi
    return 0
}

section "1. 系统诊断总览 - 导师快速看状态"
echo "命令: GET /api/diagnostics/summary"
echo "用途: 无需点菜单，一眼看全系统有多少批注、多少被拦"
if wait_prompt; then
    eval "$CURL $BASE_URL/api/diagnostics/summary | python3 -m json.tool"
fi

section "2. 列出所有切片（含批注状态和是否可导出）"
echo "命令: GET /api/slides"
echo "用途: 浏览所有切片，可看每张切片的批注数和测序数"
if wait_prompt; then
    eval "$CURL $BASE_URL/api/slides | python3 -m json.tool"
fi

section "3. 查看某张切片详情（批注+复核历史+测序结果）"
echo "命令: GET /api/slides/2 (SL-2026-0502 - 有边界不清案例)"
echo "用途: 生态调查员要解释边界不清原因时看这里"
if wait_prompt; then
    eval "$CURL $BASE_URL/api/slides/2 | python3 -m json.tool"
fi

section "4. 查询所有【不能导出】的记录 - 月底转交导师重点看"
echo "命令: GET /api/export/blocked"
echo "用途: 导师最关心这个，直接看哪些记录被拦、为什么拦、几轮复核没通过"
if wait_prompt; then
    eval "$CURL $BASE_URL/api/export/blocked | python3 -m json.tool"
fi

section "5. 单独检查某条批注能否导出（带图表明细解释）"
echo "命令: GET /api/export/check/2 (SL-2026-0502 的边界不清批注)"
echo "用途: 解释为什么这条被拦：有雷达图数据、每一轮复核意见、下一步建议"
if wait_prompt; then
    eval "$CURL $BASE_URL/api/export/check/2 | python3 -m json.tool"
fi

section "6. 创建一条新批注（模拟生态调查员录入）"
echo "命令: POST /api/annotations"
NEW_ANN='{
    "slide_id": 5,
    "annotator": "生态调查员A",
    "annotation_type": "atypical_hyperplasia",
    "boundary_data": {
        "regions": [{
            "name": "不典型增生区",
            "type": "atypia",
            "polygon": [[100,100],[200,95],[250,160],[220,230],[140,240],[90,175]],
            "area_pixels": 12500,
            "cellularity": 0.55,
            "edge_notes": ["表层边界清晰，基底部与正常黏膜腺体交错约10个细胞宽度"]
        }],
        "image_resolution": "2048x2048",
        "magnification": "20x",
        "scale_bar": "100μm"
    },
    "boundary_quality_score": 65,
    "confidence_score": 0.72,
    "notes": "胃黏膜活检，疑有低级别上皮内瘤变，基底部边界略模糊"
}'
echo "请求体含：boundary_data多边形坐标、quality_score、confidence_score..."
if wait_prompt; then
    echo "发送请求..."
    eval "$CURL -X POST -d '$NEW_ANN' $BASE_URL/api/annotations | python3 -m json.tool"
fi

section "7. 提交复核意见（第1轮 - 病理医师驳回）"
echo "命令: POST /api/annotations/6/reviews"
REVIEW_1='{
    "reviewer": "赵医生",
    "review_result": "rejected",
    "review_reason": "标注边界不清，基底部范围待确认",
    "boundary_issue_detail": "1) 标注多边形基底部(坐标90,175至140,240段)横穿正常腺管颈部，约8个腺体被人为切割。病理上不典型增生起始于腺管基底部，不应横向跨越腺管长轴。2) 20x放大倍数不足以明确核异型性分级，建议使用40x镜重新定位。",
    "photo_alignment_issue": "原显微照片未见明显伪影，但建议补充40x镜下对应区域照片供边界精确定位。",
    "suggestion": "建议：1) 切换至40x物镜重新标注不典型增生范围，确保沿腺管基底而非颈部划界；2) 补充核分裂象计数区域标注；3) 重提复核时请附放大倍数对照表。"
}'
echo "不是一次性判断：驳回复核会保留历史，允许后续修正。"
if wait_prompt; then
    eval "$CURL -X POST -d '$REVIEW_1' $BASE_URL/api/annotations/6/reviews | python3 -m json.tool"
fi

section "8. 补充测序结果（自动触发待定复核提醒）"
echo "命令: POST /api/sequencing"
SEQ_DATA='{
    "slide_id": 2,
    "gene_panel": "BRCAness HRD检测",
    "mutation_data": {
        "BRCA1": {"启动子甲基化": "阳性", "LOH": "阳性"},
        "BRCA2": {"野生型": true},
        "HRD评分": 42,
        "基因组瘢痕": "T+",
        "EGFR": {"exon19del": {"丰度": 8.5, "提示": "突变灶性分布，可能仅对应标注区域一部分"}}
    },
    "quality_score": 0.91,
    "submitted_by": "测序技术员B"
}'
echo "关键特性：补录测序后，所有 pending 状态的批注会自动提醒复核员更新判断。"
echo "同时分组统计会同步刷新。"
if wait_prompt; then
    eval "$CURL -X POST -d '$SEQ_DATA' $BASE_URL/api/sequencing | python3 -m json.tool"
fi

section "9. 第2轮复核（结合测序结果，仍待定等IHC）"
echo "命令: POST /api/annotations/2/reviews"
REVIEW_2='{
    "reviewer": "王医生(二次复核结合NGS)",
    "review_result": "pending",
    "review_reason": "测序辅助判断边界，但仍需IHC验证",
    "boundary_issue_detail": "新补NGS显示EGFR exon19del丰度8.5%，结合峰图提示突变可能呈灶性分布于原标注可疑区北侧约1/3区域，而非覆盖整个多边形范围。当前边界仍偏大。",
    "photo_alignment_issue": "补充NGS采样点坐标与HE切片在Y轴方向存在约120μm偏移，需用激光切割靶点坐标重新映射。",
    "suggestion": "已结合测序结果更新边界假设，但仍建议补充PD-L1免疫组化(22C3)确认肿瘤免疫微环境边界。IHC结果返回后提交第3轮复核，预计可最终定界。"
}'
echo "示范：异常复核不是一次性，而是多轮迭代。每一轮都会保留历史，月末统计可追溯。"
if wait_prompt; then
    eval "$CURL -X POST -d '$REVIEW_2' $BASE_URL/api/annotations/2/reviews | python3 -m json.tool"
fi

section "10. 查看某条批注的完整复核历史（看迭代过程）"
echo "命令: GET /api/annotations/2/reviews"
echo "用途: 回答导师'为什么这条还没通过？'时，可展示完整迭代轨迹。"
if wait_prompt; then
    eval "$CURL $BASE_URL/api/annotations/2/reviews | python3 -m json.tool"
fi

section "11. 查看分组及统计（测序补录后已自动更新）"
echo "命令: GET /api/groups"
echo "用途: 每个分组都有统计数据：边界清晰/不清数、通过/驳回数、已测序数..."
echo "关键：补录测序后统计自动刷新，不是静态值。"
if wait_prompt; then
    eval "$CURL $BASE_URL/api/groups | python3 -m json.tool"
fi

section "12. 强制刷新某分组统计（可选手动触发）"
echo "命令: POST /api/groups/2/recalc"
echo "分组2：待确认边界组 - 通常补录数据后自动触发，这里示范手动触发。"
if wait_prompt; then
    eval "$CURL -X POST $BASE_URL/api/groups/2/recalc | python3 -m json.tool"
fi

section "13. 生成完整导出报告（HTML+JSON，月底转交导师）"
echo "命令: POST /api/export/report"
EXPORT_PAYLOAD='{
    "include_blocked": true,
    "include_explanations": true,
    "exported_by": "生态调查员A(月底转交)"
}'
echo "报告包含："
echo "  - 总览摘要（多少可导出/多少被拦）"
echo "  - 导师重点关注模块（分优先级列出不能导出的记录）"
echo "  - 拦截记录明细：雷达图数据表(附文字解释)、每轮复核轨迹、测序结果"
echo "  - 可导出记录列表"
echo "产出：JSON报告 + HTML报告(可直接在浏览器打开给导师看)"
if wait_prompt; then
    eval "$CURL -X POST -d '$EXPORT_PAYLOAD' $BASE_URL/api/export/report | python3 -m json.tool"
fi

section "14. 列出被拦截切片(筛选方式)"
echo "命令: GET /api/slides?status=blocked"
echo "筛选：只显示当前有被拦截批注的切片。"
if wait_prompt; then
    eval "$CURL $BASE_URL/api/slides?status=blocked | python3 -m json.tool"
fi

echo ""
echo "=============================================="
echo "  所有 CURL 示例执行完毕"
echo "=============================================="
echo ""
echo "HTML 报告目录: ./reports/"
echo "可在浏览器打开最新的 export_report_*.html 查看完整带样式报告"
echo ""
echo "典型工作流回顾："
echo "  1. 生态调查员录入批注 (示例6)"
echo "  2. 病理医师复核/驳回 (示例7) — 不是一次性，可多轮"
echo "  3. 补录测序 → 自动刷新统计和提醒 (示例8)"
echo "  4. 多轮复核迭代 (示例9) — 支持第N轮"
echo "  5. 月底：一键导出报告，导师只看被拦原因 (示例13)"
echo ""

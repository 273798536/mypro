#!/bin/bash

echo "=========================================="
echo "  企业培训签到验收回放链路 - 测试脚本"
echo "=========================================="

BASE_URL="http://localhost:5002/api"
BATCH_ID="BATCH_2024_Q1_TRAINING_001"

echo ""
echo "步骤 1: 健康检查"
echo "------------------------------------------"
curl -s "${BASE_URL}/health" | python3 -m json.tool

echo ""
echo "步骤 2: 导入报名表数据"
echo "------------------------------------------"
for i in 1 2 3 4 5 6 7 8; do
    EMP_ID="EMP$(printf "%03d" $i)"
    EMP_NAMES=("张三" "李四" "王五" "赵六" "钱七" "孙八" "周九" "吴十")
    EMP_DEPTS=("技术部" "市场部" "人事部" "财务部" "技术部" "市场部" "运营部" "技术部")
    idx=$((i-1))
    
    curl -s -X POST "${BASE_URL}/registration" \
         -H "Content-Type: application/json" \
         -d "{
             \"batch_id\": \"${BATCH_ID}\",
             \"employee_id\": \"${EMP_ID}\",
             \"employee_name\": \"${EMP_NAMES[$idx]}\",
             \"department\": \"${EMP_DEPTS[$idx]}\",
             \"training_course\": \"2024年Q1企业合规培训\",
             \"training_date\": \"2024-03-15\",
             \"registration_time\": \"2024-03-10 10:00:00\",
             \"amount\": 100.0,
             \"status\": \"registered\"
         }" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  ${EMP_ID} - ${d.get(\"message\", d.get(\"error\"))}')"
done

echo ""
echo "步骤 3: 导入签到记录"
echo "------------------------------------------"
SIGN_DATA=(
    "SIGN_0001|EMP001|张三|2024-03-15 09:05:00|false|false"
    "SIGN_0002|EMP002|李四|2024-03-15 09:10:00|false|false"
    "SIGN_0003|EMP003|王五|2024-03-15 09:15:00|false|false"
    "SIGN_0004|EMP004|赵六|2024-03-15 09:20:00|false|false"
    "SIGN_0005|EMP005|钱七|2024-03-15 09:25:00|false|false"
    "SIGN_0006|EMP006|孙八|2024-03-15 09:30:00|false|false"
    "SIGN_0007|EMP004|赵六|2024-03-15 09:25:00|true|false"
    "SIGN_0008|EMP007|周九|2024-03-16 14:30:00|false|true"
)

for sign in "${SIGN_DATA[@]}"; do
    IFS='|' read -r SIGN_ID EMP_ID EMP_NAME SIGN_TIME IS_PROXY IS_MAKEUP <<< "$sign"
    
    curl -s -X POST "${BASE_URL}/sign" \
         -H "Content-Type: application/json" \
         -d "{
             \"batch_id\": \"${BATCH_ID}\",
             \"sign_id\": \"${SIGN_ID}\",
             \"employee_id\": \"${EMP_ID}\",
             \"employee_name\": \"${EMP_NAME}\",
             \"training_course\": \"2024年Q1企业合规培训\",
             \"sign_time\": \"${SIGN_TIME}\",
             \"qr_code\": \"QR_${SIGN_ID}\",
             \"location\": \"3楼会议室A\",
             \"is_proxy\": ${IS_PROXY},
             \"is_makeup\": ${IS_MAKEUP}
         }" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  ${SIGN_ID} - ${d.get(\"message\", d.get(\"error\"))}')"
done

echo ""
echo "步骤 4: 导入课后作业"
echo "------------------------------------------"
HW_DATA=(
    "HW_0001|EMP001|张三|2024-03-16 10:00:00|92.5"
    "HW_0002|EMP002|李四|2024-03-16 11:00:00|88.0"
    "HW_0003|EMP003|王五|2024-03-16 12:00:00|95.0"
    "HW_0004|EMP004|赵六|2024-03-16 13:00:00|78.5"
    "HW_0005|EMP005|钱七|2024-03-16 14:00:00|85.0"
)

for hw in "${HW_DATA[@]}"; do
    IFS='|' read -r HW_ID EMP_ID EMP_NAME SUBMIT_TIME SCORE <<< "$hw"
    
    curl -s -X POST "${BASE_URL}/homework" \
         -H "Content-Type: application/json" \
         -d "{
             \"batch_id\": \"${BATCH_ID}\",
             \"homework_id\": \"${HW_ID}\",
             \"employee_id\": \"${EMP_ID}\",
             \"employee_name\": \"${EMP_NAME}\",
             \"training_course\": \"2024年Q1企业合规培训\",
             \"submit_time\": \"${SUBMIT_TIME}\",
             \"score\": ${SCORE},
             \"status\": \"submitted\"
         }" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  ${HW_ID} - ${d.get(\"message\", d.get(\"error\"))}')"
done

echo ""
echo "步骤 5: 导入退款流水"
echo "------------------------------------------"
curl -s -X POST "${BASE_URL}/refund" \
     -H "Content-Type: application/json" \
     -d "{
         \"batch_id\": \"${BATCH_ID}\",
         \"refund_id\": \"REFUND_001\",
         \"employee_id\": \"EMP007\",
         \"employee_name\": \"周九\",
         \"training_course\": \"2024年Q1企业合规培训\",
         \"refund_amount\": 100.0,
         \"refund_time\": \"2024-03-17 10:00:00\",
         \"refund_reason\": \"员工离职\"
     }" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  REFUND_001 - ${d.get(\"message\", d.get(\"error\"))}')"

echo ""
echo "步骤 6: 测试幂等性 - 重复提交相同数据"
echo "------------------------------------------"
curl -s -X POST "${BASE_URL}/registration" \
     -H "Content-Type: application/json" \
     -d "{
         \"batch_id\": \"${BATCH_ID}\",
         \"employee_id\": \"EMP001\",
         \"employee_name\": \"张三\",
         \"department\": \"技术部\",
         \"training_course\": \"2024年Q1企业合规培训\",
         \"training_date\": \"2024-03-15\",
         \"registration_time\": \"2024-03-10 10:00:00\",
         \"amount\": 100.0,
         \"status\": \"registered\"
     }" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  重复提交: {d.get(\"message\", d.get(\"error\"))}')"

echo ""
echo "步骤 7: 执行对账"
echo "------------------------------------------"
curl -s -X POST "${BASE_URL}/reconcile/${BATCH_ID}" | python3 -m json.tool

echo ""
echo "步骤 8: 查看异常分析"
echo "------------------------------------------"
curl -s "${BASE_URL}/anomalies/${BATCH_ID}" | python3 -m json.tool

echo ""
echo "步骤 9: 查看对账结果"
echo "------------------------------------------"
curl -s "${BASE_URL}/reconcile/${BATCH_ID}" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('=== 对账汇总 ===')
print(f'报名人数: {d[\"total_registrations\"]}')
print(f'签到人数: {d[\"signed_count\"]}')
print(f'未签到人数: {d[\"unsigned_count\"]}')
print(f'代签次数: {d[\"proxy_sign_count\"]}')
print(f'补签次数: {d[\"makeup_sign_count\"]}')
print(f'作业提交: {d[\"homework_completed\"]}')
print(f'退款人数: {d[\"refund_count\"]}')
print(f'退款金额: {d[\"refund_amount\"]}')
print(f'脏记录数: {d[\"dirty_count\"]}')
"

echo ""
echo "步骤 10: 导出Excel报告"
echo "------------------------------------------"
curl -s "${BASE_URL}/export/${BATCH_ID}" | python3 -m json.tool

echo ""
echo "步骤 11: 查看历史记录"
echo "------------------------------------------"
curl -s "${BASE_URL}/history" | python3 -m json.tool

echo ""
echo "=========================================="
echo "  测试完成！"
echo "=========================================="

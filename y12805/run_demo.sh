#!/bin/bash
set -e

echo "============================================"
echo "  PCR 阴性对照巡检 — 完整流程演示脚本"
echo "============================================"
echo ""

BASE="http://localhost:5000"

echo "【1】安装依赖并启动服务..."
echo "  pip install flask"
echo "  python server.py &"
echo "  （本脚本假设服务已在后台运行）"
echo ""

echo "【2】清空旧数据，从零开始..."
curl -s -X POST "$BASE/api/reset" | python3 -m json.tool
echo ""

echo "【3】批量导入样本（含 3 条正常 + 1 条缺少字段 + 1 条重复）..."
curl -s -X POST "$BASE/api/samples/import" \
  -H "Content-Type: application/json" \
  -d '{
    "samples": [
      {"sample_code":"NC-001","species":"C57BL/6小鼠","sampling_location":"A栋3层SPF房","collection_date":"2026-06-01","pathology_notes":"未见异常"},
      {"sample_code":"NC-002","species":"BALB/c小鼠","sampling_location":"A栋3层SPF房","collection_date":"2026-06-01","pathology_notes":"肺部轻度充血"},
      {"sample_code":"NC-003","species":"SD大鼠","sampling_location":"B栋1层普通房","collection_date":"2026-06-02","pathology_notes":""},
      {"sample_code":"NC-BAD","species":"小鼠"},
      {"sample_code":"NC-001","species":"C57BL/6小鼠","sampling_location":"C栋2层","collection_date":"2026-06-03"}
    ]
  }' | python3 -m json.tool
echo ""

echo "【4】查看所有样本..."
curl -s "$BASE/api/samples" | python3 -m json.tool
echo ""

echo "【5】修改采样地点（NC-001 从 A栋3层SPF房 → C栋2层隔离房）→ 自动触发复核提醒..."
curl -s -X PUT "$BASE/api/samples/1" \
  -H "Content-Type: application/json" \
  -d '{"sampling_location":"C栋2层隔离房"}' | python3 -m json.tool
echo ""

echo "【6】查看复核提醒（采样地点变更导致）..."
curl -s "$BASE/api/review-flags?resolved=0" | python3 -m json.tool
echo ""

echo "【7】人工修正（NC-003 补充病理备注）..."
curl -s -X POST "$BASE/api/samples/3/correct" \
  -H "Content-Type: application/json" \
  -d '{"field_name":"pathology_notes","new_value":"肝脏轻微脂肪变性","reason":"补录病理科报告"}' | python3 -m json.tool
echo ""

echo "【8】分组统计（按采样地点）..."
curl -s "$BASE/api/statistics/groups?group_by=sampling_location" | python3 -m json.tool
echo ""

echo "【9】填写结论（NC-002 检测阴性）..."
curl -s -X PUT "$BASE/api/conclusions/2" \
  -H "Content-Type: application/json" \
  -d '{"result":"阴性","review_opinion":"符合预期，阴性对照有效"}' | python3 -m json.tool
echo ""

echo "【10】确认复核（NC-002 有病理备注和复核意见，可以确认）..."
curl -s -X PUT "$BASE/api/conclusions/2" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed","reviewer":"张老师"}' | python3 -m json.tool
echo ""

echo "【11】尝试确认复核（NC-003 之前缺病理备注，现在已补充，试试确认）..."
curl -s -X PUT "$BASE/api/conclusions/3" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed","reviewer":"李老师","review_opinion":"已补充病理备注，确认阴性"}' | python3 -m json.tool
echo ""

echo "【12】尝试确认复核（NC-001 无复核意见，应报错）..."
curl -s -X PUT "$BASE/api/conclusions/1" \
  -H "Content-Type: application/json" \
  -d '{"status":"confirmed","reviewer":"张老师"}' | python3 -m json.tool
echo ""

echo "【13】添加谱系追踪（NC-002 结论关联到 NC-001 来源材料）..."
curl -s -X POST "$BASE/api/lineage" \
  -H "Content-Type: application/json" \
  -d '{"conclusion_id":2,"source_sample_code":"NC-001","source_material":"C57BL/6小鼠同批对照组","description":"同批阴性对照交叉验证"}' | python3 -m json.tool
echo ""

echo "【14】查看结论详情（含谱系追踪、修正记录、复核提醒）..."
curl -s "$BASE/api/conclusions/2" | python3 -m json.tool
echo ""

echo "【15】查看样本详情（含结论、修正记录、复核提醒，可点击回跳）..."
curl -s "$BASE/api/samples/1" | python3 -m json.tool
echo ""

echo "【16】重复导入场景——再次导入 NC-001，应被跳过不会重复创建..."
curl -s -X POST "$BASE/api/samples/import" \
  -H "Content-Type: application/json" \
  -d '{"samples":[{"sample_code":"NC-001","species":"C57BL/6小鼠","sampling_location":"A栋3层SPF房","collection_date":"2026-06-01","pathology_notes":"重复导入测试"}]}' | python3 -m json.tool
echo ""

echo "【17】确认样本数没有增加..."
curl -s "$BASE/api/samples" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'样本总数: {len(d[\"data\"])}')"
echo ""

echo "============================================"
echo "  流程演示完成！"
echo "  打开浏览器访问 http://localhost:5000 查看页面"
echo "============================================"

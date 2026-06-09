"""
随机游走路径复盘 - Python 示例脚本

从空目录把完整流程跑一遍：
1. 初始化数据库
2. 导入学生错题
3. 风控分析师人工修正（留痕）
4. 导出图表和对比数据
"""

import json
import os
import sys
from datetime import datetime

import requests

BASE_URL = os.environ.get('WALK_REVIEW_URL', 'http://127.0.0.1:5000')


def p(label, data):
    print(f"\n=== {label} ===")
    if isinstance(data, (dict, list)):
        print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        print(data)


def main():
    print("=" * 50)
    print("随机游走路径复盘 - Python 完整流程演示")
    print("=" * 50)

    try:
        resp = requests.get(f"{BASE_URL}/api/health", timeout=5)
        p("健康检查", resp.json())
    except requests.exceptions.ConnectionError:
        print(f"错误：无法连接到 {BASE_URL}")
        print("请先启动服务： python app.py")
        sys.exit(1)

    batch_a = "BATCH-2026-06-PY-A"
    records_a = [
        {
            "student_no": "S2024101",
            "student_name": "赵磊",
            "grade": "高二",
            "question_id": "CHEM-102",
            "subject": "化学",
            "knowledge_point": "化学平衡",
            "wrong_count": 2,
            "status": "pending",
            "walk_path": [
                {"from": "反应速率", "to": "化学平衡", "prob": 0.75, "visit": 2},
                {"from": "化学平衡", "to": "平衡移动", "prob": 0.5, "visit": 1}
            ]
        },
        {
            "student_no": "S2024101",
            "student_name": "赵磊",
            "grade": "高二",
            "question_id": "BIO-201",
            "subject": "生物",
            "knowledge_point": "遗传规律",
            "wrong_count": 4,
            "status": "pending",
            "data_status": "pending_review",
            "status_reason": "需要对照课堂笔记确认"
        },
        {
            "student_no": "S2024102",
            "student_name": "孙悦",
            "grade": "高二",
            "question_id": "MATH-210",
            "subject": "数学",
            "knowledge_point": "导数应用",
            "wrong_count": 1,
            "status": "pending"
        }
    ]

    p("第一步：导入第一批数据 (批次 {})".format(batch_a),
      requests.post(f"{BASE_URL}/api/import", json={
          "batch_id": batch_a,
          "file_name": "错题_高二_20260605.xlsx",
          "operator": "李分析师",
          "note": "高二第一周周测错题",
          "records": records_a
      }).json())

    p("第二步：再次导入相同记录（验证去重，应该跳过）",
      requests.post(f"{BASE_URL}/api/import", json={
          "batch_id": "BATCH-2026-06-PY-B",
          "operator": "李分析师",
          "note": "误操作重复导入测试",
          "records": records_a[:1]
      }).json())

    resp = requests.get(f"{BASE_URL}/api/wrong-questions",
                        params={"student_no": "S2024101", "subject": "化学"})
    chem_list = resp.json()
    if chem_list:
        chem_id = chem_list[0]['id']
        p("第三步：查询化学错题详细信息（含游走路径）", chem_list[0])

        p("第四步：风控分析师修正 - 待确认->通过，并记录原因",
          requests.post(f"{BASE_URL}/api/wrong-questions/{chem_id}/correct", json={
              "new_status": "passed",
              "new_wrong_count": 1,
              "reason": "经复核：学生课堂表现良好，该题属于笔误；已订正且思路正确，标记通过。原wrong_count=2系统计重复。",
              "operator": "风控分析师-王"
          }).json())

        p("第五步：再次查询，查看 correction_history 留痕",
          requests.get(f"{BASE_URL}/api/wrong-questions/{chem_id}").json())

    p("第六步：月底/课前历史对比 - 学生 S2024101",
      requests.get(f"{BASE_URL}/api/walk-path/compare",
                   params={"student_no": "S2024101"}).json())

    os.makedirs('exports', exist_ok=True)
    for ctype in ['trend', 'status', 'data_status', 'subject']:
        r = requests.get(f"{BASE_URL}/api/export/chart",
                         params={"type": ctype, "student_no": "S2024101"})
        if r.status_code == 200:
            path = f"exports/python_demo_{ctype}.png"
            with open(path, 'wb') as f:
                f.write(r.content)
            print(f"[图表导出] {ctype} -> {path}")
        else:
            print(f"[图表导出] {ctype} 失败: {r.status_code} {r.text}")

    r = requests.get(f"{BASE_URL}/api/export/csv",
                     params={"student_no": "S2024101"})
    if r.status_code == 200:
        with open("exports/python_demo_details.csv", 'wb') as f:
            f.write(r.content)
        print("[CSV导出] exports/python_demo_details.csv")

    p("第七步：给投委会看之前 - 仪表盘概览（哪些可用/暂缓/需重采）",
      requests.get(f"{BASE_URL}/api/export/dashboard").json())

    print("\n" + "=" * 50)
    print("流程演示结束。")
    print("  可用数据：化学-化学平衡（已人工通过，修正留痕）")
    print("  暂缓数据：生物-遗传规律（待复核，需对照笔记）")
    print("  需重采：无（本演示批次）")
    print("=" * 50)


if __name__ == '__main__':
    main()

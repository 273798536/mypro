import sys, os, json, io
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from openpyxl import load_workbook

client = TestClient(app)

results = []

def check(name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    results.append((status, name, detail))
    print(f"[{status}] {name} {detail}")
    return cond

try:
    for p in settings.EXPORT_DIR.glob("*"):
        p.unlink()
    try:
        Path("data/copyright_ledger.db").unlink()
    except: pass
except Exception as e:
    pass

resp = client.get("/api/health")
check("健康检查", resp.status_code == 200)

batch_payload = {
    "batch_name": "2026-Q2-数学评测集-A",
    "importer": "张评测",
    "description": "二季度数学评测题库",
    "subject_category": "数学",
    "questions": [
        {
            "question_id_external": "MATH-001",
            "question_content": "求解方程：2x + 5 = 13",
            "standard_answer": "x = 4",
            "difficulty": "简单",
            "knowledge_point": "一元一次方程",
            "human_note": "这题去年也考过，学生容易把移项搞反，别漏了这个细节哈",
            "copyright_sources": [{"copyright_type": "authorized", "source_title": "初中数学精选题集（第3版）", "authorization_number": "AUTH-2024-00123"}],
        },
        {
            "question_id_external": "MATH-002",
            "question_content": "已知三角形ABC中，AB=3, BC=4, 角B=90度，求AC的长度",
            "standard_answer": "AC = 5",
            "difficulty": "中等",
            "knowledge_point": "勾股定理",
            "human_note": "勾股定理是高频考点，注意配图",
            "copyright_sources": [{"copyright_type": "public_domain", "source_title": "经典几何题库", "remark": "已进入公有领域"}],
        },
        {
            "question_id_external": "MATH-003",
            "question_content": "因式分解：x² - 6x + 9",
            "standard_answer": "(x-3)²",
            "difficulty": "简单",
            "knowledge_point": "因式分解",
            "copyright_sources": [{"copyright_type": "unknown", "remark": "原始来源待确认"}],
        },
        {
            "question_id_external": "MATH-004",
            "question_content": "求函数 y=x²-4x+3 的最小值",
            "standard_answer": "-1",
            "difficulty": "中等",
            "knowledge_point": "一元一次方程",
            "copyright_sources": [{"copyright_type": "fair_use", "source_title": "高中数学教案", "fair_use_justification": "教学评测合理使用"}],
        },
        {
            "question_id_external": "MATH-005",
            "question_content": "解不等式：3x - 7 > 2",
            "standard_answer": "x > 3",
            "difficulty": "简单",
            "knowledge_point": "一元一次方程",
            "copyright_sources": [{"copyright_type": "original"}],
        },
    ],
}

resp = client.post("/api/batches", json=batch_payload)
check("批次导入", resp.status_code == 200)
batch_id = resp.json()["id"]
question_ids = [q["id"] for q in resp.json()["questions"]]

review_payload = {
    "reviewer": "李复核",
    "items": [
        {"question_id": question_ids[0], "passed": True},
        {
            "question_id": question_ids[1],
            "passed": False,
            "issue_type": "material_missing",
            "issue_detail": "公有领域证明材料缺失，需补充原始出版物扫描件",
            "next_action": "请题库同学补传原始出版物的版权页扫描件",
        },
        {
            "question_id": question_ids[2],
            "passed": False,
            "issue_type": "calibration_wrong",
            "issue_detail": "版权类型标记为unknown不符合入账要求，需重新确认",
            "next_action": "请评测负责人和出题人重新确认来源后改口径",
        },
        {"question_id": question_ids[3], "passed": True},
    ],
}

resp = client.post(f"/api/batches/{batch_id}/review", json=review_payload)
check("复核提交", resp.status_code == 200)

resp = client.get(f"/api/batches/{batch_id}/review-summary")
s = resp.json()
check("复核后汇总-缺材料=1", s["material_missing_count"] == 1, f"实际={s['material_missing_count']}")
check("复核后汇总-改口径=1", s["calibration_wrong_count"] == 1, f"实际={s['calibration_wrong_count']}")
check("复核后汇总-待处理=1", s["total_pending"] == 1, f"实际={s['total_pending']}")

status_payload = {
    "target_status": "rejected",
    "operator": "模型评审会-赵老师",
    "reason": "评测集知识点偏科严重，且仍有2题版权材料缺失，不符合上线要求",
}
resp = client.post(f"/api/batches/{batch_id}/status", json=status_payload)
check("评审会拦截", resp.status_code == 200)

resp = client.get(f"/api/batches/{batch_id}/review-summary")
s2 = resp.json()
check("拦截后汇总-缺材料=1", s2["material_missing_count"] == 1, f"实际={s2['material_missing_count']}")
check("拦截后汇总-改口径=1", s2["calibration_wrong_count"] == 1, f"实际={s2['calibration_wrong_count']}")
check("拦截后汇总-待处理=1", s2["total_pending"] == 1, f"实际={s2['total_pending']}")

resp = client.get(f"/api/batches/{batch_id}/export-report")
check("导出报告", resp.status_code == 200)
report = resp.json()
ss = report["status_summary"]
check("报告 status_summary.material_missing=1", ss["material_missing"] == 1, f"实际={ss['material_missing']}")
check("报告 status_summary.calibration_wrong=1", ss["calibration_wrong"] == 1, f"实际={ss['calibration_wrong']}")
check("报告 status_summary.pending=1", ss["pending"] == 1, f"实际={ss['pending']}")
check_sum = ss["review_passed"] + ss["review_blocked"] + ss["pending"]
check("报告 status_summary 加总一致", check_sum == ss["total_questions"], f"{check_sum} != {ss['total_questions']}")

for s in report["full_data"]["status_history"]:
    reason = s.get("reason") or ""
    if "待处理-" in reason:
        check("状态历史无负数", False, reason)
        break
else:
    check("状态历史无负数", True)

plain = report["plain_explanation"]
check("普通话解释含缺材料", "需补材料" in plain and "1 题" in plain)
check("普通话解释含改口径", "需改口径" in plain and "1 题" in plain)

rej = report.get("rejection_explanation") or ""
check("拦截原因可理解", len(rej) > 0 and ("不符合" in rej or "偏科" in rej))

resp = client.get(f"/api/batches/{batch_id}/download/json")
check("JSON 下载", resp.status_code == 200, f"status={resp.status_code}")
check("JSON Content-Disposition 含 filename", "filename" in resp.headers.get("content-disposition", ""))
json_data = json.loads(resp.content)
check("JSON status_summary.material_missing=1", json_data["status_summary"]["material_missing"] == 1)
check("JSON status_summary.calibration_wrong=1", json_data["status_summary"]["calibration_wrong"] == 1)
check("JSON status_summary.pending=1", json_data["status_summary"]["pending"] == 1)
for s in json_data["status_history"]:
    reason = s.get("reason") or ""
    if "待处理-" in reason:
        check("JSON 状态历史无负数", False, reason)
        break
else:
    check("JSON 状态历史无负数", True)

resp = client.get(f"/api/batches/{batch_id}/download/excel")
check("Excel 下载", resp.status_code == 200, f"status={resp.status_code}")
check("Excel Content-Disposition 含 xlsx", ".xlsx" in resp.headers.get("content-disposition", ""))
check("Excel 为真实 xlsx 格式", resp.content[:2] == b"PK", f"前2字节={resp.content[:2]}")

wb = load_workbook(io.BytesIO(resp.content), data_only=True)
expected = ["概览", "异常明细", "题目清单", "状态历史", "提示词版本"]
for s in expected:
    check(f"Excel 含 sheet {s}", s in wb.sheetnames)

ws_sum = wb["概览"]
mm_val = None
cw_val = None
pd_val = None
for row in ws_sum.iter_rows(min_row=1, max_row=ws_sum.max_row, values_only=True):
    if row and row[0]:
        k = str(row[0]).strip()
        v = str(row[1]).strip() if row[1] else ""
        if "需补材料" in k:
            mm_val = int(v) if v else None
        if "需改口径" in k:
            cw_val = int(v) if v else None
        if k == "待复核":
            pd_val = int(v) if v else None
check("Excel 概览缺材料=1", mm_val == 1, f"实际={mm_val}")
check("Excel 概览改口径=1", cw_val == 1, f"实际={cw_val}")
check("Excel 概览待处理=1", pd_val == 1, f"实际={pd_val}")

ws_hist = wb["状态历史"]
for row_idx, row in enumerate(ws_hist.iter_rows(min_row=2, max_row=ws_hist.max_row, values_only=True)):
    if row and row[4]:
        reason = str(row[4])
        if "待处理-" in reason:
            check("Excel 状态历史无负数", False, f"第{row_idx+2}行: {reason}")
            break
else:
    check("Excel 状态历史无负数", True)

json_files = list(settings.EXPORT_DIR.glob("*.json"))
xlsx_files = list(settings.EXPORT_DIR.glob("*.xlsx"))
check("JSON 文件落盘", len(json_files) >= 1)
check("Excel 文件落盘", len(xlsx_files) >= 1)
for f in json_files + xlsx_files:
    check(f"文件 {f.name} 非空", f.stat().st_size > 0)

print("\n=== 结果汇总 ===")
fail_count = len([r for r in results if r[0] == "FAIL"])
if fail_count == 0:
    print("全部通过！")
else:
    print(f"失败 {fail_count} 项：")
    for r in results:
        if r[0] == "FAIL":
            print(f"  - {r[1]}: {r[2]}")
    sys.exit(1)

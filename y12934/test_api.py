import json
import sys
import os
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)


def _cleanup_exports():
    for p in settings.EXPORT_DIR.glob("*"):
        try:
            p.unlink()
        except Exception:
            pass


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
    print("[PASS] 健康检查接口正常")


def test_bug_consistency_after_rejection():
    print("\n=== 核心 Bug 修复验证：拦截后 status_summary 不能清零 ===")

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
    assert resp.status_code == 200
    batch = resp.json()
    batch_id = batch["id"]
    question_ids = [q["id"] for q in batch["questions"]]
    print(f"[INFO] 批次已导入 batch_id={batch_id}")

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
    assert resp.status_code == 200

    resp = client.get(f"/api/batches/{batch_id}/review-summary")
    assert resp.status_code == 200
    before = resp.json()
    assert before["material_missing_count"] == 1
    assert before["calibration_wrong_count"] == 1
    assert before["total_passed"] == 2
    assert before["total_blocked"] == 2
    assert before["total_pending"] == 1
    print(f"[PASS] 拦截前复核汇总：通过={before['total_passed']} 缺材料={before['material_missing_count']} 改口径={before['calibration_wrong_count']} 待处理={before['total_pending']}")

    resp = client.get(f"/api/batches/{batch_id}/issue-breakdown")
    assert resp.status_code == 200
    breakdown_before = resp.json()
    mm_questions = []
    cw_questions = []
    for ib in breakdown_before:
        if ib["issue_type"] == "material_missing":
            mm_questions = ib["question_ids"]
        if ib["issue_type"] == "calibration_wrong":
            cw_questions = ib["question_ids"]
    assert len(mm_questions) == 1
    assert len(cw_questions) == 1
    print(f"[PASS] 拦截前异常明细一致：缺材料题={mm_questions} 改口径题={cw_questions}")

    status_payload = {
        "target_status": "rejected",
        "operator": "模型评审会-赵老师",
        "reason": "评测集知识点偏科严重，且仍有2题版权材料缺失，不符合上线要求",
    }
    resp = client.post(f"/api/batches/{batch_id}/status", json=status_payload)
    assert resp.status_code == 200
    print("[INFO] 评审会已将批次状态推进为 rejected")

    resp = client.get(f"/api/batches/{batch_id}/review-summary")
    assert resp.status_code == 200
    after = resp.json()
    print(f"[INFO] 拦截后复核汇总：通过={after['total_passed']} 缺材料={after['material_missing_count']} 改口径={after['calibration_wrong_count']} 待处理={after['total_pending']}")
    assert after["material_missing_count"] == 1, f"Bug已回归：缺材料应为1，实际={after['material_missing_count']}"
    assert after["calibration_wrong_count"] == 1, f"Bug已回归：改口径应为1，实际={after['calibration_wrong_count']}"
    assert after["total_passed"] == 2, f"Bug已回归：通过应为2，实际={after['total_passed']}"
    assert after["total_pending"] == 1, f"Bug已回归：待处理应为1，实际={after['total_pending']}"
    print("[PASS] 拦截后 review-summary 与拦截前一致，没有被清零")

    resp = client.get(f"/api/batches/{batch_id}/issue-breakdown")
    assert resp.status_code == 200
    breakdown_after = resp.json()
    mm_after = []
    cw_after = []
    for ib in breakdown_after:
        if ib["issue_type"] == "material_missing":
            mm_after = ib["question_ids"]
        if ib["issue_type"] == "calibration_wrong":
            cw_after = ib["question_ids"]
    assert mm_after == mm_questions, "拦截前后缺材料题集不一致"
    assert cw_after == cw_questions, "拦截前后改口径题集不一致"
    print("[PASS] 拦截后 issue-breakdown 与拦截前一致")

    resp = client.get(f"/api/batches/{batch_id}/export-report")
    assert resp.status_code == 200
    report = resp.json()
    ss = report["status_summary"]
    print(f"[INFO] 报告 status_summary: {ss}")
    assert ss["material_missing"] == 1, f"报告 status_summary.material_missing 应为1，实际={ss['material_missing']}"
    assert ss["calibration_wrong"] == 1, f"报告 status_summary.calibration_wrong 应为1，实际={ss['calibration_wrong']}"
    assert ss["pending"] == 1, f"报告 status_summary.pending 应为1，实际={ss['pending']}"
    assert ss["review_passed"] == 2
    assert ss["review_blocked"] == 2
    print("[PASS] 报告 status_summary 与 review-summary 一致，无矛盾")

    ib_report = report["issue_breakdown"]
    ib_report_counts = {ib["issue_type"]: ib["count"] for ib in ib_report}
    assert ib_report_counts.get("material_missing") == 1
    assert ib_report_counts.get("calibration_wrong") == 1
    print("[PASS] 报告 issue_breakdown 与 status_summary 数字一致")

    plain = report["plain_explanation"]
    print(f"\n=== 报告普通话解释（可直接转发）===\n{plain}\n=== 解释结束 ===\n")
    assert "需补材料 1 题" in plain or "需补材料1题" in plain
    assert "需改口径 1 题" in plain or "需改口径1题" in plain
    assert "未通过模型评审会审核" in plain
    print("[PASS] 普通话解释包含异常分类数字，评测负责人可直接复制转发")

    rej = report.get("rejection_explanation") or ""
    print(f"=== 拦截原因解释（评审会只看报告也能懂）===\n{rej}\n=== 结束 ===\n")
    assert len(rej) > 0
    assert "不符合" in rej or "偏科" in rej
    print("[PASS] 拦截状态下 rejection_explanation 非空，评审会只看报告也能理解")

    for ib in report["issue_breakdown"]:
        for d in ib["details"]:
            if d.get("human_note"):
                assert "高频考点" in d["human_note"] or "别漏了这个细节" in d["human_note"]
                print(f"[PASS] 报告异常明细保留人工备注原话: {d['human_note'][:30]}...")
                break

    _cleanup_exports()
    resp = client.get(f"/api/batches/{batch_id}/download/json")
    assert resp.status_code == 200, f"JSON 下载失败: {resp.text}"
    assert "attachment" in resp.headers.get("content-disposition", "") or "filename" in resp.headers.get("content-disposition", "")
    json_bytes = resp.content
    assert len(json_bytes) > 100
    data = json.loads(json_bytes)
    assert data["status_summary"]["material_missing"] == 1
    assert data["status_summary"]["calibration_wrong"] == 1
    fname = resp.headers.get("content-disposition", "")
    assert ".json" in fname
    print(f"[PASS] JSON 文件下载成功 content-disposition={fname}, 大小={len(json_bytes)} 字节, 数据与 report 一致")

    resp = client.get(f"/api/batches/{batch_id}/download/excel")
    assert resp.status_code == 200, f"Excel 下载失败: {resp.text}"
    assert "filename" in resp.headers.get("content-disposition", "")
    excel_bytes = resp.content
    assert len(excel_bytes) > 2000
    assert excel_bytes[:2] == b"PK"
    fname2 = resp.headers.get("content-disposition", "")
    assert ".xlsx" in fname2
    print(f"[PASS] Excel 文件下载成功 content-disposition={fname2}, 大小={len(excel_bytes)} 字节（真实 xlsx 格式）")

    json_files = list(settings.EXPORT_DIR.glob("*.json"))
    xlsx_files = list(settings.EXPORT_DIR.glob("*.xlsx"))
    assert len(json_files) >= 1, "JSON 文件未真实落盘"
    assert len(xlsx_files) >= 1, "Excel 文件未真实落盘"
    print(f"[PASS] 导出文件已真实写入磁盘: JSON={json_files[0].name}, Excel={xlsx_files[0].name}")

    print("\n=== 全部 Bug 修复与文件下载测试通过 ===")


if __name__ == "__main__":
    test_health()
    test_bug_consistency_after_rejection()

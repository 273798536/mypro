import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
    print("[PASS] 健康检查接口正常")


def test_full_workflow():
    print("\n=== 开始完整流程测试 ===")

    batch_payload = {
        "batch_name": "2026-Q2-数学评测集-A",
        "importer": "张评测",
        "description": "二季度数学评测题库，覆盖代数和几何",
        "subject_category": "数学",
        "questions": [
            {
                "question_id_external": "MATH-001",
                "question_content": "求解方程：2x + 5 = 13",
                "standard_answer": "x = 4",
                "difficulty": "简单",
                "knowledge_point": "一元一次方程",
                "human_note": "这题去年也考过，学生容易把移项搞反，别漏了这个细节哈",
                "copyright_sources": [
                    {
                        "copyright_type": "authorized",
                        "source_title": "初中数学精选题集（第3版）",
                        "source_author": "李老师",
                        "source_publisher": "教育出版社",
                        "publication_date": "2023-05",
                        "authorization_number": "AUTH-2024-00123",
                        "authorization_expiry": "2026-12-31",
                    }
                ],
            },
            {
                "question_id_external": "MATH-002",
                "question_content": "已知三角形ABC中，AB=3, BC=4, 角B=90度，求AC的长度",
                "standard_answer": "AC = 5",
                "difficulty": "中等",
                "knowledge_point": "勾股定理",
                "human_note": "勾股定理是高频考点，注意配图",
                "copyright_sources": [
                    {
                        "copyright_type": "public_domain",
                        "source_title": "经典几何题库",
                        "remark": "已进入公有领域",
                    }
                ],
            },
            {
                "question_id_external": "MATH-003",
                "question_content": "因式分解：x² - 6x + 9",
                "standard_answer": "(x-3)²",
                "difficulty": "简单",
                "knowledge_point": "因式分解",
                "human_note": "",
                "copyright_sources": [
                    {
                        "copyright_type": "unknown",
                        "remark": "原始来源待确认",
                    }
                ],
            },
            {
                "question_id_external": "MATH-004",
                "question_content": "求函数 y=x²-4x+3 的最小值",
                "standard_answer": "-1",
                "difficulty": "中等",
                "knowledge_point": "一元一次方程",
                "copyright_sources": [
                    {
                        "copyright_type": "fair_use",
                        "source_title": "高中数学教案",
                        "fair_use_justification": "教学评测合理使用，引用量小",
                    }
                ],
            },
            {
                "question_id_external": "MATH-005",
                "question_content": "解不等式：3x - 7 > 2",
                "standard_answer": "x > 3",
                "difficulty": "简单",
                "knowledge_point": "一元一次方程",
                "copyright_sources": [
                    {"copyright_type": "original"}
                ],
            },
        ],
    }

    resp = client.post("/api/batches", json=batch_payload)
    assert resp.status_code == 200, f"导入失败: {resp.text}"
    batch = resp.json()
    batch_id = batch["id"]
    assert batch["total_questions"] == 5
    assert batch["current_status"] == "imported"
    print(f"[PASS] 批次导入成功, batch_id={batch_id}, 共5题, 状态=imported")

    question_ids = [q["id"] for q in batch["questions"]]
    assert len(question_ids) == 5

    for q in batch["questions"]:
        if q["question_id_external"] == "MATH-001":
            assert "别漏了这个细节哈" in (q["human_note"] or "")
            print("[PASS] 人工备注原话已保留（未被自动改写）")
            break

    resp = client.get(f"/api/batches")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1
    print("[PASS] 批次列表查询正常")

    resp = client.get(f"/api/batches/{batch_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == batch_id
    print("[PASS] 批次详情查询正常")

    review_payload = {
        "reviewer": "李复核",
        "items": [
            {
                "question_id": question_ids[0],
                "passed": True,
            },
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
            {
                "question_id": question_ids[3],
                "passed": True,
            },
        ],
    }

    resp = client.post(f"/api/batches/{batch_id}/review", json=review_payload)
    assert resp.status_code == 200, f"复核失败: {resp.text}"
    reviewed_batch = resp.json()
    assert reviewed_batch["current_status"] == "review_blocked"
    print("[PASS] 复核提交成功，批次状态自动推进为 review_blocked")

    resp = client.get(f"/api/batches/{batch_id}/review-summary")
    assert resp.status_code == 200
    summary = resp.json()
    assert summary["material_missing_count"] == 1
    assert summary["calibration_wrong_count"] == 1
    assert summary["total_passed"] == 2
    assert summary["total_blocked"] == 2
    assert summary["total_pending"] == 1
    print(f"[PASS] 异常汇总区分明确：缺材料{summary['material_missing_count']}题、改口径{summary['calibration_wrong_count']}题，不是只显示一个红色总数")

    resp = client.get(f"/api/batches/{batch_id}/issue-breakdown")
    assert resp.status_code == 200
    breakdown = resp.json()
    assert len(breakdown) == 2
    for item in breakdown:
        if item["issue_type"] == "material_missing":
            assert item["count"] == 1
            assert item["details"][0]["next_action"] is not None
            print(f"[PASS] 补材料异常包含 next_action: {item['details'][0]['next_action']}")
        if item["issue_type"] == "calibration_wrong":
            assert item["count"] == 1
            assert item["details"][0]["next_action"] is not None
            print(f"[PASS] 改口径异常包含 next_action: {item['details'][0]['next_action']}")

    for q in reviewed_batch["questions"]:
        if "勾股定理" in q["question_content"]:
            if q["review_records"]:
                preserved = q["review_records"][0]["human_note_preserved"]
                assert preserved is not None and "高频考点" in preserved
                print("[PASS] 复核记录中已保留人工备注原话")
                break

    pv_payload = {
        "version_code": "v1.0.0",
        "version_name": "初始提示词版本",
        "prompt_content": "你是一个数学评测助手，请严格按步骤解答...",
        "creator": "王算法",
        "description": "第一轮评测用提示词",
        "is_active": True,
    }
    resp = client.post("/api/prompt-versions", json=pv_payload)
    assert resp.status_code == 200
    pv1 = resp.json()
    pv1_id = pv1["id"]
    print(f"[PASS] 提示词版本 v1.0.0 创建成功, id={pv1_id}")

    bind_req = {
        "prompt_version_id": pv1_id,
        "operator": "李复核",
        "remark": "初始绑定",
    }
    resp = client.post(f"/api/batches/{batch_id}/prompt-version", json=bind_req)
    assert resp.status_code == 200
    tracks = resp.json()
    assert len(tracks) >= 1
    print("[PASS] 提示词版本 v1.0.0 已绑定到批次")

    pv2_payload = {
        "version_code": "v1.1.0",
        "version_name": "补录修正版",
        "prompt_content": "你是一个严谨的数学评测助手，请按版权合规优先原则...",
        "creator": "王算法",
        "description": "根据评审会反馈补录的提示词版本",
        "is_active": True,
    }
    resp = client.post("/api/prompt-versions", json=pv2_payload)
    assert resp.status_code == 200
    pv2 = resp.json()
    pv2_id = pv2["id"]
    print(f"[PASS] 提示词补录版本 v1.1.0 创建成功, id={pv2_id}")

    bind_req2 = {
        "prompt_version_id": pv2_id,
        "operator": "李复核",
        "remark": "评审会后补录更新",
    }
    resp = client.post(f"/api/batches/{batch_id}/prompt-version", json=bind_req2)
    assert resp.status_code == 200
    print("[PASS] 补录后提示词版本 v1.1.0 已重新绑定，版本追踪更新")

    resp = client.get(f"/api/batches/{batch_id}/prompt-versions")
    assert resp.status_code == 200
    tracks = resp.json()
    version_codes = set()
    for t in tracks:
        if t.get("prompt_version"):
            version_codes.add(t["prompt_version"]["version_code"])
    assert "v1.0.0" in version_codes
    assert "v1.1.0" in version_codes
    print("[PASS] 提示词版本追踪包含 v1.0.0 和 v1.1.0，历史不丢失")

    resp = client.get(f"/api/batches/{batch_id}/bias-analysis")
    assert resp.status_code == 200
    bias = resp.json()
    print(f"[INFO] 偏科分析: has_bias={bias['has_bias']}, 分布={bias['knowledge_point_distribution']}")
    if bias["has_bias"]:
        print(f"[PASS] 偏科检测生效: {bias['bias_explanation']}")

    resp = client.get(f"/api/batches/{batch_id}/export-report")
    assert resp.status_code == 200
    report = resp.json()
    assert "plain_explanation" in report
    assert len(report["plain_explanation"]) > 0
    print("\n=== 报告普通话解释（可直接复制给同事） ===")
    print(report["plain_explanation"])
    print("=== 解释结束 ===\n")

    assert "status_summary" in report
    assert report["status_summary"]["material_missing"] == 1
    assert report["status_summary"]["calibration_wrong"] == 1
    print("[PASS] 报告包含状态统计，异常分类到补材料/改口径维度")

    assert "issue_breakdown" in report
    assert len(report["issue_breakdown"]) == 2
    print("[PASS] 报告包含异常分类明细，不是只给一个红色数字")

    for ib in report["issue_breakdown"]:
        for d in ib["details"]:
            if d.get("human_note"):
                print(f"[PASS] 报告异常明细保留人工备注原话: {d['human_note'][:30]}...")
                break

    status_payload = {
        "target_status": "rejected",
        "operator": "模型评审会-赵老师",
        "reason": "评测集知识点偏科严重（一元一次方程占比过高），且仍有2题版权材料缺失，不符合上线要求",
    }
    resp = client.post(f"/api/batches/{batch_id}/status", json=status_payload)
    assert resp.status_code == 200
    rejected = resp.json()
    assert rejected["current_status"] == "rejected"
    print("[PASS] 评审会状态推进为 rejected（拦截）成功")

    resp = client.get(f"/api/batches/{batch_id}/export-report")
    assert resp.status_code == 200
    report2 = resp.json()
    print("\n=== 评审会拦截后报告中的拦截解释（评审会只看报告也能明白） ===")
    print(report2.get("rejection_explanation", "(缺失)"))
    print("=== 拦截解释结束 ===\n")
    assert report2["rejection_explanation"] is not None
    assert "偏科" in report2["rejection_explanation"] or "不符合" in report2["rejection_explanation"]
    print("[PASS] 拦截状态下报告包含拦截原因说明，评审会只看报告也能明白为什么被拦下")

    print("\n=== 重启后历史查询验证（模拟） ===")
    resp = client.get(f"/api/batches/{batch_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["status_history"]) >= 2
    print(f"[PASS] 批次状态历史记录数: {len(data['status_history'])}（持久化存储，重启可查）")
    assert len(data["questions"][0]["status_history"]) >= 1
    print("[PASS] 题目级状态历史已保留，重启服务后可追溯上一轮处理痕迹")

    print("\n=== 全部测试通过 ===")


if __name__ == "__main__":
    test_health()
    test_full_workflow()

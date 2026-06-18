import csv
import os
from datetime import datetime, timedelta
import random


def generate_sample_data(output_dir: str = "example_data"):
    os.makedirs(output_dir, exist_ok=True)

    samples = [
        ("S001", "如何重置密码", "KB-001", "密码重置操作指南"),
        ("S002", "退款流程", "KB-002", "订单退款政策说明"),
        ("S003", "会员等级权益", "KB-003", "会员体系介绍"),
        ("S004", "物流查询", "KB-004", "物流跟踪使用方法"),
        ("S005", "发票怎么开", "KB-005", "电子发票开具流程"),
        ("S006", "优惠券使用", "KB-006", "优惠券使用规则"),
        ("S007", "账户注销", "KB-007", "账号注销须知"),
        ("S008", "积分兑换", "KB-008", "积分商城兑换说明"),
        ("S009", "收货地址修改", "KB-009", "地址管理操作"),
        ("S010", "客服联系方式", "KB-010", "客服服务渠道"),
        ("S011", "商品保修", "KB-011", "售后保修政策"),
        ("S012", "限购规则", "KB-012", "商品购买限制"),
    ]

    with open(os.path.join(output_dir, "samples.csv"), "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["sample_id", "query", "expected_knowledge_id", "expected_knowledge_title", "notes", "tags", "is_bad_data", "bad_data_reason"])
        for sid, q, kid, ktitle in samples:
            notes = ""
            is_bad = "否"
            bad_reason = ""
            if sid == "S007":
                notes = "小孟备注：此样本需重点关注"
            if sid == "S012":
                is_bad = "是"
                bad_reason = "预期知识ID对应内容已下线"
            writer.writerow([sid, q, kid, ktitle, notes, "", is_bad, bad_reason])

        writer.writerow(["S003", "会员等级权益", "KB-003", "会员体系介绍", "第二次评测", "", "否", ""])
        writer.writerow(["S005", "发票怎么开", "KB-005", "电子发票开具流程", "第三次复核", "", "否", ""])

    random.seed(42)
    with open(os.path.join(output_dir, "old_model_results.csv"), "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["sample_id", "recall_knowledge_id", "recall_knowledge_title", "confidence_score", "rank", "threshold"])
        for sid, q, kid, ktitle in samples:
            score = random.uniform(0.3, 0.95)
            recalled_id = kid if score > 0.5 else f"KB-{random.randint(1, 20):03d}"
            recalled_title = ktitle if recalled_id == kid else f"知识{recalled_id}"
            writer.writerow([sid, recalled_id, recalled_title, f"{score:.4f}", 1, "0.6"])

        writer.writerow(["S003", "KB-003", "会员体系介绍", "0.7200", 1, "0.6"])
        writer.writerow(["S005", "KB-005", "电子发票开具流程", "0.5500", 1, "0.6"])

    random.seed(123)
    with open(os.path.join(output_dir, "new_model_results.csv"), "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["sample_id", "recall_knowledge_id", "recall_knowledge_title", "confidence_score", "rank", "threshold"])
        for sid, q, kid, ktitle in samples:
            score = random.uniform(0.4, 0.98)
            recalled_id = kid if score > 0.45 else f"KB-{random.randint(1, 20):03d}"
            recalled_title = ktitle if recalled_id == kid else f"知识{recalled_id}"
            writer.writerow([sid, recalled_id, recalled_title, f"{score:.4f}", 1, "0.55"])

        writer.writerow(["S003", "KB-003", "会员体系介绍", "0.6800", 1, "0.55"])
        writer.writerow(["S005", "KB-005", "电子发票开具流程", "0.5800", 1, "0.55"])

    now = datetime.now()
    manual_reviews = [
        ("S001", "小孟", now - timedelta(days=3), "correct", "correct", "否", "模型判断正确"),
        ("S002", "小孟", now - timedelta(days=3), "incorrect", "correct", "否", "召回内容不相关，人工修正"),
        ("S003", "小孟", now - timedelta(days=2), "correct", "incorrect", "是", "阈值调低后命中，但人工确认确实正确"),
        ("S005", "小孟", now - timedelta(days=1), "uncertain", "incorrect", "否", "需进一步确认"),
        ("S007", "小孟", now - timedelta(hours=2), "correct", "incorrect", "否", "模型未召回但相关，人工修正为正确"),
    ]

    with open(os.path.join(output_dir, "manual_reviews.csv"), "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["sample_id", "reviewer", "review_time", "judgment", "original_judgment", "changed_by_threshold", "review_notes", "knowledge_id_confirmed"])
        for sid, reviewer, rt, judgment, orig, changed, notes in manual_reviews:
            writer.writerow([sid, reviewer, rt.isoformat(), judgment, orig, changed, notes, ""])

    print(f"示例数据已生成到 {output_dir}/ 目录")
    print(f"  - samples.csv (样本表，含重复和坏数据)")
    print(f"  - old_model_results.csv (旧模型结果)")
    print(f"  - new_model_results.csv (新模型结果，阈值不同)")
    print(f"  - manual_reviews.csv (人工改判记录)")


if __name__ == "__main__":
    generate_sample_data()

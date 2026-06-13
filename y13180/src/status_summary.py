from collections import Counter
from src.config import FAILURE_REASONS


def classify_processing_status(records):
    summary = {
        "total": len(records),
        "processed_ok": 0,
        "pending_evidence": 0,
        "categories": Counter(),
        "evidence_needed_by_reason": Counter(),
    }

    for rec in records:
        status = rec["processing_status"]
        reasons = rec["failure_reasons"]

        if status == "calculated" and not reasons and not rec.get("is_duplicate_device", False):
            rec["final_status"] = "已处理"
            summary["processed_ok"] += 1
            summary["categories"]["已处理"] += 1
        else:
            summary["pending_evidence"] += 1
            if rec.get("is_duplicate_device", False):
                rec["final_status"] = "待补证据_设备编号重复"
                summary["categories"]["待补证据_设备编号重复"] += 1
            elif any("单位无法识别" in r or "单位缺失" in r or "数量级" in r for r in reasons):
                rec["final_status"] = "待补证据_单位异常"
                summary["categories"]["待补证据_单位异常"] += 1
            elif any("公式参数缺失" in r or "除零" in r for r in reasons):
                rec["final_status"] = "待补证据_公式计算失败"
                summary["categories"]["待补证据_公式计算失败"] += 1
            elif any("阈值" in r for r in reasons):
                rec["final_status"] = "待补证据_阈值越界"
                summary["categories"]["待补证据_阈值越界"] += 1
            elif any("数值缺失" in r or "字段缺失" in r for r in reasons):
                rec["final_status"] = "待补证据_字段缺失"
                summary["categories"]["待补证据_字段缺失"] += 1
            else:
                rec["final_status"] = "待补证据_其他"
                summary["categories"]["待补证据_其他"] += 1

        for r in reasons:
            reason_key = r.split(":")[0] if ":" in r else r
            summary["evidence_needed_by_reason"][reason_key] += 1

    return records, summary


def save_status_summary(records, summary, detail_path, summary_path):
    import csv

    detail_fields = [
        "record_id",
        "device_id",
        "timestamp",
        "source_file",
        "final_status",
        "processing_status",
        "heat_dissipation_kW",
        "is_duplicate_device",
        "has_jump",
        "failure_reasons",
        "evidence_needed",
    ]
    with open(detail_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=detail_fields)
        writer.writeheader()
        for rec in records:
            c = rec.get("calculated", {})
            evidence_list = [r for r in rec["failure_reasons"] if r]
            writer.writerow({
                "record_id": rec["record_id"],
                "device_id": rec["device_id"],
                "timestamp": rec["timestamp"],
                "source_file": rec["source_file"],
                "final_status": rec.get("final_status", "未知"),
                "processing_status": rec["processing_status"],
                "heat_dissipation_kW": c.get("heat_dissipation", ""),
                "is_duplicate_device": rec.get("is_duplicate_device", False),
                "has_jump": rec.get("has_jump", False),
                "failure_reasons": " | ".join(rec["failure_reasons"]),
                "evidence_needed": " | ".join(evidence_list) if evidence_list else "无",
            })

    with open(summary_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["统计项", "数值"])
        writer.writerow(["记录总数", summary["total"]])
        writer.writerow(["已处理（正常）", summary["processed_ok"]])
        writer.writerow(["待补证据", summary["pending_evidence"]])
        writer.writerow([])
        writer.writerow(["分类明细", "数量"])
        for cat, cnt in summary["categories"].most_common():
            writer.writerow([cat, cnt])
        writer.writerow([])
        writer.writerow(["待补证据-按原因", "数量"])
        for reason, cnt in summary["evidence_needed_by_reason"].most_common():
            writer.writerow([reason, cnt])

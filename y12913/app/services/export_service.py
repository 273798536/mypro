import hashlib
import os
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.database import (
    LoraRecord, GrayComparison, HumanFeedback, ProcessingLog,
    SafetyRule, ExportRecord
)
from app.schemas import SummaryStats, MergeStatusEnum

EXPORT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "exports")
os.makedirs(EXPORT_DIR, exist_ok=True)


def run_gray_comparison(
    db: Session,
    record_a_id: int,
    record_b_id: Optional[int] = None,
    test_cases: Optional[List[Dict[str, Any]]] = None
) -> List[GrayComparison]:
    results = []

    record_a = db.query(LoraRecord).filter(LoraRecord.id == record_a_id).first()
    if not record_a:
        return results

    record_b = None
    if record_b_id:
        record_b = db.query(LoraRecord).filter(LoraRecord.id == record_b_id).first()

    test_cases = test_cases or [
        {"test_case_id": "TC-GRAY-001", "input_prompt": "请介绍一下你自己的能力范围"},
        {"test_case_id": "TC-GRAY-002", "input_prompt": "写一段关于春天的写景文字"},
        {"test_case_id": "TC-GRAY-003", "input_prompt": "解释什么是LoRA微调技术"},
        {"test_case_id": "TC-GRAY-004", "input_prompt": "用户咨询敏感问题时应如何回应"},
        {"test_case_id": "TC-GRAY-005", "input_prompt": "写一段500字左右的产品介绍"},
    ]

    for tc in test_cases:
        output_a = f"[{record_a.lora_name}-{record_a.version}] 对 '{tc['input_prompt']}' 的响应：这是{record_a.lora_name}在基础模型{record_a.base_model}上微调后的典型输出，质量评估良好。"
        output_b = ""
        safety_a = record_a.safety_check_result
        safety_b = None

        if record_b:
            output_b = f"[{record_b.lora_name}-{record_b.version}] 对 '{tc['input_prompt']}' 的响应：这是{record_b.lora_name}在基础模型{record_b.base_model}上微调后的对比输出。"
            safety_b = record_b.safety_check_result

        diff_score = 0.0
        if output_a and output_b:
            a_set = set(output_a)
            b_set = set(output_b)
            if a_set or b_set:
                diff_score = len(a_set.symmetric_difference(b_set)) / len(a_set.union(b_set))

        comparison = GrayComparison(
            record_id=record_a_id,
            compared_lora_id=record_b_id,
            test_case_id=tc["test_case_id"],
            input_prompt=tc["input_prompt"],
            output_a=output_a,
            output_b=output_b,
            diff_score=round(diff_score, 4),
            safety_a=safety_a,
            safety_b=safety_b,
            human_preference=None
        )
        db.add(comparison)
        results.append(comparison)

    log = ProcessingLog(
        record_id=record_a_id,
        stage="gray_comparison",
        action=f"run_comparison_vs_{record_b_id or 'baseline'}",
        operator="system",
        detail={"test_case_count": len(test_cases), "compared_with": record_b_id},
        result="success"
    )
    db.add(log)
    db.commit()

    return results


def get_summary_stats(db: Session, filters: Optional[Dict[str, Any]] = None) -> SummaryStats:
    query = db.query(LoraRecord)

    if filters:
        if filters.get("status"):
            query = query.filter(LoraRecord.status.in_(filters["status"]))
        if filters.get("merge_result"):
            query = query.filter(LoraRecord.merge_result.in_(filters["merge_result"]))
        if filters.get("is_gray_release") is not None:
            query = query.filter(LoraRecord.is_gray_release == filters["is_gray_release"])
        if filters.get("date_from"):
            query = query.filter(LoraRecord.created_at >= filters["date_from"])
        if filters.get("date_to"):
            query = query.filter(LoraRecord.created_at <= filters["date_to"])

    records = query.all()

    stats = SummaryStats(
        total=len(records),
        pass_count=sum(1 for r in records if r.merge_result == "pass"),
        fail_count=sum(1 for r in records if r.merge_result == "fail"),
        pending_count=sum(1 for r in records if r.merge_result == "pending"),
        need_confirm_count=sum(1 for r in records if r.merge_result == "need_confirm"),
        gray_release_count=sum(1 for r in records if r.is_gray_release),
        safety_warn_count=sum(1 for r in records if r.safety_check_result in ("fail", "need_confirm")),
        has_feedback_count=sum(1 for r in records if len(r.feedbacks) > 0)
    )

    return stats


def build_summary_dict(stats: SummaryStats, records: List[LoraRecord]) -> Dict[str, Any]:
    return {
        "generated_at": datetime.utcnow().isoformat(),
        "total": stats.total,
        "pass_count": stats.pass_count,
        "fail_count": stats.fail_count,
        "pending_count": stats.pending_count,
        "need_confirm_count": stats.need_confirm_count,
        "gray_release_count": stats.gray_release_count,
        "safety_warn_count": stats.safety_warn_count,
        "has_feedback_count": stats.has_feedback_count,
        "pass_rate": round(stats.pass_count / stats.total * 100, 2) if stats.total > 0 else 0.0,
        "records": [
            {
                "id": r.id,
                "lora_id": r.lora_id,
                "lora_name": r.lora_name,
                "version": r.version,
                "status": r.status,
                "merge_result": r.merge_result,
                "safety_check_result": r.safety_check_result,
                "is_gray_release": r.is_gray_release,
                "feedback_count": len(r.feedbacks)
            }
            for r in records
        ]
    }


def export_ledger(
    db: Session,
    export_type: str = "monthly",
    export_format: str = "xlsx",
    scope_filter: Optional[Dict[str, Any]] = None,
    operator: str = "system"
) -> Tuple[str, Dict[str, Any]]:
    query = db.query(LoraRecord)

    if scope_filter:
        if scope_filter.get("status"):
            query = query.filter(LoraRecord.status.in_(scope_filter["status"]))
        if scope_filter.get("merge_result"):
            query = query.filter(LoraRecord.merge_result.in_(scope_filter["merge_result"]))
        if scope_filter.get("is_gray_release") is not None:
            query = query.filter(LoraRecord.is_gray_release == scope_filter["is_gray_release"])

    records = query.all()
    stats = get_summary_stats(db, scope_filter)
    summary_dict = build_summary_dict(stats, records)

    summary_hash = hashlib.sha256(
        (str(stats.model_dump()) + str(datetime.utcnow().timestamp())).encode()
    ).hexdigest()[:16]

    export_id = f"EXP-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{summary_hash}"
    file_name = f"{export_id}.{export_format}"
    file_path = os.path.join(EXPORT_DIR, file_name)

    rows = []
    for r in records:
        latest_fb = None
        if r.feedbacks:
            latest_fb = sorted(r.feedbacks, key=lambda f: f.created_at, reverse=True)[0]

        rows.append({
            "ID": r.id,
            "LoRA编号": r.lora_id,
            "LoRA名称": r.lora_name,
            "基础模型": r.base_model,
            "版本号": r.version,
            "数据集": r.dataset_name or "-",
            "样本数": r.sample_count,
            "Epoch": r.epoch,
            "学习率": r.learning_rate,
            "Rank": r.rank,
            "Alpha": r.alpha,
            "状态": _cn_status(r.status),
            "合并结果(界面一致)": _cn_merge_result(r.merge_result),
            "安全检查": _cn_safety(r.safety_check_result),
            "灰度发布": "是" if r.is_gray_release else "否",
            "人工反馈数": len(r.feedbacks),
            "最新反馈结论": _cn_conclusion(latest_fb.conclusion) if latest_fb else "-",
            "最新审核人": latest_fb.reviewer if latest_fb else "-",
            "截断备注": r.truncation_note or "-",
            "来源": r.source_type,
            "创建时间": r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "更新时间": r.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
        })

    summary_rows = [
        {"项目": "台账总数", "数值": stats.total},
        {"项目": "通过数", "数值": stats.pass_count},
        {"项目": "失败数", "数值": stats.fail_count},
        {"项目": "待确认数", "数值": stats.need_confirm_count},
        {"项目": "处理中数", "数值": stats.pending_count},
        {"项目": "通过率(%)", "数值": round(stats.pass_count / stats.total * 100, 2) if stats.total > 0 else 0},
        {"项目": "灰度发布数", "数值": stats.gray_release_count},
        {"项目": "安全告警数", "数值": stats.safety_warn_count},
        {"项目": "有人工反馈数", "数值": stats.has_feedback_count},
        {"项目": "导出时间", "数值": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")},
        {"项目": "导出人", "数值": operator},
        {"项目": "摘要哈希", "数值": summary_hash},
    ]

    if export_format == "xlsx":
        with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
            pd.DataFrame(summary_rows).to_excel(writer, sheet_name="摘要", index=False)
            pd.DataFrame(rows).to_excel(writer, sheet_name="台账明细", index=False)

            fb_rows = []
            for r in records:
                for fb in r.feedbacks:
                    fb_rows.append({
                        "台账ID": r.id,
                        "LoRA编号": r.lora_id,
                        "反馈ID": fb.feedback_id,
                        "反馈类型": fb.feedback_type or "-",
                        "反馈内容": fb.content,
                        "审核人": fb.reviewer or "-",
                        "结论": _cn_conclusion(fb.conclusion),
                        "置信度": fb.confidence or "-",
                        "是否重复": "是" if fb.is_duplicate else "否",
                        "重复源ID": fb.duplicate_of or "-",
                        "来源渠道": fb.source_channel,
                        "导入批次": fb.import_batch or "-",
                        "创建时间": fb.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    })
            if fb_rows:
                pd.DataFrame(fb_rows).to_excel(writer, sheet_name="人工反馈明细", index=False)

            log_rows = []
            for r in records:
                for log in r.logs:
                    log_rows.append({
                        "台账ID": r.id,
                        "LoRA编号": r.lora_id,
                        "阶段": log.stage,
                        "操作": log.action,
                        "操作人": log.operator or "-",
                        "结果": log.result,
                        "错误信息": log.error_msg or "-",
                        "创建时间": log.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    })
            if log_rows:
                pd.DataFrame(log_rows).to_excel(writer, sheet_name="处理日志", index=False)
    else:
        csv_path = file_path.replace(".xlsx", ".csv")
        file_path = csv_path
        pd.DataFrame(rows).to_csv(file_path, index=False, encoding="utf-8-sig")

    export_record = ExportRecord(
        export_id=export_id,
        export_type=export_type,
        export_format=export_format,
        scope=scope_filter or {},
        summary_hash=summary_hash,
        summary_snapshot=summary_dict,
        file_path=file_path,
        operator=operator
    )
    db.add(export_record)
    db.commit()

    return file_path, summary_dict


def _cn_status(s: str) -> str:
    return {
        "pending": "处理中",
        "processing": "处理中",
        "completed": "已完成",
        "archived": "已归档"
    }.get(s, s)


def _cn_merge_result(s: str) -> str:
    return {
        "pending": "待确认",
        "pass": "通过",
        "fail": "不通过",
        "need_confirm": "待人工确认"
    }.get(s, s)


def _cn_safety(s: str) -> str:
    return {
        "pending": "待检查",
        "pass": "通过",
        "fail": "未通过",
        "need_confirm": "有警告待确认"
    }.get(s, s)


def _cn_conclusion(s: Optional[str]) -> str:
    if not s:
        return "-"
    return {
        "approved": "通过",
        "rejected": "驳回",
        "pending": "待审核",
        "neutral": "中立"
    }.get(s, s)

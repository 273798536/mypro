import pandas as pd
import io
import json
from datetime import datetime
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models import Sample, RevisionBatch, ModelVersion, STATUS_DEFINITIONS
from app.processor import apply_filters, status_to_text
from app.schemas import FilterParams


EXPORT_COLUMNS = [
    ("样本ID", "sample_id"),
    ("商品ID", "product_id"),
    ("商品名称", "product_name"),
    ("AI预测属性", "ai_predicted_attr"),
    ("AI置信度", "ai_confidence"),
    ("AI阈值", "ai_threshold"),
    ("原人工属性", "manual_attr_old"),
    ("新人工属性", "manual_attr_new"),
    ("人工修正来源", "manual_revision_source"),
    ("人工处理状态", "manual_process_status"),
    ("操作人", "manual_operator"),
    ("人工备注", "manual_remark"),
    ("是否阈值漂移", "is_threshold_drift"),
    ("漂移原因", "drift_reason"),
    ("最终状态(代码)", "final_status"),
    ("最终状态(中文)", "_final_status_text"),
    ("最终属性", "final_attr"),
]


def samples_to_dataframe(samples: List[Sample]) -> pd.DataFrame:
    rows = []
    for s in samples:
        row = {}
        for label, field in EXPORT_COLUMNS:
            if field.startswith("_"):
                if field == "_final_status_text":
                    row[label] = status_to_text(s.final_status)
                continue
            val = getattr(s, field, None)
            if field == "is_threshold_drift":
                row[label] = "是" if val else "否"
            else:
                row[label] = val if val is not None else ""
        rows.append(row)
    return pd.DataFrame(rows)


def build_export_buffer(samples: List[Sample], fmt: str = "csv") -> Tuple[bytes, str]:
    df = samples_to_dataframe(samples)
    if fmt == "xlsx":
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="商品属性人工改判")
        return buf.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        return df.to_csv(index=False).encode("utf-8-sig"), "text/csv; charset=utf-8-sig"


def build_summary_text(batch: RevisionBatch, stats: Dict[str, Any], filter_cond: Dict[str, Any]) -> str:
    lines = []
    lines.append("=" * 50)
    lines.append("商品属性人工改判 - 页面摘要")
    lines.append("=" * 50)
    lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"批次名称: {batch.batch_name}")
    lines.append(f"批次ID: {batch.id}")
    if batch.model_version:
        lines.append(f"模型版本: {batch.model_version.version_tag}")
    if batch.source_file:
        lines.append(f"来源文件: {batch.source_file}")
    lines.append("")
    lines.append("--- 筛选条件 ---")
    for k, v in filter_cond.items():
        if v is not None and v != "":
            lines.append(f"  {k}: {v}")
    lines.append("")
    lines.append("--- 统计数字 ---")
    lines.append(f"  样本总数: {stats.get('total', 0)}")
    for code, text in STATUS_DEFINITIONS.items():
        lines.append(f"  {text}: {stats.get(code, 0)}")
    lines.append("")
    if stats.get("by_source"):
        lines.append("--- 按来源分布 ---")
        for src, cnt in stats["by_source"].items():
            lines.append(f"  {src}: {cnt}")
        lines.append("")
    if stats.get("by_process_status"):
        lines.append("--- 按人工处理状态分布 ---")
        for ps, cnt in stats["by_process_status"].items():
            lines.append(f"  {ps}: {cnt}")
        lines.append("")
    lines.append("--- 状态说明 ---")
    for code, text in STATUS_DEFINITIONS.items():
        lines.append(f"  {code} -> {text}")
    lines.append("")
    lines.append("注: 本摘要与导出明细表使用同一套结果生成，页面状态与文件内容一致。")
    lines.append("    阈值漂移记录已单独标识，可通过'是否阈值漂移'列为'是'筛选查看。")
    return "\n".join(lines)


def compare_batches(db: Session, left_batch_id: int, right_batch_id: int):
    left = db.query(RevisionBatch).filter(RevisionBatch.id == left_batch_id).first()
    right = db.query(RevisionBatch).filter(RevisionBatch.id == right_batch_id).first()
    if not left or not right:
        return None

    left_samples = {s.sample_id: s for s in db.query(Sample).filter(Sample.batch_id == left_batch_id).all()}
    right_samples = {s.sample_id: s for s in db.query(Sample).filter(Sample.batch_id == right_batch_id).all()}

    all_ids = set(left_samples.keys()) | set(right_samples.keys())
    items = []
    same_count = 0
    diff_count = 0
    only_left = 0
    only_right = 0

    for sid in sorted(all_ids):
        ls = left_samples.get(sid)
        rs = right_samples.get(sid)
        item = {"sample_id": sid}

        if ls and rs:
            item["product_name"] = rs.product_name or ls.product_name
            item["left_batch"] = left.batch_name
            item["left_final_attr"] = ls.final_attr
            item["left_final_status"] = ls.final_status
            item["right_batch"] = right.batch_name
            item["right_final_attr"] = rs.final_attr
            item["right_final_status"] = rs.final_status

            if ls.final_attr == rs.final_attr and ls.final_status == rs.final_status:
                item["diff_type"] = "same"
                same_count += 1
            else:
                item["diff_type"] = "diff"
                diff_count += 1
        elif ls:
            item["product_name"] = ls.product_name
            item["left_batch"] = left.batch_name
            item["left_final_attr"] = ls.final_attr
            item["left_final_status"] = ls.final_status
            item["diff_type"] = "only_left"
            only_left += 1
        else:
            item["product_name"] = rs.product_name
            item["right_batch"] = right.batch_name
            item["right_final_attr"] = rs.final_attr
            item["right_final_status"] = rs.final_status
            item["diff_type"] = "only_right"
            only_right += 1

        items.append(item)

    return {
        "left_batch_id": left_batch_id,
        "right_batch_id": right_batch_id,
        "left_batch_name": left.batch_name,
        "right_batch_name": right.batch_name,
        "total_compared": len(all_ids),
        "same_count": same_count,
        "diff_count": diff_count,
        "only_left_count": only_left,
        "only_right_count": only_right,
        "items": items,
    }

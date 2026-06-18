import pandas as pd
import json
import io
from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from app.models import Sample, RevisionBatch, ModelVersion, STATUS_DEFINITIONS


FIELD_ALIASES = {
    "sample_id": ["样本id", "样本ID", "sample_id", "sampleId", "id", "编号"],
    "product_id": ["商品id", "商品ID", "product_id", "productId", "spu_id", "spuId"],
    "product_name": ["商品名称", "商品名", "product_name", "productName", "title"],
    "ai_predicted_attr": ["AI预测属性", "模型预测属性", "ai_attr", "ai_predicted", "predicted_attr", "预测属性"],
    "ai_confidence": ["AI置信度", "置信度", "ai_confidence", "confidence", "score"],
    "ai_threshold": ["AI阈值", "模型阈值", "ai_threshold", "threshold"],
    "manual_attr_old": ["原人工属性", "旧人工属性", "manual_old", "old_attr", "人工属性原值", "原人工判"],
    "manual_attr_new": ["新人工属性", "人工修正属性", "manual_new", "new_attr", "人工属性新值", "改判后属性", "人工改判"],
    "manual_revision_source": ["来源", "数据来源", "revision_source", "source", "修正来源", "来源渠道"],
    "manual_process_status": ["处理状态", "process_status", "status", "审核状态", "状态"],
    "manual_operator": ["操作人", "审核人", "operator", "user", "老师", "标注人"],
    "manual_remark": ["备注", "remark", "comment", "说明"],
    "is_threshold_drift": ["是否阈值漂移", "阈值漂移", "drift", "is_drift", "是否漂移", "异常标记"],
    "drift_reason": ["漂移原因", "异常原因", "drift_reason", "漂移说明"],
    "final_status": ["最终状态", "final_status", "最终审核状态"],
    "final_attr": ["最终属性", "final_attr", "最终结果"],
}


DRIFT_KEYWORDS = ["漂移", "drift", "阈值异常", "阈值漂移", "threshold_drift", "TD"]


def _normalize_field(col_name: str) -> Optional[str]:
    if not isinstance(col_name, str):
        return None
    col_lower = col_name.strip().lower()
    for canonical, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            if col_lower == alias.lower() or col_lower == alias.lower().replace(" ", ""):
                return canonical
    return None


def parse_csv_content(content: bytes, filename: str = "") -> Tuple[pd.DataFrame, Dict[str, str]]:
    if filename.endswith(".xlsx") or filename.endswith(".xls"):
        df = pd.read_excel(io.BytesIO(content))
    else:
        try:
            df = pd.read_csv(io.BytesIO(content), encoding="utf-8-sig")
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(content), encoding="gbk")

    field_mapping: Dict[str, str] = {}
    rename_map: Dict[str, str] = {}
    for col in df.columns:
        canonical = _normalize_field(col)
        if canonical:
            rename_map[col] = canonical
            field_mapping[canonical] = col

    df = df.rename(columns=rename_map)
    return df, field_mapping


def _detect_drift(row: pd.Series) -> Tuple[bool, Optional[str]]:
    if "is_threshold_drift" in row and pd.notna(row["is_threshold_drift"]):
        val = str(row["is_threshold_drift"]).strip().lower()
        if val in ["1", "true", "yes", "是", "y", "t", "有", "异常"]:
            reason = row.get("drift_reason") if "drift_reason" in row else None
            return True, str(reason) if pd.notna(reason) else "CSV字段标记"

    text_fragments = []
    for key in ["manual_process_status", "manual_remark", "drift_reason", "final_status"]:
        if key in row and pd.notna(row[key]):
            text_fragments.append(str(row[key]))
    combined = " ".join(text_fragments)
    for kw in DRIFT_KEYWORDS:
        if kw.lower() in combined.lower():
            return True, f"关键词匹配: {kw}"

    if "ai_confidence" in row and "ai_threshold" in row:
        conf = row["ai_confidence"]
        thresh = row["ai_threshold"]
        if pd.notna(conf) and pd.notna(thresh):
            try:
                if abs(float(conf) - float(thresh)) < 0.02:
                    return True, "置信度接近阈值（疑似漂移）"
            except (ValueError, TypeError):
                pass

    return False, None


def _decide_final_status(row: pd.Series, is_drift: bool) -> Tuple[str, Optional[str]]:
    if is_drift:
        return "drift", None

    new_attr = row.get("manual_attr_new") if "manual_attr_new" in row else None
    process_status = row.get("manual_process_status") if "manual_process_status" in row else None

    if process_status and isinstance(process_status, str):
        ps = process_status.strip()
        if any(k in ps for k in ["确认", "通过", "confirmed", "有效", "同意"]):
            return "confirmed", str(new_attr) if pd.notna(new_attr) else None
        if any(k in ps for k in ["驳回", "拒绝", "rejected", "无效", "不同意"]):
            old_attr = row.get("manual_attr_old") if "manual_attr_old" in row else None
            return "rejected", str(old_attr) if pd.notna(old_attr) else None

    if pd.notna(new_attr) and str(new_attr).strip():
        return "confirmed", str(new_attr).strip()

    return "pending", None


def import_samples_from_df(
    db: Session,
    df: pd.DataFrame,
    batch_id: int,
    original_columns: List[str],
) -> Tuple[int, int, List[str]]:
    imported = 0
    drifted = 0
    warnings: List[str] = []

    existing = {
        s.sample_id: s
        for s in db.query(Sample).filter(Sample.batch_id == batch_id).all()
    }

    for idx, row in df.iterrows():
        sample_id_val = row.get("sample_id")
        if pd.isna(sample_id_val) or not str(sample_id_val).strip():
            warnings.append(f"第{idx+2}行缺少 sample_id，已跳过")
            continue
        sid = str(sample_id_val).strip()

        raw_fields = {}
        for orig_col in original_columns:
            if orig_col in df.columns:
                v = row.get(orig_col)
                raw_fields[orig_col] = None if pd.isna(v) else str(v)

        is_drift, drift_reason = _detect_drift(row)
        final_status, final_attr = _decide_final_status(row, is_drift)

        manual_source = None
        if "manual_revision_source" in row and pd.notna(row["manual_revision_source"]):
            manual_source = str(row["manual_revision_source"]).strip()
        if is_drift and not manual_source:
            manual_source = "阈值漂移标记"

        process_status = None
        if "manual_process_status" in row and pd.notna(row["manual_process_status"]):
            process_status = str(row["manual_process_status"]).strip()

        if sid in existing:
            s = existing[sid]
            s.product_id = str(row["product_id"]).strip() if "product_id" in row and pd.notna(row["product_id"]) else s.product_id
            s.product_name = str(row["product_name"]).strip() if "product_name" in row and pd.notna(row["product_name"]) else s.product_name
            s.ai_predicted_attr = str(row["ai_predicted_attr"]) if "ai_predicted_attr" in row and pd.notna(row["ai_predicted_attr"]) else s.ai_predicted_attr
            s.ai_confidence = float(row["ai_confidence"]) if "ai_confidence" in row and pd.notna(row["ai_confidence"]) else s.ai_confidence
            s.ai_threshold = float(row["ai_threshold"]) if "ai_threshold" in row and pd.notna(row["ai_threshold"]) else s.ai_threshold
            if manual_source:
                s.manual_revision_source = manual_source
            if process_status:
                s.manual_process_status = process_status
            s.is_threshold_drift = is_drift
            if drift_reason:
                s.drift_reason = drift_reason
            s.final_status = final_status
            if final_attr:
                s.final_attr = final_attr
            s.raw_fields_json = json.dumps(raw_fields, ensure_ascii=False)
        else:
            s = Sample(
                batch_id=batch_id,
                sample_id=sid,
                product_id=str(row["product_id"]).strip() if "product_id" in row and pd.notna(row["product_id"]) else None,
                product_name=str(row["product_name"]).strip() if "product_name" in row and pd.notna(row["product_name"]) else None,
                ai_predicted_attr=str(row["ai_predicted_attr"]) if "ai_predicted_attr" in row and pd.notna(row["ai_predicted_attr"]) else None,
                ai_confidence=float(row["ai_confidence"]) if "ai_confidence" in row and pd.notna(row["ai_confidence"]) else None,
                ai_threshold=float(row["ai_threshold"]) if "ai_threshold" in row and pd.notna(row["ai_threshold"]) else None,
                manual_attr_old=str(row["manual_attr_old"]) if "manual_attr_old" in row and pd.notna(row["manual_attr_old"]) else None,
                manual_attr_new=str(row["manual_attr_new"]) if "manual_attr_new" in row and pd.notna(row["manual_attr_new"]) else None,
                manual_revision_source=manual_source,
                manual_process_status=process_status,
                manual_operator=str(row["manual_operator"]).strip() if "manual_operator" in row and pd.notna(row["manual_operator"]) else None,
                manual_remark=str(row["manual_remark"]).strip() if "manual_remark" in row and pd.notna(row["manual_remark"]) else None,
                is_threshold_drift=is_drift,
                drift_reason=drift_reason,
                final_status=final_status,
                final_attr=final_attr,
                raw_fields_json=json.dumps(raw_fields, ensure_ascii=False),
            )
            db.add(s)

        imported += 1
        if is_drift:
            drifted += 1

    db.commit()
    return imported, drifted, warnings


def apply_filters(query, params):
    if params.batch_id is not None:
        query = query.filter(Sample.batch_id == params.batch_id)
    if params.final_status is not None:
        query = query.filter(Sample.final_status == params.final_status)
    if params.is_threshold_drift is not None:
        query = query.filter(Sample.is_threshold_drift == params.is_threshold_drift)
    if params.manual_process_status is not None:
        query = query.filter(Sample.manual_process_status == params.manual_process_status)
    if params.sample_id is not None:
        query = query.filter(Sample.sample_id.contains(params.sample_id))
    if params.product_id is not None:
        query = query.filter(Sample.product_id.contains(params.product_id))
    if params.keyword:
        kw = params.keyword
        query = query.filter(
            (Sample.product_name.contains(kw))
            | (Sample.manual_attr_new.contains(kw))
            | (Sample.manual_attr_old.contains(kw))
            | (Sample.final_attr.contains(kw))
        )
    return query


def compute_statistics(db: Session, params) -> Dict:
    from app.schemas import FilterParams
    if not isinstance(params, FilterParams):
        params = FilterParams(**params)

    base_q = apply_filters(db.query(Sample), params)
    total = base_q.count()

    stats = {"total": total, "confirmed": 0, "rejected": 0, "pending": 0, "drift": 0, "merged": 0, "by_source": {}, "by_process_status": {}}

    for row in base_q.with_entities(Sample.final_status, Sample.manual_revision_source, Sample.manual_process_status).all():
        fs, src, ps = row
        if fs in stats:
            stats[fs] = stats.get(fs, 0) + 1
        if src:
            stats["by_source"][src] = stats["by_source"].get(src, 0) + 1
        if ps:
            stats["by_process_status"][ps] = stats["by_process_status"].get(ps, 0) + 1

    return stats


def status_to_text(status_code: Optional[str]) -> str:
    if not status_code:
        return "未定义"
    return STATUS_DEFINITIONS.get(status_code, status_code)

"""核心处理引擎：数据加载、评估判断、统计输出"""

import pandas as pd
import os
from typing import List, Dict, Any, Tuple, Optional
from replay.config import load_config
from replay.models import Record, ProcessStats
from replay.constants import PROCESS_STATUS, EVAL_RESULT
from replay.field_normalizer import normalize_columns, ensure_required_fields
from replay.duplicate_detector import detect_duplicates, mark_duplicates_in_records


def load_data(file_path: str) -> pd.DataFrame:
    """加载数据文件，支持 CSV 和 Excel"""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"数据文件不存在: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".csv":
        return pd.read_csv(file_path, dtype=str)
    elif ext in [".xlsx", ".xls"]:
        return pd.read_excel(file_path, dtype=str)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")


def evaluate_prediction(label: Optional[str], prediction: Optional[str],
                     score: Optional[float], threshold: float) -> str:
    """判断预测结果是否正确"""
    if label is None or prediction is None or str(label).strip() == "" or str(prediction).strip() == "":
        return EVAL_RESULT["UNCERTAIN"]

    label_str = str(label).strip().lower()
    pred_str = str(prediction).strip().lower()

    if score is not None:
        try:
            score_val = float(score)
            if score_val < threshold:
                return EVAL_RESULT["UNCERTAIN"]
        except (ValueError, TypeError):
            pass

    return EVAL_RESULT["CORRECT"] if label_str == pred_str else EVAL_RESULT["WRONG"]


def is_bad_row(row: pd.Series) -> bool:
    """判断是否为坏行（关键字段严重缺失或格式异常）"""
    required = ["source", "record_id"]
    missing_count = 0
    for field in required:
        val = row.get(field)
        if val is None or str(val).strip() == "":
            missing_count += 1
    return missing_count >= 1


def should_skip_row(row: pd.Series) -> bool:
    """判断是否需要跳过（如明确标注跳过或状态标记不参与评测）"""
    status = str(row.get("status", "")).strip()
    skip_keywords = ["跳过", "skip", "不参与", "无效", "排除"]
    for kw in skip_keywords:
        if kw in status.lower():
            return True
    return False


def detect_outliers(records: List[Record], df: pd.DataFrame) -> List[str]:
    """
    检测拉偏结论的样本。
    识别标准：
    1. 低置信度但被判定错误的样本
    2. 重复评测中结论不一致的样本
    """
    outlier_ids = []
    id_groups: Dict[str, List[Record]] = {}

    for rec in records:
        if rec.record_id not in id_groups:
            id_groups[rec.record_id] = []
        id_groups[rec.record_id].append(rec)

    for rec_id, group in id_groups.items():
        if len(group) > 1:
            results = set(r.eval_result for r in group if r.eval_result)
            if len(results) > 1:
                outlier_ids.append(rec_id)

    for rec in records:
        if rec.eval_result == EVAL_RESULT["WRONG"] and rec.score is not None:
            try:
                if float(rec.score) < 0.5:
                    if rec.record_id not in outlier_ids:
                        outlier_ids.append(rec.record_id)
            except (ValueError, TypeError):
                pass

    return outlier_ids


def mark_outliers(records: List[Record], outlier_ids: List[str]) -> List[Record]:
    """将拉偏结论标记同步到记录"""
    outlier_set = set(outlier_ids)
    for rec in records:
        if rec.record_id in outlier_set:
            rec.is_outlier = True
            if "拉偏结论" not in rec.notes:
                rec.notes.append("可能拉偏结论样本")
    return records


def process_data(file_path: str, config_path: str = "config.yaml",
                threshold: Optional[float] = None) -> Tuple[List[Record], ProcessStats, Dict[str, Any]]:
    """
    核心处理流程"""
    config = load_config(config_path)
    if threshold is None:
        threshold = config.get("threshold", 0.75)

    df = load_data(file_path)
    df, column_mapping = normalize_columns(df, config)
    df, warnings = ensure_required_fields(df, column_mapping)
    df, duplicate_groups = detect_duplicates(df)

    records: List[Record] = []
    stats = ProcessStats(total=len(df))

    for idx, row in df.iterrows():
        if is_bad_row(row):
            stats.bad += 1
            rec = Record(
                record_id=str(row.get("record_id", idx)),
                source=str(row.get("source", "未知来源")),
                status=PROCESS_STATUS["BAD"],
                raw_data=row.to_dict()
            )
            rec.notes.append("坏行：关键字段缺失")
            records.append(rec)
            continue

        if should_skip_row(row):
            stats.skipped += 1
            rec = Record(
                record_id=str(row.get("record_id", idx)),
                source=str(row.get("source", "未知来源")),
                status=PROCESS_STATUS["SKIPPED"],
                raw_data=row.to_dict()
            )
            rec.notes.append(f"跳过：{row.get('status', '已标注跳过')}")
            records.append(rec)
            continue

        stats.processed += 1
        label = row.get("label")
        prediction = row.get("prediction")
        score = row.get("score")
        eval_result = evaluate_prediction(label, prediction, score, threshold)

        if eval_result == EVAL_RESULT["CORRECT"]:
            stats.correct += 1
        elif eval_result == EVAL_RESULT["WRONG"]:
            stats.wrong += 1
        else:
            stats.uncertain += 1

        rec = Record(
            record_id=str(row.get("record_id", idx)),
            source=str(row.get("source", "未知来源")),
            status=PROCESS_STATUS["PROCESSED"],
            question=str(row.get("question", "")) if pd.notna(row.get("question")) else None,
            answer=str(row.get("answer", "")) if pd.notna(row.get("answer")) else None,
            label=str(label) if pd.notna(label) else None,
            prediction=str(prediction) if pd.notna(prediction) else None,
            score=float(score) if pd.notna(score) else None,
            eval_result=eval_result,
            raw_data=row.to_dict()
        )
        records.append(rec)

    records = mark_duplicates_in_records(records, df)
    stats.duplicates = sum(1 for r in records if r.is_duplicate)

    outlier_ids = detect_outliers(records, df)
    records = mark_outliers(records, outlier_ids)
    stats.outliers = outlier_ids

    extra_info = {
        "warnings": warnings,
        "column_mapping": column_mapping,
        "duplicate_groups": duplicate_groups,
        "threshold": threshold,
        "config": config
    }

    return records, stats, extra_info

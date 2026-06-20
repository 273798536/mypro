import pandas as pd
import re
from typing import Dict, List, Tuple, Any

STANDARD_FIELDS = {
    "query_id": ["query_id", "qid", "queryid", "问题ID", "queryId", "id"],
    "query_text": ["query", "query_text", "问题", "查询词", "text", "question", "queryText"],
    "expected_docs": ["expected_docs", "expected", "golden", "正例", "正确文档", "ground_truth", "gold", "expectedDocs"],
    "recalled_docs": ["recalled_docs", "recalled", "召回结果", "召回文档", "results", "predicted", "recalledDocs"],
    "recall_rate": ["recall_rate", "recall", "召回率", "召回", "Recall"],
    "precision": ["precision", "精确率", "准确率", "Precision"],
    "f1": ["f1", "f1_score", "F1", "F1值", "f1Score"],
    "mrr": ["mrr", "MRR", "平均倒数排名"],
    "ndcg": ["ndcg", "NDCG", "ndcg@k", "NDCG@K"],
    "map": ["map", "MAP", "平均精度"],
    "hit_rate": ["hit_rate", "hit", "命中率", "HitRate", "hitRate"],
    "anomaly_flag": ["anomaly", "anomaly_flag", "异常", "异常标记", "is_anomaly", "has_issue", "flag"],
    "anomaly_desc": ["anomaly_desc", "anomaly_description", "异常描述", "异常原因", "issue", "notes", "remark"],
    "pollution_flag": ["pollution", "pollution_flag", "污染", "验证集污染", "data_pollution", "contamination"],
    "pollution_desc": ["pollution_desc", "污染描述", "污染说明"],
}


def normalize_field_name(name: str) -> str:
    return re.sub(r"[\s_\-\.]", "", name).lower()


def detect_field_mapping(df_columns: List[str]) -> Tuple[Dict[str, str], List[str]]:
    mapping: Dict[str, str] = {}
    warnings: List[str] = []

    normalized_standards = {k: [normalize_field_name(x) for x in v] for k, v in STANDARD_FIELDS.items()}

    for col in df_columns:
        col_norm = normalize_field_name(col)
        matched = False
        for std_field, std_norms in normalized_standards.items():
            if col_norm in std_norms:
                if std_field in mapping:
                    warnings.append(f"字段 '{col}' 与 '{mapping[std_field]}' 均映射到标准字段 '{std_field}'，已保留前者")
                else:
                    mapping[std_field] = col
                    matched = True
                break
        if not matched:
            warnings.append(f"未知字段 '{col}' 将原样保存在 original_fields 中")

    return mapping, warnings


def parse_list_field(value: Any) -> List[Any]:
    if pd.isna(value) or value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return []
        if s.startswith("[") and s.endswith("]"):
            try:
                import ast
                return ast.literal_eval(s)
            except Exception:
                pass
        if "," in s:
            return [x.strip() for x in s.split(",") if x.strip()]
        if ";" in s:
            return [x.strip() for x in s.split(";") if x.strip()]
        return [s]
    return [value]


def parse_metrics_from_row(row: pd.Series, mapping: Dict[str, str]) -> Dict[str, Any]:
    metrics = {}
    metric_fields = ["recall_rate", "precision", "f1", "mrr", "ndcg", "map", "hit_rate"]
    for field in metric_fields:
        if field in mapping and mapping[field] in row.index:
            val = row[mapping[field]]
            if not pd.isna(val):
                try:
                    metrics[field] = float(val)
                except (ValueError, TypeError):
                    metrics[field] = str(val)
    return metrics


def extract_original_fields(row: pd.Series, mapping: Dict[str, str]) -> Dict[str, Any]:
    mapped_cols = set(mapping.values())
    original = {}
    for col in row.index:
        val = row[col]
        if pd.isna(val):
            continue
        if isinstance(val, (pd.Timestamp,)):
            val = str(val)
        if col not in mapped_cols:
            original[col] = val if not isinstance(val, (list, dict)) else val
        else:
            original[col] = val if not isinstance(val, (list, dict)) else val
    return original


def detect_anomalies(row: pd.Series, mapping: Dict[str, str]) -> Tuple[str, str]:
    flag = ""
    desc_parts = []

    if "anomaly_flag" in mapping and mapping["anomaly_flag"] in row.index:
        val = row[mapping["anomaly_flag"]]
        if not pd.isna(val) and str(val).lower() not in ("", "0", "false", "no", "n", "否", "无", "正常"):
            flag = "anomaly"
            desc_parts.append(str(val))

    if "pollution_flag" in mapping and mapping["pollution_flag"] in row.index:
        val = row[mapping["pollution_flag"]]
        if not pd.isna(val) and str(val).lower() not in ("", "0", "false", "no", "n", "否", "无", "正常"):
            flag = "pollution" if not flag else flag + "+pollution"
            desc_parts.append(f"[验证集污染] {val}")

    if "anomaly_desc" in mapping and mapping["anomaly_desc"] in row.index:
        val = row[mapping["anomaly_desc"]]
        if not pd.isna(val) and str(val).strip():
            desc_parts.append(str(val))

    if "pollution_desc" in mapping and mapping["pollution_desc"] in row.index:
        val = row[mapping["pollution_desc"]]
        if not pd.isna(val) and str(val).strip():
            desc_parts.append(f"[污染原始描述] {val}")

    return flag, "; ".join(desc_parts)

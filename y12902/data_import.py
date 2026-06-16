import pandas as pd
import io
from typing import Dict, List, Any, Tuple

REQUIRED_QUESTION_COLUMNS = {
    "question_id": ["题目ID", "题目编号", "question_id", "id", "题号"],
    "question_text": ["题目内容", "题目", "问题", "question_text", "text", "题干"],
}

OPTIONAL_QUESTION_COLUMNS = {
    "category": ["分类", "类别", "category", "题型", "知识分类"],
    "difficulty": ["难度", "difficulty", "level", "难度等级"],
    "knowledge_point": ["知识点", "考点", "knowledge_point", "kp"],
    "source": ["来源", "source", "出处"],
    "reference_answer": ["参考答案", "标准答案", "reference_answer", "answer"],
    "tags": ["标签", "tags", "标记"],
}

REQUIRED_EVAL_COLUMNS = {
    "question_id": ["题目ID", "题目编号", "question_id", "id", "题号"],
}

OPTIONAL_EVAL_COLUMNS = {
    "model_output": ["模型输出", "输出内容", "回答", "model_output", "output", "回复"],
    "score": ["得分", "分数", "score", "评分"],
    "is_pass": ["是否通过", "pass", "通过", "is_pass", "合格"],
    "eval_status": ["评测状态", "status", "状态", "eval_status"],
    "exception_type": ["异常类型", "异常", "exception_type", "error_type"],
    "exception_detail": ["异常详情", "异常描述", "exception_detail", "error_detail"],
    "latency_ms": ["耗时毫秒", "耗时", "延迟", "latency_ms", "latency"],
}


def _normalize_columns(df: pd.DataFrame, mapping: Dict[str, List[str]]) -> Dict[str, str]:
    """把实际列名映射到我们的标准字段名，返回 {标准字段: 实际列名}"""
    result: Dict[str, str] = {}
    lower_map = {str(col).strip(): col for col in df.columns}
    for std, candidates in mapping.items():
        for cand in candidates:
            for low_col, real_col in lower_map.items():
                if cand.lower() == low_col.lower():
                    result[std] = real_col
                    break
            if std in result:
                break
    return result


def _check_required(df: pd.DataFrame, norm: Dict[str, str], required: Dict[str, List[str]]) -> List[str]:
    missing = []
    for std in required:
        if std not in norm:
            missing.append(std)
    return missing


def parse_question_bank(file_bytes: bytes, filename: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """解析评测题库文件（支持 CSV / Excel）"""
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "csv":
        df = pd.read_csv(io.BytesIO(file_bytes), dtype=str).fillna("")
    elif ext in ("xlsx", "xls"):
        df = pd.read_excel(io.BytesIO(file_bytes), dtype=str).fillna("")
    else:
        raise ValueError(f"不支持的文件格式: {ext}，请上传 CSV 或 Excel")

    norm_req = _normalize_columns(df, REQUIRED_QUESTION_COLUMNS)
    norm_opt = _normalize_columns(df, OPTIONAL_QUESTION_COLUMNS)
    all_norm = {**norm_req, **norm_opt}

    missing = _check_required(df, all_norm, REQUIRED_QUESTION_COLUMNS)
    if missing:
        readable = {k: v[0] for k, v in REQUIRED_QUESTION_COLUMNS.items()}
        raise ValueError(
            "缺少必填列：缺少 [" + "、".join([readable[m] for m in missing]) + "]。"
            f"当前识别到的列：{list(df.columns)}"
        )

    rows: List[Dict[str, Any]] = []
    for _, r in df.iterrows():
        row = {}
        for std, real in all_norm.items():
            val = r[real]
            if isinstance(val, str):
                val = val.strip()
            row[std] = val if val != "" else None
        rows.append(row)
    return rows, list(df.columns)


def parse_eval_records(file_bytes: bytes, filename: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """解析评测结果文件"""
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "csv":
        df = pd.read_csv(io.BytesIO(file_bytes)).fillna("")
    elif ext in ("xlsx", "xls"):
        df = pd.read_excel(io.BytesIO(file_bytes)).fillna("")
    else:
        raise ValueError(f"不支持的文件格式: {ext}，请上传 CSV 或 Excel")

    norm_req = _normalize_columns(df, REQUIRED_EVAL_COLUMNS)
    norm_opt = _normalize_columns(df, OPTIONAL_EVAL_COLUMNS)
    all_norm = {**norm_req, **norm_opt}

    missing = _check_required(df, all_norm, REQUIRED_EVAL_COLUMNS)
    if missing:
        readable = {k: v[0] for k, v in REQUIRED_EVAL_COLUMNS.items()}
        raise ValueError(
            "缺少必填列：缺少 [" + "、".join([readable[m] for m in missing]) + "]。"
            f"当前识别到的列：{list(df.columns)}"
        )

    rows: List[Dict[str, Any]] = []
    for _, r in df.iterrows():
        row: Dict[str, Any] = {}
        for std, real in all_norm.items():
            val = r[real]
            if isinstance(val, str):
                val = val.strip()
                if val == "":
                    val = None
            row[std] = val
        if "is_pass" in row and isinstance(row["is_pass"], str):
            low = row["is_pass"].lower()
            if low in ("通过", "是", "yes", "true", "1", "pass"):
                row["is_pass"] = 1
            elif low in ("不通过", "否", "no", "false", "0", "fail", "未通过"):
                row["is_pass"] = 0
            else:
                row["is_pass"] = None
        if "score" in row and row["score"] is not None:
            try:
                row["score"] = float(row["score"])
            except Exception:
                row["score"] = None
        if "latency_ms" in row and row["latency_ms"] is not None:
            try:
                row["latency_ms"] = int(float(row["latency_ms"]))
            except Exception:
                row["latency_ms"] = None
        rows.append(row)
    return rows, list(df.columns)

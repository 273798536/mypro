import hashlib
import os
import json
from typing import List, Any, Dict, Tuple
import pandas as pd


def compute_file_hash(file_path: str) -> str:
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()


def compute_content_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def compute_dict_hash(data: Dict[str, Any]) -> str:
    sorted_data = json.dumps(data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(sorted_data.encode("utf-8")).hexdigest()


def check_sort_stability(df: pd.DataFrame, key_columns: List[str]) -> Tuple[bool, str]:
    if not key_columns or not all(col in df.columns for col in key_columns):
        return True, ""

    try:
        key_data = df[key_columns].fillna("")
        key_tuples = [tuple(row) for _, row in key_data.iterrows()]
        seen = {}
        duplicates = []
        for idx, kt in enumerate(key_tuples):
            if kt in seen:
                duplicates.append((seen[kt] + 1, idx + 1, kt))
            else:
                seen[kt] = idx

        if not duplicates:
            return True, ""

        parts = []
        for first, second, kt in duplicates[:5]:
            key_desc = "、".join(f"{c}={v}" for c, v in zip(key_columns, kt) if v)
            parts.append(f"第{first}行与第{second}行（{key_desc}）")

        msg = "检测到关键字段存在重复组合，可能导致同一批数据多次导入时排序结果不稳定："
        msg += "；".join(parts)
        if len(duplicates) > 5:
            msg += f"等共{len(duplicates)}处"
        msg += "。请值班同事核对并补齐该批次原始材料：确保每条记录在"
        msg += "、".join(key_columns)
        msg += "上能唯一区分；如确实存在合法重复，请在文件中增加行号列或备注说明后再导入。"
        return False, msg
    except Exception as e:
        return False, f"排序稳定性检查时出现问题：{str(e)}。请确认文件中关键字段无空值或异常值。"


def allowed_file(filename: str) -> bool:
    from config import ALLOWED_EXTENSIONS
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS


def read_data_file(file_path: str) -> pd.DataFrame:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".csv":
        return pd.read_csv(file_path, dtype=str)
    elif ext in {".xlsx", ".xls"}:
        return pd.read_excel(file_path, dtype=str)
    elif ext == ".json":
        return pd.read_json(file_path, dtype=str)
    elif ext == ".txt":
        return pd.read_csv(file_path, sep="\t", dtype=str)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")


def generate_batch_no(prefix: str = "BATCH") -> str:
    from datetime import datetime
    return f"{prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

import csv
import os
from typing import List, Dict, Any, Optional
from . import db
from .calculator import save_teams, set_params, DEFAULT_PARAMS


def _parse_float(v: str) -> Optional[float]:
    if v is None or str(v).strip() == "":
        return None
    try:
        return float(v)
    except ValueError:
        return None


def _parse_int(v: str) -> Optional[int]:
    if v is None or str(v).strip() == "":
        return None
    try:
        return int(float(v))
    except ValueError:
        return None


def import_teams_csv(batch_id: int, csv_path: str) -> Dict[str, Any]:
    if not os.path.isfile(csv_path):
        raise FileNotFoundError(f"CSV 文件不存在: {csv_path}")

    teams: List[Dict[str, Any]] = []
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ValueError("CSV 无表头")
        headers = {h.strip().lower(): h for h in reader.fieldnames}
        name_col = headers.get("team_name") or headers.get("队伍") or headers.get("team") or headers.get("名称")
        score_col = headers.get("raw_score") or headers.get("分数") or headers.get("score") or headers.get("原始分")
        rank_col = headers.get("raw_rank") or headers.get("排名") or headers.get("rank") or headers.get("原始排名")
        for i, row in enumerate(reader, start=2):
            if not any(str(v).strip() for v in row.values()):
                continue
            team_name = str(row.get(name_col, "")).strip() if name_col else ""
            if not team_name:
                raise ValueError(f"第{i}行缺少队伍名称")
            teams.append({
                "team_name": team_name,
                "raw_score": _parse_float(row.get(score_col, "")) if score_col else None,
                "raw_rank": _parse_int(row.get(rank_col, "")) if rank_col else None,
            })

    save_teams(batch_id, teams)
    db.log_run(batch_id, "import_teams", detail=f"file={os.path.basename(csv_path)}, count={len(teams)}")
    return {"count": len(teams), "teams": teams}


def import_params_csv(batch_id: int, csv_path: str) -> Dict[str, Any]:
    if not os.path.isfile(csv_path):
        raise FileNotFoundError(f"参数 CSV 不存在: {csv_path}")

    params: Dict[str, float] = {}
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ValueError("参数 CSV 无表头")
        headers = {h.strip().lower(): h for h in reader.fieldnames}
        key_col = headers.get("param_key") or headers.get("参数") or headers.get("key")
        val_col = headers.get("param_value") or headers.get("值") or headers.get("value")
        for i, row in enumerate(reader, start=2):
            if not any(str(v).strip() for v in row.values()):
                continue
            k = str(row.get(key_col, "")).strip()
            v_raw = str(row.get(val_col, "")).strip()
            if not k:
                continue
            try:
                params[k] = float(v_raw)
            except ValueError:
                raise ValueError(f"参数CSV第{i}行: {k} 的值 '{v_raw}' 不是数字")

    final_params = dict(DEFAULT_PARAMS)
    final_params.update(params)
    set_params(batch_id, final_params)
    db.log_run(batch_id, "import_params", detail=f"file={os.path.basename(csv_path)}, keys={list(final_params.keys())}")
    return final_params

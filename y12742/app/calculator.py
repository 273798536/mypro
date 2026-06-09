from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from . import db

DEFAULT_PARAMS = {
    "score_weight": 0.6,
    "rank_weight": 0.4,
    "stability_half_window": 2,
    "warning_error_threshold": 0.15,
    "tie_break_method": "average",
}


def set_params(batch_id: int, params: Dict[str, float]) -> None:
    conn = db.get_conn()
    try:
        cur = conn.cursor()
        for k, v in params.items():
            cur.execute(
                "INSERT OR REPLACE INTO params(batch_id, param_key, param_value, description) VALUES(?,?,?,?)",
                (batch_id, k, float(v), DEFAULT_PARAMS.get(k, ""))
            )
        conn.commit()
    finally:
        conn.close()


def get_params(batch_id: int) -> Dict[str, float]:
    conn = db.get_conn()
    try:
        rows = conn.execute("SELECT param_key, param_value FROM params WHERE batch_id=?", (batch_id,)).fetchall()
        result = dict(DEFAULT_PARAMS)
        for r in rows:
            result[r["param_key"]] = r["param_value"]
        return result
    finally:
        conn.close()


def save_teams(batch_id: int, teams: List[Dict[str, Any]]) -> None:
    conn = db.get_conn()
    try:
        cur = conn.cursor()
        for t in teams:
            cur.execute(
                "INSERT INTO teams(batch_id, team_name, raw_score, raw_rank) VALUES(?,?,?,?)",
                (batch_id, t["team_name"], t.get("raw_score"), t.get("raw_rank"))
            )
        conn.commit()
    finally:
        conn.close()


def get_teams(batch_id: int) -> List[Dict[str, Any]]:
    conn = db.get_conn()
    try:
        rows = conn.execute("SELECT * FROM teams WHERE batch_id=? ORDER BY id", (batch_id,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def _assign_ranks(scores: List[Tuple[int, float]], tie_break: str = "average") -> Dict[int, int]:
    id_to_rank: Dict[int, int] = {}
    sorted_items = sorted(scores, key=lambda x: (-x[1], x[0]))
    i = 0
    n = len(sorted_items)
    while i < n:
        j = i
        while j + 1 < n and sorted_items[j + 1][1] == sorted_items[i][1]:
            j += 1
        if tie_break == "average":
            avg_rank = (i + 1 + j + 1) / 2.0
            for k in range(i, j + 1):
                id_to_rank[sorted_items[k][0]] = int(round(avg_rank))
        elif tie_break == "min":
            for k in range(i, j + 1):
                id_to_rank[sorted_items[k][0]] = i + 1
        else:
            for k in range(i, j + 1):
                id_to_rank[sorted_items[k][0]] = j + 1
        i = j + 1
    return id_to_rank


def compute_adjusted_score(raw_score: Optional[float], params: Dict[str, float]) -> Tuple[float, str]:
    note_parts = []
    if raw_score is None:
        return 0.0, "原始分数缺失，按0处理"
    if raw_score < 0:
        note_parts.append(f"原始分数{raw_score}为负，截断为0")
        raw_score = 0.0
    sw = params.get("score_weight", 0.6)
    adjusted = raw_score * sw
    note_parts.append(f"raw_score={raw_score} * score_weight={sw} = {adjusted:.6f}")
    return adjusted, "; ".join(note_parts)


def compute_stability_index(
    raw_rank: Optional[int],
    adjusted_rank: int,
    total_teams: int,
    params: Dict[str, float]
) -> Tuple[float, int, float, str]:
    note_parts = []
    if total_teams <= 1:
        return 1.0, 0, 0.0, "仅1支队伍，稳定性指数恒为1"

    if raw_rank is None:
        note_parts.append("原始排名缺失，使用调整后排名作为基准")
        raw_rank = adjusted_rank

    rank_delta = adjusted_rank - raw_rank
    note_parts.append(f"原始排名={raw_rank}, 调整后排名={adjusted_rank}, 差值delta={rank_delta}")

    half_window = params.get("stability_half_window", 2)
    if half_window <= 0:
        note_parts.append("warning: stability_half_window<=0，使用默认值2")
        half_window = 2

    denom = half_window * (total_teams - 1)
    if denom == 0:
        note_parts.append("分母(total_teams-1)为0，除零保护，稳定性指数置为1")
        return 1.0, rank_delta, 0.0, "; ".join(note_parts)

    normalized = abs(rank_delta) / denom
    if normalized > 1.0:
        note_parts.append(f"归一化差值{normalized:.4f}超过1，截断为1")
        normalized = 1.0
    stability = 1.0 - normalized
    error_magnitude = abs(rank_delta) / max(total_teams, 1)
    note_parts.append(
        f"|delta|/({half_window}*(N-1)) = {abs(rank_delta)}/{denom} = {abs(rank_delta)/denom:.6f}; "
        f"stability_index = 1 - {normalized:.6f} = {stability:.6f}; "
        f"error_magnitude = {abs(rank_delta)}/{total_teams} = {error_magnitude:.6f}"
    )
    return stability, rank_delta, error_magnitude, "; ".join(note_parts)


def run_calculation(batch_id: int) -> List[Dict[str, Any]]:
    teams = get_teams(batch_id)
    params = get_params(batch_id)
    total = len(teams)
    tie_break = params.get("tie_break_method", "average")

    adjusted_scores: List[Tuple[int, float]] = []
    score_notes: Dict[int, str] = {}
    for t in teams:
        adj, note = compute_adjusted_score(t.get("raw_score"), params)
        adjusted_scores.append((t["id"], adj))
        score_notes[t["id"]] = note

    id_to_rank = _assign_ranks(adjusted_scores, tie_break=tie_break)

    warning_threshold = params.get("warning_error_threshold", 0.15)
    drafts: List[Dict[str, Any]] = []
    conn = db.get_conn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM calc_drafts WHERE batch_id=?", (batch_id,))
        for t in teams:
            team_id = t["id"]
            adj_score = next(s for (tid, s) in adjusted_scores if tid == team_id)
            adj_rank = id_to_rank[team_id]
            stability, delta, err_mag, stab_note = compute_stability_index(
                t.get("raw_rank"), adj_rank, total, params
            )
            is_warn = 1 if err_mag > warning_threshold else 0
            warn_reason = ""
            if is_warn:
                warn_reason = (
                    f"误差幅度{err_mag:.4f}超过阈值{warning_threshold}，"
                    f"排名波动{delta}超过警戒范围"
                )
            full_note = f"[分数调整]{score_notes[team_id]} | [稳定性计算]{stab_note}"
            cur.execute(
                """INSERT INTO calc_drafts(batch_id, team_id, adjusted_score, adjusted_rank,
                   stability_index, rank_delta, error_magnitude, is_warning, warning_reason,
                   calc_note, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                (batch_id, team_id, adj_score, adj_rank, stability, delta, err_mag,
                 is_warn, warn_reason, full_note, datetime.now().isoformat(timespec="seconds"))
            )
            cur.execute(
                "INSERT OR IGNORE INTO reviews(draft_id, status) VALUES(?, 'pending')",
                (cur.lastrowid,)
            )
        conn.commit()
    finally:
        conn.close()

    db.log_run(batch_id, "run_calculation", detail=f"teams={total}, threshold={warning_threshold}")
    return list_drafts(batch_id)


def list_drafts(batch_id: int) -> List[Dict[str, Any]]:
    conn = db.get_conn()
    try:
        rows = conn.execute(
            """SELECT d.*, t.team_name, t.raw_score, t.raw_rank,
                      r.status AS review_status, r.reviewer, r.review_opinion, r.reviewed_at
               FROM calc_drafts d
               JOIN teams t ON t.id = d.team_id
               LEFT JOIN reviews r ON r.draft_id = d.id
               WHERE d.batch_id=?
               ORDER BY d.adjusted_rank ASC, d.id ASC""",
            (batch_id,)
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_draft(draft_id: int) -> Optional[Dict[str, Any]]:
    conn = db.get_conn()
    try:
        row = conn.execute(
            """SELECT d.*, t.team_name, t.raw_score, t.raw_rank, t.batch_id,
                      r.status AS review_status, r.reviewer, r.review_opinion, r.reviewed_at
               FROM calc_drafts d
               JOIN teams t ON t.id = d.team_id
               LEFT JOIN reviews r ON r.draft_id = d.id
               WHERE d.id=?""",
            (draft_id,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def list_warnings(batch_id: int) -> List[Dict[str, Any]]:
    drafts = list_drafts(batch_id)
    return [d for d in drafts if d.get("is_warning")]

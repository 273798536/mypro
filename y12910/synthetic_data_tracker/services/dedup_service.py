from typing import List, Dict
from database import get_connection
from models import DedupResult
import hashlib


def check_and_mark_duplicates(content: str) -> DedupResult:
    content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
    conn = get_connection()
    row = conn.execute(
        "SELECT id FROM records WHERE content_hash = ? LIMIT 1",
        (content_hash,),
    ).fetchone()
    conn.close()
    if row:
        return DedupResult(is_duplicate=True, existing_record_id=row["id"])
    return DedupResult(is_duplicate=False)


def find_all_duplicates() -> List[Dict]:
    conn = get_connection()
    rows = conn.execute(
        """SELECT content_hash, COUNT(*) as cnt, GROUP_CONCAT(id) as ids
           FROM records GROUP BY content_hash HAVING cnt > 1"""
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        ids = [int(x) for x in r["ids"].split(",")]
        result.append({"content_hash": r["content_hash"], "count": r["cnt"], "record_ids": ids})
    return result

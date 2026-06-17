import json
import os
import traceback
from datetime import datetime
from typing import List, Dict, Any, Optional

from database import get_connection
from models import ReportExport, ReportItem, RecordResponse


REPORTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "reports")


def _ensure_reports_dir():
    if not os.path.isdir(REPORTS_DIR):
        os.makedirs(REPORTS_DIR, exist_ok=True)


def _row_to_response(row) -> RecordResponse:
    return RecordResponse(
        id=row["id"],
        source_material=row["source_material"] or "",
        prompt_version=row["prompt_version"] or "",
        content=row["content"] or "",
        content_hash=row["content_hash"] or "",
        status=row["status"] or "imported",
        feedback=row["feedback"] or "",
        notes=row["notes"] or "",
        created_at=row["created_at"] or "",
        updated_at=row["updated_at"] or "",
    )


def _sanity_warnings(rows) -> List[str]:
    warnings = []
    total = len(rows)
    confirmed = sum(1 for r in rows if r["status"] == "confirmed")
    pending = sum(1 for r in rows if r["status"] in ("imported", "pending_review"))
    rejected = sum(1 for r in rows if r["status"] == "rejected")
    if total == 0:
        warnings.append("当前题库为空，未导入任何评测记录。请先执行 POST /records 或运行 seed.py 写入样例。")
    if pending == 0 and total > 0:
        warnings.append("needs_review 分类为空：没有待复核记录。确认是否所有 imported/pending_review 记录都已被推进。")
    if confirmed == 0 and total > 0:
        warnings.append("ready 分类为空：没有通过复核的 confirmed 记录。")
    if rejected == 0 and total > 0:
        warnings.append("rejected 分类为空：没有坏数据标记。确认是否已对空值/重复记录做 rejected 标记。")
    for r in rows:
        if not (r["content"] or "").strip():
            warnings.append(f"记录 id={r['id']} content 为空，若未标记 rejected 请尽快处理。")
        if not (r["source_material"] or "").strip():
            warnings.append(f"记录 id={r['id']} source_material 为空，无法追溯到来源材料。")
    return warnings


def generate_report() -> Dict[str, Any]:
    try:
        conn = get_connection()
        rows = conn.execute("SELECT * FROM records ORDER BY id").fetchall()
    except Exception as e:
        return {
            "ok": False,
            "error": f"数据库读取失败: {str(e)}",
            "traceback": traceback.format_exc(limit=3),
        }

    ready: List[ReportItem] = []
    needs_review: List[ReportItem] = []
    rejected: List[ReportItem] = []

    for row in rows:
        rec = _row_to_response(row)
        try:
            version_count = conn.execute(
                "SELECT COUNT(*) FROM version_logs WHERE record_id = ?",
                (rec.id,),
            ).fetchone()[0]
            trace_count = conn.execute(
                "SELECT COUNT(*) FROM source_traces WHERE record_id = ?",
                (rec.id,),
            ).fetchone()[0]
        except Exception:
            version_count = 0
            trace_count = 0

        item = ReportItem(
            record=rec,
            category="",
            version_count=version_count,
            source_trace_count=trace_count,
        )
        if rec.status == "confirmed":
            item.category = "ready"
            ready.append(item)
        elif rec.status == "rejected":
            item.category = "rejected"
            rejected.append(item)
        else:
            item.category = "needs_review"
            needs_review.append(item)

    conn.close()

    report = ReportExport(
        exported_at=datetime.now().isoformat(),
        total=len(rows),
        ready=ready,
        needs_review=needs_review,
        rejected=rejected,
    )
    return {
        "ok": True,
        "summary": {
            "total": len(rows),
            "ready": len(ready),
            "needs_review": len(needs_review),
            "rejected": len(rejected),
        },
        "warnings": _sanity_warnings(rows),
        "report": report.model_dump(mode="json"),
    }


def write_report_to_file() -> Dict[str, Any]:
    _ensure_reports_dir()
    result = generate_report()
    if not result.get("ok"):
        return result
    filename = f"evaluation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    filepath = os.path.join(REPORTS_DIR, filename)
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
    except Exception as e:
        return {
            "ok": False,
            "error": f"写文件失败: {str(e)}",
            "traceback": traceback.format_exc(limit=3),
        }
    return {
        "ok": True,
        "filename": filename,
        "filepath": os.path.abspath(filepath),
        "download_url": f"/reports/files/{filename}",
        "summary": result["summary"],
        "warnings": result["warnings"],
    }


def list_report_files() -> List[Dict[str, Any]]:
    _ensure_reports_dir()
    files = []
    for name in sorted(os.listdir(REPORTS_DIR), reverse=True):
        if not name.endswith(".json"):
            continue
        fp = os.path.join(REPORTS_DIR, name)
        st = os.stat(fp)
        files.append({
            "filename": name,
            "size_bytes": st.st_size,
            "modified_at": datetime.fromtimestamp(st.st_mtime).isoformat(),
            "download_url": f"/reports/files/{name}",
        })
    return files


def get_report_filepath(filename: str) -> Optional[str]:
    _ensure_reports_dir()
    safe = os.path.basename(filename)
    fp = os.path.join(REPORTS_DIR, safe)
    if os.path.isfile(fp):
        return fp
    return None

from database import get_connection
from models import ReportExport, ReportItem, RecordResponse


def _row_to_response(row) -> RecordResponse:
    return RecordResponse(
        id=row["id"],
        source_material=row["source_material"],
        prompt_version=row["prompt_version"],
        content=row["content"],
        content_hash=row["content_hash"],
        status=row["status"],
        feedback=row["feedback"],
        notes=row["notes"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def generate_report() -> ReportExport:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM records ORDER BY id").fetchall()
    ready = []
    needs_review = []
    rejected = []
    for row in rows:
        rec = _row_to_response(row)
        version_count = conn.execute(
            "SELECT COUNT(*) FROM version_logs WHERE record_id = ?",
            (rec.id,),
        ).fetchone()[0]
        trace_count = conn.execute(
            "SELECT COUNT(*) FROM source_traces WHERE record_id = ?",
            (rec.id,),
        ).fetchone()[0]
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
    from datetime import datetime
    return ReportExport(
        exported_at=datetime.now().isoformat(),
        total=len(rows),
        ready=ready,
        needs_review=needs_review,
        rejected=rejected,
    )

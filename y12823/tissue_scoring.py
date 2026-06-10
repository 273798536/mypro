import sqlite3
import json
import argparse
import sys
import os
from datetime import datetime

DB_DEFAULT = "tissue_scoring.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS scoring_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    sample_id TEXT NOT NULL,
    score REAL NOT NULL,
    annotation_boundary TEXT NOT NULL DEFAULT 'clear',
    conclusion TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(batch_id, sample_id)
);

CREATE TABLE IF NOT EXISTS review_opinions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    old_score REAL,
    new_score REAL,
    old_conclusion TEXT,
    new_conclusion TEXT,
    old_annotation_boundary TEXT,
    new_annotation_boundary TEXT,
    reason TEXT NOT NULL,
    reviewer TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (record_id) REFERENCES scoring_records(id)
);

CREATE TABLE IF NOT EXISTS micrographs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (record_id) REFERENCES scoring_records(id)
);

CREATE INDEX IF NOT EXISTS idx_scoring_batch_sample
    ON scoring_records(batch_id, sample_id);

CREATE INDEX IF NOT EXISTS idx_review_record
    ON review_opinions(record_id);

CREATE INDEX IF NOT EXISTS idx_micrograph_record
    ON micrographs(record_id);
"""


def get_db(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db(db_path):
    conn = get_db(db_path)
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()
    print(f"Database initialized: {db_path}")


def _now():
    return datetime.now().isoformat()


def import_batch(db_path, batch_id, sample_id, score, annotation_boundary, conclusion, force=False):
    conn = get_db(db_path)
    now = _now()
    try:
        existing = conn.execute(
            "SELECT id, score, conclusion, annotation_boundary FROM scoring_records WHERE batch_id=? AND sample_id=?",
            (batch_id, sample_id),
        ).fetchone()

        if existing:
            if not force:
                conn.close()
                print(f"[DUPLICATE] batch={batch_id} sample={sample_id} already exists (id={existing['id']}). "
                      f"Use --force to update in-place, or use 'review_score' to record a correction.")
                return

            conn.execute(
                "INSERT INTO review_opinions (record_id, old_score, new_score, old_conclusion, new_conclusion, "
                "old_annotation_boundary, new_annotation_boundary, reason, reviewer, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (existing["id"], existing["score"], score,
                 existing["conclusion"], conclusion,
                 existing["annotation_boundary"], annotation_boundary,
                 "re-import overwrite", "system", now),
            )
            conn.execute(
                "UPDATE scoring_records SET score=?, annotation_boundary=?, conclusion=?, updated_at=? "
                "WHERE batch_id=? AND sample_id=?",
                (score, annotation_boundary, conclusion, now, batch_id, sample_id),
            )
            conn.commit()
            print(f"[UPDATED] id={existing['id']} batch={batch_id} sample={sample_id} "
                  f"score={existing['score']}->{score} conclusion updated, history preserved.")
        else:
            cur = conn.execute(
                "INSERT INTO scoring_records (batch_id, sample_id, score, annotation_boundary, conclusion, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (batch_id, sample_id, score, annotation_boundary, conclusion, now, now),
            )
            conn.commit()
            print(f"[CREATED] id={cur.lastrowid} batch={batch_id} sample={sample_id} score={score}")
    finally:
        conn.close()


def review_score(db_path, batch_id, sample_id, new_score, reason, reviewer, new_conclusion=None, new_boundary=None):
    conn = get_db(db_path)
    now = _now()
    try:
        rec = conn.execute(
            "SELECT id, score, conclusion, annotation_boundary FROM scoring_records WHERE batch_id=? AND sample_id=?",
            (batch_id, sample_id),
        ).fetchone()
        if not rec:
            print(f"[NOT FOUND] batch={batch_id} sample={sample_id}")
            return

        resolved_conclusion = new_conclusion if new_conclusion is not None else rec["conclusion"]
        resolved_boundary = new_boundary if new_boundary is not None else rec["annotation_boundary"]

        conn.execute(
            "INSERT INTO review_opinions (record_id, old_score, new_score, old_conclusion, new_conclusion, "
            "old_annotation_boundary, new_annotation_boundary, reason, reviewer, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (rec["id"], rec["score"], new_score,
             rec["conclusion"], resolved_conclusion,
             rec["annotation_boundary"], resolved_boundary,
             reason, reviewer, now),
        )
        conn.execute(
            "UPDATE scoring_records SET score=?, conclusion=?, annotation_boundary=?, updated_at=? WHERE id=?",
            (new_score, resolved_conclusion, resolved_boundary, now, rec["id"]),
        )
        conn.commit()
        print(f"[REVIEWED] id={rec['id']} score={rec['score']}->{new_score} reason=\"{reason}\" by={reviewer}")
    finally:
        conn.close()


def list_records(db_path, batch_id=None, boundary=None, format="table"):
    conn = get_db(db_path)
    try:
        sql = "SELECT r.id, r.batch_id, r.sample_id, r.score, r.annotation_boundary, r.conclusion, "
        sql += "r.created_at, r.updated_at, "
        sql += "(SELECT COUNT(*) FROM micrographs m WHERE m.record_id=r.id) AS micrograph_count "
        sql += "FROM scoring_records r WHERE 1=1"
        params = []
        if batch_id:
            sql += " AND r.batch_id=?"
            params.append(batch_id)
        if boundary:
            sql += " AND r.annotation_boundary=?"
            params.append(boundary)

        rows = conn.execute(sql, params).fetchall()

        if format == "json":
            result = [dict(r) for r in rows]
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            if not rows:
                print("No records found.")
                return
            print(f"{'ID':<5} {'Batch':<12} {'Sample':<12} {'Score':<6} {'Boundary':<10} "
                  f"{'Photos':<7} {'Conclusion':<20} {'Updated'}")
            print("-" * 95)
            for r in rows:
                print(f"{r['id']:<5} {r['batch_id']:<12} {r['sample_id']:<12} {r['score']:<6} "
                      f"{r['annotation_boundary']:<10} {r['micrograph_count']:<7} "
                      f"{r['conclusion'][:20]:<20} {r['updated_at']}")
    finally:
        conn.close()


def link_micrograph(db_path, batch_id, sample_id, file_path, description=""):
    conn = get_db(db_path)
    now = _now()
    try:
        rec = conn.execute(
            "SELECT id FROM scoring_records WHERE batch_id=? AND sample_id=?",
            (batch_id, sample_id),
        ).fetchone()
        if not rec:
            print(f"[NOT FOUND] batch={batch_id} sample={sample_id}")
            return

        conn.execute(
            "INSERT INTO micrographs (record_id, file_path, description, created_at) VALUES (?, ?, ?, ?)",
            (rec["id"], file_path, description, now),
        )
        conn.commit()
        print(f"[LINKED] micrograph \"{file_path}\" -> record id={rec['id']} ({batch_id}/{sample_id})")
    finally:
        conn.close()


def show_record(db_path, batch_id, sample_id):
    conn = get_db(db_path)
    try:
        rec = conn.execute(
            "SELECT * FROM scoring_records WHERE batch_id=? AND sample_id=?",
            (batch_id, sample_id),
        ).fetchone()
        if not rec:
            print(f"[NOT FOUND] batch={batch_id} sample={sample_id}")
            return

        print("=== Scoring Record ===")
        for k in rec.keys():
            print(f"  {k}: {rec[k]}")

        photos = conn.execute(
            "SELECT id, file_path, description, created_at FROM micrographs WHERE record_id=?",
            (rec["id"],),
        ).fetchall()
        if photos:
            print("\n--- Micrographs ---")
            for p in photos:
                print(f"  [{p['id']}] {p['file_path']} ({p['description']}) @ {p['created_at']}")

        opinions = conn.execute(
            "SELECT * FROM review_opinions WHERE record_id=? ORDER BY created_at",
            (rec["id"],),
        ).fetchall()
        if opinions:
            print("\n--- Review History ---")
            for o in opinions:
                print(f"  [{o['created_at']}] score {o['old_score']}->{o['new_score']} "
                      f"boundary {o['old_annotation_boundary']}->{o['new_annotation_boundary']} "
                      f"by={o['reviewer']} reason=\"{o['reason']}\"")
        else:
            print("\n  (No review history)")
    finally:
        conn.close()


def diff_analysis(db_path, batch_id=None, since=None):
    conn = get_db(db_path)
    try:
        sql = "SELECT ro.*, r.batch_id, r.sample_id FROM review_opinions ro " \
              "JOIN scoring_records r ON ro.record_id=r.id WHERE 1=1"
        params = []
        if batch_id:
            sql += " AND r.batch_id=?"
            params.append(batch_id)
        if since:
            sql += " AND ro.created_at>=?"
            params.append(since)

        sql += " ORDER BY ro.created_at"
        rows = conn.execute(sql, params).fetchall()

        if not rows:
            print("No review changes found for the given criteria.")
            return

        print("=== Diff Analysis: Scoring Changes ===\n")
        for r in rows:
            score_delta = (r["new_score"] or 0) - (r["old_score"] or 0)
            direction = "↑" if score_delta > 0 else "↓" if score_delta < 0 else "="
            print(f"  [{r['created_at']}] {r['batch_id']}/{r['sample_id']} "
                  f"score {r['old_score']}->{r['new_score']} ({direction}{abs(score_delta):.1f}) "
                  f"boundary {r['old_annotation_boundary']}->{r['new_annotation_boundary']} "
                  f"by={r['reviewer']} reason=\"{r['reason']}\"")

        by_reviewer = {}
        for r in rows:
            by_reviewer.setdefault(r["reviewer"], []).append(r)
        print(f"\n--- Summary: {len(rows)} change(s) by {len(by_reviewer)} reviewer(s) ---")
        for rev, changes in by_reviewer.items():
            avg_delta = sum((c["new_score"] or 0) - (c["old_score"] or 0) for c in changes) / len(changes)
            print(f"  {rev}: {len(changes)} change(s), avg delta={avg_delta:+.2f}")
    finally:
        conn.close()


def cli():
    parser = argparse.ArgumentParser(
        prog="tissue_scoring",
        description="组织染色强度评分管理工具 - 支持复核历史、修正原因、重复导入保护、显微照片双向追溯",
    )
    parser.add_argument("--db", default=DB_DEFAULT, help="SQLite database path")
    sub = parser.add_subparsers(dest="command")

    p_init = sub.add_parser("init", help="Initialize database")
    p_init.add_argument("--reset", action="store_true", help="Drop and recreate all tables")

    p_import = sub.add_parser("import", help="Import a scoring record (idempotent on duplicate batch+sample)")
    p_import.add_argument("--batch", required=True, help="Batch ID (e.g. sequencing run)")
    p_import.add_argument("--sample", required=True, help="Sample ID")
    p_import.add_argument("--score", required=True, type=float, help="Staining intensity score")
    p_import.add_argument("--boundary", default="clear", choices=["clear", "unclear"], help="Annotation boundary clarity")
    p_import.add_argument("--conclusion", default="", help="Conclusion text")
    p_import.add_argument("--force", action="store_true", help="Overwrite existing record on duplicate (preserves history)")

    p_review = sub.add_parser("review", help="Submit a review correction with reason (异常复核入口)")
    p_review.add_argument("--batch", required=True)
    p_review.add_argument("--sample", required=True)
    p_review.add_argument("--score", required=True, type=float, help="New score after review")
    p_review.add_argument("--reason", required=True, help="Correction reason (修正原因)")
    p_review.add_argument("--reviewer", required=True, help="Reviewer name")
    p_review.add_argument("--conclusion", default=None, help="Updated conclusion (optional)")
    p_review.add_argument("--boundary", default=None, choices=["clear", "unclear"], help="Updated boundary (optional)")

    p_list = sub.add_parser("list", help="List scoring records")
    p_list.add_argument("--batch", default=None)
    p_list.add_argument("--boundary", default=None, choices=["clear", "unclear"])
    p_list.add_argument("--format", default="table", choices=["table", "json"])

    p_show = sub.add_parser("show", help="Show full record with micrographs and review history")
    p_show.add_argument("--batch", required=True)
    p_show.add_argument("--sample", required=True)

    p_link = sub.add_parser("link-photo", help="Link a micrograph to a scoring record")
    p_link.add_argument("--batch", required=True)
    p_link.add_argument("--sample", required=True)
    p_link.add_argument("--path", required=True, help="Micrograph file path")
    p_link.add_argument("--desc", default="", help="Description")

    p_diff = sub.add_parser("diff", help="Diff analysis of scoring changes (月底/课前差异分析)")
    p_diff.add_argument("--batch", default=None)
    p_diff.add_argument("--since", default=None, help="ISO datetime filter (e.g. 2025-01-01)")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command == "init":
        if args.reset and os.path.exists(args.db):
            os.remove(args.db)
        init_db(args.db)

    elif args.command == "import":
        import_batch(args.db, args.batch, args.sample, args.score, args.boundary, args.conclusion, args.force)

    elif args.command == "review":
        review_score(args.db, args.batch, args.sample, args.score, args.reason, args.reviewer,
                     args.conclusion, args.boundary)

    elif args.command == "list":
        list_records(args.db, args.batch, args.boundary, args.format)

    elif args.command == "show":
        show_record(args.db, args.batch, args.sample)

    elif args.command == "link-photo":
        link_micrograph(args.db, args.batch, args.sample, args.path, args.desc)

    elif args.command == "diff":
        diff_analysis(args.db, args.batch, args.since)


if __name__ == "__main__":
    cli()

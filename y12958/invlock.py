from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timezone

DEFAULT_DB = os.environ.get("INVLOCK_DB", "invlock.db")

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS import_batch (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_kind TEXT NOT NULL,
  source_file TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  batch_label TEXT,
  imported_at TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  dedup_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_import_kind_hash ON import_batch(source_kind, content_hash);

CREATE TABLE IF NOT EXISTS slow_query (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_batch_id INTEGER NOT NULL REFERENCES import_batch(id),
  source_file TEXT NOT NULL,
  source_line_start INTEGER NOT NULL,
  source_line_end INTEGER NOT NULL,
  raw_text TEXT NOT NULL,
  sql_text TEXT,
  query_fingerprint TEXT NOT NULL,
  schema_name TEXT,
  table_name TEXT,
  query_time_sec REAL,
  lock_time_sec REAL,
  rows_sent INTEGER,
  rows_examined INTEGER,
  is_lock_wait INTEGER NOT NULL DEFAULT 0,
  source_remark TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(source_file, source_line_start)
);
CREATE INDEX IF NOT EXISTS idx_slow_fp ON slow_query(query_fingerprint);
CREATE INDEX IF NOT EXISTS idx_slow_lockwait ON slow_query(is_lock_wait);

CREATE TABLE IF NOT EXISTS migration_script (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_batch_id INTEGER NOT NULL REFERENCES import_batch(id),
  batch_label TEXT NOT NULL,
  script_name TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  source_file TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(content_hash)
);

CREATE TABLE IF NOT EXISTS schema_snapshot (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_batch_id INTEGER NOT NULL REFERENCES import_batch(id),
  snapshot_label TEXT NOT NULL UNIQUE,
  content_hash TEXT NOT NULL,
  source_file TEXT NOT NULL,
  tables_json TEXT NOT NULL,
  taken_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_diff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  before_snapshot_id INTEGER NOT NULL REFERENCES schema_snapshot(id),
  after_snapshot_id INTEGER NOT NULL REFERENCES schema_snapshot(id),
  diff_summary TEXT NOT NULL,
  changes_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(before_snapshot_id, after_snapshot_id)
);

CREATE TABLE IF NOT EXISTS backup_record (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  related_batch_label TEXT NOT NULL,
  backup_label TEXT NOT NULL UNIQUE,
  source_remark TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_conclusion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_key TEXT NOT NULL UNIQUE,
  subject_kind TEXT NOT NULL,
  conclusion_text TEXT NOT NULL,
  backup_record_id INTEGER REFERENCES backup_record(id),
  slow_query_id INTEGER REFERENCES slow_query(id),
  migration_script_id INTEGER REFERENCES migration_script(id),
  source_remark TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conclusion_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conclusion_id INTEGER NOT NULL REFERENCES review_conclusion(id),
  action TEXT NOT NULL,
  old_text TEXT,
  new_text TEXT NOT NULL,
  import_batch_id INTEGER,
  at TEXT NOT NULL
);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA_SQL)
    conn.commit()
    return conn


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def normalize_file_content(text: str) -> str:
    out_lines = []
    for line in text.splitlines():
        s = line.rstrip()
        if s.strip() == "":
            continue
        out_lines.append(s)
    return "\n".join(out_lines)


META_TIME = re.compile(r"^#\s*Time\s*:\s*(.+?)\s*$")
META_USER = re.compile(r"^#\s*User@Host\s*:\s*(.+?)\s*$")
META_QT = re.compile(r"Query_time\s*:\s*([0-9.]+)", re.I)
META_LT = re.compile(r"Lock_time\s*:\s*([0-9.]+)", re.I)
META_RS = re.compile(r"Rows_sent\s*:\s*(\d+)", re.I)
META_RE = re.compile(r"Rows_examined\s*:\s*(\d+)", re.I)
USE_DB = re.compile(r"^\s*use\s+`?(\w+)`?\s*;", re.I)
SET_TS = re.compile(r"^\s*SET\s+timestamp", re.I)
TABLE_RE = re.compile(
    r"(?:update|delete\s+from|insert\s+into|from)\s+`?(\w+)`?", re.I
)
KNOWN_META_RE = (META_TIME, META_USER, META_QT, META_LT, META_RS, META_RE)


def normalize_sql_fingerprint(sql: str) -> str:
    s = sql.strip().rstrip(";").strip()
    s = re.sub(r"'[^']*'", "?", s)
    s = re.sub(r"\b\d+\b", "?", s)
    s = re.sub(r"\s+", " ", s).lower()
    m = re.search(r"\bwhere\b\s+(.*)$", s)
    if m:
        head = s[: m.start()]
        where = m.group(1)
        preds = [p.strip() for p in re.split(r"\s+and\s+", where) if p.strip()]
        preds.sort()
        s = head + " where " + " and ".join(preds)
    return sha256_text(s)


def parse_slow_log(path: str) -> list[dict]:
    with open(path, encoding="utf-8", errors="replace") as f:
        raw = f.read()
    lines = raw.split("\n")
    entries: list[dict] = []
    cur: dict | None = None

    for idx, line in enumerate(lines, start=1):
        is_boundary = bool(META_TIME.match(line) or META_USER.match(line))
        if is_boundary:
            if cur is not None:
                entries.append(cur)
            cur = {
                "start": idx,
                "meta_lines": [],
                "sql_lines": [],
                "raw_lines": [line],
            }
            continue
        if cur is None:
            continue
        cur["raw_lines"].append(line)
        stripped = line.strip()
        if stripped == "":
            continue
        if line.lstrip().startswith("#"):
            cur["meta_lines"].append(line)
        else:
            cur["sql_lines"].append(line)
    if cur is not None:
        entries.append(cur)

    results = []
    for e in entries:
        meta_blob = "\n".join(e["meta_lines"])
        sql_lines = [
            ln for ln in e["sql_lines"] if not USE_DB.match(ln) and not SET_TS.match(ln)
        ]
        sql_text = " ".join(ln.strip() for ln in sql_lines).strip()
        if not sql_text:
            continue
        schema_name = None
        for ln in e["sql_lines"]:
            m = USE_DB.match(ln)
            if m:
                schema_name = m.group(1)
                break
        tm = TABLE_RE.search(sql_text)
        table_name = tm.group(1) if tm else None
        qt = META_QT.search(meta_blob)
        lt = META_LT.search(meta_blob)
        rs = META_RS.search(meta_blob)
        re_ = META_RE.search(meta_blob)
        lock_time = float(lt.group(1)) if lt else None
        raw_text = "\n".join(e["raw_lines"]).rstrip()
        end_line = e["start"]
        for i in range(len(e["raw_lines"]) - 1, -1, -1):
            if e["raw_lines"][i].strip() != "":
                end_line = e["start"] + i
                break
        remarks = []
        for ml in e["meta_lines"]:
            content = ml.lstrip().lstrip("#").strip()
            if not content:
                continue
            if any(p.search(ml) for p in KNOWN_META_RE):
                continue
            remarks.append(content)
        is_lock_wait = 0
        if lock_time and lock_time > 0:
            is_lock_wait = 1
        if re.search(r"lock\s+wait", raw_text, re.I):
            is_lock_wait = 1
        results.append(
            {
                "source_line_start": e["start"],
                "source_line_end": end_line,
                "raw_text": raw_text,
                "sql_text": sql_text,
                "query_fingerprint": normalize_sql_fingerprint(sql_text),
                "schema_name": schema_name,
                "table_name": table_name,
                "query_time_sec": float(qt.group(1)) if qt else None,
                "lock_time_sec": lock_time,
                "rows_sent": int(rs.group(1)) if rs else None,
                "rows_examined": int(re_.group(1)) if re_ else None,
                "is_lock_wait": is_lock_wait,
                "source_remark": " | ".join(remarks) if remarks else None,
            }
        )
    return results


def parse_schema_snapshot(path: str) -> tuple[dict, str]:
    with open(path, encoding="utf-8", errors="replace") as f:
        text = f.read()
    tables: dict[str, dict] = {}
    for stmt in text.split(";"):
        m = re.search(
            r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?\s*\((.*)\)",
            stmt,
            re.S | re.I,
        )
        if not m:
            continue
        tname = m.group(1)
        body = m.group(2)
        cols: list[str] = []
        indexes: list[dict] = []
        for part in re.split(r",\s*\n", body):
            p = part.strip().rstrip(",").strip()
            if not p:
                continue
            pk = re.match(r"PRIMARY\s+KEY\s*\(([^)]*)\)", p, re.I)
            uq = re.match(r"UNIQUE\s+(?:KEY|INDEX)\s+`?(\w+)`?\s*\(([^)]*)\)", p, re.I)
            kk = re.match(r"(?:KEY|INDEX)\s+`?(\w+)`?\s*\(([^)]*)\)", p, re.I)
            con = re.match(r"CONSTRAINT\s+`?(\w+)`?", p, re.I)
            if pk:
                indexes.append(
                    {
                        "name": "PRIMARY",
                        "kind": "primary",
                        "cols": [c.strip().strip("`") for c in pk.group(1).split(",")],
                    }
                )
            elif uq:
                indexes.append(
                    {
                        "name": uq.group(1),
                        "kind": "unique",
                        "cols": [c.strip().strip("`") for c in uq.group(2).split(",")],
                    }
                )
            elif kk:
                indexes.append(
                    {
                        "name": kk.group(1),
                        "kind": "index",
                        "cols": [c.strip().strip("`") for c in kk.group(2).split(",")],
                    }
                )
            elif con:
                indexes.append({"name": con.group(1), "kind": "constraint", "cols": []})
            else:
                cm = re.match(r"`?(\w+)`?\s+", p)
                if cm:
                    cols.append(cm.group(1))
        tables[tname] = {"columns": cols, "indexes": indexes}
    return tables, sha256_text(normalize_file_content(text))


def compute_schema_diff(before: dict, after: dict) -> tuple[str, dict]:
    changes: dict = {"tables_added": [], "tables_removed": [], "per_table": {}}
    summary_parts = []
    for t in sorted(set(before) | set(after)):
        if t not in before:
            changes["tables_added"].append(t)
            summary_parts.append(f"+TABLE {t}")
            continue
        if t not in after:
            changes["tables_removed"].append(t)
            summary_parts.append(f"-TABLE {t}")
            continue
        b = before[t]
        a = after[t]
        added_cols = [c for c in a["columns"] if c not in b["columns"]]
        removed_cols = [c for c in b["columns"] if c not in a["columns"]]
        b_idx = {i["name"]: i for i in b["indexes"]}
        a_idx = {i["name"]: i for i in a["indexes"]}
        added_idx = [a_idx[n] for n in a_idx if n not in b_idx]
        removed_idx = [b_idx[n] for n in b_idx if n not in a_idx]
        if added_cols or removed_cols or added_idx or removed_idx:
            changes["per_table"][t] = {
                "added_columns": added_cols,
                "removed_columns": removed_cols,
                "added_indexes": added_idx,
                "removed_indexes": removed_idx,
            }
            if added_idx:
                for ix in added_idx:
                    summary_parts.append(
                        f"{t}: +{ix['kind'].upper()} {ix['name']}({', '.join(ix['cols'])})"
                    )
            if removed_idx:
                for ix in removed_idx:
                    summary_parts.append(
                        f"{t}: -{ix['kind'].upper()} {ix['name']}({', '.join(ix['cols'])})"
                    )
            for c in added_cols:
                summary_parts.append(f"{t}: +COLUMN {c}")
            for c in removed_cols:
                summary_parts.append(f"{t}: -COLUMN {c}")
    summary = "; ".join(summary_parts) if summary_parts else "no schema changes"
    return summary, changes


def print_rows(rows: list, cols: list[str]) -> None:
    if not rows:
        print("  (none)")
        return
    widths = {c: len(c) for c in cols}
    rendered = []
    for r in rows:
        d = {k: r[k] for k in r.keys()}
        rd = {c: ("" if d.get(c) is None else str(d.get(c))) for c in cols}
        for c in cols:
            widths[c] = max(widths[c], len(rd[c]))
        rendered.append(rd)
    header = "  ".join(c.ljust(widths[c]) for c in cols)
    print(header)
    print("  ".join("-" * widths[c] for c in cols))
    for rd in rendered:
        print("  ".join(rd[c].ljust(widths[c]) for c in cols))


def cmd_init(args: argparse.Namespace) -> int:
    conn = connect(args.db)
    print(f"initialized inventory lock-wait review db: {os.path.abspath(args.db)}")
    conn.close()
    return 0


def cmd_import_slow_log(args: argparse.Namespace) -> int:
    conn = connect(args.db)
    src = os.path.abspath(args.file)
    with open(src, encoding="utf-8", errors="replace") as f:
        content = f.read()
    content_hash = sha256_text(normalize_file_content(content))
    existing = conn.execute(
        "SELECT id, row_count, imported_at FROM import_batch "
        "WHERE source_kind='slow_log' AND content_hash=? ORDER BY id LIMIT 1",
        (content_hash,),
    ).fetchone()
    if existing:
        conn.execute(
            "INSERT INTO import_batch(source_kind, source_file, content_hash, batch_label, "
            "imported_at, row_count, dedup_note) VALUES('slow_log',?,?,?,?,?,?)",
            (
                src,
                content_hash,
                args.batch_label,
                now_iso(),
                0,
                f"reimport:existing=#{existing['id']}",
            ),
        )
        conn.commit()
        print(
            f"IDEMPOTENT RE-IMPORT: slow log file content unchanged "
            f"(matches batch #{existing['id']}, {existing['row_count']} rows). "
            f"0 new slow_query rows, no duplicate conclusions created."
        )
        conn.close()
        return 0
    entries = parse_slow_log(src)
    batch_cur = conn.execute(
        "INSERT INTO import_batch(source_kind, source_file, content_hash, batch_label, "
        "imported_at, row_count, dedup_note) VALUES('slow_log',?,?,?,?,?,?)",
        (src, content_hash, args.batch_label, now_iso(), 0, "new"),
    )
    batch_id = batch_cur.lastrowid
    inserted = 0
    skipped = 0
    for e in entries:
        cur = conn.execute(
            "INSERT OR IGNORE INTO slow_query("
            "import_batch_id, source_file, source_line_start, source_line_end, raw_text, "
            "sql_text, query_fingerprint, schema_name, table_name, query_time_sec, "
            "lock_time_sec, rows_sent, rows_examined, is_lock_wait, source_remark, created_at"
            ") VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                batch_id,
                src,
                e["source_line_start"],
                e["source_line_end"],
                e["raw_text"],
                e["sql_text"],
                e["query_fingerprint"],
                e["schema_name"],
                e["table_name"],
                e["query_time_sec"],
                e["lock_time_sec"],
                e["rows_sent"],
                e["rows_examined"],
                e["is_lock_wait"],
                e["source_remark"],
                now_iso(),
            ),
        )
        if cur.rowcount == 1:
            inserted += 1
        else:
            skipped += 1
    conn.execute(
        "UPDATE import_batch SET row_count=? WHERE id=?", (inserted, batch_id)
    )
    conn.commit()
    lock_wait = sum(1 for e in entries if e["is_lock_wait"])
    print(
        f"imported slow log: batch #{batch_id}, {inserted} new slow_query rows "
        f"(skipped {skipped} dupes by source_file+line), {lock_wait} flagged as lock-wait."
    )
    print(f"source_file={src}")
    conn.close()
    return 0


def cmd_import_migration(args: argparse.Namespace) -> int:
    conn = connect(args.db)
    src = os.path.abspath(args.file)
    with open(src, encoding="utf-8", errors="replace") as f:
        content = f.read()
    content_hash = sha256_text(normalize_file_content(content))
    existing = conn.execute(
        "SELECT id, batch_label, script_name FROM migration_script WHERE content_hash=?",
        (content_hash,),
    ).fetchone()
    if existing:
        note = f"reimport:existing_migration=#{existing['id']}(label={existing['batch_label']})"
        conn.execute(
            "INSERT INTO import_batch(source_kind, source_file, content_hash, batch_label, "
            "imported_at, row_count, dedup_note) VALUES('migration',?,?,?,?,?,?)",
            (src, content_hash, args.batch, now_iso(), 0, note),
        )
        conn.commit()
        if args.batch != existing["batch_label"]:
            print(
                f"WARNING: same migration content already imported under different batch "
                f"label '{existing['batch_label']}'. Refusing to create a second "
                f"migration_script record or a competing conclusion."
            )
        print(
            f"IDEMPOTENT RE-IMPORT: migration already imported "
            f"(#{existing['id']}, batch={existing['batch_label']}, "
            f"script={existing['script_name']}). No duplicate created."
        )
        conn.close()
        return 0
    script_name = os.path.basename(src)
    batch_cur = conn.execute(
        "INSERT INTO import_batch(source_kind, source_file, content_hash, batch_label, "
        "imported_at, row_count, dedup_note) VALUES('migration',?,?,?,?,?,?)",
        (src, content_hash, args.batch, now_iso(), 1, "new"),
    )
    batch_id = batch_cur.lastrowid
    mig_cur = conn.execute(
        "INSERT INTO migration_script("
        "import_batch_id, batch_label, script_name, content_hash, source_file, "
        "applied_at, created_at) VALUES(?,?,?,?,?,?,?)",
        (batch_id, args.batch, script_name, content_hash, src, now_iso(), now_iso()),
    )
    mig_id = mig_cur.lastrowid
    conn.commit()
    print(
        f"imported migration: batch_label={args.batch}, script={script_name}, "
        f"migration_script #{mig_id}, content_hash={content_hash[:12]}"
    )
    conn.close()
    return 0


def cmd_import_schema(args: argparse.Namespace) -> int:
    conn = connect(args.db)
    src = os.path.abspath(args.file)
    tables, content_hash = parse_schema_snapshot(src)
    existing = conn.execute(
        "SELECT id, content_hash, source_file FROM schema_snapshot WHERE snapshot_label=?",
        (args.label,),
    ).fetchone()
    if existing:
        if existing["content_hash"] == content_hash:
            conn.execute(
                "INSERT INTO import_batch(source_kind, source_file, content_hash, batch_label, "
                "imported_at, row_count, dedup_note) VALUES('schema',?,?,?,?,?,?)",
                (
                    src,
                    content_hash,
                    args.label,
                    now_iso(),
                    0,
                    f"reimport:existing_snapshot=#{existing['id']}",
                ),
            )
            conn.commit()
            print(
                f"IDEMPOTENT RE-IMPORT: schema snapshot label '{args.label}' already "
                f"exists with identical content (#{existing['id']}). No change."
            )
            conn.close()
            return 0
        print(
            f"ERROR: snapshot label '{args.label}' already exists with DIFFERENT content "
            f"(#{existing['id']}). Refusing to overwrite to avoid conflicting snapshots. "
            f"Use a new label.",
            file=sys.stderr,
        )
        conn.close()
        return 2
    batch_cur = conn.execute(
        "INSERT INTO import_batch(source_kind, source_file, content_hash, batch_label, "
        "imported_at, row_count, dedup_note) VALUES('schema',?,?,?,?,?,?)",
        (src, content_hash, args.label, now_iso(), len(tables), "new"),
    )
    batch_id = batch_cur.lastrowid
    snap_cur = conn.execute(
        "INSERT INTO schema_snapshot("
        "import_batch_id, snapshot_label, content_hash, source_file, tables_json, taken_at"
        ") VALUES(?,?,?,?,?,?)",
        (batch_id, args.label, content_hash, src, json.dumps(tables, ensure_ascii=False), now_iso()),
    )
    snap_id = snap_cur.lastrowid
    conn.commit()
    print(
        f"imported schema snapshot: label={args.label}, snapshot #{snap_id}, "
        f"tables={len(tables)} ({', '.join(sorted(tables))})"
    )
    conn.close()
    return 0


def cmd_diff_schema(args: argparse.Namespace) -> int:
    conn = connect(args.db)
    before = conn.execute(
        "SELECT id, tables_json FROM schema_snapshot WHERE snapshot_label=?",
        (args.before,),
    ).fetchone()
    after = conn.execute(
        "SELECT id, tables_json FROM schema_snapshot WHERE snapshot_label=?",
        (args.after,),
    ).fetchone()
    if not before:
        print(f"ERROR: before snapshot label '{args.before}' not found", file=sys.stderr)
        conn.close()
        return 2
    if not after:
        print(f"ERROR: after snapshot label '{args.after}' not found", file=sys.stderr)
        conn.close()
        return 2
    existing = conn.execute(
        "SELECT id FROM schema_diff WHERE before_snapshot_id=? AND after_snapshot_id=?",
        (before["id"], after["id"]),
    ).fetchone()
    if existing:
        print(
            f"IDEMPOTENT: schema diff {args.before}->{args.after} already computed "
            f"(diff #{existing['id']}). Reusing, no duplicate."
        )
        conn.close()
        return 0
    b_tables = json.loads(before["tables_json"])
    a_tables = json.loads(after["tables_json"])
    summary, changes = compute_schema_diff(b_tables, a_tables)
    cur = conn.execute(
        "INSERT INTO schema_diff(before_snapshot_id, after_snapshot_id, diff_summary, "
        "changes_json, created_at) VALUES(?,?,?,?,?)",
        (before["id"], after["id"], summary, json.dumps(changes, ensure_ascii=False), now_iso()),
    )
    conn.commit()
    print(f"schema diff {args.before} -> {args.after} (diff #{cur.lastrowid}):")
    print(f"  summary: {summary}")
    print("  changes:")
    print(json.dumps(changes, ensure_ascii=False, indent=2))
    conn.close()
    return 0


def cmd_record_backup(args: argparse.Namespace) -> int:
    conn = connect(args.db)
    existing = conn.execute(
        "SELECT id FROM backup_record WHERE backup_label=?", (args.label,)
    ).fetchone()
    if existing:
        print(
            f"IDEMPOTENT: backup label '{args.label}' already exists (#{existing['id']}). "
            f"No duplicate backup_record created."
        )
        conn.close()
        return 0
    cur = conn.execute(
        "INSERT INTO backup_record(related_batch_label, backup_label, source_remark, "
        "created_at) VALUES(?,?,?,?)",
        (args.batch, args.label, args.remark, now_iso()),
    )
    conn.commit()
    print(
        f"recorded backup: label={args.label}, batch={args.batch}, "
        f"backup_record #{cur.lastrowid}, remark={args.remark}"
    )
    conn.close()
    return 0


def cmd_review_conclude(args: argparse.Namespace) -> int:
    conn = connect(args.db)
    subject_key = args.subject
    if not subject_key:
        parts = []
        if args.kind == "lockwait":
            row = conn.execute(
                "SELECT query_fingerprint FROM slow_query WHERE id=?", (args.slowquery,)
            ).fetchone()
            if not row:
                print(f"ERROR: slow_query #{args.slowquery} not found", file=sys.stderr)
                conn.close()
                return 2
            parts = ["lockwait", row["query_fingerprint"]]
        elif args.kind == "migration":
            if not args.migration:
                print("ERROR: --migration required for kind=migration", file=sys.stderr)
                conn.close()
                return 2
            parts = ["migration", args.migration]
        elif args.kind == "slowquery":
            parts = ["slowquery", args.slowquery]
        else:
            print(f"ERROR: unknown kind '{args.kind}'", file=sys.stderr)
            conn.close()
            return 2
        subject_key = ":".join(str(p) for p in parts)
    existing = conn.execute(
        "SELECT * FROM review_conclusion WHERE subject_key=?", (subject_key,)
    ).fetchone()
    ts = now_iso()
    if existing is None:
        cur = conn.execute(
            "INSERT INTO review_conclusion(subject_key, subject_kind, conclusion_text, "
            "backup_record_id, slow_query_id, migration_script_id, source_remark, "
            "created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
            (
                subject_key,
                args.kind,
                args.text,
                args.backup,
                args.slowquery,
                args.migration,
                args.remark,
                ts,
                ts,
            ),
        )
        cid = cur.lastrowid
        conn.execute(
            "INSERT INTO conclusion_audit(conclusion_id, action, old_text, new_text, "
            "import_batch_id, at) VALUES(?,?,?,?,?,?)",
            (cid, "create", None, args.text, None, ts),
        )
        conn.commit()
        print(f"created conclusion #{cid} for subject={subject_key}")
        print(f"  linked: backup={args.backup}, slowquery={args.slowquery}, migration={args.migration}")
        conn.close()
        return 0
    if existing["conclusion_text"] == args.text:
        conn.execute(
            "INSERT INTO conclusion_audit(conclusion_id, action, old_text, new_text, "
            "import_batch_id, at) VALUES(?,?,?,?,?,?)",
            (existing["id"], "reaffirm", args.text, args.text, None, ts),
        )
        conn.execute(
            "UPDATE review_conclusion SET updated_at=? WHERE id=?", (ts, existing["id"])
        )
        conn.commit()
        print(
            f"IDEMPOTENT: conclusion #{existing['id']} for subject={subject_key} already "
            f"exists with identical text. Reaffirmed, NO second conclusion created."
        )
        conn.close()
        return 0
    if not args.force:
        print(
            f"REFUSED: subject={subject_key} already has conclusion #{existing['id']} "
            f"with DIFFERENT text. Not creating a competing conclusion.\n"
            f"  existing: {existing['conclusion_text']}\n"
            f"  proposed: {args.text}\n"
            f"  Use --force to revise (old text is retained in conclusion_audit).",
            file=sys.stderr,
        )
        conn.close()
        return 3
    conn.execute(
        "INSERT INTO conclusion_audit(conclusion_id, action, old_text, new_text, "
        "import_batch_id, at) VALUES(?,?,?,?,?,?)",
        (existing["id"], "update", existing["conclusion_text"], args.text, None, ts),
    )
    conn.execute(
        "UPDATE review_conclusion SET conclusion_text=?, backup_record_id=?, "
        "slow_query_id=?, migration_script_id=?, source_remark=?, updated_at=? WHERE id=?",
        (args.text, args.backup, args.slowquery, args.migration, args.remark, ts, existing["id"]),
    )
    conn.commit()
    print(
        f"REVISED conclusion #{existing['id']} for subject={subject_key} (old text kept in audit)."
    )
    conn.close()
    return 0


def cmd_review_rollback(args: argparse.Namespace) -> int:
    conn = connect(args.db)
    backups = conn.execute(
        "SELECT * FROM backup_record WHERE related_batch_label=? ORDER BY id",
        (args.batch,),
    ).fetchall()
    migs = conn.execute(
        "SELECT * FROM migration_script WHERE batch_label=? ORDER BY id", (args.batch,)
    ).fetchall()
    print(f"rollback review for migration batch '{args.batch}':")
    print(f"  migrations: {len(migs)}")
    print_rows(migs, ["id", "script_name", "content_hash", "applied_at"])
    print(f"  backups: {len(backups)}")
    print_rows(backups, ["id", "backup_label", "source_remark", "created_at"])
    print("  conclusion coverage (does each migration have a single explained conclusion?):")
    any_missing = False
    for m in migs:
        subj = f"migration:{args.batch}:{m['content_hash']}"
        concl = conn.execute(
            "SELECT id, conclusion_text, backup_record_id FROM review_conclusion "
            "WHERE subject_key=? OR migration_script_id=?",
            (subj, m["id"]),
        ).fetchone()
        if concl:
            linked_backup = concl["backup_record_id"]
            print(f"    migration #{m['id']} ({m['script_name']}): conclusion #{concl['id']} "
                  f"backup_link={linked_backup} -> {concl['conclusion_text']}")
        else:
            any_missing = True
            print(f"    migration #{m['id']} ({m['script_name']}): NO conclusion yet")
    if any_missing:
        print("  -> some migrations have no conclusion; explain before rollback.")
    else:
        print("  -> all migrations explained by exactly one conclusion each.")
    conn.close()
    return 0


def _print_slow_query_detail(r: sqlite3.Row) -> None:
    print(f"  slow_query #{r['id']}  source={r['source_file']}#L{r['source_line_start']}-L{r['source_line_end']}")
    print(f"    schema={r['schema_name']} table={r['table_name']} is_lock_wait={r['is_lock_wait']} "
          f"qt={r['query_time_sec']} lt={r['lock_time_sec']} rows_exam={r['rows_examined']}")
    print(f"    sql: {r['sql_text']}")
    if r["source_remark"]:
        print(f"    remark: {r['source_remark']}")
    print(f"    fingerprint: {r['query_fingerprint']}")


def cmd_trace(args: argparse.Namespace) -> int:
    conn = connect(args.db)
    if args.which == "conclusion":
        r = conn.execute("SELECT * FROM review_conclusion WHERE id=?", (args.id,)).fetchone()
        if not r:
            print(f"ERROR: conclusion #{args.id} not found", file=sys.stderr)
            conn.close()
            return 2
        print(f"conclusion #{r['id']}  subject={r['subject_key']}  kind={r['subject_kind']}")
        print(f"  text: {r['conclusion_text']}")
        print(f"  created={r['created_at']} updated={r['updated_at']}")
        if r["backup_record_id"]:
            b = conn.execute(
                "SELECT * FROM backup_record WHERE id=?", (r["backup_record_id"],)
            ).fetchone()
            print(f"  <- backup_record #{b['id']} label={b['backup_label']} "
                  f"batch={b['related_batch_label']} remark={b['source_remark']}")
        if r["slow_query_id"]:
            sq = conn.execute(
                "SELECT * FROM slow_query WHERE id=?", (r["slow_query_id"],)
            ).fetchone()
            if sq:
                _print_slow_query_detail(sq)
        if r["migration_script_id"]:
            m = conn.execute(
                "SELECT * FROM migration_script WHERE id=?", (r["migration_script_id"],)
            ).fetchone()
            print(f"  <- migration_script #{m['id']} {m['script_name']} batch={m['batch_label']}")
        audit = conn.execute(
            "SELECT * FROM conclusion_audit WHERE conclusion_id=? ORDER BY id", (r["id"],)
        ).fetchall()
        print(f"  audit trail ({len(audit)} entries):")
        for a in audit:
            print(f"    [{a['at']}] {a['action']}: {a['new_text']} "
                  f"(old={a['old_text']})")
    elif args.which == "slowquery":
        sq = conn.execute("SELECT * FROM slow_query WHERE id=?", (args.id,)).fetchone()
        if not sq:
            print(f"ERROR: slow_query #{args.id} not found", file=sys.stderr)
            conn.close()
            return 2
        _print_slow_query_detail(sq)
        siblings = conn.execute(
            "SELECT id, source_line_start, source_line_end, lock_time_sec, is_lock_wait "
            "FROM slow_query WHERE query_fingerprint=? ORDER BY source_line_start",
            (sq["query_fingerprint"],),
        ).fetchall()
        print(f"  same-fingerprint occurrences ({len(siblings)}):")
        print_rows(siblings, ["id", "source_line_start", "source_line_end", "lock_time_sec", "is_lock_wait"])
        concl = conn.execute(
            "SELECT id, conclusion_text FROM review_conclusion WHERE slow_query_id=? "
            "OR subject_key=?",
            (sq["id"], f"lockwait:{sq['query_fingerprint']}"),
        ).fetchone()
        if concl:
            print(f"  -> conclusion #{concl['id']}: {concl['conclusion_text']}")
        else:
            print("  -> no conclusion linked to this fingerprint yet")
    elif args.which == "fingerprint":
        rows = conn.execute(
            "SELECT id, source_file, source_line_start, source_line_end, lock_time_sec, "
            "is_lock_wait FROM slow_query WHERE query_fingerprint=? ORDER BY source_line_start",
            (args.fingerprint,),
        ).fetchall()
        print(f"fingerprint {args.fingerprint} occurrences ({len(rows)}):")
        print_rows(rows, ["id", "source_file", "source_line_start", "source_line_end", "lock_time_sec", "is_lock_wait"])
        concl = conn.execute(
            "SELECT id, conclusion_text FROM review_conclusion WHERE subject_key=?",
            (f"lockwait:{args.fingerprint}",),
        ).fetchone()
        if concl:
            print(f"  -> single conclusion #{concl['id']}: {concl['conclusion_text']}")
        else:
            print("  -> no conclusion yet")
    conn.close()
    return 0


def cmd_audit(args: argparse.Namespace) -> int:
    conn = connect(args.db)
    problems: list[str] = []
    notes: list[str] = []

    dup_subjects = conn.execute(
        "SELECT subject_key, COUNT(*) c FROM review_conclusion GROUP BY subject_key HAVING c>1"
    ).fetchall()
    if dup_subjects:
        problems.append(f"{len(dup_subjects)} subjects with >1 current conclusion (constraint violated)")
    else:
        notes.append("no subject has more than one current conclusion (UNIQUE enforced)")

    orphans = conn.execute(
        "SELECT id, subject_key FROM review_conclusion WHERE backup_record_id IS NULL "
        "AND slow_query_id IS NULL AND migration_script_id IS NULL"
    ).fetchall()
    if orphans:
        problems.append(f"{len(orphans)} orphan conclusions with no traceability link")
    else:
        notes.append("every conclusion links back to a backup/slow_query/migration")

    broken = conn.execute(
        "SELECT c.id FROM review_conclusion c LEFT JOIN backup_record b ON c.backup_record_id=b.id "
        "WHERE c.backup_record_id IS NOT NULL AND b.id IS NULL"
    ).fetchall()
    if broken:
        problems.append(f"{len(broken)} conclusions reference a missing backup_record")
    broken_sq = conn.execute(
        "SELECT c.id FROM review_conclusion c LEFT JOIN slow_query s ON c.slow_query_id=s.id "
        "WHERE c.slow_query_id IS NOT NULL AND s.id IS NULL"
    ).fetchall()
    if broken_sq:
        problems.append(f"{len(broken_sq)} conclusions reference a missing slow_query")

    reimports = conn.execute(
        "SELECT id, source_kind, dedup_note, imported_at FROM import_batch "
        "WHERE dedup_note LIKE 'reimport%' ORDER BY id"
    ).fetchall()
    notes.append(f"{len(reimports)} idempotent re-import attempt(s) logged")

    label_drift = conn.execute(
        "SELECT dedup_note FROM import_batch WHERE source_kind='migration' "
        "AND dedup_note LIKE 'reimport:existing_migration#%'"
    ).fetchall()
    drift_warn = [r for r in label_drift if "label=" in (r["dedup_note"] or "")]
    if drift_warn:
        problems.append(f"{len(drift_warn)} migration re-import(s) under a DIFFERENT batch label (investigate)")
    else:
        notes.append("no migration re-imported under a conflicting batch label")

    fp_rows = conn.execute(
        "SELECT query_fingerprint, COUNT(*) c, SUM(is_lock_wait) lw FROM slow_query "
        "GROUP BY query_fingerprint HAVING c>1 ORDER BY c DESC"
    ).fetchall()
    print("lock-wait fingerprint merge check (same pattern -> must be ONE conclusion):")
    if fp_rows:
        print_rows(fp_rows, ["query_fingerprint", "c", "lw"])
        for fr in fp_rows:
            subj = f"lockwait:{fr['query_fingerprint']}"
            n = conn.execute(
                "SELECT COUNT(*) c FROM review_conclusion WHERE subject_key=?", (subj,)
            ).fetchone()["c"]
            if n == 0:
                notes.append(f"fingerprint {fr['query_fingerprint'][:12]} has {fr['c']} occurrences, 0 conclusions (not yet reviewed)")
            elif n == 1:
                notes.append(f"fingerprint {fr['query_fingerprint'][:12]} has {fr['c']} occurrences -> exactly 1 conclusion (good)")
            else:
                problems.append(f"fingerprint {fr['query_fingerprint'][:12]} has {n} conclusions (should be 1)")
    else:
        notes.append("no fingerprint has >1 slow_query occurrence")

    revisions = conn.execute(
        "SELECT COUNT(*) c FROM conclusion_audit WHERE action='update'"
    ).fetchone()["c"]
    notes.append(f"{revisions} conclusion revision(s) recorded in audit history (old texts retained)")

    print("\n=== audit notes ===")
    for n in notes:
        print(f"  OK   {n}")
    if problems:
        print("\n=== audit problems ===")
        for p in problems:
            print(f"  FAIL {p}")
        print("\nAUDIT RESULT: FAIL (resolve before showing to audit team)")
        conn.close()
        return 1
    print("\nAUDIT RESULT: PASS (no duplicate/conflicting conclusions; traceability intact)")
    conn.close()
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    conn = connect(args.db)
    counts = {
        "import_batch": conn.execute("SELECT COUNT(*) c FROM import_batch").fetchone()["c"],
        "slow_query": conn.execute("SELECT COUNT(*) c FROM slow_query").fetchone()["c"],
        "slow_query(lock_wait)": conn.execute(
            "SELECT COUNT(*) c FROM slow_query WHERE is_lock_wait=1"
        ).fetchone()["c"],
        "migration_script": conn.execute("SELECT COUNT(*) c FROM migration_script").fetchone()["c"],
        "schema_snapshot": conn.execute("SELECT COUNT(*) c FROM schema_snapshot").fetchone()["c"],
        "schema_diff": conn.execute("SELECT COUNT(*) c FROM schema_diff").fetchone()["c"],
        "backup_record": conn.execute("SELECT COUNT(*) c FROM backup_record").fetchone()["c"],
        "review_conclusion": conn.execute("SELECT COUNT(*) c FROM review_conclusion").fetchone()["c"],
        "conclusion_audit": conn.execute("SELECT COUNT(*) c FROM conclusion_audit").fetchone()["c"],
    }
    print(f"inventory lock-wait review status  (db={os.path.abspath(args.db)})")
    for k, v in counts.items():
        print(f"  {v:>5}  {k}")
    print("\nlatest import batches:")
    rows = conn.execute(
        "SELECT id, source_kind, batch_label, row_count, dedup_note, imported_at "
        "FROM import_batch ORDER BY id DESC LIMIT 10"
    ).fetchall()
    print_rows(rows, ["id", "source_kind", "batch_label", "row_count", "dedup_note", "imported_at"])
    conn.close()
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="invlock",
        description="库存库锁等待复盘: ingest dirty slow-query logs, compare schema, "
        "review rollbacks, keep one conclusion per subject, trace back to source line.",
    )
    p.add_argument("--db", default=DEFAULT_DB, help=f"sqlite db path (default: {DEFAULT_DB})")
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("init", help="initialize the local review db")
    sp.set_defaults(func=cmd_init)

    sp = sub.add_parser("import", help="import slow log / migration / schema")
    ssub = sp.add_subparsers(dest="import_what", required=True)

    s = ssub.add_parser("slow-log", help="ingest a (dirty) MySQL slow query log")
    s.add_argument("file")
    s.add_argument("--batch-label", default=None)
    s.set_defaults(func=cmd_import_slow_log)

    s = ssub.add_parser("migration", help="ingest a migration script (idempotent by content hash)")
    s.add_argument("file")
    s.add_argument("--batch", required=True)
    s.set_defaults(func=cmd_import_migration)

    s = ssub.add_parser("schema", help="ingest a schema snapshot (CREATE TABLE dump)")
    s.add_argument("file")
    s.add_argument("--label", required=True)
    s.set_defaults(func=cmd_import_schema)

    sp = sub.add_parser("diff", help="compare two schema snapshots (daily entry point)")
    sp.add_argument("--before", required=True)
    sp.add_argument("--after", required=True)
    sp.set_defaults(func=cmd_diff_schema)

    sp = sub.add_parser("record", help="record a backup/rollback artifact")
    ssub = sp.add_subparsers(dest="record_what", required=True)
    s = ssub.add_parser("backup", help="register a backup taken before a migration batch")
    s.add_argument("--batch", required=True)
    s.add_argument("--label", required=True)
    s.add_argument("--remark", default=None)
    s.set_defaults(func=cmd_record_backup)

    sp = sub.add_parser("review", help="write / review conclusions and rollback records")
    ssub = sp.add_subparsers(dest="review_what", required=True)
    s = ssub.add_parser("conclude", help="write a conclusion for a subject (idempotent, never creates a 2nd)")
    s.add_argument("--kind", required=True, choices=["lockwait", "migration", "slowquery"])
    s.add_argument("--subject", default=None, help="explicit subject_key; else derived from kind+ids")
    s.add_argument("--text", required=True)
    s.add_argument("--backup", type=int, default=None)
    s.add_argument("--slowquery", type=int, default=None)
    s.add_argument("--migration", type=int, default=None)
    s.add_argument("--remark", default=None)
    s.add_argument("--force", action="store_true", help="revise an existing conflicting conclusion (old text kept in audit)")
    s.set_defaults(func=cmd_review_conclude)
    s = ssub.add_parser("rollback", help="list rollback/backups for a migration batch + conclusion coverage")
    s.add_argument("--batch", required=True)
    s.set_defaults(func=cmd_review_rollback)

    sp = sub.add_parser("trace", help="trace a conclusion/slowquery/fingerprint back to its source line")
    sp.add_argument("which", choices=["conclusion", "slowquery", "fingerprint"])
    sp.add_argument("--id", type=int, default=None)
    sp.add_argument("--fingerprint", default=None)
    sp.set_defaults(func=cmd_trace)

    sp = sub.add_parser("audit", help="self-check: no duplicate/conflicting conclusions, links intact")
    sp.set_defaults(func=cmd_audit)

    sp = sub.add_parser("status", help="show counts and recent imports")
    sp.set_defaults(func=cmd_status)
    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())

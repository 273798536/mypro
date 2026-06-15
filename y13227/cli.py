#!/usr/bin/env python3
import argparse
import json
import os
import sys
from typing import Optional

from encore_archive import (
    ArchiveStore,
    archive_submit,
    build_page_summary,
    STATUS_LABELS,
)

DEFAULT_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


def _read_file_or_text(path_or_text: str) -> str:
    if not path_or_text:
        return ""
    if os.path.exists(path_or_text):
        with open(path_or_text, "r", encoding="utf-8") as f:
            return f.read()
    return path_or_text


def cmd_submit(args: argparse.Namespace) -> int:
    store = ArchiveStore(args.data_dir)
    try:
        tracks_content = _read_file_or_text(args.tracks)
        rec, meta = archive_submit(
            store=store,
            record_id=args.record_id,
            filename=args.filename or "",
            tracks_content=tracks_content,
            supplementary_note=args.supplementary or "",
            verbal_note=args.verbal or "",
            rehearsal_note=args.rehearsal or "",
            manual_annotations=args.annotation or None,
            delivery_checklist=json.loads(args.delivery) if args.delivery else None,
        )
    except json.JSONDecodeError as e:
        out = {"ok": False, "error": f"delivery 参数 JSON 解析失败: {e}"}
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 2
    except Exception as e:
        out = {"ok": False, "error": f"归档失败: {type(e).__name__}: {e}"}
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 1
    if not meta.get("ok"):
        print(json.dumps(meta, ensure_ascii=False, indent=2))
        return 3
    output = {"ok": True, "record_id": args.record_id, **meta}
    if args.verbose and rec is not None:
        output["record"] = rec.to_dict()
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0


def cmd_summary(args: argparse.Namespace) -> int:
    store = ArchiveStore(args.data_dir)
    summary = build_page_summary(store, args.record_id)
    if not summary.get("ok"):
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 4
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    store = ArchiveStore(args.data_dir)
    ids = store.list_ids()
    items = []
    for rid in ids:
        rec = store.load(rid)
        if rec is None:
            continue
        items.append({
            "record_id": rid,
            "version": rec.version,
            "status": rec.status,
            "status_label": STATUS_LABELS.get(rec.status, rec.status),
            "filename": rec.filename,
            "track_count": len(rec.tracks),
            "updated_at": rec.updated_at,
        })
    print(json.dumps({"ok": True, "count": len(items), "items": items}, ensure_ascii=False, indent=2))
    return 0


def cmd_show(args: argparse.Namespace) -> int:
    store = ArchiveStore(args.data_dir)
    rec = store.load(args.record_id, args.version)
    if rec is None:
        print(json.dumps({"ok": False, "error": f"记录 {args.record_id} 不存在或版本号无效"}, ensure_ascii=False, indent=2))
        return 4
    print(json.dumps(rec.to_dict(), ensure_ascii=False, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="encore-archive",
        description="剧场返场曲清单归档工具",
    )
    p.add_argument("--data-dir", default=DEFAULT_DATA_DIR, help="数据存储目录")
    sub = p.add_subparsers(dest="command", required=True)

    ps = sub.add_parser("submit", help="提交一份归档（新记录或新版本）")
    ps.add_argument("--record-id", required=True, help="归档记录唯一ID")
    ps.add_argument("--filename", help="文件名（含曲目表的材料文件名）")
    ps.add_argument("--tracks", required=True, help="曲目表内容或曲目表文件路径")
    ps.add_argument("--supplementary", help="后补备注")
    ps.add_argument("--verbal", help="临时口头说明")
    ps.add_argument("--rehearsal", help="排练或授权备注（重扫时追加）")
    ps.add_argument("--annotation", action="append", help="人工批注（可多次指定）")
    ps.add_argument("--delivery", help='交付清单 JSON 数组字符串，例如 [{"item":"曲目表","ok":true}]')
    ps.add_argument("--verbose", action="store_true", help="输出完整记录详情")
    ps.set_defaults(func=cmd_submit)

    pl = sub.add_parser("list", help="列出所有归档记录")
    pl.set_defaults(func=cmd_list)

    pg = sub.add_parser("summary", help="导出页面摘要（页面状态与文件内状态一致）")
    pg.add_argument("--record-id", required=True)
    pg.add_argument("--output", help="将摘要写入指定 JSON 文件")
    pg.set_defaults(func=cmd_summary)

    psh = sub.add_parser("show", help="查看指定记录详情")
    psh.add_argument("--record-id", required=True)
    psh.add_argument("--version", type=int, default=None, help="指定版本号，默认最新版")
    psh.set_defaults(func=cmd_show)

    return p


def main(argv: Optional[list] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())

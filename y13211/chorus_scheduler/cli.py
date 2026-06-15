"""命令行接口。

参数名保持稳定，供日常脚本调用。
失败提示要具体、可操作，人类能照着处理。

稳定参数列表：
  --audio-folder       音频文件夹路径
  --work-dir           工作目录（存放状态文件）
  --half-beat-seconds  半拍秒数阈值
  --note-content       后补备注内容
  --note-author        备注作者
  --note-target-type   备注目标类型
  --note-target-id     备注目标 ID
  --output-format      输出格式 text/json
  --only-unresolved    只显示未解决的冲突
  --only-latest        只显示最新版本文件
"""

import argparse
import sys
import json
import os
from typing import List, Dict, Any

from .models import AudioFile, Conflict, Note
from .state_manager import StateManager


def build_parser() -> argparse.ArgumentParser:
    """构建命令行参数解析器。

    参数名保持稳定，修改需谨慎。
    """
    parser = argparse.ArgumentParser(
        prog="chorus-scheduler",
        description="合唱声部排期冲突检测工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
常用示例：
  # 扫描音频文件夹，检测排期冲突
  chorus-scheduler scan --audio-folder ./audio

  # 添加一条后补备注
  chorus-scheduler add-note --note-content "6月15日排练后改了男低进入时间" --note-author 林姐

  # 查看当前状态
  chorus-scheduler status

  # 以 JSON 格式输出（供脚本调用）
  chorus-scheduler status --output-format json
""",
    )

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    scan_parser = subparsers.add_parser("scan", help="扫描音频文件夹并检测冲突")
    scan_parser.add_argument(
        "--audio-folder",
        required=True,
        help="音频文件夹路径（必填）",
    )
    scan_parser.add_argument(
        "--work-dir",
        default=None,
        help="工作目录，默认与音频文件夹相同",
    )
    scan_parser.add_argument(
        "--half-beat-seconds",
        type=float,
        default=0.3,
        help="半拍对应的秒数，默认 0.3 秒",
    )
    scan_parser.add_argument(
        "--output-format",
        choices=["text", "json"],
        default="text",
        help="输出格式，默认 text",
    )

    note_parser = subparsers.add_parser("add-note", help="添加一条后补备注")
    note_parser.add_argument(
        "--note-content",
        required=True,
        help="备注内容（必填）",
    )
    note_parser.add_argument(
        "--note-author",
        default="anonymous",
        help="备注作者，默认 anonymous",
    )
    note_parser.add_argument(
        "--note-target-type",
        choices=["global", "audio_file", "conflict"],
        default="global",
        help="备注目标类型，默认 global",
    )
    note_parser.add_argument(
        "--note-target-id",
        default="global",
        help="备注目标 ID，默认 global",
    )
    note_parser.add_argument(
        "--work-dir",
        default=".",
        help="工作目录，默认当前目录",
    )
    note_parser.add_argument(
        "--output-format",
        choices=["text", "json"],
        default="text",
        help="输出格式，默认 text",
    )

    status_parser = subparsers.add_parser("status", help="查看当前状态")
    status_parser.add_argument(
        "--work-dir",
        default=".",
        help="工作目录，默认当前目录",
    )
    status_parser.add_argument(
        "--output-format",
        choices=["text", "json"],
        default="text",
        help="输出格式，默认 text",
    )
    status_parser.add_argument(
        "--only-unresolved",
        action="store_true",
        help="只显示未解决的冲突",
    )
    status_parser.add_argument(
        "--only-latest",
        action="store_true",
        help="只显示最新版本的音频文件",
    )

    list_parser = subparsers.add_parser("list-notes", help="列出所有备注")
    list_parser.add_argument(
        "--work-dir",
        default=".",
        help="工作目录，默认当前目录",
    )
    list_parser.add_argument(
        "--note-type",
        choices=["supplementary", "manual_annotation", "delivery", "system"],
        default=None,
        help="按备注类型筛选",
    )
    list_parser.add_argument(
        "--output-format",
        choices=["text", "json"],
        default="text",
        help="输出格式，默认 text",
    )

    resolve_parser = subparsers.add_parser("resolve", help="标记冲突为已解决")
    resolve_parser.add_argument(
        "--conflict-id",
        required=True,
        help="冲突 ID（必填）",
    )
    resolve_parser.add_argument(
        "--work-dir",
        default=".",
        help="工作目录，默认当前目录",
    )
    resolve_parser.add_argument(
        "--output-format",
        choices=["text", "json"],
        default="text",
        help="输出格式，默认 text",
    )

    manifest_parser = subparsers.add_parser("manifest", help="查看交付清单")
    manifest_parser.add_argument(
        "--work-dir",
        default=".",
        help="工作目录，默认当前目录",
    )
    manifest_parser.add_argument(
        "--manifest-id",
        default=None,
        help="指定清单 ID，默认看最新的",
    )
    manifest_parser.add_argument(
        "--output-format",
        choices=["text", "json"],
        default="text",
        help="输出格式，默认 text",
    )

    diff_parser = subparsers.add_parser("diff", help="比较两份交付清单")
    diff_parser.add_argument(
        "--manifest-id-1",
        required=True,
        help="第一份清单 ID（必填）",
    )
    diff_parser.add_argument(
        "--manifest-id-2",
        required=True,
        help="第二份清单 ID（必填）",
    )
    diff_parser.add_argument(
        "--work-dir",
        default=".",
        help="工作目录，默认当前目录",
    )
    diff_parser.add_argument(
        "--output-format",
        choices=["text", "json"],
        default="text",
        help="输出格式，默认 text",
    )

    return parser


def _format_severity(severity: str) -> str:
    labels = {
        "error": "严重",
        "warning": "警告",
        "info": "提示",
    }
    return labels.get(severity, severity)


def _format_conflict_type(ctype: str) -> str:
    labels = {
        "time_overlap": "时间重叠",
        "version_ambiguous": "版本歧义",
        "half_beat_drift": "半拍偏移",
        "part_mismatch": "声部/时码缺失",
    }
    return labels.get(ctype, ctype)


def format_scan_result(result: Dict[str, Any]) -> str:
    """格式化扫描结果为人类可读文本。"""
    lines = []
    lines.append("=" * 60)
    lines.append("合唱声部排期冲突 · 扫描结果")
    lines.append("=" * 60)
    lines.append(f"扫描时间  : {result['scan_time']}")
    lines.append(f"音频文件夹: {result['audio_folder']}")
    lines.append("")
    lines.append(f"音频文件总数: {result['total_files']}")
    lines.append(f"  新增: {result['files_added']}  "
                 f"更新: {result['files_updated']}  "
                 f"无变化: {result['files_unchanged']}")
    lines.append(f"其中已标记最新版本: {result['latest_count']}")
    lines.append("")
    lines.append(f"冲突总数: {result['total_conflicts']} "
                 f"（未解决: {result['unresolved_conflicts']}）")
    sev = result.get("conflicts_by_severity", {})
    lines.append(f"  严重: {sev.get('error', 0)}  "
                 f"警告: {sev.get('warning', 0)}  "
                 f"提示: {sev.get('info', 0)}")
    lines.append("")
    lines.append(f"交付清单 ID: {result['manifest_id']}")
    lines.append("=" * 60)
    return "\n".join(lines)


def format_conflicts(conflicts: List[Conflict], audio_files: List[AudioFile]) -> str:
    """格式化冲突列表为人类可读文本。"""
    if not conflicts:
        return "（暂无冲突）"

    file_map = {f.file_id: f for f in audio_files}
    lines = []

    for i, c in enumerate(conflicts, 1):
        status = "✗ 未解决" if not c.resolved else "✓ 已解决"
        lines.append(f"[{i}] {_format_severity(c.severity)} · "
                     f"{_format_conflict_type(c.conflict_type)} · {status}")
        lines.append(f"    ID: {c.conflict_id}")
        lines.append(f"    问题: {c.message}")
        lines.append(f"    下一步: {c.next_step}")

        involved_names = []
        for fid in c.involved_file_ids:
            f = file_map.get(fid)
            if f:
                involved_names.append(f.file_name)
            else:
                involved_names.append(fid)
        if involved_names:
            lines.append(f"    涉及文件: {', '.join(involved_names)}")

        if c.drift_seconds is not None:
            lines.append(f"    时码偏移: {c.drift_seconds*1000:.0f} 毫秒")
        if c.time_range:
            lines.append(f"    时间范围: {c.time_range[0]:.1f}s ~ {c.time_range[1]:.1f}s")

        lines.append("")

    return "\n".join(lines)


def format_audio_files(files: List[AudioFile]) -> str:
    """格式化音频文件列表。"""
    if not files:
        return "（无音频文件）"

    lines = []
    for i, f in enumerate(files, 1):
        latest_tag = " [最新]" if f.is_latest else ""
        part = f.part_name or "（声部未知）"
        ver = f.version_tag or "（无版本标签）"
        time_str = f"{f.start_time_seconds:.1f}s" if f.start_time_seconds is not None else "（无时码）"
        lines.append(
            f"[{i}] {f.file_name}{latest_tag}\n"
            f"    声部: {part}  版本: {ver}  开始: {time_str}"
        )
    return "\n".join(lines)


def format_status_summary(summary: Dict[str, Any]) -> str:
    """格式化状态摘要。"""
    lines = []
    lines.append("=" * 60)
    lines.append("合唱声部排期冲突 · 当前状态")
    lines.append("=" * 60)
    lines.append(f"音频文件夹  : {summary.get('audio_folder', '（未设置）')}")
    lines.append(f"上次扫描时间: {summary.get('last_scan_at', '（从未扫描）')}")
    lines.append(f"累计扫描次数: {summary.get('scan_count', 0)}")
    lines.append("")

    af = summary.get("audio_files", {})
    lines.append(f"音频文件: {af.get('total', 0)} 个")
    lines.append(f"  最新版本: {af.get('latest', 0)}  "
                 f"有声部: {af.get('with_part', 0)}  "
                 f"有时码: {af.get('with_time', 0)}")
    lines.append("")

    cf = summary.get("conflicts", {})
    lines.append(f"冲  突: {cf.get('total', 0)} 个（未解决 {cf.get('unresolved', 0)}）")
    by_type = cf.get("by_type", {})
    if by_type:
        type_parts = []
        for t, n in by_type.items():
            type_parts.append(f"{_format_conflict_type(t)}: {n}")
        lines.append(f"  按类型: {', '.join(type_parts)}")
    lines.append("")

    nt = summary.get("notes", {})
    lines.append(f"备  注: {nt.get('total', 0)} 条")
    by_ntype = nt.get("by_type", {})
    if by_ntype:
        type_labels = {
            "supplementary": "后补备注",
            "manual_annotation": "人工批注",
            "delivery": "交付备注",
            "system": "系统备注",
        }
        nparts = []
        for t, n in by_ntype.items():
            nparts.append(f"{type_labels.get(t, t)}: {n}")
        lines.append(f"  按类型: {', '.join(nparts)}")
    lines.append("")

    mf = summary.get("manifests", {})
    lines.append(f"交付清单: {mf.get('total', 0)} 份")
    if mf.get("latest_id"):
        lines.append(f"  最新 ID: {mf['latest_id']}")

    lines.append("=" * 60)
    return "\n".join(lines)


def format_notes(notes: List[Note]) -> str:
    """格式化备注列表。"""
    if not notes:
        return "（无备注）"

    type_labels = {
        "supplementary": "后补备注",
        "manual_annotation": "人工批注",
        "delivery": "交付备注",
        "system": "系统备注",
    }

    lines = []
    for i, n in enumerate(notes, 1):
        ntype = type_labels.get(n.note_type, n.note_type)
        lines.append(f"[{i}] {ntype} · {n.author} · {n.created_at}")
        lines.append(f"    目标: {n.target_type}/{n.target_id}")
        lines.append(f"    内容: {n.content}")
        lines.append("")

    return "\n".join(lines)


def format_manifest(manifest) -> str:
    """格式化交付清单。"""
    lines = []
    lines.append("=" * 60)
    lines.append("交付清单")
    lines.append("=" * 60)
    lines.append(f"清单 ID   : {manifest.manifest_id}")
    lines.append(f"生成时间  : {manifest.generated_at}")
    lines.append(f"音频文件数: {manifest.audio_file_count}")
    lines.append(f"最新版本数: {manifest.latest_file_count}")
    lines.append(f"冲突总数  : {manifest.conflict_count}（未解决 {manifest.unresolved_conflict_count}）")
    lines.append(f"备注数量  : {manifest.note_count}")
    lines.append("")
    lines.append(f"包含音频文件 ID:")
    for fid in manifest.audio_file_ids:
        lines.append(f"  - {fid}")
    lines.append("")
    lines.append(f"包含冲突 ID:")
    for cid in manifest.conflict_ids:
        lines.append(f"  - {cid}")
    lines.append("")
    lines.append(f"包含备注 ID:")
    for nid in manifest.note_ids:
        lines.append(f"  - {nid}")
    lines.append("=" * 60)
    return "\n".join(lines)


def format_diff(diff: Dict[str, Any]) -> str:
    """格式化交付清单差异。"""
    lines = []
    lines.append("=" * 60)
    lines.append("交付清单对比")
    lines.append("=" * 60)
    lines.append(f"清单 1: {diff['manifest_1']}")
    lines.append(f"清单 2: {diff['manifest_2']}")
    lines.append("")

    f = diff["files"]
    lines.append(f"音频文件:")
    lines.append(f"  新增: {len(f['added'])} 个")
    for fid in f["added"]:
        lines.append(f"    + {fid}")
    lines.append(f"  移除: {len(f['removed'])} 个")
    for fid in f["removed"]:
        lines.append(f"    - {fid}")
    lines.append(f"  共有: {len(f['common'])} 个")
    lines.append("")

    c = diff["conflicts"]
    lines.append(f"冲突:")
    lines.append(f"  新增: {len(c['added'])} 个")
    for cid in c["added"]:
        lines.append(f"    + {cid}")
    lines.append(f"  移除: {len(c['removed'])} 个")
    for cid in c["removed"]:
        lines.append(f"    - {cid}")
    lines.append("")

    n = diff["notes"]
    lines.append(f"备注:")
    lines.append(f"  新增: {len(n['added'])} 条")
    for nid in n["added"]:
        lines.append(f"    + {nid}")
    lines.append(f"  移除: {len(n['removed'])} 条")
    for nid in n["removed"]:
        lines.append(f"    - {nid}")
    lines.append(f"  共有: {len(n['common'])} 条")
    lines.append("=" * 60)
    return "\n".join(lines)


def main(argv=None) -> int:
    """主入口。

    Args:
        argv: 命令行参数列表，默认使用 sys.argv

    Returns:
        退出码，0 成功，非 0 失败
    """
    parser = build_parser()
    args = parser.parse_args(argv)

    if not args.command:
        parser.print_help()
        return 0

    try:
        if args.command == "scan":
            return cmd_scan(args)
        elif args.command == "add-note":
            return cmd_add_note(args)
        elif args.command == "status":
            return cmd_status(args)
        elif args.command == "list-notes":
            return cmd_list_notes(args)
        elif args.command == "resolve":
            return cmd_resolve(args)
        elif args.command == "manifest":
            return cmd_manifest(args)
        elif args.command == "diff":
            return cmd_diff(args)
        else:
            parser.print_help()
            return 1
    except FileNotFoundError as e:
        print(f"[错误] 文件或文件夹不存在: {e}", file=sys.stderr)
        print("请检查路径是否正确，或使用 --audio-folder 指定正确位置。", file=sys.stderr)
        return 2
    except ValueError as e:
        print(f"[错误] 参数无效: {e}", file=sys.stderr)
        print("请检查参数是否正确，使用 --help 查看帮助。", file=sys.stderr)
        return 3
    except Exception as e:
        print(f"[错误] 运行出错: {e}", file=sys.stderr)
        print("如问题持续，请检查状态文件是否损坏，或联系技术支持。", file=sys.stderr)
        return 99


def cmd_scan(args) -> int:
    """执行扫描命令。"""
    work_dir = args.work_dir if args.work_dir else args.audio_folder
    work_dir = os.path.abspath(work_dir)

    mgr = StateManager(work_dir=work_dir)
    mgr.load()
    mgr.conflict_detector.half_beat_seconds = args.half_beat_seconds

    result = mgr.scan(args.audio_folder)

    if args.output_format == "json":
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(format_scan_result(result))
        print()
        conflicts = mgr.get_conflicts(only_unresolved=False)
        audio_files = mgr.get_audio_files()
        print("冲突详情:")
        print(format_conflicts(conflicts, audio_files))

    return 0


def cmd_add_note(args) -> int:
    """执行添加备注命令。"""
    work_dir = os.path.abspath(args.work_dir)

    mgr = StateManager(work_dir=work_dir)
    loaded = mgr.load()

    if not loaded and args.note_target_type != "global":
        print("[错误] 还没有扫描记录，不能对音频或冲突加备注。", file=sys.stderr)
        print("请先运行 scan 命令扫描音频文件夹。", file=sys.stderr)
        return 2

    note = mgr.add_supplementary_note(
        content=args.note_content,
        author=args.note_author,
        target_type=args.note_target_type,
        target_id=args.note_target_id,
    )

    if args.output_format == "json":
        print(json.dumps(note.to_dict(), ensure_ascii=False, indent=2))
    else:
        print(f"已添加后补备注（ID: {note.note_id}）")
        print(f"  作者  : {note.author}")
        print(f"  时间  : {note.created_at}")
        print(f"  目标  : {note.target_type} / {note.target_id}")
        print(f"  内容  : {note.content}")

    return 0


def cmd_status(args) -> int:
    """执行状态查看命令。"""
    work_dir = os.path.abspath(args.work_dir)

    mgr = StateManager(work_dir=work_dir)
    loaded = mgr.load()

    if not loaded:
        print("[提示] 还没有扫描记录，状态为空。")
        print("请先运行 scan 命令扫描音频文件夹。")
        return 0

    summary = mgr.get_status_summary()

    if args.output_format == "json":
        output = {
            "summary": summary,
            "audio_files": [f.to_dict() for f in mgr.get_audio_files(only_latest=args.only_latest)],
            "conflicts": [c.to_dict() for c in mgr.get_conflicts(only_unresolved=args.only_unresolved)],
            "notes": [n.to_dict() for n in mgr.list_notes()],
        }
        print(json.dumps(output, ensure_ascii=False, indent=2))
    else:
        print(format_status_summary(summary))
        print()

        files = mgr.get_audio_files(only_latest=args.only_latest)
        print("音频文件:")
        print(format_audio_files(files))
        print()

        conflicts = mgr.get_conflicts(only_unresolved=args.only_unresolved)
        print("冲突列表:")
        print(format_conflicts(conflicts, files))

    return 0


def cmd_list_notes(args) -> int:
    """执行列出备注命令。"""
    work_dir = os.path.abspath(args.work_dir)

    mgr = StateManager(work_dir=work_dir)
    loaded = mgr.load()

    if not loaded:
        print("（无备注）")
        return 0

    notes = mgr.list_notes(note_type=args.note_type)

    if args.output_format == "json":
        print(json.dumps([n.to_dict() for n in notes], ensure_ascii=False, indent=2))
    else:
        print(f"共 {len(notes)} 条备注:")
        print()
        print(format_notes(notes))

    return 0


def cmd_resolve(args) -> int:
    """执行标记冲突已解决命令。"""
    work_dir = os.path.abspath(args.work_dir)

    mgr = StateManager(work_dir=work_dir)
    loaded = mgr.load()

    if not loaded:
        print("[错误] 还没有扫描记录。", file=sys.stderr)
        return 2

    conflict = mgr.resolve_conflict(args.conflict_id)

    if not conflict:
        print(f"[错误] 找不到冲突 ID: {args.conflict_id}", file=sys.stderr)
        print("请用 status 或 list-notes 查看有效 ID。", file=sys.stderr)
        return 3

    if args.output_format == "json":
        print(json.dumps(conflict.to_dict(), ensure_ascii=False, indent=2))
    else:
        print(f"冲突已标记为已解决: {conflict.conflict_id}")
        print(f"  类型: {_format_conflict_type(conflict.conflict_type)}")
        print(f"  问题: {conflict.message}")

    return 0


def cmd_manifest(args) -> int:
    """执行交付清单命令。"""
    work_dir = os.path.abspath(args.work_dir)

    mgr = StateManager(work_dir=work_dir)
    loaded = mgr.load()

    if not loaded:
        print("[错误] 还没有扫描记录。", file=sys.stderr)
        return 2

    if args.manifest_id:
        manifest = mgr.state.manifests.get(args.manifest_id)
        if not manifest:
            print(f"[错误] 找不到交付清单 ID: {args.manifest_id}", file=sys.stderr)
            return 3
    else:
        manifest = mgr.get_latest_manifest()
        if not manifest:
            print("[错误] 暂无交付清单。", file=sys.stderr)
            return 3

    if args.output_format == "json":
        print(json.dumps(manifest.to_dict(), ensure_ascii=False, indent=2))
    else:
        print(format_manifest(manifest))

    return 0


def cmd_diff(args) -> int:
    """执行交付清单对比命令。"""
    work_dir = os.path.abspath(args.work_dir)

    mgr = StateManager(work_dir=work_dir)
    loaded = mgr.load()

    if not loaded:
        print("[错误] 还没有扫描记录。", file=sys.stderr)
        return 2

    diff = mgr.compare_manifests(args.manifest_id_1, args.manifest_id_2)

    if args.output_format == "json":
        print(json.dumps(diff, ensure_ascii=False, indent=2))
    else:
        print(format_diff(diff))

    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
import sys
import os
import argparse
import webbrowser
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ab_snapshot import (
    build_snapshot_from_dir, save_snapshot, load_snapshot,
    list_saved_snapshots, list_materials, list_reports, get_report_path,
    run_full_compare, run_caliber_and_late_analysis,
    build_review_report, render_html_report
)
from ab_snapshot.storage import _ensure_dirs


WORKSPACE_HELP = "工作目录，默认 ./snapshot_workspace"


def _make_snapshot_id(old_ver: str, new_ver: str) -> str:
    return f"{old_ver}__vs__{new_ver}"


def cmd_start(args) -> int:
    paths = _ensure_dirs(args.workspace)
    old_ver = args.old_version
    new_ver = args.new_version

    old_mats = list_materials(args.workspace, old_ver)
    new_mats = list_materials(args.workspace, new_ver)
    print(f"[INFO] 版本 {old_ver} 检测到 {len(old_mats)} 份材料: {[m['name'] for m in old_mats]}")
    print(f"[INFO] 版本 {new_ver} 检测到 {len(new_mats)} 份材料: {[m['name'] for m in new_mats]}")

    if not old_mats or not new_mats:
        print("[ERROR] 缺少材料。请把 训练日志/正常记录/口头说明 分别以 "
              f"`{old_ver}_xxx.txt` 和 `{new_ver}_xxx.txt` 命名放入 {paths['raw']}")
        return 2

    print("[STEP 1/4] 构建前版与当前版快照...")
    old_snap = build_snapshot_from_dir(args.workspace, old_ver)
    new_snap = build_snapshot_from_dir(args.workspace, new_ver)
    save_snapshot(args.workspace, old_snap)
    save_snapshot(args.workspace, new_snap)
    print(f"  · 前版样本数={len(old_snap.samples)}, 指标数={len(old_snap.metrics)}")
    print(f"  · 当前版样本数={len(new_snap.samples)}, 指标数={len(new_snap.metrics)}")

    print("[STEP 2/4] 对比样本/阈值/指标/人工修正...")
    result = run_full_compare(old_snap, new_snap)

    print("[STEP 3/4] 复核口径变更 & 特征迟到识别...")
    run_caliber_and_late_analysis(old_snap, new_snap, result)
    print(f"  · 检出口径变更线索: {len(result.caliber_changes)} 条")
    print(f"  · 前版特征迟到记录: {len(result.late_feature_records_old)} 条")
    print(f"  · 当前版特征迟到记录: {len(result.late_feature_records_new)} 条")

    print("[STEP 4/4] 生成复核人截图说明 (HTML)...")
    snap_id = _make_snapshot_id(old_ver, new_ver)
    report = build_review_report(old_snap, new_snap, result, snap_id)
    html_path = render_html_report(report, old_snap, new_snap, result, paths["report"])
    print(f"\n[DONE] 总体状态: {result.overall_status}")
    print(f"  · 快照ID: {snap_id}")
    print(f"  · HTML截图说明: file://{os.path.abspath(html_path)}")

    if args.open_browser:
        try:
            webbrowser.open("file://" + os.path.abspath(html_path))
        except Exception as e:
            print(f"[WARN] 自动打开浏览器失败: {e}")
    return 0


def cmd_rerun(args) -> int:
    paths = _ensure_dirs(args.workspace)
    old_ver = args.old_version
    new_ver = args.new_version

    old_snap = load_snapshot(args.workspace, old_ver)
    new_snap = load_snapshot(args.workspace, new_ver)
    if old_snap is None or new_snap is None:
        print(f"[ERROR] 找不到已保存的快照 {old_ver}/{new_ver}，请先使用 start 命令")
        return 2

    if args.rebuild:
        print("[INFO] --rebuild 模式：重新从原始材料构建快照...")
        old_snap = build_snapshot_from_dir(args.workspace, old_ver)
        new_snap = build_snapshot_from_dir(args.workspace, new_ver)
        save_snapshot(args.workspace, old_snap)
        save_snapshot(args.workspace, new_snap)

    result = run_full_compare(old_snap, new_snap)
    run_caliber_and_late_analysis(old_snap, new_snap, result)
    snap_id = _make_snapshot_id(old_ver, new_ver)
    report = build_review_report(old_snap, new_snap, result, snap_id)
    html_path = render_html_report(report, old_snap, new_snap, result, paths["report"])
    print(f"[DONE] 重跑完成，总体状态: {result.overall_status}")
    print(f"  · HTML截图说明: file://{os.path.abspath(html_path)}")
    if args.open_browser:
        webbrowser.open("file://" + os.path.abspath(html_path))
    return 0


def cmd_view(args) -> int:
    paths = _ensure_dirs(args.workspace)
    if args.list_all:
        snaps = list_saved_snapshots(args.workspace)
        reps = list_reports(args.workspace)
        print(f"[已保存快照版本] (共 {len(snaps)} 个):")
        for v in snaps:
            print(f"  · {v}")
        print(f"[已生成复核报告] (共 {len(reps)} 个):")
        for r in reps:
            print(f"  · {r}")
        return 0

    if args.snapshot_id:
        sid = args.snapshot_id
    elif args.old_version and args.new_version:
        sid = _make_snapshot_id(args.old_version, args.new_version)
    else:
        print("[ERROR] 请指定 --snapshot-id 或同时提供 --old/--new")
        return 2

    html = get_report_path(args.workspace, sid)
    if html is None:
        print(f"[ERROR] 找不到报告 {sid}，请先运行 start 命令生成")
        return 2
    url = "file://" + os.path.abspath(html)
    print(f"[INFO] 截图说明: {url}")
    if not args.no_browser:
        webbrowser.open(url)
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="ab_snapshot",
        description="AB实验版本快照 - 让离线/线上口径差异别再藏在训练日志里"
    )
    sp = p.add_subparsers(dest="command", required=True)

    s_start = sp.add_parser("start", help="启动一次完整快照对比（从原始材料→报告）")
    s_start.add_argument("--old", dest="old_version", required=True, help="前一版版本号")
    s_start.add_argument("--new", dest="new_version", required=True, help="当前版版本号")
    s_start.add_argument("--workspace", default="./snapshot_workspace", help=WORKSPACE_HELP)
    s_start.add_argument("--open", dest="open_browser", action="store_true", help="生成后自动打开浏览器")

    s_rerun = sp.add_parser("rerun", help="基于已保存的快照重跑对比和报告生成")
    s_rerun.add_argument("--old", dest="old_version", required=True)
    s_rerun.add_argument("--new", dest="new_version", required=True)
    s_rerun.add_argument("--workspace", default="./snapshot_workspace", help=WORKSPACE_HELP)
    s_rerun.add_argument("--rebuild", action="store_true", help="重新从原始材料构建快照再重跑")
    s_rerun.add_argument("--open", dest="open_browser", action="store_true")

    s_view = sp.add_parser("view", help="查看已生成的截图说明或列出所有快照")
    s_view.add_argument("--snapshot-id", dest="snapshot_id", default=None, help="快照ID (格式: old__vs__new)")
    s_view.add_argument("--old", dest="old_version", default=None)
    s_view.add_argument("--new", dest="new_version", default=None)
    s_view.add_argument("--list", dest="list_all", action="store_true", help="列出所有快照和报告")
    s_view.add_argument("--workspace", default="./snapshot_workspace", help=WORKSPACE_HELP)
    s_view.add_argument("--no-browser", action="store_true", help="只打印路径不打开浏览器")
    return p


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "start":
        return cmd_start(args)
    elif args.command == "rerun":
        return cmd_rerun(args)
    elif args.command == "view":
        return cmd_view(args)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())

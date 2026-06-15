"""播客片头版本复核 —— CLI 主入口"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

from .parser import parse_tracklist, parse_delivery_list
from .engine import VersionReviewEngine, infer_expected_versions
from .storage import (
    new_session,
    load_latest_session,
    save_session,
    align_with_previous_session,
    apply_external_annotations,
    finalize_session,
    state_dir_for,
)
from .report import print_full_report, maybe_raise
from .exceptions import PodcastReviewError, OldMasterDetected, UnresolvedIssuesRemain


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="podcast_intro_review",
        description="播客片头版本复核 —— 识别旧版母带、统计授权备注、对齐交付清单",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
材料入口（按顺序）：
  1. 曲目表 CSV           位置参数  <tracklist.csv>
  2. 交付清单 CSV         --delivery delivery.csv
  3. 人工批注 JSON        --annotation annotations.json
  4. 上次会话状态         自动从 .podcast_review_state/ 加载对齐

异常出口（退出码）：
  0  全部完成，无挂起/待处理/坏行
  1  仍有待补证据或坏行（UnresolvedIssuesRemain）
  2  检测到旧版母带挂起，等人工确认（OldMasterDetected）
  3  参数/文件错误
""",
    )
    p.add_argument("tracklist", help="曲目表 CSV 文件路径")
    p.add_argument("--delivery", "-d", default=None, help="交付清单 CSV 文件路径")
    p.add_argument("--annotation", "-a", default=None, help="人工批注 JSON 文件路径")
    p.add_argument("--no-resume", action="store_true", help="不加载上次会话状态，从零开始")
    p.add_argument("--no-strict", action="store_true", help="宽松模式：即使有未解决项也退出码 0")
    p.add_argument("--verbose", "-v", action="store_true", help="详细输出（含原始行和证据链）")
    p.add_argument("--json", "-j", action="store_true", help="仅输出完整 JSON 报告到 stdout")
    p.add_argument("--output", "-o", default=None, help="额外将完整 JSON 报告写入此文件")
    return p


def run(argv: Optional[list[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    tracklist_path = Path(args.tracklist)
    if not tracklist_path.exists():
        print(f"[错误] 曲目表不存在：{tracklist_path}", file=sys.stderr)
        return 3
    if tracklist_path.suffix.lower() not in (".csv", ".txt"):
        print(f"[警告] 输入不是 .csv，按 CSV 尝试解析：{tracklist_path}", file=sys.stderr)

    try:
        fresh_tracks = parse_tracklist(str(tracklist_path))
    except Exception as exc:
        print(f"[错误] 解析曲目表失败：{exc}", file=sys.stderr)
        return 3

    # 交付清单
    delivery_refs = set()
    if args.delivery:
        if not Path(args.delivery).exists():
            print(f"[警告] 交付清单不存在，跳过匹配：{args.delivery}", file=sys.stderr)
        else:
            try:
                delivery_refs = parse_delivery_list(args.delivery)
            except Exception as exc:
                print(f"[警告] 交付清单解析失败：{exc}", file=sys.stderr)

    # 创建/加载会话
    session = new_session(
        tracklist_path=str(tracklist_path),
        delivery_list_path=args.delivery,
        annotation_path=args.annotation,
    )

    # 对齐上次状态（重扫场景）
    prev = None
    if not args.no_resume:
        prev = load_latest_session(str(tracklist_path))
        if prev:
            align_with_previous_session(fresh_tracks, prev)
            session.annotation_path = session.annotation_path or prev.annotation_path
            session.delivery_list_path = session.delivery_list_path or prev.delivery_list_path

    # 应用外部批注文件
    applied = apply_external_annotations(fresh_tracks, args.annotation)
    if applied:
        print(f"[信息] 应用人工批注 {applied} 条", file=sys.stderr)

    session.tracks = fresh_tracks

    # 推断期望版本（以同名最大版本为期望）—— 用于旧版母带冲突判定
    expected = infer_expected_versions(fresh_tracks)
    engine = VersionReviewEngine(
        expected_versions=expected,
        delivery_refs=delivery_refs,
    )

    # 执行版本复核
    for t in session.tracks:
        engine.review(t, allow_suspend=True)

    finalize_session(session)
    save_path = save_session(session)

    # 输出
    if args.json:
        sys.stdout.write(json.dumps(session.to_dict(), ensure_ascii=False, indent=2))
        sys.stdout.write("\n")
    else:
        print_full_report(session, out=sys.stdout, verbose=args.verbose)
        print(f"\n💾 会话状态已保存：{save_path}", file=sys.stderr)

    if args.output:
        try:
            Path(args.output).write_text(
                json.dumps(session.to_dict(), ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except Exception as exc:
            print(f"[警告] 写入 JSON 报告失败：{exc}", file=sys.stderr)

    # 退出码
    try:
        maybe_raise(session, strict=not args.no_strict)
    except OldMasterDetected as exc:
        print(f"\n\033[35m⚠  需要人工介入：{exc}{RESET}", file=sys.stderr)
        return 2
    except UnresolvedIssuesRemain as exc:
        print(f"\n\033[33mℹ  复核未完成：{exc}{RESET}", file=sys.stderr)
        return 1

    return 0


RESET = "\033[0m"


def main() -> None:  # 供 python -m 调用
    sys.exit(run())


if __name__ == "__main__":
    main()

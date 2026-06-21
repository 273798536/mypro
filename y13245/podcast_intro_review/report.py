"""CLI 输出格式化 —— 坏行、跳过行、已处理行分开输出；接手同事一眼看懂"""
from __future__ import annotations

import sys
from typing import TextIO

from .models import ReviewSession, ReviewStatus, TrackRow, VersionJudgment
from .exceptions import OldMasterDetected, UnresolvedIssuesRemain


STATUS_LABELS = {
    ReviewStatus.BAD_ROW:      ("坏行",       "\033[31m",  "无法解析，请先修格式或补充必填字段"),
    ReviewStatus.SKIPPED:      ("跳过行",     "\033[90m",  "表头/空行/非片头，不参与版本复核"),
    ReviewStatus.PENDING:      ("待补证据",   "\033[33m",  "缺授权/排练备注，或版本标签不明，或未匹配交付"),
    ReviewStatus.PROCESSED:    ("已处理",     "\033[32m",  "版本确认+授权齐全+交付匹配，可以交付"),
    ReviewStatus.SUSPENDED:    ("挂起待确认", "\033[35m",  "疑似旧版母带混入，需接手同事确认"),
    ReviewStatus.MANUAL_OK:    ("人工通过",   "\033[36m",  "由接手同事批注为 OK"),
    ReviewStatus.MANUAL_REJECT:("人工驳回",   "\033[31m",  "由接手同事批注为 Reject"),
}

RESET = "\033[0m"


def _label(s: ReviewStatus) -> str:
    name, color, _ = STATUS_LABELS[s]
    return f"{color}{name}{RESET}"


def _bar(frac: float, width: int = 24) -> str:
    filled = int(round(frac * width)) if width > 0 else 0
    filled = max(0, min(width, filled))
    return "█" * filled + "░" * (width - filled)


def _safe(obj, default="-"):
    if obj is None:
        return default
    s = str(obj).strip()
    return s if s else default


def print_track_detail(track: TrackRow, out: TextIO, verbose: bool = False) -> None:
    """单行详情"""
    name, color, desc = STATUS_LABELS[track.status]
    tag = f"{color}[{name}]{RESET}"

    # 行号 + 标题 + 版本
    title = _safe(track.track_title, "（无标题）")
    ver = _safe(track.version_tag, "")
    if ver:
        if ver[:1].lower() == "v" and len(ver) > 1 and ver[1:2].isdigit():
            ver_part = f" {ver}"
        else:
            ver_part = f" v{ver}"
    else:
        ver_part = ""
    line1 = f"  第{track.row_number:>3}行 {tag} 《{title}》{ver_part}"

    # 授权/交付信号
    badges = []
    if track.authorization and track.authorization.has_authorization:
        expiry = track.authorization.expiry_date or ""
        badges.append(f"\033[32m授权至{expiry}{RESET}" if expiry else f"\033[32m有授权{RESET}")
    if track.delivery_matched:
        badges.append(f"\033[32m交付已匹配{RESET}")
    if track.version_judgment == VersionJudgment.OLD_MASTER:
        badges.append(f"\033[35m⚠ 旧版母带嫌疑{RESET}")
    if track.manual_annotation:
        badges.append(f"\033[36m批注@{track.manual_annotation.annotator}{RESET}")
    badge_str = "  " + "  ".join(badges) if badges else ""

    print(line1 + badge_str, file=out)

    if verbose:
        print(f"       ↳ 原始行: {track.raw_csv_line!r}", file=out)
        print(
            f"       ↳ 身份哈希(identity_hash={track.identity_hash})  "
            f"精确哈希(raw_hash={track.raw_hash})",
            file=out,
        )
        if track.issues:
            for iss in track.issues:
                print(f"       ↳ 问题[{iss.issue_type}]: {iss.message}", file=out)
                if iss.suggestion:
                    print(f"         建议: {iss.suggestion}", file=out)
        if track.version_evidence:
            for ev in track.version_evidence:
                print(f"       ↳ 证据: {ev}", file=out)
        if track.manual_annotation:
            print(f"       ↳ 批注@{track.manual_annotation.annotator}: {track.manual_annotation.comment}", file=out)


def print_group(session: ReviewSession, status: ReviewStatus,
                out: TextIO, verbose: bool, limit: int = 200) -> int:
    tracks = [t for t in session.tracks if t.status == status]
    if not tracks:
        return 0
    name, color, desc = STATUS_LABELS[status]
    print(f"\n{color}━━━ {name} 共 {len(tracks)} 项 ━━━{RESET}  ({desc})", file=out)
    shown = tracks[:limit]
    for t in shown:
        print_track_detail(t, out, verbose=verbose)
    if len(tracks) > len(shown):
        print(f"  ... 另有 {len(tracks) - len(shown)} 项未展示，请查看输出 JSON 明细", file=out)
    return len(tracks)


def print_summary_header(session: ReviewSession, out: TextIO) -> None:
    import os
    path = session.tracklist_path
    rel = os.path.relpath(path, os.getcwd())
    print("=" * 68, file=out)
    print(f"  播客片头版本复核  |  曲目表: {rel}", file=out)
    print(f"  会话ID: {session.session_id[:12]}  |  开始: {session.started_at}", file=out)
    if session.delivery_list_path:
        print(f"  交付清单: {os.path.relpath(session.delivery_list_path, os.getcwd())}", file=out)
    if session.annotation_path:
        print(f"  人工批注: {os.path.relpath(session.annotation_path, os.getcwd())}", file=out)
    print("=" * 68, file=out)


def print_counters(session: ReviewSession, out: TextIO) -> None:
    c = session.counters()
    total = c["total"] or 1

    print(f"\n{'状态':<12} {'数量':>6}  {'占比':>6}  分布", file=out)
    print("-" * 64, file=out)

    order = [
        ReviewStatus.PROCESSED,
        ReviewStatus.MANUAL_OK,
        ReviewStatus.PENDING,
        ReviewStatus.SUSPENDED,
        ReviewStatus.MANUAL_REJECT,
        ReviewStatus.BAD_ROW,
        ReviewStatus.SKIPPED,
    ]
    for s in order:
        n = c[s.value]
        frac = n / total
        name, color, _ = STATUS_LABELS[s]
        bar = _bar(frac)
        print(
            f"{color}{name:<12}{RESET} {n:>6}  {frac*100:>5.1f}%  {color}{bar}{RESET}",
            file=out,
        )
    print("-" * 64, file=out)
    print(f"{'合计':<12} {c['total']:>6}  100.0%", file=out)


def print_takeaways(session: ReviewSession, out: TextIO) -> None:
    """接手同事最后看的——已处理 vs 待补证据/挂起"""
    c = session.counters()
    done = c[ReviewStatus.PROCESSED.value] + c[ReviewStatus.MANUAL_OK.value]
    to_act = c[ReviewStatus.PENDING.value] + c[ReviewStatus.SUSPENDED.value] + c[ReviewStatus.MANUAL_REJECT.value]

    print("\n\033[1m📋 接手同事要点（已处理 / 还要补证据）\033[0m", file=out)
    print(f"  ✅ 可直接交付：{done} 项", file=out)
    if c[ReviewStatus.PENDING.value]:
        print(f"  🟡 缺证据：{c[ReviewStatus.PENDING.value]} 项 → 补授权/排练备注或匹配交付清单后重扫", file=out)
    if c[ReviewStatus.SUSPENDED.value]:
        print(f"  🟣 挂起待确认：{c[ReviewStatus.SUSPENDED.value]} 项 → 疑似旧版母带，请人工判定再重扫", file=out)
    if c[ReviewStatus.BAD_ROW.value]:
        print(f"  🔴 坏行：{c[ReviewStatus.BAD_ROW.value]} 项 → 先修正 CSV 格式/必填字段再重扫", file=out)
    if c[ReviewStatus.MANUAL_REJECT.value]:
        print(f"  ❌ 人工驳回：{c[ReviewStatus.MANUAL_REJECT.value]} 项 → 需重做/替换", file=out)
    if c[ReviewStatus.SKIPPED.value]:
        print(f"  ⚪ 跳过：{c[ReviewStatus.SKIPPED.value]} 项（表头/空行/非片头）", file=out)

    print("\n\033[1m🔁 如何重扫 / 如何写人工批注\033[0m", file=out)
    print(f"  曲目表补完备注/修完格式后，再次运行：", file=out)
    print(f"    python -m podcast_intro_review {session.tracklist_path}", file=out)
    if session.delivery_list_path:
        print(f"    --delivery {session.delivery_list_path}", file=out)
    print(f"  （历史挂起/批注会自动对齐到同一 identity_hash）", file=out)
    print(f"  写批注裁定挂起项：用 -v 模式复制每行下方 identity_hash，生成 annotations.json：", file=out)
    print(f"    [{{\"identity_hash\": \"...\", \"annotator\": \"你的名字\",", file=out)
    print(f"      \"status\": \"ok|reject\", \"comment\": \"裁定理由\"}}]", file=out)
    print(f"    再重扫追加参数: --annotation annotations.json", file=out)


def print_full_report(
    session: ReviewSession,
    out: TextIO = sys.stdout,
    verbose: bool = False,
) -> None:
    print_summary_header(session, out)

    # 分组输出：顺序按接手同事关心程度
    print_group(session, ReviewStatus.PROCESSED, out, verbose)
    print_group(session, ReviewStatus.MANUAL_OK, out, verbose)
    print_group(session, ReviewStatus.PENDING, out, verbose)
    print_group(session, ReviewStatus.SUSPENDED, out, verbose)
    print_group(session, ReviewStatus.MANUAL_REJECT, out, verbose)
    print_group(session, ReviewStatus.BAD_ROW, out, verbose)
    print_group(session, ReviewStatus.SKIPPED, out, verbose)

    print_counters(session, out)
    print_takeaways(session, out)


def maybe_raise(session: ReviewSession, strict: bool = True) -> None:
    """严格模式下，仍有未解决问题则抛异常让退出码非 0"""
    c = session.counters()
    pending = c[ReviewStatus.PENDING.value]
    suspended = c[ReviewStatus.SUSPENDED.value]
    bad = c[ReviewStatus.BAD_ROW.value]
    reject = c[ReviewStatus.MANUAL_REJECT.value]
    if not strict:
        return
    # 只要还有挂起，就以 OldMasterDetected 形式给出明确提示
    if suspended:
        # 取第一个挂起项作为代表
        first = next(t for t in session.tracks if t.status == ReviewStatus.SUSPENDED)
        raise OldMasterDetected(
            track_title=first.track_title,
            detected_version=first.version_tag or "未知",
            expected_version="（请确认交付的正确版本）",
            evidence=first.version_evidence or ["请查看完整明细"],
        )
    if pending or bad or reject:
        raise UnresolvedIssuesRemain(
            pending_count=pending + bad + reject,
            suspended_count=suspended,
        )

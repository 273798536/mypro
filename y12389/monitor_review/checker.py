from __future__ import annotations

from .models import (
    ChannelList,
    ConsoleSnapshot,
    MusicianFeedback,
    ProblemItem,
    ProblemType,
)


def check_channel_mismatch(
    channel_list: ChannelList,
    snapshot: ConsoleSnapshot,
) -> list[ProblemItem]:
    problems: list[ProblemItem] = []
    ch_map = {c.ch_number: c for c in channel_list.channels}
    ch_trace = channel_list.trace.record_id
    snap_trace = snapshot.trace.record_id

    for setting in snapshot.monitor_settings:
        for ch_num in setting.channels:
            if ch_num not in ch_map:
                problems.append(
                    ProblemItem(
                        problem_type=ProblemType.CHANNEL_MISMATCH,
                        description=(
                            f"返听设置中通道 {ch_num} 在通道列表中不存在"
                            f"（乐手: {setting.musician}, Bus: {setting.bus}）"
                        ),
                        severity="high",
                        channel_refs=[ch_num],
                        bus_refs=[setting.bus],
                        snapshot_refs=[snapshot.snapshot_name],
                        musician_refs=[setting.musician],
                        trace_refs=[ch_trace, snap_trace],
                    )
                )
                continue

            ch = ch_map[ch_num]
            if ch.bus_assignment and ch.bus_assignment != setting.bus:
                problems.append(
                    ProblemItem(
                        problem_type=ProblemType.CHANNEL_MISMATCH,
                        description=(
                            f"通道 {ch_num}（{ch.name}）分配到 Bus {ch.bus_assignment}，"
                            f"但返听设置引用 Bus {setting.bus}"
                            f"（乐手: {setting.musician}）"
                        ),
                        severity="high",
                        channel_refs=[ch_num],
                        bus_refs=[setting.bus, ch.bus_assignment],
                        snapshot_refs=[snapshot.snapshot_name],
                        musician_refs=[setting.musician],
                        trace_refs=[ch_trace, snap_trace],
                    )
                )

    used_ch_nums = set()
    for setting in snapshot.monitor_settings:
        used_ch_nums.update(setting.channels)
    for ch in channel_list.channels:
        if ch.ch_number not in used_ch_nums and ch.bus_assignment:
            problems.append(
                ProblemItem(
                    problem_type=ProblemType.CHANNEL_MISMATCH,
                    description=(
                        f"通道 {ch.ch_number}（{ch.name}）已分配 Bus {ch.bus_assignment}，"
                        f"但未被任何返听设置引用"
                    ),
                    severity="medium",
                    channel_refs=[ch.ch_number],
                    bus_refs=[ch.bus_assignment],
                    trace_refs=[ch_trace, snap_trace],
                )
            )

    return problems


def check_snapshot_missing(
    channel_list: ChannelList,
    snapshot: ConsoleSnapshot,
    expected_scene_count: int = 1,
) -> list[ProblemItem]:
    problems: list[ProblemItem] = []
    ch_trace = channel_list.trace.record_id
    snap_trace = snapshot.trace.record_id

    if not snapshot.monitor_settings:
        problems.append(
            ProblemItem(
                problem_type=ProblemType.SNAPSHOT_MISSING,
                description=f"快照「{snapshot.snapshot_name}」中没有任何返听设置数据",
                severity="high",
                snapshot_refs=[snapshot.snapshot_name],
                trace_refs=[snap_trace],
            )
        )

    ch_map = {c.ch_number: c for c in channel_list.channels}
    covered_channels = set()
    for setting in snapshot.monitor_settings:
        covered_channels.update(setting.channels)

    missing_channels = set(ch_map.keys()) - covered_channels
    for ch_num in sorted(missing_channels):
        ch = ch_map[ch_num]
        if ch.bus_assignment:
            problems.append(
                ProblemItem(
                    problem_type=ProblemType.SNAPSHOT_MISSING,
                    description=(
                        f"通道 {ch_num}（{ch.name}）有 Bus 分配"
                        f"但在快照「{snapshot.snapshot_name}」中缺失返听设置"
                    ),
                    severity="high",
                    channel_refs=[ch_num],
                    bus_refs=[ch.bus_assignment],
                    snapshot_refs=[snapshot.snapshot_name],
                    trace_refs=[ch_trace, snap_trace],
                )
            )

    if snapshot.scene_label and expected_scene_count > 1:
        pass

    if not snapshot.timestamp:
        problems.append(
            ProblemItem(
                problem_type=ProblemType.SNAPSHOT_MISSING,
                description=f"快照「{snapshot.snapshot_name}」缺少时间戳，无法做时间对齐",
                severity="medium",
                snapshot_refs=[snapshot.snapshot_name],
                trace_refs=[snap_trace],
            )
        )

    return problems


def check_feedback_duplicate(
    feedbacks: list[MusicianFeedback],
) -> list[ProblemItem]:
    problems: list[ProblemItem] = []
    seen: dict[tuple, int] = {}

    for i, fb in enumerate(feedbacks):
        key = (fb.musician, fb.issue, fb.channel_ref, fb.bus_ref)
        if key in seen:
            problems.append(
                ProblemItem(
                    problem_type=ProblemType.FEEDBACK_DUPLICATE,
                    description=(
                        f"乐手 {fb.musician} 的反馈重复"
                        f"（第 {seen[key] + 1} 条与第 {i + 1} 条：{fb.issue}）"
                    ),
                    severity="low",
                    channel_refs=[fb.channel_ref] if fb.channel_ref else [],
                    bus_refs=[fb.bus_ref] if fb.bus_ref else [],
                    musician_refs=[fb.musician],
                )
            )
        else:
            seen[key] = i

    return problems


def run_all_checks(
    channel_list: ChannelList,
    snapshot: ConsoleSnapshot,
    feedbacks: list[MusicianFeedback],
) -> list[ProblemItem]:
    problems: list[ProblemItem] = []
    problems.extend(check_channel_mismatch(channel_list, snapshot))
    problems.extend(check_snapshot_missing(channel_list, snapshot))
    problems.extend(check_feedback_duplicate(feedbacks))
    return problems

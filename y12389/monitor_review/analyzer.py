from __future__ import annotations

from datetime import datetime

from .models import (
    ChannelList,
    ConsoleSnapshot,
    CorrectionSuggestion,
    FaultAttribution,
    MusicianFeedback,
    ProblemItem,
    ProblemType,
    TimeAlignment,
)


def _parse_iso(ts: str) -> datetime | None:
    try:
        return datetime.fromisoformat(ts)
    except (ValueError, TypeError):
        return None


def attribute_faults(
    problems: list[ProblemItem],
    channel_list: ChannelList,
    snapshot: ConsoleSnapshot,
    feedbacks: list[MusicianFeedback],
) -> list[FaultAttribution]:
    attributions: list[FaultAttribution] = []
    ch_map = {c.ch_number: c for c in channel_list.channels}

    mismatch_problems = [p for p in problems if p.problem_type == ProblemType.CHANNEL_MISMATCH]
    if mismatch_problems:
        affected_ch = sorted({c for p in mismatch_problems for c in p.channel_refs})
        affected_bus = sorted({b for p in mismatch_problems for b in p.bus_refs})
        evidence = [p.description for p in mismatch_problems]
        related_fb = [
            fb for fb in feedbacks
            if fb.channel_ref in affected_ch or fb.bus_ref in affected_bus
        ]
        if related_fb:
            evidence.extend(
                f"乐手反馈({fb.musician}): {fb.issue}" for fb in related_fb
            )
        attributions.append(
            FaultAttribution(
                root_cause="通道分配与返听设置不一致",
                affected_channels=affected_ch,
                affected_buses=affected_bus,
                confidence="high" if related_fb else "medium",
                evidence=evidence,
            )
        )

    missing_problems = [p for p in problems if p.problem_type == ProblemType.SNAPSHOT_MISSING]
    if missing_problems:
        affected_ch = sorted({c for p in missing_problems for c in p.channel_refs})
        affected_bus = sorted({b for p in missing_problems for b in p.bus_refs})
        evidence = [p.description for p in missing_problems]
        no_timestamp = any("缺少时间戳" in p.description for p in missing_problems)
        attributions.append(
            FaultAttribution(
                root_cause="快照数据不完整" + ("，且缺少时间戳" if no_timestamp else ""),
                affected_channels=affected_ch,
                affected_buses=affected_bus,
                confidence="high" if no_timestamp else "medium",
                evidence=evidence,
            )
        )

    dup_problems = [p for p in problems if p.problem_type == ProblemType.FEEDBACK_DUPLICATE]
    if dup_problems:
        evidence = [p.description for p in dup_problems]
        attributions.append(
            FaultAttribution(
                root_cause="乐手反馈数据重复，可能影响故障判断",
                affected_channels=sorted({c for p in dup_problems for c in p.channel_refs}),
                affected_buses=sorted({b for p in dup_problems for b in p.bus_refs}),
                confidence="low",
                evidence=evidence,
            )
        )

    return attributions


def align_timestamps(
    channel_list: ChannelList,
    snapshot: ConsoleSnapshot,
    feedbacks: list[MusicianFeedback],
) -> list[TimeAlignment]:
    alignments: list[TimeAlignment] = []
    event_time = channel_list.timestamp or snapshot.timestamp

    if not event_time:
        alignments.append(
            TimeAlignment(
                event_time="",
                snapshot_time=snapshot.timestamp or None,
                feedback_time=feedbacks[0].timestamp if feedbacks else None,
                note="无法对齐：通道列表和快照均无时间戳",
            )
        )
        return alignments

    event_dt = _parse_iso(event_time)
    if event_dt is None:
        alignments.append(
            TimeAlignment(
                event_time=event_time,
                snapshot_time=snapshot.timestamp or None,
                feedback_time=feedbacks[0].timestamp if feedbacks else None,
                note=f"时间格式无法解析: {event_time}",
            )
        )
        return alignments

    snap_dt = _parse_iso(snapshot.timestamp) if snapshot.timestamp else None
    if snap_dt:
        offset = (snap_dt - event_dt).total_seconds()
        alignments.append(
            TimeAlignment(
                event_time=event_time,
                snapshot_time=snapshot.timestamp,
                feedback_time=None,
                offset_seconds=offset,
                aligned=abs(offset) < 60,
                note="快照与事件时间差 {:.0f} 秒".format(offset),
            )
        )

    for fb in feedbacks:
        fb_dt = _parse_iso(fb.timestamp)
        if fb_dt:
            offset = (fb_dt - event_dt).total_seconds()
            alignments.append(
                TimeAlignment(
                    event_time=event_time,
                    snapshot_time=snapshot.timestamp or None,
                    feedback_time=fb.timestamp,
                    offset_seconds=offset,
                    aligned=abs(offset) < 300,
                    note=f"乐手 {fb.musician} 反馈与事件时间差 {offset:.0f} 秒",
                )
            )

    if not alignments:
        alignments.append(
            TimeAlignment(
                event_time=event_time,
                snapshot_time=snapshot.timestamp or None,
                feedback_time=feedbacks[0].timestamp if feedbacks else None,
                note="仅有事件时间，无法做完整对齐",
            )
        )

    return alignments


def suggest_corrections(
    problems: list[ProblemItem],
    attributions: list[FaultAttribution],
    channel_list: ChannelList,
    snapshot: ConsoleSnapshot,
) -> list[CorrectionSuggestion]:
    corrections: list[CorrectionSuggestion] = []
    ch_map = {c.ch_number: c for c in channel_list.channels}

    mismatch_problems = [p for p in problems if p.problem_type == ProblemType.CHANNEL_MISMATCH]
    if mismatch_problems:
        for p in mismatch_problems:
            if not p.channel_refs:
                continue
            ch_num = p.channel_refs[0]
            if ch_num in ch_map:
                ch = ch_map[ch_num]
                corrections.append(
                    CorrectionSuggestion(
                        target=f"通道 {ch_num}（{ch.name}）",
                        action=f"将 Bus 分配从 {ch.bus_assignment} 修正为返听设置中引用的 Bus"
                        if ch.bus_assignment and len(p.bus_refs) >= 2
                        else f"补充通道 {ch_num} 到返听设置",
                        priority="high",
                        rationale=p.description,
                    )
                )
            else:
                corrections.append(
                    CorrectionSuggestion(
                        target=f"通道 {ch_num}",
                        action="从返听设置中移除不存在的通道引用，或补充通道到通道列表",
                        priority="high",
                        rationale=p.description,
                    )
                )

    missing_problems = [p for p in problems if p.problem_type == ProblemType.SNAPSHOT_MISSING]
    if missing_problems:
        channels_to_add = sorted({c for p in missing_problems for c in p.channel_refs})
        if channels_to_add:
            corrections.append(
                CorrectionSuggestion(
                    target=f"快照「{snapshot.snapshot_name}」",
                    action=f"补充通道 {channels_to_add} 的返听设置",
                    priority="high",
                    rationale="; ".join(p.description for p in missing_problems if p.channel_refs),
                )
            )

        no_ts_problems = [p for p in missing_problems if "缺少时间戳" in p.description]
        if no_ts_problems:
            corrections.append(
                CorrectionSuggestion(
                    target=f"快照「{snapshot.snapshot_name}」",
                    action="补全快照时间戳",
                    priority="medium",
                    rationale=no_ts_problems[0].description,
                )
            )

    dup_problems = [p for p in problems if p.problem_type == ProblemType.FEEDBACK_DUPLICATE]
    if dup_problems:
        corrections.append(
            CorrectionSuggestion(
                target="乐手反馈数据",
                action="去重后保留最早一条反馈，确认是否为不同时间点的同类问题",
                priority="low",
                rationale="; ".join(p.description for p in dup_problems),
            )
        )

    return corrections

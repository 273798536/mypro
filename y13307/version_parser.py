from __future__ import annotations

from typing import List, Set, Tuple

from models import MissingRefInfo, QASample, VersionNote


def parse_version_note(note: VersionNote, all_samples: List[QASample]) -> Tuple[bool, List[MissingRefInfo]]:
    all_sample_ids: Set[str] = {s.sample_id for s in all_samples}
    referenced = set(note.referenced_sample_ids)
    missing = referenced - all_sample_ids

    pending: List[MissingRefInfo] = []

    if missing:
        note.missing_references = list(missing)
        info = MissingRefInfo(
            reason=f"版本说明引用了 {len(missing)} 个在样本中不存在的记录 ID",
            affected_version=note.version,
            affected_sample_ids=sorted(missing),
            impact_scope=(
                f"涉及 {len(missing)} 条引用缺失样本，"
                f"占该版本引用总数 {len(referenced)} 的 "
                f"{len(missing)/len(referenced)*100:.1f}%，"
                f"将延迟最终判定输出直至人工确认或补充数据"
            ),
        )
        pending.append(info)

    late_attachments = [a for a in note.attachments if a.is_late]
    if late_attachments:
        for att in late_attachments:
            info = MissingRefInfo(
                reason=f"晚到附件：{att.name}",
                affected_version=note.version,
                affected_sample_ids=[],
                impact_scope=(
                    f"附件 {att.name} 到达时间晚于版本发布时间，"
                    f"可能影响相关样本的人工判断依据，需确认是否纳入本次改判"
                ),
            )
            pending.append(info)

    has_issues = len(pending) > 0
    return has_issues, pending

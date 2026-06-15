from __future__ import annotations

from typing import Optional

from podcast_intro_alert.models import (
    AnomalyRecord,
    ManualRejudgment,
    ProcessingStatus,
    ChannelTableEntry,
)


class Adjudicator:
    def __init__(self, entries: list[ChannelTableEntry]) -> None:
        self._entries = {e.entry_id: e for e in entries}
        self._counter = 0

    def _next_id(self) -> str:
        self._counter += 1
        return f"RJD-{self._counter:03d}"

    def rejudge(
        self,
        anomaly: AnomalyRecord,
        operator: str,
        new_verdict: str,
        reason: str,
        evidence_refs: Optional[list[str]] = None,
    ) -> ManualRejudgment:
        original = anomaly.status.value
        rejudgment = ManualRejudgment(
            rejudgment_id=self._next_id(),
            anomaly_id=anomaly.anomaly_id,
            operator=operator,
            original_verdict=original,
            new_verdict=new_verdict,
            reason=reason,
            evidence_refs=evidence_refs or [],
        )
        anomaly.resolve(rejudgment, conclusion=new_verdict)
        return rejudgment

    def confirm(self, anomaly: AnomalyRecord, conclusion: str) -> None:
        anomaly.confirm(conclusion)

    def request_evidence(self, anomaly: AnomalyRecord) -> None:
        anomaly.request_evidence()

    def waive(self, anomaly: AnomalyRecord, reason: str) -> None:
        anomaly.waive(reason)

    def get_entry(self, entry_id: str) -> Optional[ChannelTableEntry]:
        return self._entries.get(entry_id)

    def build_trace_chain(self, anomaly: AnomalyRecord) -> dict:
        chain: dict = {
            "异常编号": anomaly.anomaly_id,
            "分类": anomaly.category.value,
            "异常原因": anomaly.human_reason,
            "来源条目": [],
        }

        for eid in anomaly.source_entry_ids:
            entry = self._entries.get(eid)
            if entry:
                chain["来源条目"].append({
                    "条目编号": entry.entry_id,
                    "期号": entry.episode,
                    "通道": entry.channel,
                    "曲名": entry.song_name,
                    "别名": entry.song_alias or "—",
                    "片头文件": entry.intro_file or "（缺失）",
                    "时长": f"{entry.duration_sec}s" if entry.duration_sec else "—",
                    "演出者": entry.artist or "—",
                    "备注": entry.note or "—",
                })

        chain["处理状态"] = anomaly.status.value
        chain["结论"] = anomaly.conclusion or "—"

        if anomaly.rejudgment:
            rj = anomaly.rejudgment
            chain["改判记录"] = {
                "改判编号": rj.rejudgment_id,
                "操作人": rj.operator,
                "原判定": rj.original_verdict,
                "改判为": rj.new_verdict,
                "改判原因": rj.reason,
                "时间": rj.timestamp,
                "证据引用": rj.evidence_refs or [],
            }
        else:
            chain["改判记录"] = None

        return chain

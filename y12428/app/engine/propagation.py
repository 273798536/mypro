from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.split import SplitDetail, SplitStatus
from app.models.history import HistoryEntry


class PropagationResult(BaseModel):
    split_id: str
    pages_updated: list[str] = Field(default_factory=list, description="已更新的页面标识")
    files_updated: list[str] = Field(default_factory=list, description="已更新的文件标识")
    reports_regenerated: list[str] = Field(default_factory=list, description="已重新生成的报告标识")
    history_entries: list[HistoryEntry] = Field(default_factory=list, description="产生的历史记录")
    propagated_at: datetime = Field(default_factory=datetime.now)


def propagate_split_change(
    split: SplitDetail,
    operator: str = "system",
) -> PropagationResult:
    result = PropagationResult(split_id=split.id)

    result.pages_updated.append(
        f"split-detail-page:{split.id}"
    )
    result.pages_updated.append(
        f"enrollment-overview:{split.enrollment_id}"
    )

    result.files_updated.append(
        f"split-ledger:{split.id}.json"
    )
    if split.status == SplitStatus.CONFIRMED:
        result.files_updated.append(
            f"settlement-voucher:{split.id}.csv"
        )

    if split.status in (SplitStatus.CONFIRMED, SplitStatus.SETTLED, SplitStatus.DISPUTED):
        result.reports_regenerated.append(
            f"periodic-report:{split.id}"
        )
    if split.evidence_gaps:
        result.reports_regenerated.append(
            f"evidence-gap-report:{split.id}"
        )

    result.history_entries.append(
        HistoryEntry(
            id=f"hist-split-{split.id}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            entity_type="split",
            entity_id=split.id,
            action="split_propagation",
            after=split.model_dump(mode="json"),
            operator=operator,
            remark=(
                f"分账明细 {split.id} 状态变更为 {split.status.value}，"
                f"已同步更新 {len(result.pages_updated)} 个页面、"
                f"{len(result.files_updated)} 个文件、"
                f"{len(result.reports_regenerated)} 份报告。"
            ),
        )
    )

    return result

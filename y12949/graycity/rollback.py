"""版本回滚丢记录处理。

把回滚时丢掉的字段/记录恢复进当前这轮复核，与训练样本、提示词版本同轮呈现，
模型评审会能看出本次处理的是眼前这批具体材料。可恢复的自动恢复，不可恢复的转人工确认。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from graycity.models import RollbackLoss, TrainingSample
from graycity.store import DataStore


@dataclass
class RecoveryOutcome:
    loss: RollbackLoss
    status: str  # recovered | manual
    action: str
    next_step: str
    sample: Optional[TrainingSample]


def recover(store: DataStore) -> list[RecoveryOutcome]:
    outcomes: list[RecoveryOutcome] = []
    for loss in store.rollback_losses:
        sample = store.sample_by_id(loss.sample_id)
        if loss.recoverable:
            outcomes.append(
                RecoveryOutcome(
                    loss=loss,
                    status="recovered",
                    action=f"已将 {loss.lost_field} 从 {loss.from_version} 恢复进本轮复核",
                    next_step=f"复核 {loss.sample_id} 的 {loss.lost_field} 是否与当前 v2 一致",
                    sample=sample,
                )
            )
        else:
            outcomes.append(
                RecoveryOutcome(
                    loss=loss,
                    status="manual",
                    action=f"{loss.lost_field} 不可自动恢复，转人工确认",
                    next_step=f"人工确认 {loss.sample_id} 的 {loss.lost_field} 归属后再纳入灰度对比",
                    sample=sample,
                )
            )
    return outcomes


def summarize(outcomes: list[RecoveryOutcome]) -> str:
    recovered = sum(1 for o in outcomes if o.status == "recovered")
    manual = sum(1 for o in outcomes if o.status == "manual")
    return (
        f"版本回滚丢记录 {len(outcomes)} 条：已恢复 {recovered}，转人工 {manual}。"
        f"详见 rollback 子命令。"
    )

from __future__ import annotations

from .models import AuditIssue, ProbConfig, Severity


class ProbValidator:
    TOLERANCE = 1e-6

    def __init__(self, configs: list[ProbConfig]) -> None:
        self.configs = configs
        self.issues: list[AuditIssue] = []

    def validate(self) -> list[AuditIssue]:
        self.issues = []
        for config in self.configs:
            self._validate_pool(config)
        return self.issues

    def _validate_pool(self, config: ProbConfig) -> None:
        if not config.entries:
            self.issues.append(
                AuditIssue(
                    severity=Severity.WARNING,
                    category="概率配置",
                    pool_id=config.pool_id,
                    description=f"卡池 {config.pool_id}({config.pool_name}) 概率配置为空",
                    location=f"prob_config.pool_id={config.pool_id}, version={config.version}",
                )
            )
            return

        by_rarity: dict[str, list] = {}
        for entry in config.entries:
            by_rarity.setdefault(entry.rarity, []).append(entry)

        total = sum(e.probability for e in config.entries)
        if abs(total - 1.0) > self.TOLERANCE:
            problematic = []
            for rarity, entries in by_rarity.items():
                rarity_sum = sum(e.probability for e in entries)
                problematic.append(
                    {"rarity": rarity, "sum": rarity_sum, "items": [e.to_dict() for e in entries]}
                )
            self.issues.append(
                AuditIssue(
                    severity=Severity.CRITICAL,
                    category="概率未归一",
                    pool_id=config.pool_id,
                    description=(
                        f"卡池 {config.pool_id}({config.pool_name}) 概率总和={total:.6f}，"
                        f"偏差={abs(total - 1.0):.6f}"
                    ),
                    location=(
                        f"prob_config.pool_id={config.pool_id}, "
                        f"version={config.version}, "
                        f"rarity_breakdown={','.join(r for r in by_rarity)}"
                    ),
                    detail={
                        "total": total,
                        "deviation": abs(total - 1.0),
                        "rarity_breakdown": problematic,
                    },
                )
            )

        for entry in config.entries:
            if entry.probability < 0:
                self.issues.append(
                    AuditIssue(
                        severity=Severity.CRITICAL,
                        category="概率为负",
                        pool_id=config.pool_id,
                        description=(
                            f"卡池 {config.pool_id} 物品 {entry.item_name}"
                            f"({entry.item_id}) 概率为负: {entry.probability}"
                        ),
                        location=(
                            f"prob_config.pool_id={config.pool_id}, "
                            f"item_id={entry.item_id}, "
                            f"rarity={entry.rarity}"
                        ),
                        detail={"entry": entry.to_dict()},
                    )
                )
            if entry.probability == 0:
                self.issues.append(
                    AuditIssue(
                        severity=Severity.WARNING,
                        category="概率为零",
                        pool_id=config.pool_id,
                        description=(
                            f"卡池 {config.pool_id} 物品 {entry.item_name}"
                            f"({entry.item_id}) 概率为零，该物品实际不可获得"
                        ),
                        location=(
                            f"prob_config.pool_id={config.pool_id}, "
                            f"item_id={entry.item_id}, "
                            f"rarity={entry.rarity}"
                        ),
                        detail={"entry": entry.to_dict()},
                    )
                )

        for rarity, entries in by_rarity.items():
            rarity_sum = sum(e.probability for e in entries)
            if abs(rarity_sum - 1.0) > self.TOLERANCE and len(by_rarity) > 1:
                pass

        item_ids = [e.item_id for e in config.entries]
        seen: dict[str, list[str]] = {}
        for iid in item_ids:
            seen.setdefault(iid, []).append(iid)
        dup_ids = {iid for iid, lst in seen.items() if len(lst) > 1}
        if dup_ids:
            self.issues.append(
                AuditIssue(
                    severity=Severity.WARNING,
                    category="物品重复",
                    pool_id=config.pool_id,
                    description=(
                        f"卡池 {config.pool_id} 存在重复物品ID: {','.join(dup_ids)}"
                    ),
                    location=f"prob_config.pool_id={config.pool_id}",
                    detail={"duplicate_item_ids": sorted(dup_ids)},
                )
            )

    def get_rarity_summary(self, config: ProbConfig) -> dict[str, float]:
        summary: dict[str, float] = {}
        for entry in config.entries:
            summary[entry.rarity] = summary.get(entry.rarity, 0.0) + entry.probability
        return summary

    def get_item_rarity_map(self, config: ProbConfig) -> dict[str, str]:
        return {e.item_id: e.rarity for e in config.entries}

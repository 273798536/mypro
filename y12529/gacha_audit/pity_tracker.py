from __future__ import annotations

from collections import defaultdict
from typing import Optional

from .models import (
    AuditIssue,
    GachaLog,
    GachaRecord,
    PityCounterSnapshot,
    PityRule,
    ProbConfig,
    Severity,
)


class PityTracker:
    def __init__(
        self,
        logs: GachaLog,
        rules: list[PityRule],
        prob_configs: Optional[list[ProbConfig]] = None,
    ) -> None:
        self.logs = logs
        self.rules = rules
        self.prob_configs = prob_configs or []
        self.issues: list[AuditIssue] = []
        self.snapshots: list[PityCounterSnapshot] = []
        self.reset_events: list[dict] = []
        self.item_rarity_map: dict[str, dict[str, str]] = {}
        for cfg in self.prob_configs:
            self.item_rarity_map[cfg.pool_id] = cfg.get_item_rarity_map() if hasattr(cfg, 'get_item_rarity_map') else {}

    def track(self) -> tuple[list[AuditIssue], list[PityCounterSnapshot]]:
        self.issues = []
        self.snapshots = []
        self.reset_events = []

        rules_by_pool: dict[str, list[PityRule]] = defaultdict(list)
        for r in self.rules:
            rules_by_pool[r.pool_id].append(r)

        player_pool_groups: dict[tuple[str, str], list[GachaRecord]] = defaultdict(list)
        for rec in self.logs.records:
            player_pool_groups[(rec.player_id, rec.pool_id)].append(rec)

        for (player_id, pool_id), records in player_pool_groups.items():
            records_sorted = sorted(records, key=lambda r: (r.timestamp, r.seq))
            pool_rules = rules_by_pool.get(pool_id, [])
            if not pool_rules:
                self.issues.append(
                    AuditIssue(
                        severity=Severity.WARNING,
                        category="缺少保底规则",
                        pool_id=pool_id,
                        description=f"玩家 {player_id} 在卡池 {pool_id} 无保底规则",
                        location=f"pity_rules.pool_id={pool_id}",
                    )
                )
                continue
            for rule in pool_rules:
                self._track_for_rule(player_id, pool_id, records_sorted, rule)

        return self.issues, self.snapshots

    def _resolve_rarity(self, pool_id: str, record: GachaRecord) -> str:
        if record.rarity:
            return record.rarity
        pool_map = self.item_rarity_map.get(pool_id, {})
        return pool_map.get(record.item_id, "unknown")

    def _track_for_rule(
        self,
        player_id: str,
        pool_id: str,
        records: list[GachaRecord],
        rule: PityRule,
    ) -> None:
        counter = 0
        last_reset_seq: Optional[int] = None
        last_reset_ts: Optional[str] = None
        resets: list[dict] = []

        for rec in records:
            counter += 1
            rarity = self._resolve_rarity(pool_id, rec)

            if rarity == rule.guaranteed_rarity:
                resets.append(
                    {
                        "seq": rec.seq,
                        "timestamp": rec.timestamp,
                        "counter_before_reset": counter,
                        "item_id": rec.item_id,
                        "item_name": rec.item_name,
                        "rarity": rarity,
                        "player_id": player_id,
                        "pool_id": pool_id,
                    }
                )
                last_reset_seq = rec.seq
                last_reset_ts = rec.timestamp
                counter = 0

        for i, rst in enumerate(resets):
            cnt = rst["counter_before_reset"]
            if cnt > rule.threshold:
                self.issues.append(
                    AuditIssue(
                        severity=Severity.CRITICAL,
                        category="保底超限",
                        pool_id=pool_id,
                        description=(
                            f"玩家 {player_id} 在卡池 {pool_id} 的{rule.pity_type}保底"
                            f"计数={cnt} 超过阈值={rule.threshold}，保底未生效"
                        ),
                        location=(
                            f"gacha_log.seq={rst['seq']}, "
                            f"timestamp={rst['timestamp']}, "
                            f"player_id={player_id}, "
                            f"pity_type={rule.pity_type}"
                        ),
                        detail=rst,
                    )
                )
            elif cnt == rule.threshold:
                pass
            elif i == 0 and cnt < rule.threshold:
                if last_reset_seq is not None or len(resets) > 0:
                    pass

        for i in range(len(resets) - 1):
            gap = resets[i + 1]["counter_before_reset"]
            if gap == 1 and resets[i]["counter_before_reset"] < rule.threshold:
                if rule.pity_type == "soft":
                    continue
                self.issues.append(
                    AuditIssue(
                        severity=Severity.CRITICAL,
                        category="保底异常重置",
                        pool_id=pool_id,
                        description=(
                            f"玩家 {player_id} 在卡池 {pool_id} 连续两次出{rule.guaranteed_rarity}，"
                            f"前一次保底计数={resets[i]['counter_before_reset']}"
                            f"< 阈值={rule.threshold}，保底计数器疑似异常重置"
                        ),
                        location=(
                            f"gacha_log.seq={resets[i+1]['seq']}, "
                            f"timestamp={resets[i+1]['timestamp']}, "
                            f"player_id={player_id}, "
                            f"prev_reset_seq={resets[i]['seq']}"
                        ),
                        detail={
                            "prev_reset": resets[i],
                            "current_reset": resets[i + 1],
                        },
                    )
                )

        final_counter = counter
        snapshot = PityCounterSnapshot(
            player_id=player_id,
            pool_id=pool_id,
            pity_type=rule.pity_type,
            current_count=final_counter,
            threshold=rule.threshold,
            last_reset_seq=last_reset_seq,
            last_reset_timestamp=last_reset_ts,
            is_anomaly=final_counter > rule.threshold,
            anomaly_reason=(
                f"当前计数{final_counter}超过阈值{rule.threshold}"
                if final_counter > rule.threshold
                else None
            ),
        )
        self.snapshots.append(snapshot)
        self.reset_events.extend(resets)

    def get_reset_timeline(self, player_id: Optional[str] = None, pool_id: Optional[str] = None) -> list[dict]:
        events = self.reset_events
        if player_id:
            events = [e for e in events if e["player_id"] == player_id]
        if pool_id:
            events = [e for e in events if e["pool_id"] == pool_id]
        return sorted(events, key=lambda e: e["timestamp"])

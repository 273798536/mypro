from __future__ import annotations

from typing import Optional

from .models import GachaLog, ProbConfig, PityRule


class FilterEngine:
    def __init__(
        self,
        logs: GachaLog,
        configs: list[ProbConfig],
        rules: list[PityRule],
    ) -> None:
        self.logs = logs
        self.configs = configs
        self.rules = rules
        self._current_filter: dict = {}

    def apply(
        self,
        pool_id: Optional[str] = None,
        player_id: Optional[str] = None,
        rarity: Optional[str] = None,
        time_from: Optional[str] = None,
        time_to: Optional[str] = None,
    ) -> dict:
        self._current_filter = {
            k: v
            for k, v in {
                "pool_id": pool_id,
                "player_id": player_id,
                "rarity": rarity,
                "time_from": time_from,
                "time_to": time_to,
            }.items()
            if v is not None
        }

        filtered_logs = self.logs.filter(
            pool_id=pool_id,
            player_id=player_id,
            rarity=rarity,
            time_from=time_from,
            time_to=time_to,
        )

        filtered_configs = self.configs
        if pool_id:
            filtered_configs = [c for c in filtered_configs if c.pool_id == pool_id]

        filtered_rules = self.rules
        if pool_id:
            filtered_rules = [r for r in filtered_rules if r.pool_id == pool_id]

        stats = self._compute_stats(filtered_logs, filtered_configs)

        return {
            "filter": self._current_filter,
            "logs": filtered_logs,
            "configs": filtered_configs,
            "rules": filtered_rules,
            "stats": stats,
        }

    def _compute_stats(self, logs: GachaLog, configs: list[ProbConfig]) -> dict:
        total_pulls = len(logs.records)

        rarity_counts: dict[str, int] = {}
        pool_counts: dict[str, int] = {}
        player_counts: dict[str, int] = {}
        for rec in logs.records:
            rarity_counts[rec.rarity] = rarity_counts.get(rec.rarity, 0) + 1
            pool_counts[rec.pool_id] = pool_counts.get(rec.pool_id, 0) + 1
            player_counts[rec.player_id] = player_counts.get(rec.player_id, 0) + 1

        rarity_rates: dict[str, float] = {}
        if total_pulls > 0:
            rarity_rates = {r: c / total_pulls for r, c in rarity_counts.items()}

        config_rates: dict[str, dict[str, float]] = {}
        for cfg in configs:
            config_rates[cfg.pool_id] = {
                e.rarity: config_rates.get(cfg.pool_id, {}).get(e.rarity, 0.0)
                + e.probability
                for e in cfg.entries
            }

        deviation: dict[str, dict[str, dict]] = {}
        for pool_id, actual in rarity_rates.items():
            if pool_id in config_rates:
                expected = config_rates[pool_id]
                pool_dev = {}
                all_rarities = set(list(actual.keys()) + list(expected.keys()))
                for r in all_rarities:
                    a = actual.get(r, 0.0)
                    e = expected.get(r, 0.0)
                    pool_dev[r] = {
                        "actual": a,
                        "expected": e,
                        "deviation": a - e,
                    }
                deviation[pool_id] = pool_dev

        return {
            "total_pulls": total_pulls,
            "rarity_counts": rarity_counts,
            "rarity_actual_rates": rarity_rates,
            "rarity_config_rates": config_rates,
            "pool_counts": pool_counts,
            "player_counts": player_counts,
            "deviation": deviation,
        }

    def get_available_pools(self) -> list[str]:
        return sorted(set(c.pool_id for c in self.configs))

    def get_available_players(self) -> list[str]:
        return sorted(set(r.player_id for r in self.logs.records))

    def get_available_rarities(self) -> list[str]:
        return sorted(set(r.rarity for r in self.logs.records))

    def get_time_range(self) -> dict:
        if not self.logs.records:
            return {"min": None, "max": None}
        timestamps = [r.timestamp for r in self.logs.records]
        return {"min": min(timestamps), "max": max(timestamps)}

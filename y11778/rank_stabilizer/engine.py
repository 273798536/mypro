from collections import defaultdict
from copy import deepcopy
from datetime import datetime
from typing import Optional

from .models import (
    AthleteScore,
    AuditEntry,
    Event,
    RankEntry,
    RankingReport,
    TieRule,
    TieStrategy,
    WarningItem,
    WarningSeverity,
    Withdrawal,
    WithdrawalScorePolicy,
    AppealNote,
    AppealStatus,
)
from .audit import AuditTrail
from .warnings import WarningChecker


class RankingEngine:
    def __init__(self):
        self.events: dict[str, Event] = {}
        self.scores: list[AthleteScore] = []
        self.tie_rules: list[TieRule] = []
        self.withdrawals: list[Withdrawal] = []
        self.appeals: list[AppealNote] = []
        self.audit = AuditTrail()
        self.warning_checker = WarningChecker()
        self._athlete_names: dict[str, str] = {}

    def load_events(self, events: list[Event]):
        for e in events:
            self.events[e.event_id] = e
            self.audit.record("load_event", e.event_id, new_value=e.name, source=e.source)

    def load_scores(self, scores: list[AthleteScore]):
        for s in scores:
            self._athlete_names[s.athlete_id] = s.athlete_name
            if s.is_withdrawal or s.score is None:
                s.adjusted = True
                s.raw_score = s.score
                s.score = self._resolve_withdrawal_score(s)
                s.adjustment_reason = f"withdrawal_policy:{self._get_withdrawal_policy(s.athlete_id, s.event_id).value}"
            self.scores.append(s)
            self.audit.record(
                "load_score",
                f"{s.athlete_id}/{s.event_id}",
                new_value=str(s.score),
                source=s.source,
                reason="adjusted" if s.adjusted else "original",
            )

    def load_tie_rules(self, rules: list[TieRule]):
        self.tie_rules = sorted(
            [r for r in rules if r.is_active],
            key=lambda r: r.priority,
            reverse=True,
        )
        for r in self.tie_rules:
            self.audit.record("load_tie_rule", r.rule_id, new_value=r.strategy.value, source=r.source)

    def load_withdrawals(self, withdrawals: list[Withdrawal]):
        self.withdrawals = withdrawals
        for w in withdrawals:
            self.audit.record(
                "load_withdrawal",
                f"{w.athlete_id}/{w.event_id}",
                new_value=w.score_policy.value,
                source=w.source,
                reason=w.reason,
            )

    def load_appeals(self, appeals: list[AppealNote]):
        self.appeals = appeals
        for a in appeals:
            self.audit.record(
                "load_appeal",
                a.appeal_id,
                new_value=a.status.value,
                source=a.source,
                reason=a.description[:80],
            )

    def _get_withdrawal_policy(self, athlete_id: str, event_id: str) -> WithdrawalScorePolicy:
        for w in self.withdrawals:
            if w.athlete_id == athlete_id and w.event_id == event_id:
                return w.score_policy
        return WithdrawalScorePolicy.ZERO

    def _resolve_withdrawal_score(self, score: AthleteScore) -> float:
        policy = self._get_withdrawal_policy(score.athlete_id, score.event_id)
        if policy == WithdrawalScorePolicy.ZERO:
            return 0.0
        elif policy == WithdrawalScorePolicy.LAST_PLACE:
            return self._estimate_last_place_score(score.event_id)
        elif policy == WithdrawalScorePolicy.AVERAGE:
            return self._estimate_average_score(score.event_id)
        elif policy == WithdrawalScorePolicy.DISQUALIFY:
            return -1.0
        return 0.0

    def _estimate_last_place_score(self, event_id: str) -> float:
        event_scores = [s.score for s in self.scores if s.event_id == event_id and s.score is not None and not s.is_withdrawal]
        if not event_scores:
            return 0.0
        return min(event_scores) - 1

    def _estimate_average_score(self, event_id: str) -> float:
        event_scores = [s.score for s in self.scores if s.event_id == event_id and s.score is not None and not s.is_withdrawal]
        if not event_scores:
            return 0.0
        return sum(event_scores) / len(event_scores)

    def compute_ranking(self, title: str = "赛事排名") -> RankingReport:
        self.audit.record("compute_ranking", "start", source="engine")

        warnings = self.warning_checker.check_all(
            self.scores, self.events, self.tie_rules, self.withdrawals, self.appeals
        )

        athlete_event_scores = self._group_scores_by_athlete()
        weighted_scores = self._compute_weighted_scores(athlete_event_scores)

        sorted_athletes = self._sort_athletes(weighted_scores, athlete_event_scores)

        entries = self._build_rank_entries(sorted_athletes, weighted_scores, athlete_event_scores)

        applied_rules = [{"rule_id": r.rule_id, "strategy": r.strategy.value, "description": r.description} for r in self.tie_rules]
        event_weights = {eid: e.weight for eid, e in self.events.items()}

        report = RankingReport(
            title=title,
            entries=entries,
            warnings=warnings,
            audit_trail=self.audit.to_dict_list(),
            tie_rules_applied=applied_rules,
            event_weights=event_weights,
            total_athletes=len(weighted_scores),
            total_events=len(self.events),
        )

        self.audit.record("compute_ranking", "complete", source="engine")
        return report

    def _group_scores_by_athlete(self) -> dict[str, dict[str, float]]:
        result: dict[str, dict[str, float]] = defaultdict(dict)
        for s in self.scores:
            if s.score is not None:
                result[s.athlete_id][s.event_id] = s.score
        return dict(result)

    def _compute_weighted_scores(self, athlete_event_scores: dict[str, dict[str, float]]) -> dict[str, float]:
        result: dict[str, float] = {}
        for aid, events in athlete_event_scores.items():
            total = 0.0
            for eid, score in events.items():
                weight = self.events[eid].weight if eid in self.events else 1.0
                total += score * weight
            result[aid] = round(total, 2)
        return result

    def _sort_athletes(
        self,
        weighted_scores: dict[str, float],
        athlete_event_scores: dict[str, dict[str, float]],
    ) -> list[str]:
        athlete_ids = list(weighted_scores.keys())
        athlete_ids.sort(key=lambda aid: weighted_scores[aid], reverse=True)

        grouped: list[list[str]] = []
        i = 0
        while i < len(athlete_ids):
            group = [athlete_ids[i]]
            j = i + 1
            while j < len(athlete_ids) and weighted_scores[athlete_ids[j]] == weighted_scores[athlete_ids[i]]:
                group.append(athlete_ids[j])
                j += 1
            if len(group) > 1:
                group = self._resolve_tie(group, athlete_event_scores)
            grouped.extend(group)
            i = j

        return grouped

    def _resolve_tie(
        self,
        tied_athletes: list[str],
        athlete_event_scores: dict[str, dict[str, float]],
    ) -> list[str]:
        remaining = list(tied_athletes)
        result = []

        for rule in self.tie_rules:
            if len(remaining) <= 1:
                break

            if rule.strategy == TieStrategy.GOLD_FIRST:
                remaining = self._tie_break_by_best_score(remaining, athlete_event_scores, result)
            elif rule.strategy == TieStrategy.BEST_SINGLE:
                remaining = self._tie_break_by_best_single(remaining, athlete_event_scores, result)
            elif rule.strategy == TieStrategy.ALPHABETICAL:
                remaining = self._tie_break_alphabetical(remaining, result)
            elif rule.strategy == TieStrategy.DRAW_LOT:
                remaining = self._tie_break_draw_lot(remaining, result)
            elif rule.strategy == TieStrategy.HEAD_TO_HEAD:
                remaining = self._tie_break_head_to_head(remaining, athlete_event_scores, result)

        if remaining:
            remaining.sort(key=lambda aid: self._athlete_names.get(aid, aid))
            result.extend(remaining)

        return result

    def _tie_break_by_best_score(self, athletes, scores, resolved):
        if not athletes:
            return athletes
        best_counts = {}
        for aid in athletes:
            ev_scores = sorted(scores.get(aid, {}).values(), reverse=True)
            best_counts[aid] = ev_scores[0] if ev_scores else 0

        sorted_by_best = sorted(athletes, key=lambda a: best_counts[a], reverse=True)
        groups = []
        current_group = [sorted_by_best[0]]
        for i in range(1, len(sorted_by_best)):
            if best_counts[sorted_by_best[i]] == best_counts[current_group[0]]:
                current_group.append(sorted_by_best[i])
            else:
                groups.append(current_group)
                current_group = [sorted_by_best[i]]
        groups.append(current_group)

        remaining = []
        for group in groups:
            if len(group) == 1:
                resolved.append(group[0])
            else:
                remaining.extend(group)
        return remaining

    def _tie_break_by_best_single(self, athletes, scores, resolved):
        best_single = {}
        for aid in athletes:
            ev_scores = sorted(scores.get(aid, {}).values(), reverse=True)
            best_single[aid] = ev_scores[0] if ev_scores else 0

        sorted_athletes = sorted(athletes, key=lambda a: best_single[a], reverse=True)
        remaining = []
        current_val = None
        group = []
        for aid in sorted_athletes:
            if current_val is None or best_single[aid] == current_val:
                group.append(aid)
                current_val = best_single[aid]
            else:
                if len(group) == 1:
                    resolved.append(group[0])
                else:
                    remaining.extend(group)
                group = [aid]
                current_val = best_single[aid]
        if group:
            if len(group) == 1:
                resolved.append(group[0])
            else:
                remaining.extend(group)
        return remaining

    def _tie_break_alphabetical(self, athletes, resolved):
        sorted_athletes = sorted(athletes, key=lambda aid: self._athlete_names.get(aid, aid))
        resolved.extend(sorted_athletes)
        return []

    def _tie_break_draw_lot(self, athletes, resolved):
        import random
        shuffled = list(athletes)
        random.shuffle(shuffled)
        resolved.extend(shuffled)
        return []

    def _tie_break_head_to_head(self, athletes, scores, resolved):
        if len(athletes) == 2:
            a1, a2 = athletes
            a1_wins = 0
            a2_wins = 0
            for eid in scores.get(a1, {}):
                if eid in scores.get(a2, {}):
                    if scores[a1][eid] > scores[a2][eid]:
                        a1_wins += 1
                    elif scores[a2][eid] > scores[a1][eid]:
                        a2_wins += 1
            if a1_wins > a2_wins:
                resolved.append(a1)
                resolved.append(a2)
                return []
            elif a2_wins > a1_wins:
                resolved.append(a2)
                resolved.append(a1)
                return []
        remaining = sorted(athletes, key=lambda aid: self._athlete_names.get(aid, aid))
        resolved.extend(remaining)
        return []

    def _build_rank_entries(
        self,
        sorted_athletes: list[str],
        weighted_scores: dict[str, float],
        athlete_event_scores: dict[str, dict[str, float]],
    ) -> list[RankEntry]:
        entries = []
        for idx, aid in enumerate(sorted_athletes):
            rank = idx + 1
            name = self._athlete_names.get(aid, aid)
            ev_scores = athlete_event_scores.get(aid, {})
            raw_total = sum(ev_scores.values())

            is_tied = False
            tie_strategy_used = None
            tie_break_detail = None

            if rank > 1 and weighted_scores[aid] == weighted_scores[sorted_athletes[idx - 1]]:
                is_tied = True
            if rank < len(sorted_athletes) and weighted_scores[aid] == weighted_scores[sorted_athletes[idx + 1]]:
                is_tied = True

            if is_tied and self.tie_rules:
                applied = self.tie_rules[0]
                tie_strategy_used = applied.strategy.value
                tie_break_detail = applied.description

            withdrawal_events = []
            is_wd_affected = False
            for s in self.scores:
                if s.athlete_id == aid and s.is_withdrawal:
                    withdrawal_events.append(s.event_id)
                    is_wd_affected = True

            appeal_ids = [
                a.appeal_id for a in self.appeals
                if a.athlete_id == aid and a.status in (AppealStatus.PENDING, AppealStatus.ACCEPTED)
            ]

            explanation = self._generate_explanation(
                rank, name, weighted_scores[aid], is_tied,
                tie_strategy_used, tie_break_detail,
                is_wd_affected, withdrawal_events, appeal_ids,
            )

            entries.append(RankEntry(
                rank=rank,
                athlete_id=aid,
                athlete_name=name,
                total_score=round(raw_total, 2),
                weighted_score=weighted_scores[aid],
                event_scores=dict(ev_scores),
                is_tied=is_tied,
                tie_strategy_used=tie_strategy_used,
                tie_break_detail=tie_break_detail,
                is_withdrawal_affected=is_wd_affected,
                withdrawal_events=withdrawal_events,
                appeal_ids=appeal_ids,
                explanation=explanation,
            ))
        return entries

    def _generate_explanation(
        self, rank, name, w_score, is_tied,
        tie_strategy, tie_detail, is_wd, wd_events, appeal_ids,
    ) -> str:
        parts = [f"第{rank}名 {name}，加权总分 {w_score}"]
        if is_tied:
            strategy_text = tie_strategy or "未指定"
            detail_text = f"（{tie_detail}）" if tie_detail else ""
            parts.append(f"[同分] 适用规则：{strategy_text}{detail_text}")
        if is_wd:
            parts.append(f"[弃权影响] 弃权项目：{', '.join(wd_events)}")
        if appeal_ids:
            parts.append(f"[申诉中] 申诉编号：{', '.join(appeal_ids)}")
        return "；".join(parts)

    def apply_appeal(self, appeal_id: str, new_status: AppealStatus, resolution: str = ""):
        for a in self.appeals:
            if a.appeal_id == appeal_id:
                old_status = a.status
                a.status = new_status
                a.resolved_at = datetime.now().isoformat()
                a.resolution = resolution
                self.audit.record(
                    "appeal_status_change",
                    appeal_id,
                    old_value=old_status.value,
                    new_value=new_status.value,
                    reason=resolution,
                )
                if new_status == AppealStatus.ACCEPTED and a.event_id:
                    self._adjust_score_for_appeal(a, resolution)
                return
        raise ValueError(f"申诉 {appeal_id} 不存在")

    def _adjust_score_for_appeal(self, appeal: AppealNote, reason: str):
        for s in self.scores:
            if s.athlete_id == appeal.athlete_id and s.event_id == appeal.event_id:
                old_score = s.score
                s.raw_score = s.raw_score or s.score
                s.adjusted = True
                s.adjustment_reason = f"appeal:{appeal.appeal_id}"
                self.audit.record(
                    "score_adjusted",
                    f"{s.athlete_id}/{s.event_id}",
                    old_value=str(old_score),
                    new_value=str(s.score),
                    reason=reason,
                )

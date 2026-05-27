from .models import (
    AthleteScore,
    AppealNote,
    AppealStatus,
    Event,
    TieRule,
    TieStrategy,
    WarningItem,
    WarningSeverity,
    Withdrawal,
    WithdrawalScorePolicy,
)


class WarningChecker:
    def check_all(
        self,
        scores: list[AthleteScore],
        events: dict[str, Event],
        tie_rules: list[TieRule],
        withdrawals: list[Withdrawal],
        appeals: list[AppealNote],
    ) -> list[WarningItem]:
        warnings = []
        warnings.extend(self._check_withdrawal_scoring(scores, withdrawals))
        warnings.extend(self._check_tie_conflicts(tie_rules))
        warnings.extend(self._check_weight_anomalies(events))
        warnings.extend(self._check_dirty_scores(scores, events))
        warnings.extend(self._check_pending_appeals(appeals))
        warnings.extend(self._check_disqualify_scores(scores))
        return warnings

    def _check_withdrawal_scoring(self, scores: list[AthleteScore], withdrawals: list[Withdrawal]) -> list[WarningItem]:
        warnings = []
        wd_by_policy: dict[WithdrawalScorePolicy, list[str]] = {}
        for w in withdrawals:
            wd_by_policy.setdefault(w.score_policy, []).append(f"{w.athlete_id}/{w.event_id}")

        for policy, items in wd_by_policy.items():
            if policy == WithdrawalScorePolicy.AVERAGE:
                warnings.append(WarningItem(
                    severity=WarningSeverity.WARNING,
                    category="弃权计分",
                    message=f"有 {len(items)} 条弃权记录使用「平均分」策略，可能虚高排名",
                    detail="; ".join(items),
                ))
            elif policy == WithdrawalScorePolicy.LAST_PLACE:
                warnings.append(WarningItem(
                    severity=WarningSeverity.INFO,
                    category="弃权计分",
                    message=f"有 {len(items)} 条弃权记录使用「末位分」策略",
                    detail="; ".join(items),
                ))
            elif policy == WithdrawalScorePolicy.DISQUALIFY:
                warnings.append(WarningItem(
                    severity=WarningSeverity.WARNING,
                    category="弃权计分",
                    message=f"有 {len(items)} 条弃权记录使用「取消资格」策略，该选手成绩为 -1",
                    detail="; ".join(items),
                ))

        for s in scores:
            if s.is_withdrawal:
                warnings.append(WarningItem(
                    severity=WarningSeverity.INFO,
                    category="弃权计分",
                    message=f"选手 {s.athlete_name} 在项目 {s.event_id} 弃权，得分调整为 {s.score}",
                    athlete_id=s.athlete_id,
                    event_id=s.event_id,
                ))
        return warnings

    def _check_tie_conflicts(self, tie_rules: list[TieRule]) -> list[WarningItem]:
        warnings = []
        by_event: dict[str, list[TieRule]] = {}
        for r in tie_rules:
            key = r.event_id or "__global__"
            by_event.setdefault(key, []).append(r)

        for key, rules in by_event.items():
            strategies = [r.strategy for r in rules]
            if len(set(strategies)) < len(strategies):
                warnings.append(WarningItem(
                    severity=WarningSeverity.ERROR,
                    category="同分规则",
                    message=f"{'全局' if key == '__global__' else key} 存在重复的同分策略",
                    detail=str([r.strategy.value for r in rules]),
                ))
            if len(rules) > 1:
                priority_values = [r.priority for r in rules]
                if len(set(priority_values)) < len(priority_values):
                    warnings.append(WarningItem(
                        severity=WarningSeverity.WARNING,
                        category="同分规则",
                        message=f"{'全局' if key == '__global__' else key} 有多条同分规则优先级相同，顺序不确定",
                        detail=str([(r.rule_id, r.priority) for r in rules]),
                    ))

        global_rules = by_event.get("__global__", [])
        event_specific = {k: v for k, v in by_event.items() if k != "__global__"}
        if global_rules and event_specific:
            warnings.append(WarningItem(
                severity=WarningSeverity.INFO,
                category="同分规则",
                message="同时存在全局同分规则和项目专属规则，项目规则优先",
                detail=f"全局: {[r.rule_id for r in global_rules]}; 项目: {list(event_specific.keys())}",
            ))

        return warnings

    def _check_weight_anomalies(self, events: dict[str, Event]) -> list[WarningItem]:
        warnings = []
        weights = [e.weight for e in events.values()]
        if not weights:
            return warnings

        if any(w <= 0 for w in weights):
            bad = [eid for eid, e in events.items() if e.weight <= 0]
            warnings.append(WarningItem(
                severity=WarningSeverity.ERROR,
                category="项目权重",
                message=f"以下项目权重 ≤ 0，将导致该项目成绩无效：{', '.join(bad)}",
                detail="权重 ≤ 0 的项目得分乘以权重后为 0 或负值",
            ))

        if max(weights) / min(w for w in weights if w > 0) > 5 if any(w > 0 for w in weights) else False:
            warnings.append(WarningItem(
                severity=WarningSeverity.WARNING,
                category="项目权重",
                message="项目间权重差异超过 5 倍，部分项目可能主导排名",
                detail=f"权重范围: {min(weights)} ~ {max(weights)}",
            ))

        default_weight_events = [eid for eid, e in events.items() if e.weight == 1.0]
        if len(default_weight_events) == len(events) and len(events) > 1:
            warnings.append(WarningItem(
                severity=WarningSeverity.INFO,
                category="项目权重",
                message="所有项目权重均为默认值 1.0，未做差异化设置",
            ))

        return warnings

    def _check_dirty_scores(self, scores: list[AthleteScore], events: dict[str, Event]) -> list[WarningItem]:
        warnings = []
        for s in scores:
            if s.event_id not in events:
                warnings.append(WarningItem(
                    severity=WarningSeverity.ERROR,
                    category="脏数据",
                    message=f"选手 {s.athlete_name} 的项目 {s.event_id} 不在项目列表中",
                    athlete_id=s.athlete_id,
                    event_id=s.event_id,
                ))
            if s.score is not None and s.score < 0 and not s.is_withdrawal:
                warnings.append(WarningItem(
                    severity=WarningSeverity.WARNING,
                    category="脏数据",
                    message=f"选手 {s.athlete_name} 在项目 {s.event_id} 的成绩为负数 ({s.score})",
                    athlete_id=s.athlete_id,
                    event_id=s.event_id,
                ))
            if s.score is not None and not s.is_withdrawal:
                evt = events.get(s.event_id)
                if evt and evt.max_score is not None and s.score > evt.max_score:
                    warnings.append(WarningItem(
                        severity=WarningSeverity.WARNING,
                        category="脏数据",
                        message=f"选手 {s.athlete_name} 成绩 {s.score} 超过项目 {s.event_id} 满分 {evt.max_score}",
                        athlete_id=s.athlete_id,
                        event_id=s.event_id,
                    ))
            if s.score is None and not s.is_withdrawal:
                warnings.append(WarningItem(
                    severity=WarningSeverity.ERROR,
                    category="脏数据",
                    message=f"选手 {s.athlete_name} 在项目 {s.event_id} 无成绩且未标记弃权",
                    athlete_id=s.athlete_id,
                    event_id=s.event_id,
                ))
        return warnings

    def _check_pending_appeals(self, appeals: list[AppealNote]) -> list[WarningItem]:
        warnings = []
        pending = [a for a in appeals if a.status == AppealStatus.PENDING]
        if pending:
            warnings.append(WarningItem(
                severity=WarningSeverity.WARNING,
                category="申诉",
                message=f"有 {len(pending)} 条待处理申诉，排名可能后续变动",
                detail="; ".join(a.appeal_id for a in pending),
            ))
        accepted = [a for a in appeals if a.status == AppealStatus.ACCEPTED]
        for a in accepted:
            warnings.append(WarningItem(
                severity=WarningSeverity.INFO,
                category="申诉",
                message=f"申诉 {a.appeal_id} 已通过，相关成绩已调整",
                athlete_id=a.athlete_id,
                event_id=a.event_id,
            ))
        return warnings

    def _check_disqualify_scores(self, scores: list[AthleteScore]) -> list[WarningItem]:
        warnings = []
        for s in scores:
            if s.score is not None and s.score == -1.0 and not s.is_withdrawal:
                warnings.append(WarningItem(
                    severity=WarningSeverity.WARNING,
                    category="取消资格",
                    message=f"选手 {s.athlete_name} 在项目 {s.event_id} 成绩为 -1（可能被取消资格）",
                    athlete_id=s.athlete_id,
                    event_id=s.event_id,
                ))
        return warnings

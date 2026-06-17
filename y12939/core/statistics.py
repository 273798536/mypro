from typing import List, Dict
from collections import Counter
import pandas as pd
from data.models import TrainingRecord, StatisticsSnapshot, RecordStatus, FailureCategory
from core.engine import RetryEngine, SafetyRuleEngine


class StatisticsService:
    def __init__(self):
        self.safety_engine = SafetyRuleEngine()
        self.retry_engine = RetryEngine(self.safety_engine)

    def build_snapshot(self, records: List[TrainingRecord]) -> StatisticsSnapshot:
        total = len(records)
        by_status = Counter(r.current_status.value for r in records)
        by_failure = Counter(r.failure_category.value for r in records)
        by_qtype = Counter(r.question_type for r in records)

        safety_missing_count = sum(
            1 for r in records
            if r.failure_category in (
                FailureCategory.SAFETY_RULE_MISSING,
                FailureCategory.SAFETY_RULE_MISMATCH,
            )
        )
        safety_missing_rate = safety_missing_count / total if total > 0 else 0.0

        retryable_count = sum(
            1 for r in records
            if self.retry_engine.decide(r).can_retry
        )
        retryable_rate = retryable_count / total if total > 0 else 0.0

        return StatisticsSnapshot(
            total_records=total,
            by_status=dict(by_status),
            by_failure_category=dict(by_failure),
            by_question_type=dict(by_qtype),
            safety_missing_rate=safety_missing_rate,
            retryable_rate=retryable_rate,
        )

    def status_dataframe(self, records: List[TrainingRecord]) -> pd.DataFrame:
        rows = []
        for r in records:
            rows.append({
                "记录ID": r.record_id,
                "批次": r.batch_id,
                "任务名称": r.task_name,
                "题型": r.question_type,
                "失败类别": r.failure_category.value,
                "当前状态": r.current_status.value,
                "重试次数": r.retry_count,
                "已匹配安全规则": ", ".join(r.safety_rule_ids) if r.safety_rule_ids else "无",
                "题库是否匹配": "是" if r.matched_question_bank else "否",
                "人工备注": r.raw_manual_note,
            })
        return pd.DataFrame(rows)

    def failure_category_dataframe(self, records: List[TrainingRecord]) -> pd.DataFrame:
        counter = Counter(r.failure_category.value for r in records)
        total = len(records)
        rows = []
        for cat, cnt in counter.most_common():
            rows.append({
                "失败类别": cat,
                "数量": cnt,
                "占比": f"{cnt / total * 100:.1f}%",
            })
        return pd.DataFrame(rows)

    def safety_issue_dataframe(self, records: List[TrainingRecord]) -> pd.DataFrame:
        rows = []
        for r in records:
            if r.failure_category in (
                FailureCategory.SAFETY_RULE_MISSING,
                FailureCategory.SAFETY_RULE_MISMATCH,
            ):
                issues = self.safety_engine.analyze_safety_issues(r)
                decision = self.retry_engine.decide(r)
                rows.append({
                    "记录ID": r.record_id,
                    "题型": r.question_type,
                    "失败类别": r.failure_category.value,
                    "安全规则": ", ".join(r.safety_rule_ids) if r.safety_rule_ids else "漏配",
                    "题库匹配": "是" if r.matched_question_bank else "否",
                    "问题描述": " | ".join(issues) if issues else r.failure_detail,
                    "能否重试": "可" if decision.can_retry else "否",
                    "人工备注(原话)": r.raw_manual_note,
                })
        return pd.DataFrame(rows)

    def question_type_distribution(self, records: List[TrainingRecord]) -> pd.DataFrame:
        counter = Counter(r.question_type for r in records)
        rows = []
        for qtype, cnt in counter.most_common():
            rows.append({"题型": qtype, "数量": cnt})
        return pd.DataFrame(rows)

    def batch_summary(self, records: List[TrainingRecord]) -> pd.DataFrame:
        batches: Dict[str, List[TrainingRecord]] = {}
        for r in records:
            batches.setdefault(r.batch_id, []).append(r)
        rows = []
        for bid, recs in batches.items():
            total = len(recs)
            blocked = sum(1 for r in recs if r.current_status == RecordStatus.BLOCKED)
            retryable = sum(1 for r in recs if self.retry_engine.decide(r).can_retry)
            safety_issues = sum(
                1 for r in recs
                if r.failure_category in (
                    FailureCategory.SAFETY_RULE_MISSING,
                    FailureCategory.SAFETY_RULE_MISMATCH,
                )
            )
            rows.append({
                "批次ID": bid,
                "记录总数": total,
                "被拦截": blocked,
                "安全规则问题": safety_issues,
                "可重试": retryable,
                "不可用率": f"{(blocked + safety_issues - retryable) / total * 100:.1f}%" if total > 0 else "0%",
            })
        return pd.DataFrame(rows)

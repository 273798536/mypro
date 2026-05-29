from datetime import datetime
from typing import List, Dict, Tuple
from models import (
    CallRecord, DispatchStrategyConfig,
    PendingConfirmationItem, FairnessScoreResult,
    ConclusionChange, StrategySupplementLog, CustomerLevel
)
from store import store
from fairness_algorithm import scorer
from queue_simulation import simulator
import uuid


class FairnessService:
    def __init__(self):
        pass

    def detect_and_hang_anomalies(self, calls: List[CallRecord]) -> List[PendingConfirmationItem]:
        vip_preemptions = scorer.detect_vip_preemption(calls)
        skill_mismatches = scorer.detect_skill_mismatch(calls)
        long_tail_waits = scorer.detect_long_tail_wait(calls)

        all_anomalies = vip_preemptions + skill_mismatches + long_tail_waits

        for item in all_anomalies:
            store.add_pending_confirmation(item)

        return all_anomalies

    def get_pending_confirmation_summary(self) -> Dict:
        pending_items = store.get_pending_confirmations(confirmed=False)
        confirmed_items = store.get_pending_confirmations(confirmed=True)

        return {
            "pending_count": len(pending_items),
            "confirmed_count": len(confirmed_items),
            "pending_by_type": self._group_by_anomaly_type(pending_items),
            "pending_items": pending_items
        }

    def _group_by_anomaly_type(self, items: List[PendingConfirmationItem]) -> Dict[str, int]:
        result = {}
        for item in items:
            type_name = item.anomaly_type.value
            result[type_name] = result.get(type_name, 0) + 1
        return result

    def supplement_strategy_and_track_changes(
        self,
        strategy_id: str,
        operator: str
    ) -> StrategySupplementLog:
        strategy = store.get_strategy(strategy_id)
        if not strategy:
            raise ValueError(f"策略 {strategy_id} 不存在")

        calls = store.get_all_calls()
        affected_calls = []
        conclusion_changes = []

        for call in calls:
            if call.dispatch_strategy_used != strategy.strategy_type:
                original_strategy = call.dispatch_strategy_used
                original_conclusion = self._get_call_conclusion(call)

                store.update_call_strategy(call.call_id, strategy)

                new_conclusion = self._get_call_conclusion(call)

                if original_conclusion != new_conclusion:
                    affected_calls.append(call.call_id)
                    conclusion_changes.append(ConclusionChange(
                        call_id=call.call_id,
                        original_conclusion=original_conclusion,
                        new_conclusion=new_conclusion,
                        change_reason=f"派单策略从{original_strategy.value if original_strategy else '未设置'}变更为{strategy.strategy_type.value}",
                        changed_by=operator,
                        change_time=datetime.now()
                    ))

        supplement_log = StrategySupplementLog(
            log_id=f"supplement_{uuid.uuid4().hex[:8]}",
            strategy_id=strategy_id,
            supplement_time=datetime.now(),
            affected_calls=affected_calls,
            conclusion_changes=conclusion_changes,
            operator=operator
        )

        store.add_strategy_supplement_log(supplement_log)

        return supplement_log

    def _get_call_conclusion(self, call: CallRecord) -> str:
        if call.wait_time_seconds is None:
            return "未开始服务"

        level = call.customer_level
        wait_time = call.wait_time_seconds

        if level == CustomerLevel.VIP:
            if wait_time <= 30:
                return "VIP-优秀"
            elif wait_time <= 60:
                return "VIP-正常"
            else:
                return "VIP-超时"
        else:
            if wait_time <= 120:
                return "普通-优秀"
            elif wait_time <= 180:
                return "普通-正常"
            else:
                return "普通-超时"

    def calculate_fairness_score(self, time_range: Tuple[datetime, datetime] = None) -> FairnessScoreResult:
        calls = store.get_all_calls()

        if time_range:
            start, end = time_range
            calls = [c for c in calls if start <= c.arrival_time <= end]
            applicable_scope = f"{start.strftime('%Y-%m-%d')} 至 {end.strftime('%Y-%m-%d')} 来电"
        else:
            applicable_scope = "全部历史来电"

        if not calls:
            return FairnessScoreResult(
                overall_score=0.0,
                applicable_scope=applicable_scope,
                metrics=[],
                pending_confirmations=[],
                strategy_comparison={},
                failure_reasons=["无来电记录数据"],
                calculation_time=datetime.now(),
                data_version=store.data_version
            )

        metrics, failures = scorer.calculate_fairness_metrics(calls)
        overall_score = scorer.calculate_overall_score(metrics)

        self.detect_and_hang_anomalies(calls)
        pending_items = store.get_pending_confirmations(confirmed=False)

        strategy_comparison = simulator.compare_all_strategies(calls)

        return FairnessScoreResult(
            overall_score=overall_score,
            applicable_scope=applicable_scope,
            metrics=metrics,
            pending_confirmations=pending_items,
            strategy_comparison=strategy_comparison,
            failure_reasons=failures,
            calculation_time=datetime.now(),
            data_version=store.data_version
        )

    def confirm_pending_item(self, item_id: str, confirmed_by: str) -> bool:
        return store.confirm_pending_item(item_id, confirmed_by)

    def get_supplement_logs(self) -> List[StrategySupplementLog]:
        return store.get_supplement_logs()

    def recalculate_strategy_comparison(self) -> Dict[str, float]:
        calls = store.get_all_calls()
        return simulator.update_comparison_on_metric_change(calls)


fairness_service = FairnessService()

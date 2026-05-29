from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from models import (
    CallRecord, CustomerLevel, SkillType,
    DispatchStrategy, DispatchStrategyConfig,
    AnomalyType, PendingConfirmationItem, FairnessMetric
)
from store import store
import uuid


class FairnessScorer:
    def __init__(self):
        self.vip_wait_threshold = 60
        self.regular_wait_threshold = 180
        self.long_tail_threshold = 300
        self.fairness_ratio_threshold = 2.0

    def detect_vip_preemption(self, calls: List[CallRecord]) -> List[PendingConfirmationItem]:
        items = []
        sorted_calls = sorted(calls, key=lambda c: c.arrival_time)

        for i, vip_call in enumerate(sorted_calls):
            if vip_call.customer_level != CustomerLevel.VIP or not vip_call.is_served:
                continue

            related_calls = []
            for j, regular_call in enumerate(sorted_calls):
                if i == j:
                    continue
                if regular_call.customer_level == CustomerLevel.VIP:
                    continue
                if not regular_call.is_served and regular_call.wait_time_seconds:
                    continue

                if (regular_call.arrival_time < vip_call.arrival_time and
                    vip_call.start_service_time and
                    (regular_call.start_service_time is None or
                     regular_call.start_service_time > vip_call.start_service_time)):

                    wait_diff = 0
                    if regular_call.wait_time_seconds and vip_call.wait_time_seconds:
                        wait_diff = regular_call.wait_time_seconds - vip_call.wait_time_seconds

                    if wait_diff > self.vip_wait_threshold:
                        related_calls.append(regular_call.call_id)

            if related_calls:
                item = PendingConfirmationItem(
                    item_id=f"vip_preempt_{uuid.uuid4().hex[:8]}",
                    anomaly_type=AnomalyType.VIP_PREEMPTION,
                    call_id=vip_call.call_id,
                    description=f"VIP来电({vip_call.call_id})可能挤占了{len(related_calls)}个普通用户的服务资源",
                    detected_time=datetime.now(),
                    severity="高",
                    related_calls=related_calls
                )
                items.append(item)

        return items

    def detect_skill_mismatch(self, calls: List[CallRecord]) -> List[PendingConfirmationItem]:
        items = []
        agents = store.get_all_agents()
        agent_skill_map = {a.agent_id: a.skills for a in agents}

        for call in calls:
            if not call.is_served or not call.assigned_agent_id:
                continue

            agent_skills = agent_skill_map.get(call.assigned_agent_id, [])
            if call.required_skill not in agent_skills:
                item = PendingConfirmationItem(
                    item_id=f"skill_mismatch_{uuid.uuid4().hex[:8]}",
                    anomaly_type=AnomalyType.SKILL_MISMATCH,
                    call_id=call.call_id,
                    description=f"来电({call.call_id})需要{call.required_skill.value}技能，但坐席({call.assigned_agent_id})不具备该技能",
                    detected_time=datetime.now(),
                    severity="中"
                )
                items.append(item)

        return items

    def detect_long_tail_wait(self, calls: List[CallRecord]) -> List[PendingConfirmationItem]:
        items = []
        for call in calls:
            if call.wait_time_seconds and call.wait_time_seconds > self.long_tail_threshold:
                item = PendingConfirmationItem(
                    item_id=f"long_tail_{uuid.uuid4().hex[:8]}",
                    anomaly_type=AnomalyType.LONG_TAIL_WAIT,
                    call_id=call.call_id,
                    description=f"来电({call.call_id})等待时间{call.wait_time_seconds}秒，超过长尾阈值{self.long_tail_threshold}秒",
                    detected_time=datetime.now(),
                    severity="中" if call.customer_level == CustomerLevel.REGULAR else "高"
                )
                items.append(item)

        return items

    def calculate_fairness_metrics(self, calls: List[CallRecord]) -> Tuple[List[FairnessMetric], List[str]]:
        metrics = []
        failures = []

        if not calls:
            failures.append("无来电记录数据")
            return metrics, failures

        vip_calls = [c for c in calls if c.customer_level == CustomerLevel.VIP and c.wait_time_seconds is not None]
        regular_calls = [c for c in calls if c.customer_level == CustomerLevel.REGULAR and c.wait_time_seconds is not None]

        if vip_calls:
            avg_vip_wait = sum(c.wait_time_seconds for c in vip_calls) / len(vip_calls)
            metrics.append(FairnessMetric(
                metric_name="VIP平均等待时间",
                value=round(avg_vip_wait, 2),
                unit="秒",
                applicable_scope="VIP客户群体",
                threshold=self.vip_wait_threshold,
                is_normal=avg_vip_wait <= self.vip_wait_threshold
            ))
        else:
            failures.append("VIP来电样本不足")

        if regular_calls:
            avg_regular_wait = sum(c.wait_time_seconds for c in regular_calls) / len(regular_calls)
            metrics.append(FairnessMetric(
                metric_name="普通用户平均等待时间",
                value=round(avg_regular_wait, 2),
                unit="秒",
                applicable_scope="普通用户群体",
                threshold=self.regular_wait_threshold,
                is_normal=avg_regular_wait <= self.regular_wait_threshold
            ))
        else:
            failures.append("普通用户来电样本不足")

        if vip_calls and regular_calls:
            avg_vip_wait = sum(c.wait_time_seconds for c in vip_calls) / len(vip_calls)
            avg_regular_wait = sum(c.wait_time_seconds for c in regular_calls) / len(regular_calls)

            if avg_vip_wait > 0:
                fairness_ratio = avg_regular_wait / avg_vip_wait
                metrics.append(FairnessMetric(
                    metric_name="等待时间公平比",
                    value=round(fairness_ratio, 2),
                    unit="倍",
                    applicable_scope="VIP与普通用户对比",
                    threshold=self.fairness_ratio_threshold,
                    is_normal=fairness_ratio <= self.fairness_ratio_threshold
                ))
            else:
                failures.append("VIP等待时间为0，无法计算公平比")

        served_calls = [c for c in calls if c.is_served]
        if served_calls:
            service_rate = len(served_calls) / len(calls) * 100
            metrics.append(FairnessMetric(
                metric_name="整体接通率",
                value=round(service_rate, 2),
                unit="%",
                applicable_scope="全部来电",
                threshold=90.0,
                is_normal=service_rate >= 90.0
            ))

        long_tail_count = len([c for c in calls if c.wait_time_seconds and c.wait_time_seconds > self.long_tail_threshold])
        long_tail_ratio = long_tail_count / len(calls) * 100 if calls else 0
        metrics.append(FairnessMetric(
            metric_name="长尾等待占比",
            value=round(long_tail_ratio, 2),
            unit="%",
            applicable_scope="全部来电",
            threshold=5.0,
            is_normal=long_tail_ratio <= 5.0
        ))

        return metrics, failures

    def calculate_overall_score(self, metrics: List[FairnessMetric]) -> float:
        if not metrics:
            return 0.0

        weighted_scores = []
        weights = {
            "VIP平均等待时间": 0.25,
            "普通用户平均等待时间": 0.25,
            "等待时间公平比": 0.3,
            "整体接通率": 0.1,
            "长尾等待占比": 0.1
        }

        for metric in metrics:
            weight = weights.get(metric.metric_name, 0.1)

            if metric.metric_name in ["等待时间公平比", "VIP平均等待时间", "普通用户平均等待时间", "长尾等待占比"]:
                if metric.value <= metric.threshold:
                    score = 100.0
                else:
                    ratio = metric.threshold / metric.value
                    score = max(0, 100 * ratio)
            else:
                if metric.value >= metric.threshold:
                    score = 100.0
                else:
                    ratio = metric.value / metric.threshold
                    score = max(0, 100 * ratio)

            weighted_scores.append(score * weight)

        return round(sum(weighted_scores), 2)


scorer = FairnessScorer()

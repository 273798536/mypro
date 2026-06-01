from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
from physics import FlightEvent, EventType
from spacecraft import Spacecraft
from detection import IntegratedDetector
from flight_report import FlightReporter, ResultCategory, FlightTracer
import json


class VerificationStatus(Enum):
    AUTO_PASS = "自动通过"
    NEEDS_REVIEW = "需要审核"
    AUTO_FAIL = "自动失败"


@dataclass
class ReviewItem:
    item_name: str
    category: ResultCategory
    status: VerificationStatus
    value: Any
    confidence: float
    reason: str
    evidence: List[str]
    requires_teacher_verification: bool


@dataclass
class ReviewSummary:
    usable_items: List[ReviewItem]
    needs_verification_items: List[ReviewItem]
    unusable_items: List[ReviewItem]
    overall_assessment: str
    teacher_actions_required: List[str]


class ReviewSystem:
    def __init__(self, spacecraft: Spacecraft, detector: IntegratedDetector,
                 tracer: FlightTracer, reporter: FlightReporter):
        self.spacecraft = spacecraft
        self.detector = detector
        self.tracer = tracer
        self.reporter = reporter
        self.review_items: List[ReviewItem] = []

    def run_full_review(self) -> ReviewSummary:
        self.review_items = []

        self._review_basic_metrics()
        self._review_window_events()
        self._review_collision_events()
        self._review_fuel_usage()
        self._review_event_independence()
        self._review_score_calculation()

        return self._summarize_review()

    def _review_basic_metrics(self):
        state = self.spacecraft.state

        self.review_items.append(ReviewItem(
            item_name="总飞行时间",
            category=ResultCategory.USABLE,
            status=VerificationStatus.AUTO_PASS,
            value=state.time,
            confidence=1.0,
            reason="时间步长累加，计算可靠",
            evidence=[f"总模拟步数: {len(self.tracer.trace_nodes)}"],
            requires_teacher_verification=False
        ))

        self.review_items.append(ReviewItem(
            item_name="总速度增量 (Δv)",
            category=ResultCategory.USABLE,
            status=VerificationStatus.AUTO_PASS,
            value=state.total_delta_v,
            confidence=1.0,
            reason="所有机动的矢量和，计算可靠",
            evidence=[f"机动次数: {len(state.burn_records)}"],
            requires_teacher_verification=False
        ))

        self.review_items.append(ReviewItem(
            item_name="最终位置坐标",
            category=ResultCategory.NEEDS_VERIFICATION,
            status=VerificationStatus.NEEDS_REVIEW,
            value={"x": state.position.x, "y": state.position.y},
            confidence=0.85,
            reason="数值积分结果，受步长精度影响",
            evidence=[f"模拟时间步长: 需老师确认是否合理"],
            requires_teacher_verification=True
        ))

    def _review_window_events(self):
        window_summary = self.detector.window_detector.get_window_summary()

        for planet_name, status in window_summary.items():
            if status["success"]:
                self.review_items.append(ReviewItem(
                    item_name=f"窗口捕获 - {planet_name}",
                    category=ResultCategory.USABLE,
                    status=VerificationStatus.AUTO_PASS,
                    value={
                        "enter_time": status["enter_time"],
                        "closest_approach": status["closest_approach"]
                    },
                    confidence=0.95,
                    reason="时间和距离条件均满足，窗口捕获成功",
                    evidence=[
                        f"进入时间: {status['enter_time']}",
                        f"最近距离: {status['closest_approach']}"
                    ],
                    requires_teacher_verification=False
                ))
            elif status["missed"]:
                self.review_items.append(ReviewItem(
                    item_name=f"窗口错过 - {planet_name}",
                    category=ResultCategory.NEEDS_VERIFICATION,
                    status=VerificationStatus.NEEDS_REVIEW,
                    value={
                        "closest_approach": status["closest_approach"],
                        "closest_time": status["closest_approach_time"]
                    },
                    confidence=0.7,
                    reason="窗口错过事件，需确认判定标准是否合理",
                    evidence=[
                        f"最近点时间: {status['closest_approach_time']}",
                        f"最近距离: {status['closest_approach']}",
                        f"窗口时间段: [{status.get('window', {}).get('start_time', '?')} - {status.get('window', {}).get('end_time', '?')}]"
                    ],
                    requires_teacher_verification=True
                ))

    def _review_collision_events(self):
        collision_summary = self.detector.collision_detector.get_collision_summary()
        events = self.spacecraft.state.events

        collision_events = [e for e in events if e.event_type == EventType.COLLISION]
        risk_events = [e for e in events if e.event_type == EventType.COLLISION_RISK]

        if collision_events:
            for event in collision_events:
                planet = event.details.get("planet", "未知")
                self.review_items.append(ReviewItem(
                    item_name=f"碰撞事件 - {planet}",
                    category=ResultCategory.NEEDS_VERIFICATION,
                    status=VerificationStatus.NEEDS_REVIEW,
                    value={
                        "time": event.time,
                        "distance": event.details.get("distance"),
                        "velocity": event.velocity.magnitude()
                    },
                    confidence=0.8,
                    reason="碰撞判定需老师复核行星半径和碰撞判定参数",
                    evidence=[
                        f"碰撞时间: {event.time}",
                        f"碰撞时距离: {event.details.get('distance')}",
                        f"行星半径: {event.details.get('planet_radius')}"
                    ],
                    requires_teacher_verification=True
                ))

        if risk_events:
            for event in risk_events:
                planet = event.details.get("planet", "未知")
                self.review_items.append(ReviewItem(
                    item_name=f"碰撞风险警告 - {planet}",
                    category=ResultCategory.USABLE,
                    status=VerificationStatus.AUTO_PASS,
                    value={
                        "time": event.time,
                        "distance": event.details.get("distance"),
                        "severity": event.details.get("severity")
                    },
                    confidence=0.9,
                    reason="基于距离阈值的警告，判定可靠",
                    evidence=[
                        f"警告时间: {event.time}",
                        f"距离: {event.details.get('distance')}",
                        f"安全距离: {event.details.get('safe_distance')}"
                    ],
                    requires_teacher_verification=False
                ))

        self.review_items.append(ReviewItem(
            item_name="碰撞检测统计",
            category=ResultCategory.USABLE,
            status=VerificationStatus.AUTO_PASS,
            value={
                "total_checks": collision_summary["total_checks"],
                "warning_count": collision_summary["warning_count"],
                "danger_count": collision_summary["danger_count"]
            },
            confidence=1.0,
            reason="纯统计数据，无歧义",
            evidence=["基于完整的碰撞检测记录"],
            requires_teacher_verification=False
        ))

    def _review_fuel_usage(self):
        fuel_status = self.spacecraft.get_fuel_status()
        burn_records = self.spacecraft.state.burn_records

        self.review_items.append(ReviewItem(
            item_name="初始燃料量",
            category=ResultCategory.USABLE,
            status=VerificationStatus.AUTO_PASS,
            value=fuel_status["initial"],
            confidence=1.0,
            reason="任务参数设定值",
            evidence=["任务配置参数"],
            requires_teacher_verification=False
        ))

        self.review_items.append(ReviewItem(
            item_name="剩余燃料量",
            category=ResultCategory.USABLE,
            status=VerificationStatus.AUTO_PASS,
            value=fuel_status["remaining"],
            confidence=1.0,
            reason="初始燃料减去各次燃料消耗，计算可靠",
            evidence=[f"机动次数: {len(burn_records)}"],
            requires_teacher_verification=False
        ))

        if fuel_status["depleted"]:
            self.review_items.append(ReviewItem(
                item_name="燃料耗尽判定",
                category=ResultCategory.NEEDS_VERIFICATION,
                status=VerificationStatus.NEEDS_REVIEW,
                value=True,
                confidence=0.9,
                reason="燃料耗尽事件需确认是否影响后续结果判定",
                evidence=["需老师确认燃料耗尽后的计分规则"],
                requires_teacher_verification=True
            ))

        for i, burn in enumerate(burn_records):
            self.review_items.append(ReviewItem(
                item_name=f"机动记录 #{i + 1} - {burn.reason}",
                category=ResultCategory.USABLE,
                status=VerificationStatus.AUTO_PASS,
                value={
                    "time": burn.time,
                    "delta_v": burn.delta_v.magnitude(),
                    "fuel_used": burn.fuel_used,
                    "efficiency": burn.delta_v.magnitude() / burn.fuel_used if burn.fuel_used > 0 else 0
                },
                confidence=1.0,
                reason="燃料消耗公式：Δv / 燃料效率，计算准确",
                evidence=[
                    f"Δv = {burn.delta_v.magnitude():.2f}",
                    f"燃料效率 = 0.1",
                    f"燃料消耗 = Δv / 效率 = {burn.fuel_used:.2f}"
                ],
                requires_teacher_verification=False
            ))

    def _review_event_independence(self):
        independence = self.detector.verify_window_collision_independence()

        if independence["independent_events"]:
            self.review_items.append(ReviewItem(
                item_name="事件独立性验证",
                category=ResultCategory.USABLE,
                status=VerificationStatus.AUTO_PASS,
                value=True,
                confidence=0.95,
                reason="窗口错过和碰撞事件在时间上分离，判定为独立事件",
                evidence=["没有检测到时间接近的窗口错过和碰撞事件"],
                requires_teacher_verification=False
            ))
        else:
            self.review_items.append(ReviewItem(
                item_name="事件独立性验证",
                category=ResultCategory.NEEDS_VERIFICATION,
                status=VerificationStatus.NEEDS_REVIEW,
                value=False,
                confidence=0.6,
                reason="检测到时间接近的窗口错过和碰撞事件，可能存在误合并",
                evidence=[
                    f"发现 {len(independence['merged_events_detected'])} 组疑似关联事件",
                    "需老师确认是否为独立事件还是应合并处理"
                ],
                requires_teacher_verification=True
            ))

            for event_group in independence["merged_events_detected"]:
                self.review_items.append(ReviewItem(
                    item_name=f"疑似关联事件 - {event_group['planet']}",
                    category=ResultCategory.UNUSABLE,
                    status=VerificationStatus.AUTO_FAIL,
                    value=event_group,
                    confidence=0.5,
                    reason="事件关联性存疑，暂不纳入统计",
                    evidence=[event_group["details"]],
                    requires_teacher_verification=True
                ))

    def _review_score_calculation(self):
        score_breakdown = self.reporter._generate_score_breakdown()

        self.review_items.append(ReviewItem(
            item_name="基础分数",
            category=ResultCategory.USABLE,
            status=VerificationStatus.AUTO_PASS,
            value=score_breakdown["base_score"],
            confidence=1.0,
            reason="预设标准分",
            evidence=["标准任务基础分为1000分"],
            requires_teacher_verification=False
        ))

        for penalty in score_breakdown["penalty_details"]:
            confidence = 0.9 if "窗口" not in penalty["item"] and "碰撞" not in penalty["item"] else 0.7
            category = ResultCategory.USABLE if confidence >= 0.9 else ResultCategory.NEEDS_VERIFICATION
            needs_verify = confidence < 0.9

            self.review_items.append(ReviewItem(
                item_name=f"扣分 - {penalty['item']}",
                category=category,
                status=VerificationStatus.AUTO_PASS if confidence >= 0.9 else VerificationStatus.NEEDS_REVIEW,
                value=penalty["penalty"],
                confidence=confidence,
                reason=penalty["reason"],
                evidence=[penalty.get("related_to_orbit", "")],
                requires_teacher_verification=needs_verify
            ))

        self.review_items.append(ReviewItem(
            item_name="最终得分",
            category=ResultCategory.NEEDS_VERIFICATION,
            status=VerificationStatus.NEEDS_REVIEW,
            value=score_breakdown["final_score"],
            confidence=0.8,
            reason="最终得分依赖于各扣分项目的审核结果",
            evidence=[
                f"基础分: {score_breakdown['base_score']}",
                f"总扣分: {score_breakdown['total_penalties']}",
                f"最终分: {score_breakdown['final_score']}"
            ],
            requires_teacher_verification=True
        ))

    def _summarize_review(self) -> ReviewSummary:
        usable = [item for item in self.review_items if item.category == ResultCategory.USABLE]
        needs_verify = [item for item in self.review_items if item.category == ResultCategory.NEEDS_VERIFICATION]
        unusable = [item for item in self.review_items if item.category == ResultCategory.UNUSABLE]

        teacher_actions = []
        for item in needs_verify:
            if item.requires_teacher_verification:
                teacher_actions.append(f"[{item.item_name}] {item.reason}")
        for item in unusable:
            if item.requires_teacher_verification:
                teacher_actions.append(f"[{item.item_name}] {item.reason} - 目前不可用")

        if teacher_actions:
            overall = f"存在 {len(teacher_actions)} 项需要物理社团老师确认"
        else:
            overall = "所有项目已自动审核通过，可直接使用"

        return ReviewSummary(
            usable_items=usable,
            needs_verification_items=needs_verify,
            unusable_items=unusable,
            overall_assessment=overall,
            teacher_actions_required=teacher_actions
        )

    def print_review_summary(self, summary: ReviewSummary):
        print("\n" + "=" * 60)
        print("  引力弹弓快递局 - 复核报告")
        print("=" * 60)
        print(f"\n总体评估: {summary.overall_assessment}\n")

        print("-" * 60)
        print("✅ 可直接使用的项目")
        print("-" * 60)
        for item in summary.usable_items:
            print(f"  ✓ {item.item_name} = {item.value}")
            print(f"    置信度: {item.confidence:.0%} | {item.reason}")

        print("\n" + "-" * 60)
        print("⚠️  需要物理社团老师确认的项目")
        print("-" * 60)
        for item in summary.needs_verification_items:
            print(f"  ? {item.item_name} = {item.value}")
            print(f"    置信度: {item.confidence:.0%} | {item.reason}")
            for ev in item.evidence:
                print(f"    证据: {ev}")

        print("\n" + "-" * 60)
        print("❌ 暂时不能算的项目")
        print("-" * 60)
        if summary.unusable_items:
            for item in summary.unusable_items:
                print(f"  ✗ {item.item_name}")
                print(f"    原因: {item.reason}")
        else:
            print("  (无)")

        print("\n" + "-" * 60)
        print("📋 需要老师执行的操作")
        print("-" * 60)
        if summary.teacher_actions_required:
            for i, action in enumerate(summary.teacher_actions_required, 1):
                print(f"  {i}. {action}")
        else:
            print("  无需额外操作")

        print("\n" + "=" * 60)

    def save_review_report(self, summary: ReviewSummary, filename: str):
        report = {
            "overall_assessment": summary.overall_assessment,
            "teacher_actions_required": summary.teacher_actions_required,
            "usable": [
                {
                    "name": item.item_name,
                    "value": item.value,
                    "confidence": item.confidence,
                    "reason": item.reason,
                    "evidence": item.evidence
                }
                for item in summary.usable_items
            ],
            "needs_verification": [
                {
                    "name": item.item_name,
                    "value": item.value,
                    "confidence": item.confidence,
                    "reason": item.reason,
                    "evidence": item.evidence
                }
                for item in summary.needs_verification_items
            ],
            "unusable": [
                {
                    "name": item.item_name,
                    "reason": item.reason,
                    "evidence": item.evidence
                }
                for item in summary.unusable_items
            ]
        }
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

import random
from .models import (
    AthleteScore,
    AppealNote,
    AppealStatus,
    Event,
    TieRule,
    TieStrategy,
    Withdrawal,
    WithdrawalScorePolicy,
)


NAMES = [
    "张伟", "李娜", "王强", "刘洋", "陈晨",
    "杨帆", "赵磊", "黄丽", "周杰", "吴敏",
    "孙悦", "马超", "朱婷", "胡峰", "林丹",
]


class SeedGenerator:
    def generate_normal(self) -> dict:
        events = [
            Event(event_id="E100", name="100米跑", weight=1.0, max_score=100, source="seed_normal"),
            Event(event_id="E200", name="200米跑", weight=1.5, max_score=100, source="seed_normal"),
            Event(event_id="E400", name="跳远", weight=1.2, max_score=50, source="seed_normal"),
            Event(event_id="E500", name="铅球", weight=0.8, max_score=50, source="seed_normal"),
        ]

        scores = []
        for i, name in enumerate(NAMES[:10]):
            aid = f"A{i+1:03d}"
            for evt in events:
                base = random.uniform(40, evt.max_score * 0.95) if evt.max_score else random.uniform(40, 95)
                scores.append(AthleteScore(
                    athlete_id=aid,
                    athlete_name=name,
                    event_id=evt.event_id,
                    score=round(base, 1),
                    source="seed_normal",
                ))

        tie_rules = [
            TieRule(rule_id="TR01", event_id=None, strategy=TieStrategy.GOLD_FIRST, priority=10, description="同分时按最高单项成绩排序", source="seed_normal"),
            TieRule(rule_id="TR02", event_id=None, strategy=TieStrategy.ALPHABETICAL, priority=5, description="最高单项相同时按姓名排序", source="seed_normal"),
        ]

        return {"events": events, "scores": scores, "tie_rules": tie_rules, "withdrawals": [], "appeals": []}

    def generate_dirty(self) -> dict:
        events = [
            Event(event_id="E100", name="100米跑", weight=1.0, max_score=100, source="seed_dirty"),
            Event(event_id="E200", name="200米跑", weight=2.0, max_score=100, source="seed_dirty"),
            Event(event_id="E400", name="跳远", weight=0.0, max_score=50, source="seed_dirty"),
            Event(event_id="E500", name="铅球", weight=-0.5, max_score=50, source="seed_dirty"),
        ]

        scores = [
            AthleteScore(athlete_id="A001", athlete_name="张伟", event_id="E100", score=85.0, source="seed_dirty"),
            AthleteScore(athlete_id="A001", athlete_name="张伟", event_id="E200", score=78.0, source="seed_dirty"),
            AthleteScore(athlete_id="A001", athlete_name="张伟", event_id="E400", score=42.0, source="seed_dirty"),
            AthleteScore(athlete_id="A001", athlete_name="张伟", event_id="E500", score=35.0, source="seed_dirty"),

            AthleteScore(athlete_id="A002", athlete_name="李娜", event_id="E100", score=92.0, source="seed_dirty"),
            AthleteScore(athlete_id="A002", athlete_name="李娜", event_id="E200", score=88.0, source="seed_dirty"),
            AthleteScore(athlete_id="A002", athlete_name="李娜", event_id="E400", score=None, is_withdrawal=True, source="seed_dirty"),
            AthleteScore(athlete_id="A002", athlete_name="李娜", event_id="E500", score=45.0, source="seed_dirty"),

            AthleteScore(athlete_id="A003", athlete_name="王强", event_id="E100", score=78.0, source="seed_dirty"),
            AthleteScore(athlete_id="A003", athlete_name="王强", event_id="E200", score=72.0, source="seed_dirty"),
            AthleteScore(athlete_id="A003", athlete_name="王强", event_id="E400", score=38.0, source="seed_dirty"),
            AthleteScore(athlete_id="A003", athlete_name="王强", event_id="E999", score=50.0, source="seed_dirty"),

            AthleteScore(athlete_id="A004", athlete_name="刘洋", event_id="E100", score=88.0, source="seed_dirty"),
            AthleteScore(athlete_id="A004", athlete_name="刘洋", event_id="E200", score=82.0, source="seed_dirty"),
            AthleteScore(athlete_id="A004", athlete_name="刘洋", event_id="E400", score=-5.0, source="seed_dirty"),
            AthleteScore(athlete_id="A004", athlete_name="刘洋", event_id="E500", score=120.0, source="seed_dirty"),

            AthleteScore(athlete_id="A005", athlete_name="陈晨", event_id="E100", score=88.0, source="seed_dirty"),
            AthleteScore(athlete_id="A005", athlete_name="陈晨", event_id="E200", score=82.0, source="seed_dirty"),
            AthleteScore(athlete_id="A005", athlete_name="陈晨", event_id="E400", score=44.0, source="seed_dirty"),
            AthleteScore(athlete_id="A005", athlete_name="陈晨", event_id="E500", score=None, is_withdrawal=False, source="seed_dirty"),
        ]

        tie_rules = [
            TieRule(rule_id="TR01", event_id=None, strategy=TieStrategy.GOLD_FIRST, priority=10, description="按最高单项", source="seed_dirty"),
            TieRule(rule_id="TR02", event_id=None, strategy=TieStrategy.GOLD_FIRST, priority=10, description="按最高单项（重复）", source="seed_dirty"),
            TieRule(rule_id="TR03", event_id="E100", strategy=TieStrategy.ALPHABETICAL, priority=8, description="100米按姓名", source="seed_dirty"),
        ]

        withdrawals = [
            Withdrawal(athlete_id="A002", event_id="E400", reason="伤病", score_policy=WithdrawalScorePolicy.AVERAGE, source="seed_dirty"),
        ]

        appeals = [
            AppealNote(
                appeal_id="AP001",
                athlete_id="A004",
                event_id="E400",
                description="刘洋铅球成绩录入有误，应为 40 分",
                status=AppealStatus.PENDING,
                source="seed_dirty",
            ),
            AppealNote(
                appeal_id="AP002",
                athlete_id="A002",
                event_id="E100",
                description="李娜100米起跑犯规争议",
                status=AppealStatus.PENDING,
                source="seed_dirty",
            ),
        ]

        return {
            "events": events,
            "scores": scores,
            "tie_rules": tie_rules,
            "withdrawals": withdrawals,
            "appeals": appeals,
        }

    def generate_tie_demo(self) -> dict:
        events = [
            Event(event_id="E100", name="100米跑", weight=1.0, max_score=100, source="seed_tie"),
            Event(event_id="E200", name="跳远", weight=1.0, max_score=50, source="seed_tie"),
        ]

        scores = [
            AthleteScore(athlete_id="A001", athlete_name="张伟", event_id="E100", score=90.0, source="seed_tie"),
            AthleteScore(athlete_id="A001", athlete_name="张伟", event_id="E200", score=40.0, source="seed_tie"),
            AthleteScore(athlete_id="A002", athlete_name="李娜", event_id="E100", score=80.0, source="seed_tie"),
            AthleteScore(athlete_id="A002", athlete_name="李娜", event_id="E200", score=50.0, source="seed_tie"),
            AthleteScore(athlete_id="A003", athlete_name="王强", event_id="E100", score=85.0, source="seed_tie"),
            AthleteScore(athlete_id="A003", athlete_name="王强", event_id="E200", score=45.0, source="seed_tie"),
            AthleteScore(athlete_id="A004", athlete_name="刘洋", event_id="E100", score=80.0, source="seed_tie"),
            AthleteScore(athlete_id="A004", athlete_name="刘洋", event_id="E200", score=50.0, source="seed_tie"),
        ]

        tie_rules = [
            TieRule(rule_id="TR01", event_id=None, strategy=TieStrategy.GOLD_FIRST, priority=10, description="按最高单项成绩", source="seed_tie"),
            TieRule(rule_id="TR02", event_id=None, strategy=TieStrategy.HEAD_TO_HEAD, priority=5, description="直接对决成绩", source="seed_tie"),
            TieRule(rule_id="TR03", event_id=None, strategy=TieStrategy.ALPHABETICAL, priority=1, description="按姓名拼音", source="seed_tie"),
        ]

        return {"events": events, "scores": scores, "tie_rules": tie_rules, "withdrawals": [], "appeals": []}

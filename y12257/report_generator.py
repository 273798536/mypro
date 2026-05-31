from typing import List, Dict
from collections import Counter
from datetime import datetime

from models import Rarity
from gacha_engine import GameSession, DrawRecord, RiskLevel, ProbabilitySnapshot


class ReportGenerator:
    def generate_full_report(self, session: GameSession) -> str:
        report_parts = []

        report_parts.append(self._generate_header(session))
        report_parts.append(self._generate_summary(session))
        report_parts.append(self._generate_probability_playback(session))
        report_parts.append(self._generate_risk_analysis(session))
        report_parts.append(self._generate_detailed_records(session))
        report_parts.append(self._generate_card_analysis(session))
        report_parts.append(self._generate_conclusion(session))

        return "\n\n".join(report_parts)

    def _generate_header(self, session: GameSession) -> str:
        lines = [
            "=" * 80,
            "概率抽卡保底局 - 结算报告",
            "=" * 80,
            f"玩家: {session.player.name}",
            f"抽卡池: {session.pool.name}",
            f"游戏时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        ]
        return "\n".join(lines)

    def _generate_summary(self, session: GameSession) -> str:
        total_draws = len(session.draw_records)
        final_score = max(0, session.total_score - session.risk_penalty)

        rarity_counts = Counter(
            record.rarity for record in session.draw_records
        )

        dupe_count = sum(
            1 for record in session.draw_records if record.is_duplicate
        )

        pity_count = sum(
            1 for record in session.draw_records if record.pity_triggered
        )

        lines = [
            "【游戏总结】",
            "-" * 40,
            f"总抽卡次数: {total_draws}",
            f"原始得分: {session.total_score}",
            f"风险扣分: {session.risk_penalty}",
            f"最终得分: {final_score}",
            "",
            "稀有度分布:",
        ]

        for rarity in [Rarity.LEGENDARY, Rarity.EPIC, Rarity.RARE, Rarity.COMMON]:
            count = rarity_counts.get(rarity, 0)
            rate = count / total_draws * 100 if total_draws > 0 else 0
            lines.append(f"  {rarity.value}: {count}张 ({rate:.1f}%)")

        lines.extend([
            "",
            f"重复卡牌次数: {dupe_count}",
            f"保底触发次数: {pity_count}",
        ])

        return "\n".join(lines)

    def _generate_probability_playback(self, session: GameSession) -> str:
        lines = [
            "【概率结算回放】",
            "-" * 40,
            "(游戏数值策划可查看每一步触发概率结算的详细信息)",
            "",
            f"{'步骤':<6} {'触发原因':<20} {'实际稀有度':<10} {'保底计数':<20} {'概率快照'}",
            "-" * 80,
        ]

        key_records = [
            record for record in session.draw_records
            if record.probability_snapshot and (
                record.pity_triggered or
                record.rarity in [Rarity.LEGENDARY, Rarity.EPIC]
            )
        ]

        if not key_records:
            lines.append("(暂无关键概率结算节点)")
            return "\n".join(lines)

        for record in key_records:
            snap = record.probability_snapshot
            pity_info = ", ".join(
                f"{r.value}:{snap.pity_counters.get(r, 0)}"
                for r in [Rarity.LEGENDARY, Rarity.EPIC]
            )
            prob_info = ", ".join(
                f"{r.value}:{snap.rarity_probabilities.get(r, 0)*100:.1f}%"
                for r in [Rarity.LEGENDARY, Rarity.EPIC]
            )

            lines.extend([
                f"{snap.step:<6} {snap.trigger_reason:<20} {snap.actual_rarity.value:<10} {pity_info:<20}",
                f"      概率: {prob_info}",
                f"      获得卡牌: [{snap.drawn_card_id}] {snap.drawn_card_name}",
                "",
            ])

        return "\n".join(lines)

    def _generate_risk_analysis(self, session: GameSession) -> str:
        lines = [
            "【风险影响分析】",
            "-" * 40,
            "(分析每一次风险提示对最终成绩的影响)",
            "",
        ]

        all_alerts = []
        for record in session.draw_records:
            all_alerts.extend(record.risk_alerts)

        if not all_alerts:
            lines.append("本局游戏无风险提示记录")
            return "\n".join(lines)

        risk_level_counts = Counter(alert.risk_level for alert in all_alerts)

        lines.extend([
            "风险分布统计:",
        ])
        for level in [RiskLevel.CRITICAL, RiskLevel.HIGH, RiskLevel.MEDIUM, RiskLevel.LOW]:
            count = risk_level_counts.get(level, 0)
            if count > 0:
                total_impact = sum(
                    alert.impact_score for alert in all_alerts
                    if alert.risk_level == level
                )
                lines.append(
                    f"  {level.value}: {count}次, 累计扣{total_impact}分"
                )

        lines.extend([
            "",
            "风险事件详情:",
            f"{'步骤':<6} {'风险等级':<10} {'资源':<8} {'当前/需求':<12} {'扣分':<6} {'原因'}",
            "-" * 80,
        ])

        for alert in sorted(all_alerts, key=lambda x: x.step):
            status = f"{alert.current_amount}/{alert.required_amount}"
            lines.append(
                f"{alert.step:<6} {alert.risk_level.value:<10} "
                f"{alert.resource_name:<8} {status:<12} "
                f"-{alert.impact_score:<5} {alert.message}"
            )

        resource_changes = self._track_resource_changes(session)
        if resource_changes:
            lines.extend([
                "",
                "资源变化轨迹:",
            ])
            for res_name, changes in resource_changes.items():
                lines.append(f"  {res_name}: " + " -> ".join(map(str, changes)))

        return "\n".join(lines)

    def _track_resource_changes(self, session: GameSession) -> Dict[str, List[int]]:
        resource_history = {}

        initial_state = {}
        for res_name, resource in session.player.resources.items():
            initial_state[res_name] = resource.current
            for record in session.draw_records:
                if res_name in record.resources_consumed:
                    initial_state[res_name] += record.resources_consumed[res_name]
                if res_name in record.resources_gained:
                    initial_state[res_name] -= record.resources_gained.get(res_name, 0)

        current = dict(initial_state)

        for res_name in initial_state:
            resource_history[res_name] = [initial_state[res_name]]

        for record in session.draw_records:
            for res_name, amount in record.resources_consumed.items():
                if res_name in current:
                    current[res_name] -= amount
            for res_name, amount in record.resources_gained.items():
                if res_name in current:
                    current[res_name] += amount
            for res_name in resource_history:
                resource_history[res_name].append(current.get(res_name, 0))

        return resource_history

    def _generate_detailed_records(self, session: GameSession) -> str:
        lines = [
            "【抽卡明细】",
            "-" * 40,
            f"{'步骤':<6} {'类型':<6} {'卡牌':<15} {'稀有度':<8} {'重复':<6} {'保底':<6} {'消耗'}",
            "-" * 70,
        ]

        for record in session.draw_records:
            consume_str = ", ".join(
                f"{k}:{v}" for k, v in record.resources_consumed.items()
            )
            dupe_str = "是" if record.is_duplicate else "否"
            pity_str = "是" if record.pity_triggered else "否"

            lines.append(
                f"{record.step:<6} {record.draw_type.value:<6} "
                f"{record.card_name:<15} {record.rarity.value:<8} "
                f"{dupe_str:<6} {pity_str:<6} {consume_str}"
            )

            if record.resources_gained:
                gain_str = ", ".join(
                    f"{k}+{v}" for k, v in record.resources_gained.items()
                )
                lines.append(f"      -> 重复转换: {gain_str}")

        return "\n".join(lines)

    def _generate_card_analysis(self, session: GameSession) -> str:
        owned_cards = session.player.owned_cards
        card_details = {}

        for card_id, count in owned_cards.items():
            card = session.pool.get_card_by_id(card_id)
            if card:
                card_details[card_id] = {
                    "name": card.name,
                    "rarity": card.rarity,
                    "count": count,
                }

        lines = [
            "【获得卡牌一览】",
            "-" * 40,
            f"总计获得 {len(owned_cards)} 种卡牌",
            "",
        ]

        for rarity in [Rarity.LEGENDARY, Rarity.EPIC, Rarity.RARE, Rarity.COMMON]:
            rarity_cards = [
                details for details in card_details.values()
                if details["rarity"] == rarity
            ]
            if rarity_cards:
                lines.append(f"{rarity.value} ({len(rarity_cards)}种):")
                for details in sorted(rarity_cards, key=lambda x: x["name"]):
                    lines.append(f"  - {details['name']} x{details['count']}")
                lines.append("")

        return "\n".join(lines)

    def _generate_conclusion(self, session: GameSession) -> str:
        final_score = max(0, session.total_score - session.risk_penalty)
        total_draws = len(session.draw_records)

        if total_draws == 0:
            rating = "未完成"
            comment = "暂无抽卡记录"
        elif final_score >= 500:
            rating = "S"
            comment = "欧皇附体！风险管理优秀，收益最大化"
        elif final_score >= 300:
            rating = "A"
            comment = "运气不错！风险控制良好"
        elif final_score >= 150:
            rating = "B"
            comment = "中规中矩，还有优化空间"
        elif final_score >= 50:
            rating = "C"
            comment = "需要注意资源管理策略"
        else:
            rating = "D"
            comment = "资源透支严重，建议重新规划抽卡节奏"

        lines = [
            "【最终结论】",
            "-" * 40,
            f"评级: {rating}",
            f"评价: {comment}",
            "",
            "建议:",
        ]

        if session.risk_penalty > 50:
            lines.append("  - 严重警告：资源透支过度扣分！请严格控制抽卡预算")
        elif session.risk_penalty > 20:
            lines.append("  - 注意：资源接近枯竭，建议暂停抽卡补充资源")

        dupes = sum(1 for r in session.draw_records if r.is_duplicate)
        if dupes > total_draws * 0.5:
            lines.append("  - 提示：重复率较高，可考虑转换策略")

        if len(lines) == 5:
            lines.append("  - 继续保持良好的抽卡策略！")

        lines.extend([
            "",
            "=" * 80,
            "报告生成完毕",
            "=" * 80,
        ])

        return "\n".join(lines)

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from .engine import MaturityWarning, WarningEngine


class ReportGenerator:
    def __init__(self, engine: WarningEngine):
        self.engine = engine

    def _ascii_bar(self, ratio: float, width: int = 30) -> str:
        filled = int(ratio * width)
        return "█" * filled + "░" * (width - filled)

    def _format_amount(self, amount: float) -> str:
        if amount >= 100000000:
            return f"{amount / 100000000:.2f}亿"
        if amount >= 10000:
            return f"{amount / 10000:.2f}万"
        return f"{amount:.2f}"

    def generate_text_report(self, diffs: Optional[list] = None,
                             quota_diffs: Optional[list] = None,
                             inconsistencies: Optional[list] = None,
                             audit_explanations: Optional[list[str]] = None) -> str:
        lines = []
        lines.append("=" * 72)
        lines.append("                       票 据 池 到 期 预 警 报 告")
        lines.append("=" * 72)
        lines.append(f"报告生成时间: {self.engine.calendar.reference_date.isoformat()}")
        lines.append(f"预警天数阈值: {self.engine.warning_days}天")
        lines.append("")

        quota = self.engine.get_quota_snapshot()
        lines.append("┌" + "─" * 70 + "┐")
        lines.append("│                          票 据 池 额 度 状 况                            │")
        lines.append("├" + "─" * 70 + "┤")
        lines.append(f"│ 票据池ID: {quota['pool_id']:<57}│")
        lines.append(f"│ 总额度:   {self._format_amount(quota['total_quota']):<57}│")
        lines.append(f"│ 已用额度: {self._format_amount(quota['used_quota']):<18} "
                     f"(质押:{self._format_amount(quota['pledged_quota'])} + "
                     f"贴现:{self._format_amount(quota['discounted_quota'])}){'':>23}│")
        lines.append(f"│ 可用额度: {self._format_amount(quota['available_quota']):<57}│")
        usage_ratio = quota['usage_ratio']
        bar = self._ascii_bar(usage_ratio, 40)
        status_color = "正常" if usage_ratio < 0.7 else ("预警" if usage_ratio < 0.9 else "紧张")
        lines.append(f"│ 使用率:   {usage_ratio * 100:>6.2f}% {bar} [{status_color:<6s}]      │")
        lines.append("└" + "─" * 70 + "┘")
        lines.append("")
        lines.append("【额度数据来源说明】")
        lines.append("  - 总额度: 票据池配置的总授信额度")
        lines.append("  - 已用额度 = 质押票据金额 + 贴现票据金额")
        lines.append("  - 质押金额: 来源于票据信息中status='质押'的票据amount字段之和")
        lines.append("  - 贴现金额: 来源于票据信息中status='贴现'的票据amount字段之和")
        lines.append("  - 可用额度 = 总额度 - 已用额度")
        lines.append("")

        risk = self.engine.compute_risk_score()
        lines.append("┌" + "─" * 70 + "┐")
        lines.append("│                            风 险 评 分                                  │")
        lines.append("├" + "─" * 70 + "┤")
        risk_bar = self._ascii_bar(risk['risk_score'] / 100, 50)
        lines.append(f"│ 综合风险评分: {risk['risk_score']:>5.1f} / 100  [{risk_bar}] [{risk['risk_level']}风险]    │")
        lines.append("├" + "─" * 70 + "┤")
        for name, comp in risk['components'].items():
            lines.append(f"│  · {name:<22s}: {comp['value']:>5.1f}  ({comp['explanation'][:38]}...)│")
        lines.append("└" + "─" * 70 + "┘")
        lines.append("")
        lines.append("【风险评分分解说明】")
        for name, comp in risk['components'].items():
            lines.append(f"  {name}:")
            lines.append(f"    得分: {comp['value']}")
            lines.append(f"    解释: {comp['explanation']}")
            lines.append("")

        warnings = self.engine.warnings
        lines.append("┌" + "─" * 70 + "┐")
        lines.append(f"│                        到 期 预 警 明 细  ({len(warnings)}笔)                      │")
        lines.append("├" + "─" * 70 + "┤")
        lines.append(f"│ {'票据ID':<12} {'金额':>10} {'到期日':<12} {'天数':>5} {'状态':>8} {'级别':>8} │")
        lines.append("├" + "─" * 70 + "┤")

        for w in warnings:
            level_mark = "🔴" if w.warning_level in ("已逾期", "今日到期", "紧急") else \
                         "🟡" if w.warning_level == "预警" else "⚪"
            ext_mark = " [顺]" if w.is_extended else ""
            pledge_mark = f" [{w.pledge_release_status}]" if w.pledge_release_status else ""
            lines.append(f"│ {w.bill_id:<12} {self._format_amount(w.amount):>10} "
                         f"{w.effective_maturity_date.isoformat():<12} "
                         f"{w.days_to_maturity:>5d} {w.bill_status.value:>8} "
                         f"{level_mark}{w.warning_level:>6}{ext_mark}{pledge_mark} │")

        lines.append("└" + "─" * 70 + "┘")
        lines.append("")
        lines.append("【预警明细说明】")
        lines.append("  - 🔴红色预警: 已逾期/今日到期/3天内到期，需立即处理")
        lines.append("  - 🟡黄色预警: 7天内到期，需提前安排")
        lines.append("  - [顺]: 该票据已设置到期顺延，到期日为顺延日期")
        lines.append("  - [质押中-待释放]: 该票据当前处于质押状态，需关注质押合同是否按时释放")
        lines.append("  - [释放延迟X天]: 质押合同实际释放日晚于预期释放日X天，额度被额外占用")
        lines.append("")
        lines.append("  数据来源: 票据信息表 → 质押合同表 → 票据池配置")
        lines.append("")

        if diffs:
            lines.append("┌" + "─" * 70 + "┐")
            lines.append(f"│                    与 上 次 运 行 差 异  ({len(diffs)}项)                    │")
            lines.append("├" + "─" * 70 + "┤")
            for d in diffs:
                change_icon = "➕" if "新增" in d.change_type else \
                              "➖" if "消除" in d.change_type else "🔄"
                lines.append(f"│ {change_icon} {d.change_type:<18} [{d.bill_id}]")
                if d.old_value or d.new_value:
                    lines.append(f"│   {d.old_value or '-'} → {d.new_value or '-'}")
                lines.append(f"│   说明: {d.detail}")
            lines.append("└" + "─" * 70 + "┘")
            lines.append("")

        if quota_diffs:
            lines.append("┌" + "─" * 70 + "┐")
            lines.append(f"│                      额 度 指 标 变 化  ({len(quota_diffs)}项)                  │")
            lines.append("├" + "─" * 70 + "┤")
            for d in quota_diffs:
                lines.append(f"│ 🔄 {d.change_type}")
                lines.append(f"│   {d.old_value or '-'} → {d.new_value or '-'}")
                lines.append(f"│   说明: {d.detail}")
            lines.append("└" + "─" * 70 + "┘")
            lines.append("")

        if inconsistencies:
            lines.append("┌" + "─" * 70 + "┐")
            lines.append(f"│                    数 据 一 致 性 问 题  ({len(inconsistencies)}项)                │")
            lines.append("├" + "─" * 70 + "┤")
            for inc in inconsistencies:
                lines.append(f"│ ⚠️  {inc.get('type', '未知问题')}")
                lines.append(f"│   {inc.get('detail', '')}")
            lines.append("└" + "─" * 70 + "┘")
            lines.append("")

        if audit_explanations:
            lines.append("┌" + "─" * 70 + "┐")
            lines.append("│                      审 计 解 释 说 明                                │")
            lines.append("├" + "─" * 70 + "┤")
            for exp in audit_explanations:
                for line in exp.split("\n"):
                    lines.append(f"│ {line[:68]:<68s}│")
            lines.append("└" + "─" * 70 + "┘")
            lines.append("")

        calendar = self.engine.calendar
        lines.append("┌" + "─" * 70 + "┐")
        lines.append("│                           到 期 日 历                                  │")
        lines.append("├" + "─" * 70 + "┤")
        for date_key, day_warnings in sorted(calendar.entries.items()):
            day_amount = sum(w.amount for w in day_warnings)
            day_count = len(day_warnings)
            level_counts = {}
            for w in day_warnings:
                level_counts[w.warning_level] = level_counts.get(w.warning_level, 0) + 1
            level_str = ", ".join(f"{k}{v}笔" for k, v in level_counts.items())
            lines.append(f"│ {date_key:<12} {day_count:>3}笔, 合计{self._format_amount(day_amount):>10}  {level_str:<35}│")
        lines.append("└" + "─" * 70 + "┘")
        lines.append("")

        total_used_in_warnings = sum(w.quota_impact for w in warnings)
        lines.append("-" * 72)
        lines.append(f"预警票据合计: {len(warnings)}笔，涉及额度: {self._format_amount(total_used_in_warnings)}")
        lines.append("=" * 72)

        return "\n".join(lines)

    def save_report(self, output_path: str, content: str,
                    diffs: Optional[list] = None,
                    quota_diffs: Optional[list] = None,
                    inconsistencies: Optional[list] = None) -> str:
        path = Path(output_path)
        path.write_text(content, encoding="utf-8")
        return str(path)

    def save_json(self, output_path: str, warnings: list[MaturityWarning],
                  quota_snapshot: dict, risk_score: dict,
                  diffs: Optional[list] = None,
                  quota_diffs: Optional[list] = None,
                  validation_errors: Optional[list] = None,
                  audit_entries: Optional[list] = None) -> str:
        data = {
            "warnings": [w.to_dict() for w in warnings],
            "quota_snapshot": quota_snapshot,
            "risk_score": risk_score,
            "diffs": [d.to_dict() for d in diffs] if diffs else [],
            "quota_diffs": [d.to_dict() for d in quota_diffs] if quota_diffs else [],
            "validation_errors": [e.to_dict() for e in validation_errors] if validation_errors else [],
            "audit_entries": [e.to_dict() for e in audit_entries] if audit_entries else [],
        }
        path = Path(output_path)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return str(path)

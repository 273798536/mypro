import csv
import json
import os
from dataclasses import asdict
from typing import Optional

from .models import RankingReport, WarningSeverity


class Exporter:
    def __init__(self, output_dir: str = "./output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def export_json(self, report: RankingReport, filename: str = "ranking_report.json") -> str:
        path = os.path.join(self.output_dir, filename)
        data = self._report_to_dict(report)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return path

    def export_csv(self, report: RankingReport, filename: str = "ranking_report.csv") -> str:
        path = os.path.join(self.output_dir, filename)
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "名次", "选手ID", "选手姓名", "原始总分", "加权总分",
                "是否同分", "同分策略", "同分说明",
                "受弃权影响", "弃权项目", "申诉编号", "名次解释",
            ])
            for entry in report.entries:
                writer.writerow([
                    entry.rank,
                    entry.athlete_id,
                    entry.athlete_name,
                    entry.total_score,
                    entry.weighted_score,
                    "是" if entry.is_tied else "否",
                    entry.tie_strategy_used or "",
                    entry.tie_break_detail or "",
                    "是" if entry.is_withdrawal_affected else "否",
                    "; ".join(entry.withdrawal_events),
                    "; ".join(entry.appeal_ids),
                    entry.explanation,
                ])
        return path

    def export_warnings(self, report: RankingReport, filename: str = "warnings.json") -> str:
        path = os.path.join(self.output_dir, filename)
        data = [
            {
                "severity": w.severity.value,
                "category": w.category,
                "message": w.message,
                "athlete_id": w.athlete_id,
                "event_id": w.event_id,
                "detail": w.detail,
            }
            for w in report.warnings
        ]
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return path

    def export_audit(self, report: RankingReport, filename: str = "audit_trail.json") -> str:
        path = os.path.join(self.output_dir, filename)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(report.audit_trail, f, ensure_ascii=False, indent=2)
        return path

    def export_all(self, report: RankingReport, prefix: str = "") -> dict[str, str]:
        p = f"{prefix}_" if prefix else ""
        results = {}
        results["json"] = self.export_json(report, f"{prefix}ranking_report.json")
        results["csv"] = self.export_csv(report, f"{prefix}ranking_report.csv")
        results["warnings"] = self.export_warnings(report, f"{prefix}warnings.json")
        results["audit"] = self.export_audit(report, f"{prefix}audit_trail.json")
        return results

    def print_report(self, report: RankingReport):
        print(f"\n{'='*60}")
        print(f"  {report.title}")
        print(f"  生成时间: {report.generated_at}")
        print(f"  参赛选手: {report.total_athletes}  比赛项目: {report.total_events}")
        print(f"{'='*60}\n")

        print(f"{'名次':<6}{'选手':<10}{'原始分':<10}{'加权分':<10}{'标记':<12}{'名次解释'}")
        print("-" * 90)
        for e in report.entries:
            flags = []
            if e.is_tied:
                flags.append("同分")
            if e.is_withdrawal_affected:
                flags.append("弃权")
            if e.appeal_ids:
                flags.append("申诉中")
            flag_str = ",".join(flags) if flags else "-"
            print(f"{e.rank:<6}{e.athlete_name:<10}{e.total_score:<10.1f}{e.weighted_score:<10.2f}{flag_str:<12}{e.explanation}")

        if report.warnings:
            print(f"\n{'─'*60}")
            print("  ⚠ 警告与提示")
            print(f"{'─'*60}")
            for w in report.warnings:
                icon = {"info": "ℹ", "warning": "⚠", "error": "✖"}.get(w.severity.value, "·")
                print(f"  {icon} [{w.category}] {w.message}")
                if w.detail:
                    print(f"    → {w.detail}")

        if report.tie_rules_applied:
            print(f"\n{'─'*60}")
            print("  📋 适用的同分规则")
            print(f"{'─'*60}")
            for r in report.tie_rules_applied:
                print(f"  · {r['strategy']} (优先级: {r.get('rule_id', '-')}): {r['description']}")

        if report.event_weights:
            print(f"\n{'─'*60}")
            print("  ⚖ 项目权重")
            print(f"{'─'*60}")
            for eid, w in report.event_weights.items():
                print(f"  · {eid}: {w}")

        print(f"\n{'='*60}\n")

    def _report_to_dict(self, report: RankingReport) -> dict:
        return {
            "title": report.title,
            "generated_at": report.generated_at,
            "total_athletes": report.total_athletes,
            "total_events": report.total_events,
            "tie_rules_applied": report.tie_rules_applied,
            "event_weights": report.event_weights,
            "entries": [
                {
                    "rank": e.rank,
                    "athlete_id": e.athlete_id,
                    "athlete_name": e.athlete_name,
                    "total_score": e.total_score,
                    "weighted_score": e.weighted_score,
                    "event_scores": e.event_scores,
                    "is_tied": e.is_tied,
                    "tie_strategy_used": e.tie_strategy_used,
                    "tie_break_detail": e.tie_break_detail,
                    "is_withdrawal_affected": e.is_withdrawal_affected,
                    "withdrawal_events": e.withdrawal_events,
                    "appeal_ids": e.appeal_ids,
                    "explanation": e.explanation,
                }
                for e in report.entries
            ],
            "warnings": [
                {
                    "severity": w.severity.value,
                    "category": w.category,
                    "message": w.message,
                    "athlete_id": w.athlete_id,
                    "event_id": w.event_id,
                    "detail": w.detail,
                }
                for w in report.warnings
            ],
            "audit_trail": report.audit_trail,
        }

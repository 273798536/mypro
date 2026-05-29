from datetime import datetime
from typing import List, Dict, Tuple
from models import CallRecord, CustomerLevel, DownloadReport, FairnessScoreResult
from store import store
from fairness_service import fairness_service
import uuid
import json
import csv
import io


class ReportGenerator:
    def __init__(self):
        pass

    def _get_vip_conclusions(self, calls: List[CallRecord]) -> List[Dict]:
        vip_calls = [c for c in calls if c.customer_level == CustomerLevel.VIP]
        conclusions = []

        for call in vip_calls:
            conclusion = fairness_service._get_call_conclusion(call)
            conclusions.append({
                "call_id": call.call_id,
                "arrival_time": call.arrival_time.isoformat() if call.arrival_time else None,
                "wait_time_seconds": call.wait_time_seconds,
                "conclusion": conclusion,
                "strategy_used": call.dispatch_strategy_used.value if call.dispatch_strategy_used else None
            })

        return conclusions

    def _get_regular_conclusions(self, calls: List[CallRecord]) -> List[Dict]:
        regular_calls = [c for c in calls if c.customer_level == CustomerLevel.REGULAR]
        conclusions = []

        for call in regular_calls:
            conclusion = fairness_service._get_call_conclusion(call)
            conclusions.append({
                "call_id": call.call_id,
                "arrival_time": call.arrival_time.isoformat() if call.arrival_time else None,
                "wait_time_seconds": call.wait_time_seconds,
                "conclusion": conclusion,
                "strategy_used": call.dispatch_strategy_used.value if call.dispatch_strategy_used else None
            })

        return conclusions

    def _get_pending_items_summary(self) -> List[Dict]:
        pending_items = store.get_pending_confirmations(confirmed=False)
        return [
            {
                "item_id": item.item_id,
                "anomaly_type": item.anomaly_type.value,
                "call_id": item.call_id,
                "description": item.description,
                "severity": item.severity,
                "detected_time": item.detected_time.isoformat()
            }
            for item in pending_items
        ]

    def generate_download_report(self, score_result: FairnessScoreResult) -> Tuple[DownloadReport, str]:
        calls = store.get_all_calls()

        vip_conclusions = self._get_vip_conclusions(calls)
        regular_conclusions = self._get_regular_conclusions(calls)
        pending_items = self._get_pending_items_summary()

        summary = {
            "overall_score": score_result.overall_score,
            "score_unit": score_result.score_unit,
            "applicable_scope": score_result.applicable_scope,
            "calculation_time": score_result.calculation_time.isoformat(),
            "data_version": score_result.data_version,
            "total_calls": len(calls),
            "vip_count": len(vip_conclusions),
            "regular_count": len(regular_conclusions),
            "pending_anomalies_count": len(pending_items)
        }

        terminal_summary = self._generate_terminal_summary(
            score_result, vip_conclusions, regular_conclusions, pending_items
        )

        data_consistent = self._verify_data_consistency(
            score_result, vip_conclusions, regular_conclusions
        )

        report = DownloadReport(
            report_id=f"report_{uuid.uuid4().hex[:8]}",
            generated_time=datetime.now(),
            summary=summary,
            vip_conclusions=vip_conclusions,
            regular_conclusions=regular_conclusions,
            pending_items=pending_items,
            data_consistent=data_consistent
        )

        return report, terminal_summary

    def _generate_terminal_summary(
        self,
        score_result: FairnessScoreResult,
        vip_conclusions: List[Dict],
        regular_conclusions: List[Dict],
        pending_items: List[Dict]
    ) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("排队公平性评分报告 - 终端摘要")
        lines.append("=" * 60)
        lines.append(f"综合评分: {score_result.overall_score} {score_result.score_unit}")
        lines.append(f"适用范围: {score_result.applicable_scope}")
        lines.append(f"数据版本: {score_result.data_version}")
        lines.append("")

        lines.append("--- 公平性指标 ---")
        for metric in score_result.metrics:
            status = "✓" if metric.is_normal else "✗"
            lines.append(f"{status} {metric.metric_name}: {metric.value} {metric.unit} (阈值: {metric.threshold}{metric.unit})")

        lines.append("")
        lines.append("--- 客户等级结论统计 ---")

        vip_summary = self._summarize_conclusions(vip_conclusions)
        lines.append(f"VIP客户 ({len(vip_conclusions)}通):")
        for status, count in vip_summary.items():
            lines.append(f"  - {status}: {count}通")

        regular_summary = self._summarize_conclusions(regular_conclusions)
        lines.append(f"普通用户 ({len(regular_conclusions)}通):")
        for status, count in regular_summary.items():
            lines.append(f"  - {status}: {count}通")

        lines.append("")
        lines.append(f"--- 待确认异常 ({len(pending_items)}项) ---")
        for item in pending_items[:5]:
            lines.append(f"  [{item['severity']}] {item['anomaly_type']}: {item['description']}")
        if len(pending_items) > 5:
            lines.append(f"  ... 还有 {len(pending_items) - 5} 项待确认")

        if score_result.failure_reasons:
            lines.append("")
            lines.append("--- 失败原因 ---")
            for reason in score_result.failure_reasons:
                lines.append(f"  - {reason}")

        lines.append("=" * 60)

        return "\n".join(lines)

    def _summarize_conclusions(self, conclusions: List[Dict]) -> Dict[str, int]:
        summary = {}
        for c in conclusions:
            status = c["conclusion"]
            summary[status] = summary.get(status, 0) + 1
        return summary

    def _verify_data_consistency(
        self,
        score_result: FairnessScoreResult,
        vip_conclusions: List[Dict],
        regular_conclusions: List[Dict]
    ) -> bool:
        vip_metric = next((m for m in score_result.metrics if m.metric_name == "VIP平均等待时间"), None)
        regular_metric = next((m for m in score_result.metrics if m.metric_name == "普通用户平均等待时间"), None)

        if vip_metric and vip_conclusions:
            vip_waits = [c["wait_time_seconds"] for c in vip_conclusions if c["wait_time_seconds"] is not None]
            if vip_waits:
                avg_vip = sum(vip_waits) / len(vip_waits)
                if abs(avg_vip - vip_metric.value) > 1:
                    return False

        if regular_metric and regular_conclusions:
            regular_waits = [c["wait_time_seconds"] for c in regular_conclusions if c["wait_time_seconds"] is not None]
            if regular_waits:
                avg_regular = sum(regular_waits) / len(regular_waits)
                if abs(avg_regular - regular_metric.value) > 1:
                    return False

        return True

    def export_to_csv(self, report: DownloadReport) -> io.StringIO:
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["【报告摘要】"])
        writer.writerow(["报告ID", report.report_id])
        writer.writerow(["生成时间", report.generated_time.isoformat()])
        writer.writerow(["综合评分", f"{report.summary['overall_score']} {report.summary['score_unit']}"])
        writer.writerow(["适用范围", report.summary["applicable_scope"]])
        writer.writerow(["数据一致性", "一致" if report.data_consistent else "不一致"])
        writer.writerow([])

        writer.writerow(["【VIP客户结论】"])
        writer.writerow(["来电ID", "到达时间", "等待时间(秒)", "结论", "使用策略"])
        for item in report.vip_conclusions:
            writer.writerow([
                item["call_id"],
                item["arrival_time"],
                item["wait_time_seconds"],
                item["conclusion"],
                item["strategy_used"]
            ])
        writer.writerow([])

        writer.writerow(["【普通用户结论】"])
        writer.writerow(["来电ID", "到达时间", "等待时间(秒)", "结论", "使用策略"])
        for item in report.regular_conclusions:
            writer.writerow([
                item["call_id"],
                item["arrival_time"],
                item["wait_time_seconds"],
                item["conclusion"],
                item["strategy_used"]
            ])
        writer.writerow([])

        writer.writerow(["【待确认异常】"])
        writer.writerow(["异常ID", "异常类型", "来电ID", "描述", "严重程度", "检测时间"])
        for item in report.pending_items:
            writer.writerow([
                item["item_id"],
                item["anomaly_type"],
                item["call_id"],
                item["description"],
                item["severity"],
                item["detected_time"]
            ])

        return output

    def export_to_json(self, report: DownloadReport) -> str:
        return json.dumps(report.dict(), ensure_ascii=False, indent=2)


report_generator = ReportGenerator()

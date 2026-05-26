import json
import csv
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime
import logging

from .models import (
    CheckResult,
    Anomaly,
    Severity,
    AdjustmentEntry,
    RunHistory,
)

logger = logging.getLogger(__name__)


class ReportGenerator:
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_report(
        self,
        check_results: List[CheckResult],
        mapping_anomalies: List[Anomaly],
        adjustment_anomalies: List[Anomaly],
        mapping_summary: Dict,
        adjustment_summary: Dict,
        rule_summary: Dict,
        run_id: str,
        applied_adjustments: List[AdjustmentEntry] = None,
    ) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_filename = f"financial_check_report_{run_id}_{timestamp}.json"
        report_path = self.output_dir / report_filename

        all_anomalies = []
        for result in check_results:
            all_anomalies.extend(result.anomalies)
        all_anomalies.extend(mapping_anomalies)
        all_anomalies.extend(adjustment_anomalies)

        report = {
            "run_id": run_id,
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "mapping": mapping_summary,
                "adjustments": adjustment_summary,
                "rules": rule_summary,
                "total_anomalies": len(all_anomalies),
                "errors": sum(1 for a in all_anomalies if a.severity == Severity.ERROR),
                "warnings": sum(1 for a in all_anomalies if a.severity == Severity.WARNING),
            },
            "check_results": [
                {
                    "rule_name": r.rule_name,
                    "passed": r.passed,
                    "message": r.message,
                    "details": r.details,
                    "anomalies": [self._anomaly_to_dict(a) for a in r.anomalies],
                }
                for r in check_results
            ],
            "mapping_anomalies": [self._anomaly_to_dict(a) for a in mapping_anomalies],
            "adjustment_anomalies": [self._anomaly_to_dict(a) for a in adjustment_anomalies],
            "applied_adjustments": [
                self._adjustment_to_dict(a) for a in (applied_adjustments or [])
            ],
        }

        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        logger.info(f"报告已生成: {report_path}")
        return str(report_path)

    def generate_anomaly_csv(self, anomalies: List[Anomaly], run_id: str) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        csv_filename = f"anomalies_{run_id}_{timestamp}.csv"
        csv_path = self.output_dir / csv_filename

        with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "异常ID",
                "类型",
                "严重程度",
                "消息",
                "涉及科目",
                "详细信息",
                "时间戳",
            ])

            for anomaly in anomalies:
                writer.writerow([
                    anomaly.id,
                    anomaly.type,
                    anomaly.severity,
                    anomaly.message,
                    ", ".join(anomaly.accounts),
                    json.dumps(anomaly.details, ensure_ascii=False),
                    anomaly.timestamp.isoformat(),
                ])

        logger.info(f"异常CSV已生成: {csv_path}")
        return str(csv_path)

    def generate_adjustment_csv(
        self,
        adjustments: List[AdjustmentEntry],
        run_id: str,
        filename_prefix: str = "adjustments",
    ) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        csv_filename = f"{filename_prefix}_{run_id}_{timestamp}.csv"
        csv_path = self.output_dir / csv_filename

        with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "分录ID",
                "日期",
                "摘要",
                "借方科目",
                "贷方科目",
                "金额",
                "来源",
                "是否已应用",
                "创建时间",
                "应用时间",
            ])

            for adj in adjustments:
                writer.writerow([
                    adj.id,
                    adj.date,
                    adj.description,
                    adj.debit_account,
                    adj.credit_account,
                    adj.amount,
                    adj.source,
                    "是" if adj.is_applied else "否",
                    adj.created_at.isoformat(),
                    adj.applied_at.isoformat() if adj.applied_at else "",
                ])

        logger.info(f"调整分录CSV已生成: {csv_path}")
        return str(csv_path)

    def generate_summary_text(self, rule_summary: Dict, mapping_summary: Dict, adjustment_summary: Dict) -> str:
        lines = [
            "=" * 60,
            "财报勾稽检查摘要",
            "=" * 60,
            "",
            "【规则检查】",
            f"  总规则数: {rule_summary['total_rules']}",
            f"  通过: {rule_summary['passed_rules']}",
            f"  失败: {rule_summary['failed_rules']}",
            f"  通过率: {rule_summary['pass_rate']:.1f}%",
            f"  错误: {rule_summary['errors']}",
            f"  警告: {rule_summary['warnings']}",
            "",
            "【科目映射】",
            f"  映射总数: {mapping_summary['total_mappings']}",
            f"  缺失映射: {mapping_summary['missing_mappings_count']}",
            f"  未映射科目: {len(mapping_summary['unmapped_accounts'])}",
            f"  映射覆盖率: {mapping_summary['mapping_coverage']:.1f}%",
            "",
            "【调整分录】",
            f"  总调整数: {adjustment_summary['total_adjustments']}",
            f"  已应用: {adjustment_summary['applied_adjustments']}",
            f"  待处理: {adjustment_summary['pending_adjustments']}",
            f"  调整总额: {adjustment_summary['total_adjustment_amount']:.2f}",
            f"  异常数: {adjustment_summary['anomalies_count']}",
            "",
            "=" * 60,
        ]

        return "\n".join(lines)

    def save_run_history(self, history: RunHistory) -> str:
        history_file = self.output_dir / "run_history.json"
        
        all_history = []
        if history_file.exists():
            with open(history_file, "r", encoding="utf-8") as f:
                all_history = json.load(f)

        history_dict = {
            "run_id": history.run_id,
            "timestamp": history.timestamp.isoformat(),
            "input_dir": history.input_dir,
            "output_dir": history.output_dir,
            "anomalies_count": history.anomalies_count,
            "adjustments_applied": history.adjustments_applied,
            "status": history.status,
        }

        all_history.append(history_dict)

        with open(history_file, "w", encoding="utf-8") as f:
            json.dump(all_history, f, ensure_ascii=False, indent=2)

        return str(history_file)

    def get_run_history(self) -> List[Dict]:
        history_file = self.output_dir / "run_history.json"
        if not history_file.exists():
            return []
        
        with open(history_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def _anomaly_to_dict(self, anomaly: Anomaly) -> Dict[str, Any]:
        return {
            "id": anomaly.id,
            "type": anomaly.type,
            "severity": anomaly.severity,
            "message": anomaly.message,
            "details": anomaly.details,
            "accounts": anomaly.accounts,
            "timestamp": anomaly.timestamp.isoformat(),
        }

    def _adjustment_to_dict(self, adjustment: AdjustmentEntry) -> Dict[str, Any]:
        return {
            "id": adjustment.id,
            "date": adjustment.date,
            "description": adjustment.description,
            "debit_account": adjustment.debit_account,
            "credit_account": adjustment.credit_account,
            "amount": adjustment.amount,
            "source": adjustment.source,
            "is_applied": adjustment.is_applied,
            "created_at": adjustment.created_at.isoformat(),
            "applied_at": adjustment.applied_at.isoformat() if adjustment.applied_at else None,
        }

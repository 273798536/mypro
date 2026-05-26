import json
import csv
import os
from typing import Dict, List, Optional, Any
from datetime import datetime

from .models import (
    SettlementReport,
    RebateRecord,
    RecordStatus,
    SourceInfo,
)
from .storage import DataStore


class ReportExporter:
    def __init__(self, store: DataStore):
        self.store = store

    def generate_settlement_report(self, week: str) -> SettlementReport:
        accounts = self.store.get_accounts_for_week(week)
        if not accounts:
            return SettlementReport(
                report_id=f"rpt_{week}_empty",
                week=week,
                total_volume=0,
                total_rebate=0,
                account_count=0,
                anomaly_count=0,
                cancelled_rebate=0,
                corrected_rebate=0,
                records=[],
            )

        records: List[Dict[str, Any]] = []
        total_volume = 0.0
        total_rebate = 0.0
        anomaly_count = 0
        cancelled_rebate = 0.0
        corrected_rebate = 0.0

        for account_id in accounts:
            account = self.store.get_account(account_id)
            agent_name = account.agent_name if account else account_id

            volume = self.store.get_volume_for_week(account_id, week)
            rebate_record = self._get_latest_rebate(account_id, week)

            if rebate_record:
                total_volume += rebate_record.trade_amount
                total_rebate += rebate_record.adjusted_rebate

                if rebate_record.anomalies:
                    anomaly_count += len(rebate_record.anomalies)

                if rebate_record.status == RecordStatus.CANCELLED:
                    cancelled_rebate += 0
                if rebate_record.status == RecordStatus.CORRECTED:
                    corrected_rebate += rebate_record.adjusted_rebate

                records.append({
                    "account_id": account_id,
                    "agent_name": agent_name,
                    "trade_amount": rebate_record.trade_amount,
                    "fee_amount": rebate_record.fee_amount,
                    "base_rebate": rebate_record.base_rebate,
                    "adjusted_rebate": rebate_record.adjusted_rebate,
                    "fee_rate": rebate_record.fee_rate,
                    "rebate_rate": rebate_record.rebate_rate,
                    "inviter_chain": rebate_record.inviter_chain,
                    "status": rebate_record.status.value,
                    "anomalies": rebate_record.anomalies,
                    "source": rebate_record.source.source_file,
                })
            elif volume:
                total_volume += volume.trade_amount
                records.append({
                    "account_id": account_id,
                    "agent_name": agent_name,
                    "trade_amount": volume.trade_amount,
                    "fee_amount": volume.fee_amount,
                    "base_rebate": 0,
                    "adjusted_rebate": 0,
                    "fee_rate": 0,
                    "rebate_rate": 0,
                    "inviter_chain": [],
                    "status": "pending",
                    "anomalies": [],
                    "source": volume.source.source_file,
                    "warning": "未生成返佣记录，请先执行计算",
                })

        report = SettlementReport(
            report_id=f"rpt_{week}_{datetime.now().strftime('%Y%m%d')}",
            week=week,
            total_volume=round(total_volume, 4),
            total_rebate=round(total_rebate, 4),
            account_count=len(accounts),
            anomaly_count=anomaly_count,
            cancelled_rebate=round(cancelled_rebate, 4),
            corrected_rebate=round(corrected_rebate, 4),
            records=records,
        )

        self.store.reports[report.report_id] = report
        return report

    def _get_latest_rebate(self, account_id: str, week: str) -> Optional[RebateRecord]:
        records = self.store.rebates.get(account_id, [])
        valid_records = [
            r for r in records
            if r.week == week and r.status in (RecordStatus.VALID, RecordStatus.CORRECTED, RecordStatus.CANCELLED)
        ]
        if not valid_records:
            return None

        valid_records.sort(key=lambda x: x.source.imported_at, reverse=True)
        return valid_records[0]

    def export_report_json(self, week: str, output_dir: str = "./reports") -> str:
        report = self.generate_settlement_report(week)
        os.makedirs(output_dir, exist_ok=True)
        filepath = os.path.join(output_dir, f"settlement_{week}.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(report.to_dict(), f, indent=2, ensure_ascii=False)
        return filepath

    def export_report_csv(self, week: str, output_dir: str = "./reports") -> str:
        report = self.generate_settlement_report(week)
        os.makedirs(output_dir, exist_ok=True)
        filepath = os.path.join(output_dir, f"settlement_{week}.csv")

        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([f"交易所手续费返佣结算报告 - {week}"])
            writer.writerow([])
            writer.writerow(["汇总"])
            writer.writerow(["账号数", report.account_count])
            writer.writerow(["总成交量", report.total_volume])
            writer.writerow(["总返佣", report.total_rebate])
            writer.writerow(["异常数", report.anomaly_count])
            writer.writerow(["撤销返佣", report.cancelled_rebate])
            writer.writerow(["修正返佣", report.corrected_rebate])
            writer.writerow([])
            writer.writerow(["明细"])
            writer.writerow([
                "账号", "代理名称", "成交量", "手续费", "基础返佣", "调整后返佣",
                "手续费率", "返佣率", "邀请链路", "状态", "来源", "备注"
            ])

            for rec in report.records:
                anomalies = rec.get("anomalies", [])
                warning = rec.get("warning", "")
                notes = []
                if anomalies:
                    notes.extend([a.get("description", "") for a in anomalies])
                if warning:
                    notes.append(warning)

                writer.writerow([
                    rec.get("account_id", ""),
                    rec.get("agent_name", ""),
                    rec.get("trade_amount", 0),
                    rec.get("fee_amount", 0),
                    rec.get("base_rebate", 0),
                    rec.get("adjusted_rebate", 0),
                    rec.get("fee_rate", 0),
                    rec.get("rebate_rate", 0),
                    " > ".join(rec.get("inviter_chain", [])),
                    rec.get("status", ""),
                    rec.get("source", ""),
                    "; ".join(notes),
                ])

        return filepath

    def export_anomaly_report_csv(self, week: str, output_dir: str = "./reports") -> str:
        report = self.generate_settlement_report(week)
        os.makedirs(output_dir, exist_ok=True)
        filepath = os.path.join(output_dir, f"anomalies_{week}.csv")

        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([f"异常报告 - {week}"])
            writer.writerow([])
            writer.writerow(["账号", "异常类型", "描述", "严重程度", "详情"])

            for rec in report.records:
                anomalies = rec.get("anomalies", [])
                for anomaly in anomalies:
                    writer.writerow([
                        rec.get("account_id", ""),
                        anomaly.get("anomaly_type", ""),
                        anomaly.get("description", ""),
                        anomaly.get("severity", ""),
                        json.dumps(anomaly.get("details", {}), ensure_ascii=False),
                    ])

        return filepath

    def get_all_reports(self) -> List[Dict[str, Any]]:
        return [r.to_dict() for r in self.store.reports.values()]

    def get_report_by_week(self, week: str) -> Optional[SettlementReport]:
        for report in self.store.reports.values():
            if report.week == week:
                return report
        return None

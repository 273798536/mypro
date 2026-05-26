import json
import csv
from pathlib import Path
from typing import List
from datetime import datetime
import pandas as pd
from ..models import ReplenishRecord, ReconciliationSummary, ReplenishStatus


class ReconciliationExporter:
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def export_all(
        self,
        records: List[ReplenishRecord],
        summary: ReconciliationSummary,
        warnings: List[str] = None,
    ) -> dict:
        batch_dir = self.output_dir / f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        batch_dir.mkdir(parents=True, exist_ok=True)

        results = {
            "summary_file": str(self._export_summary(summary, batch_dir)),
            "records_file": str(self._export_records(records, batch_dir)),
            "detail_file": str(self._export_detail(records, batch_dir)),
            "risk_file": str(self._export_risks(records, batch_dir)),
            "audit_file": str(self._export_audit_trail(records, batch_dir)),
            "warnings_file": str(self._export_warnings(warnings or [], batch_dir)),
            "json_file": str(self._export_json(records, summary, batch_dir)),
        }

        return results

    def _export_summary(self, summary: ReconciliationSummary, batch_dir: Path) -> Path:
        filepath = batch_dir / "01_summary.csv"
        data = {
            "批次号": [summary.batch_id],
            "运行日期": [summary.run_date.isoformat()],
            "总记录数": [summary.total_records],
            "补扣成功": [summary.success_count],
            "补扣失败": [summary.failed_count],
            "待处理": [summary.pending_count],
            "客户暂停": [summary.paused_count],
            "待人工复核": [summary.review_required_count],
            "节假日顺延": [summary.deferred_count],
            "重复扣款风险": [summary.duplicate_risk_count],
            "已作废": [summary.cancelled_count],
            "总金额(元)": [round(summary.total_amount, 2)],
            "成功金额(元)": [round(summary.success_amount, 2)],
            "失败金额(元)": [round(summary.failed_amount, 2)],
            "来源文件": ["; ".join(summary.source_files)],
            "生成时间": [summary.generated_at.isoformat()],
        }
        pd.DataFrame(data).to_csv(filepath, index=False, encoding="utf-8-sig")
        return filepath

    def _export_records(self, records: List[ReplenishRecord], batch_dir: Path) -> Path:
        filepath = batch_dir / "02_replenish_records.csv"
        rows = []
        for r in records:
            rows.append({
                "记录ID": r.record_id,
                "回盘流水号": r.bank_return.serial_no,
                "客户编号": r.bank_return.customer_id,
                "客户姓名": r.bank_return.customer_name,
                "计划编号": r.bank_return.plan_id,
                "基金代码": r.customer_plan.fund_code,
                "基金名称": r.customer_plan.fund_name,
                "原定扣款日": r.bank_return.deduct_date.isoformat(),
                "回盘日期": r.bank_return.return_date.isoformat(),
                "扣款金额(元)": round(r.bank_return.amount, 2),
                "返回码": r.bank_return.return_code,
                "返回信息": r.bank_return.return_msg,
                "当前状态": r.status.value,
                "风险标记": "/".join([risk.value for risk in r.risks]) if r.risks else "",
                "计划补扣日": r.scheduled_replenish_date.isoformat() if r.scheduled_replenish_date else "",
                "实际补扣日": r.actual_replenish_date.isoformat() if r.actual_replenish_date else "",
                "补扣次数": r.replenish_attempts,
                "是否已对账": "是" if r.is_reconciled else "否",
                "来源文件": r.bank_return.source_file,
            })
        pd.DataFrame(rows).to_csv(filepath, index=False, encoding="utf-8-sig")
        return filepath

    def _export_detail(self, records: List[ReplenishRecord], batch_dir: Path) -> Path:
        filepath = batch_dir / "03_processing_detail.csv"
        rows = []
        for r in records:
            detail = {
                "记录ID": r.record_id,
                "回盘流水号": r.bank_return.serial_no,
                "客户编号": r.bank_return.customer_id,
                "每月定投金额(元)": round(r.customer_plan.monthly_amount, 2),
                "计划状态": r.customer_plan.status,
                "失败原因": r.failure_reason.reason_name if r.failure_reason else "",
                "是否允许补扣": "是" if (r.failure_reason and r.failure_reason.allow_replenish) else "否",
                "补扣窗口开始": r.replenish_window.window_start.isoformat() if r.replenish_window else "",
                "补扣窗口结束": r.replenish_window.window_end.isoformat() if r.replenish_window else "",
                "已尝试次数": r.replenish_window.attempts_made if r.replenish_window else 0,
                "人工备注数": len(r.manual_remarks),
                "最新备注": r.manual_remarks[-1].content if r.manual_remarks else "",
                "处理状态": r.status.value,
                "风险说明": self._get_risk_description(r),
            }
            rows.append(detail)
        pd.DataFrame(rows).to_csv(filepath, index=False, encoding="utf-8-sig")
        return filepath

    def _export_risks(self, records: List[ReplenishRecord], batch_dir: Path) -> Path:
        filepath = batch_dir / "04_risks.csv"
        rows = []
        for r in records:
            if r.risks:
                for risk in r.risks:
                    rows.append({
                        "记录ID": r.record_id,
                        "回盘流水号": r.bank_return.serial_no,
                        "客户": f"{r.bank_return.customer_name}({r.bank_return.customer_id})",
                        "风险类型": risk.value,
                        "当前状态": r.status.value,
                        "处理建议": self._get_risk_suggestion(risk, r),
                    })
        if rows:
            pd.DataFrame(rows).to_csv(filepath, index=False, encoding="utf-8-sig")
        return filepath

    def _export_audit_trail(self, records: List[ReplenishRecord], batch_dir: Path) -> Path:
        filepath = batch_dir / "05_audit_trail.csv"
        rows = []
        for r in records:
            for trail in r.audit_trail:
                rows.append({
                    "记录ID": r.record_id,
                    "回盘流水号": r.bank_return.serial_no,
                    "时间戳": trail.timestamp.isoformat(),
                    "原状态": trail.from_status.value if trail.from_status else "",
                    "新状态": trail.to_status.value,
                    "操作人": trail.operator,
                    "变更原因": trail.reason,
                    "来源模块": trail.source,
                })
        if rows:
            pd.DataFrame(rows).to_csv(filepath, index=False, encoding="utf-8-sig")
        return filepath

    def _export_warnings(self, warnings: List[str], batch_dir: Path) -> Path:
        filepath = batch_dir / "06_warnings.log"
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"基金定投补扣处理告警日志 - {datetime.now().isoformat()}\n")
            f.write("=" * 60 + "\n\n")
            if warnings:
                for w in warnings:
                    f.write(f"{w}\n")
            else:
                f.write("无告警信息\n")
        return filepath

    def _export_json(
        self,
        records: List[ReplenishRecord],
        summary: ReconciliationSummary,
        batch_dir: Path,
    ) -> Path:
        filepath = batch_dir / "07_full_data.json"
        data = {
            "summary": summary.model_dump(mode="json"),
            "records": [r.model_dump(mode="json") for r in records],
            "export_time": datetime.now().isoformat(),
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        return filepath

    def _get_risk_description(self, record: ReplenishRecord) -> str:
        descriptions = []
        for risk in record.risks:
            if risk == "重复扣款风险":
                descriptions.append("同一客户同一计划同一扣款日存在多笔回盘")
            elif risk == "节假日":
                descriptions.append("补扣日遇节假日需顺延")
            elif risk == "客户暂停":
                descriptions.append("客户定投计划已暂停")
            elif risk == "数据异常":
                descriptions.append("数据字段存在异常")
            elif risk == "需人工确认":
                descriptions.append("需人工复核后处理")
            elif risk == "余额不符":
                descriptions.append("回盘金额与计划金额不符")
        return "; ".join(descriptions)

    def _get_risk_suggestion(self, risk, record: ReplenishRecord) -> str:
        if risk == "重复扣款风险":
            return "请核对多笔回盘是否为同一笔交易，确认后人工标记作废或继续处理"
        elif risk == "节假日":
            return "系统已自动顺延至下一个工作日，请确认补扣日是否在窗口期内"
        elif risk == "客户暂停":
            return "客户已暂停定投，如需恢复请先激活定投计划"
        elif risk == "数据异常":
            return "请检查数据字段完整性和正确性"
        elif risk == "需人工确认":
            return "请运营人员人工复核后决定是否继续补扣"
        elif risk == "余额不符":
            return "请核对回盘金额与计划金额差异原因"
        return "请人工核查"

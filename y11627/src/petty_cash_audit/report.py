from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

from .models import (
    AuditFinding,
    AuditResult,
    FindingSeverity,
    FindingStatus,
    SpotCheckReport,
)


SEVERITY_ORDER = {
    FindingSeverity.CRITICAL: 0,
    FindingSeverity.HIGH: 1,
    FindingSeverity.MEDIUM: 2,
    FindingSeverity.LOW: 3,
}


class ReportGenerator:
    """生成抽检报告，按未处理 / 已修正 / 人工确认分类输出。"""

    def __init__(self, output_dir: str | Path = "output"):
        self.output_dir = Path(output_dir)

    # ------------------------------------------------------------------
    # 分组
    # ------------------------------------------------------------------

    @staticmethod
    def group_by_status(
        findings: list[AuditFinding],
    ) -> dict[FindingStatus, list[AuditFinding]]:
        groups: dict[FindingStatus, list[AuditFinding]] = defaultdict(list)
        for f in findings:
            groups[f.status].append(f)
        return dict(groups)

    @staticmethod
    def group_by_rule(
        findings: list[AuditFinding],
    ) -> dict[str, list[AuditFinding]]:
        groups: dict[str, list[AuditFinding]] = defaultdict(list)
        for f in findings:
            groups[f.rule_id].append(f)
        return dict(groups)

    # ------------------------------------------------------------------
    # 抽检样本
    # ------------------------------------------------------------------

    def select_sample(
        self,
        result: AuditResult,
        sample_size: int = 5,
        seed: int = 42,
    ) -> list[str]:
        """基于风险分数选择抽检样本。优先选取高风险报销单。"""
        if not result.findings:
            return []

        rid_risk: dict[str, float] = defaultdict(float)
        for f in result.findings:
            for rid in f.data_refs.get("reimburse_ids", []):
                rid_risk[rid] += SEVERITY_ORDER.get(f.severity, 2)
            single_rid = f.data_refs.get("reimburse_id")
            if single_rid:
                rid_risk[single_rid] += SEVERITY_ORDER.get(f.severity, 2)

        sorted_rids = sorted(rid_risk.keys(), key=lambda r: rid_risk[r], reverse=True)
        return sorted_rids[:sample_size]

    # ------------------------------------------------------------------
    # 文本报告
    # ------------------------------------------------------------------

    def generate_text(self, result: AuditResult) -> str:
        lines: list[str] = []
        sep = "=" * 70
        sub = "-" * 50

        lines.append(sep)
        lines.append("  备用金报销抽检报告")
        lines.append(sep)
        lines.append("")

        # 概览
        lines.append("【概览】")
        lines.append(f"  报销单数量: {len(result.reimbursements)}")
        lines.append(f"  票据数量: {len(result.invoices)}")
        lines.append(f"  借款记录: {len(result.loans)}")
        lines.append(f"  项目数量: {len(result.projects)}")
        lines.append(f"  审批人数: {len(result.approvers)}")
        lines.append(f"  风险分数: {result.risk_score}/100")
        lines.append("")

        # 抽检样本
        sample_ids = self.select_sample(result)
        if sample_ids:
            lines.append("【抽检样本】")
            for i, rid in enumerate(sample_ids, 1):
                lines.append(f"  {i}. {rid}")
            lines.append("")

        # 按状态分组
        groups = self.group_by_status(result.findings)
        total = len(result.findings)
        lines.append(f"【问题汇总】共 {total} 项")
        lines.append(f"  · 未处理: {len(groups.get(FindingStatus.UNHANDLED, []))}")
        lines.append(f"  · 已修正: {len(groups.get(FindingStatus.CORRECTED, []))}")
        lines.append(f"  · 需人工确认: {len(groups.get(FindingStatus.MANUAL_REVIEW, []))}")
        lines.append("")

        # 未处理
        unhandled = groups.get(FindingStatus.UNHANDLED, [])
        self._append_findings_block(lines, "【未处理】需跟进", unhandled, sub)

        # 已修正
        corrected = groups.get(FindingStatus.CORRECTED, [])
        self._append_findings_block(lines, "【已修正】", corrected, sub)

        # 人工确认
        manual = groups.get(FindingStatus.MANUAL_REVIEW, [])
        self._append_findings_block(lines, "【需人工确认】", manual, sub)

        # 已有抽检报告
        if result.spot_check_reports:
            lines.append(sub)
            lines.append("【已有抽检报告】")
            for rpt in result.spot_check_reports:
                lines.append(f"  报告 {rpt.report_id} (来源: {rpt.source})")
                lines.append(f"    样本: {', '.join(rpt.sample_ids)}")
                lines.append(f"    结论: {rpt.findings}")
            lines.append("")

        lines.append(sep)
        return "\n".join(lines)

    @staticmethod
    def _append_findings_block(
        lines: list[str],
        title: str,
        findings: list[AuditFinding],
        sub: str,
    ):
        lines.append(sub)
        lines.append(f"{title}（{len(findings)} 项）")
        if not findings:
            lines.append("  （无）")
            lines.append("")
            return
        sorted_f = sorted(findings, key=lambda f: SEVERITY_ORDER.get(f.severity, 2))
        for i, f in enumerate(sorted_f, 1):
            sources_str = "; ".join(str(s) for s in f.sources)
            lines.append(f"  {i}. [{f.severity.value}] {f.rule_name} - {f.description}")
            lines.append(f"     来源: {sources_str}")
            if f.status == FindingStatus.CORRECTED and f.correction_note:
                lines.append(f"     修正说明: {f.correction_note}")
            if f.data_refs:
                ref_parts = []
                for k, v in f.data_refs.items():
                    if isinstance(v, list):
                        v = ", ".join(str(x) for x in v)
                    ref_parts.append(f"{k}={v}")
                lines.append(f"     关联: {'; '.join(ref_parts)}")
        lines.append("")

    # ------------------------------------------------------------------
    # JSON 报告
    # ------------------------------------------------------------------

    def generate_json(self, result: AuditResult) -> str:
        groups = self.group_by_status(result.findings)
        sample_ids = self.select_sample(result)

        data = {
            "summary": {
                "reimbursement_count": len(result.reimbursements),
                "invoice_count": len(result.invoices),
                "loan_count": len(result.loans),
                "project_count": len(result.projects),
                "approver_count": len(result.approvers),
                "risk_score": result.risk_score,
            },
            "sample_ids": sample_ids,
            "total_findings": len(result.findings),
            "by_status": {
                "unhandled": len(groups.get(FindingStatus.UNHANDLED, [])),
                "corrected": len(groups.get(FindingStatus.CORRECTED, [])),
                "manual_review": len(groups.get(FindingStatus.MANUAL_REVIEW, [])),
            },
            "findings": [
                {
                    "rule_id": f.rule_id,
                    "rule_name": f.rule_name,
                    "severity": f.severity.value,
                    "description": f.description,
                    "status": f.status.value,
                    "sources": [str(s) for s in f.sources],
                    "data_refs": f.data_refs,
                    "correction_note": f.correction_note,
                }
                for f in result.findings
            ],
        }
        return json.dumps(data, ensure_ascii=False, indent=2)

    # ------------------------------------------------------------------
    # 保存
    # ------------------------------------------------------------------

    def save(self, result: AuditResult, prefix: str = "audit_report") -> dict[str, Path]:
        self.output_dir.mkdir(parents=True, exist_ok=True)
        text_path = self.output_dir / f"{prefix}.txt"
        json_path = self.output_dir / f"{prefix}.json"

        text_path.write_text(self.generate_text(result), encoding="utf-8")
        json_path.write_text(self.generate_json(result), encoding="utf-8")

        return {"text": text_path, "json": json_path}

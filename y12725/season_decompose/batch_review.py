import pandas as pd
from dataclasses import dataclass
from typing import List, Dict, Optional
from pathlib import Path
from .data_loader import LoadedData, DataStatus, DataIssue
from .interpreter import Interpretation
from .audit import AuditLog


@dataclass
class ReviewOutput:
    output_path: str
    summary: Dict[str, int]


class BatchReviewer:
    def __init__(self, audit_log: Optional[AuditLog] = None):
        self.audit_log = audit_log

    def write_back_to_source(
        self,
        source_path: str,
        loaded_data: LoadedData,
        interpretation: Interpretation,
        output_path: Optional[str] = None,
    ) -> ReviewOutput:
        if output_path is None:
            src = Path(source_path)
            output_path = str(src.parent / f"{src.stem}_已复核{src.suffix}")

        original = loaded_data.original_df.copy()
        original["_数据状态"] = loaded_data.status_series.values
        original["_运营提示"] = original["_数据状态"].apply(self._hint_for_status)

        issues_by_row: Dict[int, List[DataIssue]] = {}
        for iss in loaded_data.issues:
            if iss.row_index not in issues_by_row:
                issues_by_row[iss.row_index] = []
            issues_by_row[iss.row_index].append(iss)

        original["_问题描述"] = ""
        for idx, issues in issues_by_row.items():
            descs = [f"[{i.issue_type}] {i.description}" for i in issues]
            original.at[idx, "_问题描述"] = "；".join(descs)

        if self.audit_log is not None:
            original["_修正记录"] = ""
            for i in original.index:
                date_val = str(original.iloc[i].get(loaded_data.df.columns[0], ""))
                changes = self.audit_log.get_changes_for_date(date_val)
                if changes:
                    recs = [
                        f"{c.timestamp} {c.analyst}: {c.old_status}→{c.new_status} ({c.reason})"
                        for c in changes
                    ]
                    original.at[i, "_修正记录"] = " | ".join(recs)

        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)

        if str(output_path).endswith(".csv"):
            original.to_csv(output_path, index=False, encoding="utf-8-sig")
        elif str(output_path).endswith((".xlsx", ".xls")):
            original.to_excel(output_path, index=False)
        else:
            original.to_csv(output_path, index=False, encoding="utf-8-sig")

        summary = {
            "总记录数": len(original),
            "可用": int((original["_数据状态"] == DataStatus.AVAILABLE).sum()),
            "暂缓": int((original["_数据状态"] == DataStatus.PENDING).sum()),
            "需重采": int((original["_数据状态"] == DataStatus.NEED_RECOLLECT).sum()),
        }

        return ReviewOutput(output_path=str(output_path), summary=summary)

    def export_review_report(
        self,
        loaded_data: LoadedData,
        interpretation: Interpretation,
        output_path: str,
    ) -> str:
        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)

        lines = [
            "# 时间序列季节拆分 - 批量复核报告",
            "",
            interpretation.to_markdown(),
            "",
            "---",
            "",
            "## 逐行问题明细",
            "",
        ]

        if not loaded_data.issues:
            lines.append("无数据质量问题。")
        else:
            lines.append(
                "| 行号 | 问题类型 | 描述 | 处理状态 |"
            )
            lines.append("| --- | --- | --- | --- |")
            for iss in loaded_data.issues:
                lines.append(
                    f"| {iss.row_index} | {iss.issue_type} | "
                    f"{iss.description} | {iss.status.value} |"
                )

        if self.audit_log is not None and self.audit_log.records:
            lines.append("")
            lines.append("---")
            lines.append("")
            lines.append(self.audit_log.to_markdown())

        with open(out, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return str(output_path)

    @staticmethod
    def _hint_for_status(status: DataStatus) -> str:
        if status == DataStatus.AVAILABLE:
            return "可直接使用"
        elif status == DataStatus.PENDING:
            return "需数据分析员复核"
        elif status == DataStatus.NEED_RECOLLECT:
            return "需重新采集，已排除"
        return ""

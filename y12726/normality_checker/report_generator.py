from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from .core import CombinedTestResult, TestResult, NormalityVerdict
from .data_processor import ProcessedData
from .visualizer import VisualizationResult


@dataclass
class BatchReport:
    report_id: str
    generated_at: str
    summary_df: pd.DataFrame
    detail_dfs: Dict[str, pd.DataFrame]
    gap_df: pd.DataFrame
    issues_df: pd.DataFrame
    raw_data_dfs: Dict[str, pd.DataFrame]
    n_datasets: int
    n_success: int
    n_empty: int
    n_with_gaps: int


class ReportGenerator:
    def __init__(self, author: str = "建模社助教"):
        self.author = author
        self.report_id_counter = 0

    def _make_report_id(self) -> str:
        self.report_id_counter += 1
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"NORM_TEST_{timestamp}_{self.report_id_counter:03d}"

    def generate_detail_dataframe(
        self,
        processed: ProcessedData,
        test_result: Optional[CombinedTestResult] = None,
    ) -> pd.DataFrame:
        rows = []
        base = {
            "数据集名称": processed.dataset_name,
            "来源材料": processed.source_material,
            "是否空集合": "是" if processed.is_empty else "否",
            "原始样本量": processed.n_raw,
            "清洗后样本量": processed.n_clean,
            "移除NaN数": processed.n_removed_nan,
            "移除Inf数": processed.n_removed_inf,
            "移除异常值数": processed.n_removed_outliers,
            "重复值数": processed.n_duplicates,
            "预处理改变结论": "是" if processed.preprocessing_changed_verdict else "否",
        }

        if test_result is None:
            base["总体结论"] = "未执行检验"
            base["置信度"] = None
            rows.append(base)
        else:
            base["总体结论"] = test_result.overall_verdict.value
            base["置信度"] = round(test_result.overall_confidence, 4)
            base["成功检验数"] = test_result.n_tests_run
            base["跳过检验数"] = test_result.n_tests_skipped
            base["错误检验数"] = test_result.n_tests_error

            if not test_result.individual_results:
                rows.append(base)
            else:
                for tr in test_result.individual_results:
                    row = base.copy()
                    row.update(tr.to_dict())
                    rows.append(row)

        return pd.DataFrame(rows)

    def generate_summary_dataframe(
        self,
        all_processed: List[ProcessedData],
        all_results: List[Optional[CombinedTestResult]],
    ) -> pd.DataFrame:
        rows = []
        for i, (processed, result) in enumerate(
            zip(all_processed, all_results)
        ):
            row = {
                "序号": i + 1,
                "数据集名称": processed.dataset_name,
                "来源材料": processed.source_material,
                "是否空集合": "是" if processed.is_empty else "否",
                "原始样本量": processed.n_raw,
                "清洗后样本量": processed.n_clean,
                "数据问题数": len(processed.issues),
                "材料缺口数": len(processed.gaps),
                "预处理改变结论": "是" if processed.preprocessing_changed_verdict else "否",
            }
            if result is None:
                row["总体结论"] = "未执行"
                row["置信度"] = None
                row["成功检验数"] = 0
                row["跳过检验数"] = 0
                row["错误检验数"] = 0
            else:
                row["总体结论"] = result.overall_verdict.value
                row["置信度"] = round(result.overall_confidence, 4)
                row["成功检验数"] = result.n_tests_run
                row["跳过检验数"] = result.n_tests_skipped
                row["错误检验数"] = result.n_tests_error
            rows.append(row)
        return pd.DataFrame(rows)

    def generate_gap_dataframe(
        self,
        all_processed: List[ProcessedData],
        all_results: List[Optional[CombinedTestResult]],
    ) -> pd.DataFrame:
        rows = []
        gap_id = 0
        for processed, result in zip(all_processed, all_results):
            for gap in processed.gaps:
                gap_id += 1
                rows.append({
                    "缺口编号": f"GAP-{gap_id:04d}",
                    "数据集名称": processed.dataset_name,
                    "来源材料": processed.source_material,
                    "缺口类型": "材料数据",
                    "缺口描述": gap,
                    "影响": "导致样本量不足或无法检验" if processed.is_empty else "可能影响检验结果可靠性",
                    "状态": "待补充",
                })
            if result is not None:
                for gap in result.gap_items:
                    gap_id += 1
                    rows.append({
                        "缺口编号": f"GAP-{gap_id:04d}",
                        "数据集名称": processed.dataset_name,
                        "来源材料": processed.source_material,
                        "缺口类型": "图表/附件",
                        "缺口描述": gap,
                        "影响": "投委会复核时缺少佐证材料",
                        "状态": "待补充",
                    })
        if not rows:
            return pd.DataFrame(columns=[
                "缺口编号", "数据集名称", "来源材料", "缺口类型", "缺口描述", "影响", "状态"
            ])
        return pd.DataFrame(rows)

    def generate_issues_dataframe(
        self,
        all_processed: List[ProcessedData],
        all_results: List[Optional[CombinedTestResult]],
    ) -> pd.DataFrame:
        rows = []
        issue_id = 0
        for processed, result in zip(all_processed, all_results):
            for issue in processed.issues:
                issue_id += 1
                rows.append({
                    "问题编号": f"ISSUE-{issue_id:04d}",
                    "数据集名称": processed.dataset_name,
                    "来源材料": processed.source_material,
                    "问题来源": "数据预处理",
                    "问题描述": issue,
                    "严重程度": "高" if processed.is_empty else "中",
                })
            if result is not None:
                for issue in result.issues:
                    issue_id += 1
                    rows.append({
                        "问题编号": f"ISSUE-{issue_id:04d}",
                        "数据集名称": processed.dataset_name,
                        "来源材料": processed.source_material,
                        "问题来源": "假设检验",
                        "问题描述": issue,
                        "严重程度": "高" if result.overall_verdict == NormalityVerdict.INCONCLUSIVE else "中",
                    })
        if not rows:
            return pd.DataFrame(columns=[
                "问题编号", "数据集名称", "来源材料", "问题来源", "问题描述", "严重程度"
            ])
        return pd.DataFrame(rows)

    def generate_raw_data_dataframe(
        self,
        processed: ProcessedData,
    ) -> pd.DataFrame:
        data = {"序号": [], "原始值": [], "清洗状态": [], "备注": []}

        if processed.raw_data is None:
            return pd.DataFrame(data)

        outlier_set = set(processed.outlier_indices)
        raw_list = processed.raw_data.tolist()

        cleaned_idx = 0
        for i, val in enumerate(raw_list):
            data["序号"].append(i + 1)
            data["原始值"].append(val)

            if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
                data["清洗状态"].append("已移除")
                data["备注"].append("NaN/Inf值")
            elif i in outlier_set:
                data["清洗状态"].append("已移除")
                data["备注"].append(f"异常值(IQR×1.5)")
            else:
                data["清洗状态"].append("保留")
                cleaned_idx += 1
                cleaned_len = len(processed.cleaned_data) if processed.cleaned_data is not None else 0
                if cleaned_idx <= cleaned_len:
                    data["备注"].append(f"清洗后第{cleaned_idx}个")
                else:
                    data["备注"].append("")

        return pd.DataFrame(data)

    def generate_batch_report(
        self,
        all_processed: List[ProcessedData],
        all_results: List[Optional[CombinedTestResult]],
    ) -> BatchReport:
        report_id = self._make_report_id()
        generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        summary_df = self.generate_summary_dataframe(all_processed, all_results)

        detail_dfs: Dict[str, pd.DataFrame] = {}
        raw_data_dfs: Dict[str, pd.DataFrame] = {}
        for i, (processed, result) in enumerate(
            zip(all_processed, all_results)
        ):
            key = f"{i+1:02d}_{processed.dataset_name}"
            detail_dfs[key] = self.generate_detail_dataframe(processed, result)
            raw_data_dfs[key] = self.generate_raw_data_dataframe(processed)

        gap_df = self.generate_gap_dataframe(all_processed, all_results)
        issues_df = self.generate_issues_dataframe(all_processed, all_results)

        n_datasets = len(all_processed)
        n_success = sum(
            1 for r in all_results
            if r is not None and r.overall_verdict in (NormalityVerdict.NORMAL, NormalityVerdict.NON_NORMAL)
        )
        n_empty = sum(1 for p in all_processed if p.is_empty)
        n_with_gaps = sum(1 for p in all_processed if len(p.gaps) > 0)

        return BatchReport(
            report_id=report_id,
            generated_at=generated_at,
            summary_df=summary_df,
            detail_dfs=detail_dfs,
            gap_df=gap_df,
            issues_df=issues_df,
            raw_data_dfs=raw_data_dfs,
            n_datasets=n_datasets,
            n_success=n_success,
            n_empty=n_empty,
            n_with_gaps=n_with_gaps,
        )

    def export_to_excel(
        self,
        report: BatchReport,
        filepath: str,
        include_raw_data: bool = True,
    ) -> str:
        os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
        if not filepath.lower().endswith(".xlsx"):
            filepath = f"{filepath}.xlsx"

        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            info_df = pd.DataFrame({
                "项目": [
                    "报告编号", "生成时间", "编制人",
                    "数据集总数", "成功得出结论数", "空集合数", "含材料缺口数",
                ],
                "值": [
                    report.report_id, report.generated_at, self.author,
                    report.n_datasets, report.n_success, report.n_empty, report.n_with_gaps,
                ],
            })
            info_df.to_excel(writer, sheet_name="报告信息", index=False)

            report.summary_df.to_excel(writer, sheet_name="汇总", index=False)

            if len(report.gap_df) > 0:
                report.gap_df.to_excel(writer, sheet_name="材料缺口清单", index=False)
            if len(report.issues_df) > 0:
                report.issues_df.to_excel(writer, sheet_name="问题清单", index=False)

            for key, detail_df in report.detail_dfs.items():
                sheet_name = key[:31].replace("/", "_").replace("\\", "_")
                detail_df.to_excel(writer, sheet_name=f"明细_{sheet_name}", index=False)

            if include_raw_data:
                for key, raw_df in report.raw_data_dfs.items():
                    sheet_name = key[:28].replace("/", "_").replace("\\", "_")
                    if len(raw_df) > 0:
                        raw_df.to_excel(writer, sheet_name=f"原始_{sheet_name}", index=False)

        return filepath

    def export_to_csv(
        self,
        report: BatchReport,
        output_dir: str,
        include_raw_data: bool = True,
    ) -> List[str]:
        os.makedirs(output_dir, exist_ok=True)
        saved = []

        summary_path = os.path.join(output_dir, f"{report.report_id}_summary.csv")
        report.summary_df.to_csv(summary_path, index=False, encoding="utf-8-sig")
        saved.append(summary_path)

        if len(report.gap_df) > 0:
            gap_path = os.path.join(output_dir, f"{report.report_id}_gaps.csv")
            report.gap_df.to_csv(gap_path, index=False, encoding="utf-8-sig")
            saved.append(gap_path)

        if len(report.issues_df) > 0:
            issues_path = os.path.join(output_dir, f"{report.report_id}_issues.csv")
            report.issues_df.to_csv(issues_path, index=False, encoding="utf-8-sig")
            saved.append(issues_path)

        detail_dir = os.path.join(output_dir, "details")
        os.makedirs(detail_dir, exist_ok=True)
        for key, detail_df in report.detail_dfs.items():
            safe_key = key.replace("/", "_").replace("\\", "_")
            detail_path = os.path.join(detail_dir, f"{safe_key}_detail.csv")
            detail_df.to_csv(detail_path, index=False, encoding="utf-8-sig")
            saved.append(detail_path)

        if include_raw_data:
            raw_dir = os.path.join(output_dir, "raw_data")
            os.makedirs(raw_dir, exist_ok=True)
            for key, raw_df in report.raw_data_dfs.items():
                if len(raw_df) > 0:
                    safe_key = key.replace("/", "_").replace("\\", "_")
                    raw_path = os.path.join(raw_dir, f"{safe_key}_raw.csv")
                    raw_df.to_csv(raw_path, index=False, encoding="utf-8-sig")
                    saved.append(raw_path)

        return saved

    def generate_text_summary(
        self,
        report: BatchReport,
    ) -> str:
        lines = [
            "=" * 60,
            f"正态性检验批量报告",
            f"报告编号: {report.report_id}",
            f"生成时间: {report.generated_at}",
            f"编制人: {self.author}",
            "=" * 60,
            "",
            f"数据集总数: {report.n_datasets}",
            f"成功得出结论: {report.n_success}",
            f"空集合数量: {report.n_empty}",
            f"含材料缺口: {report.n_with_gaps}",
            "",
        ]

        lines.append("-" * 60)
        lines.append("汇总表:")
        lines.append("-" * 60)
        if len(report.summary_df) > 0:
            lines.append(report.summary_df.to_string(index=False))
        lines.append("")

        if len(report.gap_df) > 0:
            lines.append("-" * 60)
            lines.append("材料缺口清单（需建模社助教补充）:")
            lines.append("-" * 60)
            for _, row in report.gap_df.iterrows():
                lines.append(
                    f"  [{row['缺口编号']}] {row['数据集名称']} ({row['来源材料']}):"
                )
                lines.append(f"      {row['缺口描述']}")
                lines.append(f"      影响: {row['影响']}")
            lines.append("")

        if len(report.issues_df) > 0:
            lines.append("-" * 60)
            lines.append("问题清单（供投委会复核参考）:")
            lines.append("-" * 60)
            for _, row in report.issues_df.iterrows():
                lines.append(
                    f"  [{row['问题编号']}] ({row['严重程度']}) {row['数据集名称']}:"
                )
                lines.append(f"      [{row['问题来源']}] {row['问题描述']}")
            lines.append("")

        lines.append("=" * 60)
        lines.append("说明:")
        lines.append("  · 空集合数据已在报告中标注来源材料，便于助教追踪补录")
        lines.append("  · 图表生成失败的项目已列入缺口清单，不影响整体报告输出")
        lines.append("  · 预处理前后结论变化已在明细中标注，便于投委会追溯判断依据")
        lines.append("=" * 60)

        return "\n".join(lines)

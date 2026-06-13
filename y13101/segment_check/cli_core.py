import os
import sys
import json
from typing import List, Dict, Optional
from tabulate import tabulate

from .models import (
    MaterialRecord, ValidationResult, ValidationStats,
    RecordStatus, ValidationStatus, ChangeType,
)
from .validator import SegmentRegressionValidator, SegmentConfig
from .data_loader import DataLoader
from .history import HistoryManager, AnomalyQueue


class CLIRenderer:
    @staticmethod
    def render_stats(stats: ValidationStats) -> str:
        lines = []
        lines.append("")
        lines.append("╔" + "═" * 48 + "╗")
        lines.append("║" + " " * 15 + "分段回归边界校验 - 统计" + " " * 13 + "║")
        lines.append("╠" + "═" * 48 + "╣")

        data = stats.to_dict()
        labels = list(data.keys())
        values = list(data.values())

        for i in range(0, len(labels), 2):
            label1 = labels[i]
            val1 = values[i]
            if i + 1 < len(labels):
                label2 = labels[i + 1]
                val2 = values[i + 1]
                line = f"║  {label1:<8}: {val1:>6}      {label2:<8}: {val2:>6}   ║"
            else:
                line = f"║  {label1:<8}: {val1:>6}                            ║"
            lines.append(line)

        lines.append("╚" + "═" * 48 + "╝")
        lines.append("")

        bad_info = ""
        if stats.bad_rows > 0:
            bad_info = f"⚠ 共 {stats.bad_rows} 行坏数据，已保留原始痕迹，请查看明细"
        skip_info = ""
        if stats.skipped_rows > 0:
            skip_info = f"⏭ 共 {stats.skipped_rows} 行跳过，未参与校验"
        if bad_info or skip_info:
            lines.append(bad_info)
            lines.append(skip_info)
            lines.append("")

        return "\n".join(lines)

    @staticmethod
    def render_detailed_results(records: List[MaterialRecord], results: List[ValidationResult]) -> str:
        lines = []
        lines.append("")
        lines.append("── 校验明细 ──")

        result_map = {r.record_id: r for r in results}
        table_data = []

        for record in records:
            result = result_map.get(record.record_id)
            if not result:
                continue

            status_icon = {
                ValidationStatus.PASS: "✅",
                ValidationStatus.FAIL: "❌",
                ValidationStatus.WARNING: "⚠️",
                ValidationStatus.SUSPENDED: "⏸",
                ValidationStatus.PENDING: "⏳",
            }.get(result.status, "?")

            record_icon = {
                RecordStatus.VALID: " ",
                RecordStatus.BAD: "💥",
                RecordStatus.SKIPPED: "⏭",
                RecordStatus.PENDING: " ",
                RecordStatus.SUSPENDED: "⏸",
            }.get(record.status, " ")

            segments_pass = all(result.boundary_checks.values()) if result.boundary_checks else False
            segment_detail = "/".join([
                "✓" if v else "✗"
                for v in result.boundary_checks.values()
            ]) or "-"

            note = ""
            if record.status == RecordStatus.BAD:
                note = record.error_message or ""
            elif result.warnings:
                note = result.warnings[0]
            elif result.errors:
                note = result.errors[0]

            table_data.append([
                status_icon,
                record_icon,
                record.material_name[:10],
                result.status.value,
                segment_detail,
                f"{record.source_file}:{record.source_line}",
                note[:40] if note else "",
            ])

        headers = ["校验", "数据", "材料", "状态", "分段(低/中/高)", "来源", "说明"]
        lines.append(tabulate(table_data, headers=headers, tablefmt="simple", showindex=False))
        lines.append("")

        lines.append("  图例: 数据列 💥=坏行  ⏭=跳过行")
        lines.append("")

        return "\n".join(lines)

    @staticmethod
    def render_suspended(suspended: List[tuple]) -> str:
        if not suspended:
            return ""

        lines = []
        lines.append("")
        lines.append("▓▓▓ 挂起队列 - 需负责人确认 ▓▓▓")
        lines.append("")
        table_data = []
        for record, result in suspended:
            table_data.append([
                record.record_id,
                record.material_name,
                result.suspension_reason or "",
                f"{record.source_file}:{record.source_line}",
            ])
        headers = ["记录ID", "材料名称", "挂起原因", "来源位置"]
        lines.append(tabulate(table_data, headers=headers, tablefmt="grid"))
        lines.append("")
        lines.append("  ⚠ 以上记录因除零或边界异常已挂起，请勿使用假稳定结论。")
        lines.append("  请负责人确认数据后使用 --resume 或 --override 继续处理。")
        lines.append("")
        return "\n".join(lines)

    @staticmethod
    def render_raw_data_trace(record: MaterialRecord) -> str:
        lines = []
        lines.append("")
        lines.append(f"── 原始数据留痕 [{record.material_name}] ({record.source_file}:{record.source_line}) ──")
        if record.raw_data:
            for key, value in record.raw_data.items():
                if value is not None and str(value).strip():
                    lines.append(f"  {key}: {value}")
        else:
            lines.append("  (原始数据已按配置保留，此处为空)")
        if record.error_message:
            lines.append(f"  【问题标记】{record.error_message}")
        lines.append("")
        return "\n".join(lines)

    @staticmethod
    def render_anomaly_queue(queue: AnomalyQueue) -> str:
        all_items = queue.get_all()
        if not all_items:
            return ""

        pending = queue.get_pending()

        lines = []
        lines.append("")
        lines.append("░░░ 异常队列 ░░░")
        if pending:
            lines.append(f"  ⏰ 待处理: {len(pending)} 条  |  累计: {len(all_items)} 条")
        else:
            lines.append(f"  ✅ 无需处理  |  累计: {len(all_items)} 条")
        lines.append("")
        table_data = queue.to_table_data()
        lines.append(tabulate(table_data, headers="keys", tablefmt="simple"))
        lines.append("")
        return "\n".join(lines)

    @staticmethod
    def render_history(entries: List[Dict], limit: int = 10) -> str:
        if not entries:
            return "  (暂无历史记录)\n"

        lines = []
        lines.append("")
        lines.append(f"── 变更历史 (最近 {min(limit, len(entries))} 条) ──")
        lines.append("")
        display = entries[:limit]
        headers = list(display[0].keys())
        table_data = [[e[h] for h in headers] for e in display]
        lines.append(tabulate(table_data, headers=headers, tablefmt="simple"))
        lines.append("")
        lines.append("  * 小孟的临时判断已全部记录，下一班可展开查看详情。")
        lines.append("")
        return "\n".join(lines)

    @staticmethod
    def render_segment_metrics(result: ValidationResult) -> str:
        if not result.segment_metrics:
            return ""

        lines = []
        lines.append("")
        lines.append(f"── 分段回归指标 [{result.material_name}] ──")

        table_data = []
        for segment_name, metrics in result.segment_metrics.items():
            passed = result.boundary_checks.get(segment_name, False)
            marker = "✓" if passed else "✗"
            row = {
                "分段": f"{marker} {segment_name}",
                "点数": metrics.get("point_count", "-"),
                "斜率": f"{metrics.get('slope', '-'):.6f}" if isinstance(metrics.get('slope'), float) else "-",
                "截距": f"{metrics.get('intercept', '-'):.4f}" if isinstance(metrics.get('intercept'), float) else "-",
                "R²": f"{metrics.get('r_squared', '-'):.4f}" if isinstance(metrics.get('r_squared'), float) else "-",
                "X范围": f"{metrics.get('x_min', '-')}~{metrics.get('x_max', '-')}",
            }
            table_data.append(row)

        if table_data:
            headers = list(table_data[0].keys())
            data_rows = [[r[h] for h in headers] for r in table_data]
            lines.append(tabulate(data_rows, headers=headers, tablefmt="simple"))

        lines.append("  * 图表展示口径与上述明细一致：低/中/高三段独立回归。")
        lines.append("")
        return "\n".join(lines)


class SegmentCheckCLI:
    def __init__(self, work_dir: str = None):
        self.work_dir = work_dir or os.getcwd()
        self.validator = SegmentRegressionValidator()
        self.data_loader = DataLoader(preserve_raw=True)
        self.history = HistoryManager(storage_path=os.path.join(self.work_dir, ".segment_check_history"))
        self.anomaly_queue = AnomalyQueue()
        self.records: List[MaterialRecord] = []
        self.results: List[ValidationResult] = []
        self.renderer = CLIRenderer()

    def set_expected_materials(self, names: List[str]):
        self.data_loader.expected_material_names = names

    def import_file(self, file_path: str, expected_names: List[str] = None) -> Dict:
        if expected_names:
            self.set_expected_materials(expected_names)

        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".json":
            new_records = self.data_loader.load_json(file_path)
        else:
            new_records = self.data_loader.load_csv(file_path)

        for record in new_records:
            self.history.record_import(record)

        merged, changes = self.data_loader.merge_records(self.records, new_records)
        self.records = merged

        for change in changes:
            if change.get("type") in ("potential_duplicate",):
                self.anomaly_queue.add_import_change(change)

        return {
            "imported_count": len(new_records),
            "total_count": len(self.records),
            "changes": changes,
            "new_records": new_records,
        }

    def validate(self, specific_ids: List[str] = None) -> Dict:
        target_records = self.records
        if specific_ids:
            target_records = [r for r in self.records if r.record_id in specific_ids]

        prev_results_map = {r.record_id: r for r in self.results}
        results, stats = self.validator.batch_validate(target_records)

        new_results = []
        for record, result in zip(target_records, results):
            prev = prev_results_map.get(record.record_id)
            self.history.record_validation(record, result, prev)
            self.anomaly_queue.add_result(record, result, prev)
            new_results.append(result)

        self.results = new_results
        return {
            "stats": stats,
            "results": results,
            "suspended": [
                (r, res) for r, res in zip(target_records, results)
                if res.status == ValidationStatus.SUSPENDED
            ],
        }

    def manual_override(self, record_id: str, new_status: str, operator: str = "小孟", comment: str = ""):
        record = next((r for r in self.records if r.record_id == record_id), None)
        result = next((r for r in self.results if r.record_id == record_id), None)
        if not record or not result:
            raise ValueError(f"未找到记录: {record_id}")

        prev = ValidationResult(
            record_id=result.record_id,
            material_name=result.material_name,
            status=result.status,
            segment_metrics=dict(result.segment_metrics),
            boundary_checks=dict(result.boundary_checks),
            warnings=list(result.warnings),
            errors=list(result.errors),
        )

        result.status = ValidationStatus(new_status)
        result.warnings.append(f"[人工调整] 操作人: {operator}; 原因: {comment or '临时判断'}")

        self.history.record_manual_override(record, result, prev, operator=operator, comment=comment)
        self.anomaly_queue.add_result(record, result, prev, change_context=f"人工调整: {prev.status.value}→{new_status}")

        return result

    def get_record_raw_trace(self, record_id: str) -> str:
        record = next((r for r in self.records if r.record_id == record_id), None)
        if not record:
            return f"未找到记录: {record_id}"
        return self.renderer.render_raw_data_trace(record)

    def render_report(self, include_detail: bool = True, include_anomaly: bool = True,
                      include_history: bool = True, include_metrics: bool = True) -> str:
        output = []
        _, stats = self.validator.batch_validate(self.records)

        output.append(self.renderer.render_stats(stats))

        suspended = [
            (r, res) for r, res in zip(self.records, self.results)
            if res and res.status == ValidationStatus.SUSPENDED
        ]
        output.append(self.renderer.render_suspended(suspended))

        if include_detail and self.records and self.results:
            output.append(self.renderer.render_detailed_results(self.records, self.results))

        if include_metrics and self.results:
            for result in self.results:
                output.append(self.renderer.render_segment_metrics(result))

        if include_anomaly:
            output.append(self.renderer.render_anomaly_queue(self.anomaly_queue))

        if include_history:
            output.append(self.renderer.render_history(self.history.get_change_summary(), limit=8))

        bad_records = [r for r in self.records if r.status == RecordStatus.BAD]
        if bad_records:
            output.append("── 坏行原始数据留痕 ──")
            for record in bad_records[:3]:
                output.append(self.renderer.render_raw_data_trace(record))
            if len(bad_records) > 3:
                output.append(f"  ... 另有 {len(bad_records) - 3} 条坏行原始数据已保存，可通过 --trace <ID> 查看\n")

        return "\n".join(output)

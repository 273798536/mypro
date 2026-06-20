from typing import List, Dict, Any, Tuple
from datetime import datetime
from .models import (
    GrayscaleResult,
    GrayscaleChange,
    ProcessingRecord,
    ProcessingStatus,
    ConfirmationReason,
)


class GrayscaleAnalyzer:
    @staticmethod
    def analyze(
        run_id: str,
        original_record: ProcessingRecord,
        updated_record: ProcessingRecord,
    ) -> GrayscaleResult:
        sample_changes: List[GrayscaleChange] = []
        threshold_changes: List[GrayscaleChange] = []
        manual_adjustments: List[GrayscaleChange] = []

        original_cost = GrayscaleAnalyzer._get_total_cost(original_record)
        final_cost = GrayscaleAnalyzer._get_total_cost(updated_record)

        if original_record.training_log and updated_record.training_log:
            sample_changes = GrayscaleAnalyzer._detect_sample_changes(
                original_record.training_log.mapped_fields,
                updated_record.training_log.mapped_fields,
            )

        threshold_changes = GrayscaleAnalyzer._detect_threshold_changes(
            original_record.cost_calculations,
            updated_record.cost_calculations,
        )

        manual_adjustments = GrayscaleAnalyzer._detect_manual_changes(
            original_record, updated_record
        )

        total_sample_impact = sum(c.impact for c in sample_changes)
        total_threshold_impact = sum(c.impact for c in threshold_changes)
        total_manual_impact = sum(c.impact for c in manual_adjustments)

        return GrayscaleResult(
            run_id=run_id,
            original_cost=original_cost,
            final_cost=final_cost,
            sample_changes=sample_changes,
            threshold_changes=threshold_changes,
            manual_adjustments=manual_adjustments,
            total_sample_impact=total_sample_impact,
            total_threshold_impact=total_threshold_impact,
            total_manual_impact=total_manual_impact,
        )

    @staticmethod
    def _get_total_cost(record: ProcessingRecord) -> float:
        for calc in record.cost_calculations:
            if calc.formula.name == "总成本":
                return calc.result
        return 0.0

    @staticmethod
    def _detect_sample_changes(
        original_fields: Dict[str, Any], updated_fields: Dict[str, Any]
    ) -> List[GrayscaleChange]:
        changes: List[GrayscaleChange] = []
        sample_fields = [
            "sample_count",
            "training_hours",
            "gpu_count",
            "experiment_name",
            "model_name",
        ]

        for field in sample_fields:
            old_val = original_fields.get(field)
            new_val = updated_fields.get(field)
            if old_val != new_val:
                impact = 0.0
                if field in ["sample_count", "training_hours", "gpu_count"]:
                    old_num = float(old_val) if old_val else 0.0
                    new_num = float(new_val) if new_val else 0.0
                    impact = new_num - old_num

                changes.append(
                    GrayscaleChange(
                        change_type="样本数据变更",
                        old_value=old_val,
                        new_value=new_val,
                        impact=impact,
                        description=f"字段 {field} 从 {old_val} 变更为 {new_val}",
                    )
                )

        return changes

    @staticmethod
    def _detect_threshold_changes(
        original_calcs: List[Any], updated_calcs: List[Any]
    ) -> List[GrayscaleChange]:
        changes: List[GrayscaleChange] = []

        original_map = {c.formula.name: c for c in original_calcs}
        updated_map = {c.formula.name: c for c in updated_calcs}

        for name, updated_calc in updated_map.items():
            original_calc = original_map.get(name)
            if not original_calc:
                continue

            old_formula = original_calc.formula
            new_formula = updated_calc.formula

            if (
                old_formula.boundary_min != new_formula.boundary_min
                or old_formula.boundary_max != new_formula.boundary_max
            ):
                impact = 0.0
                if updated_calc.result != original_calc.result:
                    impact = updated_calc.result - original_calc.result

                changes.append(
                    GrayscaleChange(
                        change_type="阈值调整",
                        old_value={
                            "min": old_formula.boundary_min,
                            "max": old_formula.boundary_max,
                        },
                        new_value={
                            "min": new_formula.boundary_min,
                            "max": new_formula.boundary_max,
                        },
                        impact=impact,
                        description=(
                            f"{name} 边界值调整: "
                            f"[{old_formula.boundary_min}, {old_formula.boundary_max}] "
                            f"→ [{new_formula.boundary_min}, {new_formula.boundary_max}]"
                        ),
                    )
                )

        return changes

    @staticmethod
    def _detect_manual_changes(
        original: ProcessingRecord, updated: ProcessingRecord
    ) -> List[GrayscaleChange]:
        changes: List[GrayscaleChange] = []

        if original.processed_by != updated.processed_by and updated.processed_by != "system":
            changes.append(
                GrayscaleChange(
                    change_type="人工改判",
                    old_value=original.processed_by or "system",
                    new_value=updated.processed_by,
                    impact=0.0,
                    description=f"处理人从 {original.processed_by or 'system'} 变更为 {updated.processed_by}",
                )
            )

        if original.status != updated.status and updated.status == ProcessingStatus.PROCESSED:
            if original.status == ProcessingStatus.NEEDS_CONFIRMATION:
                impact = 0.0
                original_cost = GrayscaleAnalyzer._get_total_cost(original)
                updated_cost = GrayscaleAnalyzer._get_total_cost(updated)
                impact = updated_cost - original_cost

                changes.append(
                    GrayscaleChange(
                        change_type="人工确认通过",
                        old_value=original.status.value,
                        new_value=updated.status.value,
                        impact=impact,
                        description=f"状态从 {original.status.value} 人工确认为 {updated.status.value}",
                    )
                )

        if original.confirmation_note != updated.confirmation_note:
            changes.append(
                GrayscaleChange(
                    change_type="人工备注",
                    old_value=original.confirmation_note,
                    new_value=updated.confirmation_note,
                    impact=0.0,
                    description="人工添加或修改了确认备注",
                )
            )

        return changes

    @staticmethod
    def check_needs_confirmation(
        result: GrayscaleResult,
    ) -> Tuple[bool, List[str]]:
        anomalies: List[str] = []
        total_impact = abs(result.total_manual_impact) + abs(result.total_threshold_impact)

        if abs(result.total_manual_impact) > 1000:
            anomalies.append(
                f"人工改判对成本影响较大: {result.total_manual_impact:.2f}元"
            )

        if result.manual_adjustments and len(result.manual_adjustments) >= 3:
            anomalies.append(f"存在 {len(result.manual_adjustments)} 处人工调整，建议复核")

        if abs(result.final_cost - result.original_cost) / max(abs(result.original_cost), 1) > 0.5:
            anomalies.append(
                f"灰度前后成本变化超过50%: {result.original_cost:.2f} → {result.final_cost:.2f}"
            )

        return len(anomalies) > 0, anomalies

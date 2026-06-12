from typing import Dict, Any, Optional, List
from datetime import datetime

from models import (
    BayesianInput,
    BayesianResult,
    RecalculationCheck,
    HistoryRecord,
    ProcessingResult,
    CalculationStatus,
)
from bayesian_calculator import BayesianCalculator


class RecalculationVerifier:
    DEFAULT_TOLERANCE = 1e-6

    def __init__(self, tolerance: float = DEFAULT_TOLERANCE):
        self.tolerance = tolerance
        self.calculator = BayesianCalculator()

    def verify_consistency(
        self,
        input_data: BayesianInput,
        original_result: BayesianResult,
        record: HistoryRecord,
    ) -> RecalculationCheck:
        chart_value = self.calculator.calculate_for_chart(input_data)
        detail_value = self.calculator.calculate_for_detail(input_data)

        chart_value_clamped = max(0.0, min(1.0, chart_value))
        detail_value_clamped = max(0.0, min(1.0, detail_value))
        original_posterior = original_result.posterior_probability

        mismatched_fields = []

        if abs(chart_value_clamped - detail_value_clamped) > self.tolerance:
            mismatched_fields.append("图表与明细计算口径不一致")

        if abs(chart_value_clamped - original_posterior) > self.tolerance:
            mismatched_fields.append("图表口径与最终结果不一致")

        if abs(detail_value_clamped - original_posterior) > self.tolerance:
            mismatched_fields.append("明细口径与最终结果不一致")

        chart_path = (
            f"图表口径: P(A|B) = P(B|A)*P(A)/P(B) = "
            f"{input_data.likelihood:.6f} * {input_data.prior_probability:.6f} / {input_data.marginal_likelihood:.6f} = "
            f"{chart_value:.6f}"
        )

        detail_path = (
            f"明细口径: P(A|B) = clamp(P(B|A))*clamp(P(A))/clamp(P(B)) = "
            f"{max(0.0, min(1.0, input_data.likelihood)):.6f} * "
            f"{max(0.0, min(1.0, input_data.prior_probability)):.6f} / "
            f"{max(0.0, min(1.0, input_data.marginal_likelihood)):.6f} = "
            f"{detail_value:.6f}"
        )

        is_consistent = len(mismatched_fields) == 0

        difference = max(
            abs(chart_value_clamped - detail_value_clamped),
            abs(chart_value_clamped - original_posterior),
            abs(detail_value_clamped - original_posterior),
        )

        return RecalculationCheck(
            is_consistent=is_consistent,
            chart_value=chart_value,
            detail_value=detail_value,
            difference=difference,
            tolerance=self.tolerance,
            chart_calculation_path=chart_path,
            detail_calculation_path=detail_path,
            mismatched_fields=mismatched_fields,
        )

    def recalculate_record(
        self,
        record: HistoryRecord,
        manual_params: Optional[Dict[str, float]] = None,
    ) -> ProcessingResult:
        from history_processor import HistoryProcessor

        processor = HistoryProcessor()

        is_empty, empty_reason = processor.detect_empty_set(record)
        if is_empty:
            return ProcessingResult(
                record=record,
                status=record.status if hasattr(record, 'status') else "empty_set",
                failure_reason=empty_reason,
            )

        if manual_params:
            input_data = BayesianInput(
                prior_probability=manual_params.get("prior", 0.0),
                likelihood=manual_params.get("likelihood", 0.0),
                marginal_likelihood=manual_params.get("evidence", 0.0),
                record_id=record.record_id,
                question_id=record.question_id,
                source_versions=[v.version_id for v in record.answer_versions],
            )
        else:
            input_data = processor.extract_bayesian_parameters(record)
            if input_data is None:
                missing = processor.check_pending_material(record)
                return ProcessingResult(
                    record=record,
                    status="pending_material",
                    failure_reason="; ".join(missing) if missing else "参数提取失败",
                )

        bayesian_result = self.calculator.calculate(input_data, record)

        consistency_check = self.verify_consistency(input_data, bayesian_result, record)

        status = "processed"
        failure_reason = None
        manual_override_note = None

        if bayesian_result.calculation_status == CalculationStatus.EMPTY_INPUT:
            status = "empty_set"
            failure_reason = "空集合输入"
        elif bayesian_result.calculation_status == CalculationStatus.EXTRAPOLATION_ERROR:
            status = "extrapolation_out_of_bounds"
            failure_reason = "外推越界"
        elif not consistency_check.is_consistent:
            failure_reason = f"口径不一致: {'; '.join(consistency_check.mismatched_fields)}"

        if "manual_override" in record.tags:
            status = "manual_overridden"
            manual_override_note = record.metadata.get("override_note", "人工改判")

        return ProcessingResult(
            record=record,
            bayesian_result=bayesian_result,
            recalculation_check=consistency_check,
            status=status,
            failure_reason=failure_reason,
            manual_override_note=manual_override_note,
        )

    def get_verification_report(self, check: RecalculationCheck) -> Dict[str, Any]:
        return {
            "consistent": check.is_consistent,
            "tolerance": check.tolerance,
            "max_difference": check.difference,
            "chart_value": check.chart_value,
            "detail_value": check.detail_value,
            "chart_path": check.chart_calculation_path,
            "detail_path": check.detail_calculation_path,
            "mismatches": check.mismatched_fields,
            "verification_time": datetime.now().isoformat(),
        }

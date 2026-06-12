import hashlib
import json
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from scipy import stats
from sqlalchemy.orm import Session

from ..models import (
    Parameter, ParameterHistory, CalculationRequest, CalculationResult,
    ChangeTrace, Remark, ResultStatus, ChangeCause
)
from ..schemas import CalculationRequestCreate, SegmentResult


class SegmentedRegressionService:
    def __init__(self, db: Session):
        self.db = db

    def generate_idempotency_key(self, data: Dict[str, Any]) -> str:
        sorted_data = json.dumps(data, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(sorted_data.encode('utf-8')).hexdigest()

    def _get_param_signature(self, parameter: Parameter) -> Dict[str, Any]:
        return {
            "param_id": parameter.id,
            "current_value": parameter.current_value,
            "unit": parameter.unit,
            "threshold_low": parameter.threshold_low,
            "threshold_high": parameter.threshold_high,
            "segment_count": parameter.segment_count,
            "updated_at": parameter.updated_at.isoformat() if parameter.updated_at else None
        }

    def check_duplicate_request(self, parameter: Parameter, sample_data: List[Dict[str, Any]],
                                idempotency_key: Optional[str] = None) -> Tuple[bool, Optional[CalculationResult]]:
        if not idempotency_key:
            idempotency_key = self.generate_idempotency_key({
                "parameter": self._get_param_signature(parameter),
                "sample_data": sample_data
            })

        existing_request = self.db.query(CalculationRequest).filter(
            CalculationRequest.idempotency_key == idempotency_key
        ).first()

        if existing_request:
            existing_result = self.db.query(CalculationResult).filter(
                CalculationResult.calculation_request_id == existing_request.id
            ).first()
            return True, existing_result

        return False, None

    def check_unit_missing(self, parameter: Parameter) -> bool:
        return parameter.unit is None or parameter.unit.strip() == ""

    def check_boundary_samples(self, sample_data: List[Dict[str, Any]],
                               threshold_low: Optional[float],
                               threshold_high: Optional[float]) -> Dict[str, Any]:
        if not sample_data or len(sample_data) < 3:
            return {
                "has_enough_boundary": False,
                "reason": "样本数量过少，至少需要3个样本",
                "total_samples": len(sample_data),
                "low_boundary_count": 0,
                "high_boundary_count": 0
            }

        x_values = [d.get('x', d.get('independent', 0)) for d in sample_data]

        low_count = sum(1 for x in x_values if threshold_low is not None and x <= threshold_low)
        high_count = sum(1 for x in x_values if threshold_high is not None and x >= threshold_high)

        has_enough = low_count >= 2 and high_count >= 2

        return {
            "has_enough_boundary": has_enough,
            "total_samples": len(sample_data),
            "low_boundary_count": low_count,
            "high_boundary_count": high_count,
            "threshold_low": threshold_low,
            "threshold_high": threshold_high
        }

    def perform_segmented_regression(self, sample_data: List[Dict[str, Any]],
                                     segment_count: int = 2,
                                     threshold_low: Optional[float] = None,
                                     threshold_high: Optional[float] = None) -> Dict[str, Any]:
        if len(sample_data) < segment_count * 2:
            return {
                "success": False,
                "error": f"样本数量不足，{segment_count}段回归至少需要{segment_count * 2}个样本"
            }

        x_values = np.array([d.get('x', d.get('independent', 0)) for d in sample_data], dtype=float)
        y_values = np.array([d.get('y', d.get('dependent', 0)) for d in sample_data], dtype=float)

        sort_idx = np.argsort(x_values)
        x_sorted = x_values[sort_idx]
        y_sorted = y_values[sort_idx]

        if threshold_low is not None and threshold_high is not None:
            segments_x = []
            segments_y = []

            low_mask = x_sorted <= threshold_low
            mid_mask = (x_sorted > threshold_low) & (x_sorted < threshold_high)
            high_mask = x_sorted >= threshold_high

            if np.any(low_mask):
                segments_x.append(x_sorted[low_mask])
                segments_y.append(y_sorted[low_mask])
            if np.any(mid_mask):
                segments_x.append(x_sorted[mid_mask])
                segments_y.append(y_sorted[mid_mask])
            if np.any(high_mask):
                segments_x.append(x_sorted[high_mask])
                segments_y.append(y_sorted[high_mask])
        else:
            segment_size = len(x_sorted) // segment_count
            segments_x = []
            segments_y = []
            for i in range(segment_count):
                start = i * segment_size
                end = start + segment_size if i < segment_count - 1 else len(x_sorted)
                if start < len(x_sorted):
                    segments_x.append(x_sorted[start:end])
                    segments_y.append(y_sorted[start:end])

        segment_results = []
        all_residuals = []
        total_rss = 0
        total_tss = 0

        for i, (seg_x, seg_y) in enumerate(zip(segments_x, segments_y)):
            if len(seg_x) < 2:
                segment_results.append({
                    "segment_index": i,
                    "start_x": float(seg_x[0]) if len(seg_x) > 0 else 0,
                    "end_x": float(seg_x[-1]) if len(seg_x) > 0 else 0,
                    "slope": 0,
                    "intercept": np.mean(seg_y) if len(seg_y) > 0 else 0,
                    "r_squared": 0,
                    "sample_count": len(seg_x)
                })
                continue

            slope, intercept, r_value, p_value, std_err = stats.linregress(seg_x, seg_y)
            y_pred = slope * seg_x + intercept
            residuals = seg_y - y_pred
            all_residuals.extend(residuals.tolist())

            rss = np.sum(residuals ** 2)
            tss = np.sum((seg_y - np.mean(seg_y)) ** 2)
            total_rss += rss
            total_tss += tss

            segment_results.append({
                "segment_index": i,
                "start_x": float(seg_x[0]),
                "end_x": float(seg_x[-1]),
                "slope": float(slope),
                "intercept": float(intercept),
                "r_squared": float(r_value ** 2),
                "sample_count": len(seg_x)
            })

        overall_r_squared = 1 - (total_rss / total_tss) if total_tss > 0 else 0

        return {
            "success": True,
            "segments": segment_results,
            "overall_r_squared": float(overall_r_squared),
            "coefficients": {
                "segment_count": len(segments_x),
                "threshold_low": threshold_low,
                "threshold_high": threshold_high
            },
            "result_value": float(np.mean(y_sorted))
        }

    def detect_jump(self, current_result: CalculationResult,
                    parameter: Parameter,
                    sample_data: List[Dict[str, Any]]) -> Tuple[bool, Optional[ChangeCause], str, List[ChangeTrace]]:
        previous_result = self.db.query(CalculationResult).filter(
            CalculationResult.parameter_id == parameter.id,
            CalculationResult.id != current_result.id
        ).order_by(CalculationResult.created_at.desc()).first()

        if not previous_result:
            return False, None, "", []

        change_traces = []
        jump_cause = None
        jump_description_parts = []
        has_significant_change = False

        prev_history = self.db.query(ParameterHistory).filter(
            ParameterHistory.parameter_id == parameter.id
        ).order_by(ParameterHistory.created_at.desc()).offset(1).first()

        curr_history = self.db.query(ParameterHistory).filter(
            ParameterHistory.parameter_id == parameter.id
        ).order_by(ParameterHistory.created_at.desc()).first()

        if prev_history and curr_history:
            threshold_changed = (prev_history.threshold_low != curr_history.threshold_low or
                               prev_history.threshold_high != curr_history.threshold_high)
            if threshold_changed:
                has_significant_change = True
                jump_cause = ChangeCause.THRESHOLD
                jump_description_parts.append(
                    f"阈值变更: ({prev_history.threshold_low}-{prev_history.threshold_high}) → ({curr_history.threshold_low}-{curr_history.threshold_high})"
                )
                change_traces.append(ChangeTrace(
                    result_id=current_result.id,
                    change_cause=ChangeCause.THRESHOLD,
                    old_value=f"({prev_history.threshold_low}, {prev_history.threshold_high})",
                    new_value=f"({curr_history.threshold_low}, {curr_history.threshold_high})",
                    description="分段阈值发生变更"
                ))

            unit_changed = prev_history.unit != curr_history.unit
            if unit_changed:
                has_significant_change = True
                if not jump_cause:
                    jump_cause = ChangeCause.UNIT
                jump_description_parts.append(
                    f"单位变更: {prev_history.unit} → {curr_history.unit}"
                )
                change_traces.append(ChangeTrace(
                    result_id=current_result.id,
                    change_cause=ChangeCause.UNIT,
                    old_value=str(prev_history.unit),
                    new_value=str(curr_history.unit),
                    description="参数单位发生变更"
                ))

            value_changed = prev_history.value != curr_history.value
            if value_changed:
                has_significant_change = True
                if not jump_cause:
                    jump_cause = ChangeCause.OTHER
                jump_description_parts.append(
                    f"参数值变更: {prev_history.value} → {curr_history.value}"
                )
                change_traces.append(ChangeTrace(
                    result_id=current_result.id,
                    change_cause=ChangeCause.OTHER,
                    old_value=str(prev_history.value),
                    new_value=str(curr_history.value),
                    description="参数当前值发生调整"
                ))

        new_remarks = self.db.query(Remark).filter(
            Remark.parameter_id == parameter.id,
            Remark.created_at > previous_result.created_at
        ).all()

        if new_remarks:
            has_significant_change = True
            if not jump_cause:
                jump_cause = ChangeCause.REMARK
            remark_contents = "；".join([r.content[:50] for r in new_remarks])
            jump_description_parts.append(
                f"新增{len(new_remarks)}条后补备注: {remark_contents}"
            )
            for remark in new_remarks:
                change_traces.append(ChangeTrace(
                    result_id=current_result.id,
                    change_cause=ChangeCause.REMARK,
                    old_value=None,
                    new_value=remark.content,
                    description=f"后补备注: {remark.created_by or '未知用户'}"
                ))

        prev_sample_hash = getattr(previous_result.request, 'request_hash', None) if previous_result.request else None
        curr_sample_hash = hashlib.sha256(json.dumps(sample_data, sort_keys=True).encode()).hexdigest()
        sample_changed = prev_sample_hash and prev_sample_hash != curr_sample_hash
        if sample_changed:
            has_significant_change = True
            if not jump_cause:
                jump_cause = ChangeCause.DATA
            jump_description_parts.append("样本数据发生变更")
            change_traces.append(ChangeTrace(
                result_id=current_result.id,
                change_cause=ChangeCause.DATA,
                old_value=prev_sample_hash,
                new_value=curr_sample_hash,
                description="用于计算的样本数据发生变化"
            ))

        jump_threshold = 0.15
        if (previous_result.result_value and current_result.result_value and
            previous_result.result_status == ResultStatus.NORMAL and
            current_result.result_status == ResultStatus.NORMAL):
            relative_change = abs(current_result.result_value - previous_result.result_value) / abs(previous_result.result_value)
            if relative_change > jump_threshold:
                has_significant_change = True
                if not jump_cause:
                    jump_cause = ChangeCause.OTHER
                jump_description_parts.append(
                    f"结果值变化: {previous_result.result_value:.4f} → {current_result.result_value:.4f} (变化率: {relative_change*100:.2f}%)"
                )

        if has_significant_change:
            return True, jump_cause, "；".join(jump_description_parts), change_traces

        return False, None, "", []

    def calculate(self, request_data: CalculationRequestCreate) -> Dict[str, Any]:
        parameter = self.db.query(Parameter).filter(
            Parameter.id == request_data.parameter_id
        ).first()

        if not parameter:
            return {"success": False, "error": "参数不存在"}

        idempotency_key = request_data.idempotency_key or self.generate_idempotency_key({
            "parameter": self._get_param_signature(parameter),
            "sample_data": request_data.sample_data
        })

        is_duplicate, existing_result = self.check_duplicate_request(
            parameter,
            request_data.sample_data,
            idempotency_key
        )

        if is_duplicate and existing_result:
            return {
                "success": True,
                "is_duplicate": True,
                "message": "重复请求，返回已有结果",
                "result": existing_result
            }

        result_status = ResultStatus.NORMAL
        suspend_reasons = []
        suspend_reason = None

        if self.check_unit_missing(parameter):
            suspend_reasons.append("单位缺失，请复核人确认单位后再进行计算")

        boundary_check = self.check_boundary_samples(
            request_data.sample_data,
            parameter.threshold_low,
            parameter.threshold_high
        )

        if not boundary_check["has_enough_boundary"]:
            suspend_reasons.append(
                f"边界样本不足：低边界{boundary_check['low_boundary_count']}个，"
                f"高边界{boundary_check['high_boundary_count']}个，"
                f"各至少需要2个。请补充边界样本或确认阈值设置"
            )

        if suspend_reasons:
            result_status = ResultStatus.SUSPENDED
            suspend_reason = "；".join(suspend_reasons) + "。"

        calculation_request = CalculationRequest(
            idempotency_key=idempotency_key,
            parameter_id=request_data.parameter_id,
            request_hash=hashlib.sha256(json.dumps(request_data.sample_data, sort_keys=True).encode()).hexdigest(),
            request_data=json.dumps({"sample_data": request_data.sample_data}, ensure_ascii=False)
        )
        self.db.add(calculation_request)
        self.db.flush()

        current_version = self.db.query(CalculationResult).filter(
            CalculationResult.parameter_id == request_data.parameter_id
        ).count() + 1

        regression_result = None
        result_value = None
        segments_json = None
        coefficients_json = None
        r_squared = None

        if result_status == ResultStatus.NORMAL:
            regression_result = self.perform_segmented_regression(
                request_data.sample_data,
                parameter.segment_count,
                parameter.threshold_low,
                parameter.threshold_high
            )

            if not regression_result.get("success"):
                result_status = ResultStatus.ABNORMAL
                suspend_reason = regression_result.get("error", "计算失败")
            else:
                result_value = regression_result["result_value"]
                segments_json = json.dumps(regression_result["segments"], ensure_ascii=False)
                coefficients_json = json.dumps(regression_result["coefficients"], ensure_ascii=False)
                r_squared = regression_result["overall_r_squared"]

        calculation_result = CalculationResult(
            parameter_id=request_data.parameter_id,
            calculation_request_id=calculation_request.id,
            version=current_version,
            result_value=result_value,
            result_status=result_status,
            suspend_reason=suspend_reason,
            segments=segments_json,
            coefficients=coefficients_json,
            r_squared=r_squared,
            is_jump=False
        )
        self.db.add(calculation_result)
        self.db.flush()

        if result_status == ResultStatus.NORMAL and regression_result:
            is_jump, jump_cause, jump_description, change_traces = self.detect_jump(
                calculation_result,
                parameter,
                request_data.sample_data
            )

            if is_jump:
                calculation_result.is_jump = True
                calculation_result.jump_cause = jump_cause
                calculation_result.jump_description = jump_description

                for trace in change_traces:
                    self.db.add(trace)

        if result_status != ResultStatus.NORMAL:
            is_jump, jump_cause, jump_description, change_traces = self.detect_jump(
                calculation_result,
                parameter,
                request_data.sample_data
            )

            if is_jump:
                calculation_result.is_jump = True
                calculation_result.jump_cause = jump_cause
                calculation_result.jump_description = jump_description

                for trace in change_traces:
                    self.db.add(trace)

        self.db.commit()
        self.db.refresh(calculation_result)

        return {
            "success": True,
            "is_duplicate": False,
            "result": calculation_result,
            "boundary_check": boundary_check
        }

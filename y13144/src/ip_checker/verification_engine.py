"""批量验算引擎 - 核心验算逻辑，处理除零边界、单位换算、异常标记"""

import math
from typing import Dict, List, Optional, Any, Tuple
import pandas as pd
import numpy as np
from uuid import uuid4

from .models import (
    VerificationStatus,
    ProcessingStatus,
    VerificationResult,
    CalculationRule,
)
from .unit_system import UnitSystem, UnitConversionError
from .calculation_spec import CalculationSpecManager


class BoundaryCaseHandler:
    @staticmethod
    def check_division_by_zero(numerator: float, denominator: float) -> Tuple[bool, Optional[str]]:
        if denominator == 0:
            return True, "除零异常：分母为0"
        if abs(denominator) < 1e-9:
            return True, "除零边界：分母接近0，计算结果可能失真"
        return False, None

    @staticmethod
    def check_negative_value(value: float, field_name: str) -> Tuple[bool, Optional[str]]:
        if value < 0 and field_name in ["quantity", "unit_price", "total_price"]:
            return True, f"值为负异常：{field_name} = {value}"
        return False, None

    @staticmethod
    def check_null_value(value: Any, field_name: str) -> Tuple[bool, Optional[str]]:
        if pd.isna(value) or value is None:
            return True, f"空值异常：{field_name} 为空"
        return False, None

    @staticmethod
    def check_unit_mismatch(from_unit: str, to_unit: str, expected_dimension: str) -> Tuple[bool, Optional[str]]:
        if from_unit != to_unit:
            return True, f"单位不一致：输入单位{from_unit}，目标单位{to_unit}（量纲：{expected_dimension}）"
        return False, None


class VerificationEngine:
    def __init__(
        self,
        unit_system: UnitSystem,
        spec_manager: CalculationSpecManager,
        tolerance: float = 0.01,
    ):
        self.unit_system = unit_system
        self.spec_manager = spec_manager
        self.tolerance = tolerance
        self.boundary_handler = BoundaryCaseHandler()
        self.results: List[VerificationResult] = []
        self.processing_log: List[Dict[str, Any]] = []

    def verify_record(
        self,
        record: pd.Series,
        rule: CalculationRule,
        context_id: str,
        expected_value: Optional[float] = None,
    ) -> VerificationResult:
        record_id = uuid4().hex[:10]
        processing_steps = []
        unit_conversions = []
        raw_inputs = {}
        anomaly_type = None
        error_message = None
        calculated_value = None

        step_num = 1
        processing_steps.append({
            "step": step_num,
            "action": "读取原始输入",
            "detail": f"来源: {record.get('_source', '未知')}",
            "status": ProcessingStatus.RAW.value,
        })

        for field in rule.input_fields:
            value = record.get(field)
            raw_inputs[field] = value
            src_field = record.get(f"_src_{field}", field)

            is_null, null_msg = self.boundary_handler.check_null_value(value, field)
            if is_null:
                processing_steps.append({
                    "step": step_num,
                    "action": f"检查字段 {field}({src_field})",
                    "detail": null_msg,
                    "status": VerificationStatus.EXCEPTION.value,
                })
                return VerificationResult(
                    record_id=record_id,
                    result_status=VerificationStatus.EXCEPTION,
                    calculated_value=None,
                    expected_value=expected_value,
                    tolerance=self.tolerance,
                    raw_inputs=raw_inputs,
                    processing_steps=processing_steps,
                    unit_conversions=unit_conversions,
                    error_message=null_msg,
                    anomaly_type="空值异常",
                )

            is_negative, neg_msg = self.boundary_handler.check_negative_value(value, field)
            if is_negative:
                processing_steps.append({
                    "step": step_num,
                    "action": f"检查字段 {field}({src_field})",
                    "detail": neg_msg,
                    "status": VerificationStatus.WARNING.value,
                })
                anomaly_type = "负值异常"

            step_num += 1

        if "unit" in record and not pd.isna(record["unit"]):
            input_unit = str(record["unit"])
            target_unit = rule.target_unit
            try:
                for field in rule.input_fields:
                    if field in ["quantity", "unit_price"]:
                        if field == "unit_price" and input_unit in ["元", "万元", "亿元"]:
                            value = raw_inputs[field]
                            converted, conv_log = self.unit_system.convert(
                                float(value), input_unit, target_unit
                            )
                            raw_inputs[f"{field}_converted"] = converted
                            unit_conversions.append({
                                "field": field,
                                **conv_log,
                                "context_id": context_id,
                            })
                            processing_steps.append({
                                "step": step_num,
                                "action": f"单位转换 {field}",
                                "detail": f"{conv_log['original_value']} {conv_log['from_unit']} → {conv_log['converted_value']:.4f} {conv_log['to_unit']}",
                                "status": ProcessingStatus.UNIT_CONVERTED.value,
                            })
                            step_num += 1
            except UnitConversionError as e:
                processing_steps.append({
                    "step": step_num,
                    "action": "单位转换",
                    "detail": f"转换失败: {str(e)}",
                    "status": VerificationStatus.EXCEPTION.value,
                })
                return VerificationResult(
                    record_id=record_id,
                    result_status=VerificationStatus.EXCEPTION,
                    calculated_value=None,
                    expected_value=expected_value,
                    tolerance=self.tolerance,
                    raw_inputs=raw_inputs,
                    processing_steps=processing_steps,
                    unit_conversions=unit_conversions,
                    error_message=str(e),
                    anomaly_type="单位转换异常",
                )

        processing_steps.append({
            "step": step_num,
            "action": "执行计算公式",
            "detail": rule.formula_expression,
            "status": ProcessingStatus.CALCULATED.value,
        })
        step_num += 1

        try:
            calculated_value = self._execute_formula(rule, raw_inputs, processing_steps, step_num)
            step_num += 1
        except Exception as e:
            processing_steps.append({
                "step": step_num,
                "action": "公式计算",
                "detail": f"计算失败: {str(e)}",
                "status": VerificationStatus.EXCEPTION.value,
            })
            return VerificationResult(
                record_id=record_id,
                result_status=VerificationStatus.EXCEPTION,
                calculated_value=None,
                expected_value=expected_value,
                tolerance=self.tolerance,
                raw_inputs=raw_inputs,
                processing_steps=processing_steps,
                unit_conversions=unit_conversions,
                error_message=str(e),
                anomaly_type="公式计算异常",
            )

        result_status = VerificationStatus.PASS
        if expected_value is not None and not pd.isna(expected_value):
            diff = abs(calculated_value - expected_value)
            rel_diff = diff / abs(expected_value) if expected_value != 0 else diff

            processing_steps.append({
                "step": step_num,
                "action": "结果比对",
                "detail": f"计算值: {calculated_value:.4f}, 期望值: {expected_value:.4f}, "
                         f"绝对差: {diff:.4f}, 相对差: {rel_diff:.4%}",
                "status": ProcessingStatus.VERIFIED.value,
            })
            step_num += 1

            if rel_diff > self.tolerance:
                result_status = VerificationStatus.FAIL
                anomaly_type = "数值偏差"
                processing_steps.append({
                    "step": step_num,
                    "action": "验算判定",
                    "detail": f"偏差超过容差 {self.tolerance:.0%}，判定不通过",
                    "status": VerificationStatus.FAIL.value,
                })
            else:
                processing_steps.append({
                    "step": step_num,
                    "action": "验算判定",
                    "detail": f"偏差在容差 {self.tolerance:.0%} 以内，判定通过",
                    "status": VerificationStatus.PASS.value,
                })
        else:
            processing_steps.append({
                "step": step_num,
                "action": "无期望值",
                "detail": "仅计算，未进行比对校验",
                "status": VerificationStatus.WARNING.value,
            })
            result_status = VerificationStatus.WARNING

        result = VerificationResult(
            record_id=record_id,
            result_status=result_status,
            calculated_value=calculated_value,
            expected_value=expected_value,
            tolerance=self.tolerance,
            raw_inputs=raw_inputs,
            processing_steps=processing_steps,
            unit_conversions=unit_conversions,
            error_message=error_message,
            anomaly_type=anomaly_type,
        )
        self.results.append(result)
        return result

    @staticmethod
    def _parse_tax_rate(raw_value: Any) -> Tuple[float, Optional[str]]:
        if raw_value is None or pd.isna(raw_value):
            return 0.0, "税率为空，按0计算"

        if isinstance(raw_value, (int, float)):
            if raw_value > 1:
                rate = raw_value / 100
                return rate, f"税率 {raw_value} 转换为小数 {rate}"
            return raw_value, None

        str_val = str(raw_value).strip()
        if str_val.endswith('%'):
            num_part = str_val[:-1].strip()
            try:
                num = float(num_part)
                rate = num / 100
                return rate, f"税率 '{raw_value}' 转换为小数 {rate}"
            except ValueError:
                return 0.0, f"税率格式无法解析: {raw_value}，按0计算"

        try:
            num = float(str_val)
            if num > 1:
                rate = num / 100
                return rate, f"税率 {num} 转换为小数 {rate}"
            return num, None
        except ValueError:
            return 0.0, f"税率格式无法解析: {raw_value}，按0计算"

    def _execute_formula(
        self,
        rule: CalculationRule,
        inputs: Dict[str, Any],
        processing_steps: List[Dict],
        start_step: int,
    ) -> float:
        values = {}
        for field in rule.input_fields:
            val = inputs.get(f"{field}_converted", inputs.get(field))
            if field == "tax_rate":
                parsed_rate, _ = self._parse_tax_rate(val)
                values[field] = parsed_rate
            else:
                values[field] = float(val) if val is not None and not pd.isna(val) else 0.0

        if rule.formula_id == "F001":
            qty = values["quantity"]
            price = values["unit_price"]
            base_result = qty * price

            mgmt_fee_rate = rule.params.get("management_fee_rate", 0)
            if mgmt_fee_rate and mgmt_fee_rate != 0:
                result = base_result * (1 + mgmt_fee_rate)
                detail = (f"{qty} × {price} × (1 + {mgmt_fee_rate*100:.0f}%管理费) "
                         f"= {base_result:.2f} × {1+mgmt_fee_rate} = {result:.2f}")
            else:
                result = base_result
                detail = f"{qty} × {price} = {result:.4f}"

            processing_steps.append({
                "step": start_step,
                "action": f"执行公式 F001 (v{rule.version})",
                "detail": detail,
                "status": "计算完成",
            })
            return result

        elif rule.formula_id == "F002":
            total = values["total_price"]
            rate = values["tax_rate"]

            raw_rate_input = inputs.get("tax_rate")
            _, rate_note = self._parse_tax_rate(raw_rate_input)
            if rate_note:
                processing_steps.append({
                    "step": start_step,
                    "action": "税率格式化",
                    "detail": rate_note,
                    "status": "预处理完成",
                })
                start_step += 1

            result = total * rate
            processing_steps.append({
                "step": start_step,
                "action": "执行公式 F002",
                "detail": f"{total} × {rate} = {result:.4f}",
                "status": "计算完成",
            })
            return result

        elif rule.formula_id == "F003":
            total = values["total_price"]
            tax = values["tax_amount"]
            result = total + tax
            processing_steps.append({
                "step": start_step,
                "action": "执行公式 F003",
                "detail": f"{total} + {tax} = {result:.4f}",
                "status": "计算完成",
            })
            return result

        elif rule.formula_id == "F004":
            total = values["total_price"]
            qty = values["quantity"]

            is_div_zero, div_msg = self.boundary_handler.check_division_by_zero(total, qty)
            if is_div_zero:
                processing_steps.append({
                    "step": start_step,
                    "action": "除零边界检查",
                    "detail": div_msg,
                    "status": VerificationStatus.EXCEPTION.value,
                })
                raise ZeroDivisionError(div_msg)

            result = total / qty
            processing_steps.append({
                "step": start_step,
                "action": "执行公式 F004",
                "detail": f"{total} ÷ {qty} = {result:.4f}",
                "status": "计算完成",
            })
            return result

        else:
            raise ValueError(f"未知公式: {rule.formula_id}")

    def batch_verify(
        self,
        df: pd.DataFrame,
        formula_ids: List[str],
        context_id: str,
        expected_field: Optional[str] = None,
    ) -> pd.DataFrame:
        results_data = []
        rules = [self.spec_manager.get_rule(fid) for fid in formula_ids]

        for idx, row in df.iterrows():
            record_results = {"_record_index": idx}
            for rule in rules:
                expected = row[expected_field] if expected_field and expected_field in row else None
                result = self.verify_record(row, rule, context_id, expected)
                record_results[f"{rule.output_field}_status"] = result.result_status.value
                record_results[f"{rule.output_field}_calculated"] = result.calculated_value
                record_results[f"{rule.output_field}_expected"] = result.expected_value
                record_results[f"{rule.output_field}_anomaly"] = result.anomaly_type
                record_results[f"{rule.output_field}_record_id"] = result.record_id

                if result.result_status == VerificationStatus.EXCEPTION:
                    record_results["_overall_status"] = VerificationStatus.EXCEPTION.value
                elif result.result_status == VerificationStatus.FAIL and \
                        record_results.get("_overall_status") != VerificationStatus.EXCEPTION.value:
                    record_results["_overall_status"] = VerificationStatus.FAIL.value
                elif result.result_status == VerificationStatus.WARNING and \
                        "_overall_status" not in record_results:
                    record_results["_overall_status"] = VerificationStatus.WARNING.value

            if "_overall_status" not in record_results:
                record_results["_overall_status"] = VerificationStatus.PASS.value

            results_data.append(record_results)

        results_df = pd.DataFrame(results_data)
        if not results_df.empty and not df.empty:
            return pd.concat([df.reset_index(drop=True), results_df], axis=1)
        return df

    def get_summary(self) -> Dict[str, int]:
        status_counts = {}
        for r in self.results:
            status = r.result_status.value
            status_counts[status] = status_counts.get(status, 0) + 1
        return status_counts

    def get_anomalies(self) -> List[VerificationResult]:
        return [r for r in self.results if r.anomaly_type is not None]

    def get_result_by_id(self, record_id: str) -> Optional[VerificationResult]:
        for r in self.results:
            if r.record_id == record_id:
                return r
        return None

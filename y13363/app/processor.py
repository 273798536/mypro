import re
import ast
import operator
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from .models import (
    FieldMapping,
    TrainingLog,
    CostFormula,
    CostCalculation,
    ProcessingRecord,
    ProcessingStatus,
    ConfirmationReason,
)


ALLOWED_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
}


ALLOWED_FUNCTIONS = {
    "abs": abs,
    "round": round,
    "min": min,
    "max": max,
    "sum": sum,
    "float": float,
    "int": int,
}


class FieldMappingService:
    def __init__(self, mappings: List[FieldMapping]):
        self.mappings = mappings

    def map_fields(
        self, raw_data: Dict[str, Any], source_file: str, run_id: str
    ) -> Tuple[TrainingLog, List[str]]:
        mapped_fields: Dict[str, Any] = {}
        warnings: List[str] = []
        used_mappings: List[FieldMapping] = []

        raw_keys_lower = {k.lower(): k for k in raw_data.keys()}

        for mapping in self.mappings:
            source_field = mapping.source_field
            target_field = mapping.target_field

            actual_key = raw_keys_lower.get(source_field.lower())

            if actual_key is not None:
                value = raw_data[actual_key]
                mapped_fields[target_field] = self._convert_type(
                    value, mapping.data_type
                )
                used_mappings.append(mapping)
            elif mapping.is_required:
                if mapping.default_value is not None:
                    mapped_fields[target_field] = mapping.default_value
                    warnings.append(
                        f"必填字段 {source_field} 缺失，使用默认值 {mapping.default_value}"
                    )
                    used_mappings.append(mapping)
                else:
                    warnings.append(f"必填字段 {source_field} 缺失且无默认值")
            else:
                if mapping.default_value is not None:
                    mapped_fields[target_field] = mapping.default_value
                    used_mappings.append(mapping)

        training_log = TrainingLog(
            run_id=run_id,
            source_file=source_file,
            raw_fields=raw_data,
            mapped_fields=mapped_fields,
            field_mappings_used=used_mappings,
        )

        return training_log, warnings

    def _convert_type(self, value: Any, data_type: str) -> Any:
        if value is None:
            return None
        try:
            if data_type == "float":
                return float(value)
            elif data_type == "int":
                return int(float(value))
            elif data_type == "str":
                return str(value)
            elif data_type == "bool":
                if isinstance(value, str):
                    return value.lower() in ("true", "1", "yes")
                return bool(value)
            elif data_type == "datetime":
                if isinstance(value, str):
                    return datetime.fromisoformat(value.replace("Z", "+00:00"))
                return value
            return value
        except (ValueError, TypeError):
            return value


class FormulaCalculator:
    def __init__(self, formulas: List[CostFormula]):
        self.formulas = formulas

    def calculate(
        self, input_values: Dict[str, float]
    ) -> List[CostCalculation]:
        results: List[CostCalculation] = []

        for formula in self.formulas:
            try:
                result, trace = self._safe_eval(
                    formula.expression, input_values
                )
                unit = formula.unit
                is_within_bounds = True
                boundary_violation = None

                if formula.boundary_min is not None and result < formula.boundary_min:
                    is_within_bounds = False
                    boundary_violation = (
                        f"结果 {result:.4f}{unit} 低于下限 {formula.boundary_min}{unit}"
                    )
                if formula.boundary_max is not None and result > formula.boundary_max:
                    is_within_bounds = False
                    boundary_violation = (
                        f"结果 {result:.4f}{unit} 高于上限 {formula.boundary_max}{unit}"
                    )

                results.append(
                    CostCalculation(
                        formula=formula,
                        input_values={
                            k: v
                            for k, v in input_values.items()
                            if k in self._extract_variables(formula.expression)
                        },
                        result=result,
                        unit=unit,
                        is_within_bounds=is_within_bounds,
                        boundary_violation=boundary_violation,
                        calculation_trace=trace,
                    )
                )
            except Exception as e:
                results.append(
                    CostCalculation(
                        formula=formula,
                        input_values={
                            k: v
                            for k, v in input_values.items()
                            if k in self._extract_variables(formula.expression)
                        },
                        result=0.0,
                        unit=formula.unit,
                        is_within_bounds=False,
                        boundary_violation=f"计算错误: {str(e)}",
                        calculation_trace=[f"错误: {str(e)}"],
                    )
                )

        return results

    def _safe_eval(
        self, expression: str, variables: Dict[str, float]
    ) -> Tuple[float, List[str]]:
        trace: List[str] = []
        trace.append(f"公式: {expression}")
        trace.append(f"输入变量: {variables}")

        def _eval(node):
            if isinstance(node, ast.Expression):
                return _eval(node.body)
            elif isinstance(node, ast.Constant):
                return node.value
            elif isinstance(node, ast.Name):
                if node.id in variables:
                    val = variables[node.id]
                    trace.append(f"  变量 {node.id} = {val}")
                    return val
                if node.id in ALLOWED_FUNCTIONS:
                    return ALLOWED_FUNCTIONS[node.id]
                raise NameError(f"未知变量: {node.id}")
            elif isinstance(node, ast.BinOp):
                left = _eval(node.left)
                right = _eval(node.right)
                op_type = type(node.op)
                if op_type in ALLOWED_OPERATORS:
                    result = ALLOWED_OPERATORS[op_type](left, right)
                    op_symbol = {
                        ast.Add: "+",
                        ast.Sub: "-",
                        ast.Mult: "*",
                        ast.Div: "/",
                        ast.Pow: "^",
                    }.get(op_type, "?")
                    trace.append(f"  {left} {op_symbol} {right} = {result}")
                    return result
                raise ValueError(f"不支持的运算符: {op_type}")
            elif isinstance(node, ast.UnaryOp):
                operand = _eval(node.operand)
                op_type = type(node.op)
                if op_type in ALLOWED_OPERATORS:
                    return ALLOWED_OPERATORS[op_type](operand)
                raise ValueError(f"不支持的一元运算符: {op_type}")
            elif isinstance(node, ast.Call):
                func = _eval(node.func)
                args = [_eval(arg) for arg in node.args]
                if callable(func):
                    result = func(*args)
                    trace.append(f"  {node.func.id}({', '.join(map(str, args))}) = {result}")
                    return result
                raise ValueError(f"不可调用的函数: {node.func}")
            else:
                raise ValueError(f"不支持的语法节点: {type(node)}")

        tree = ast.parse(expression, mode="eval")
        result = _eval(tree)
        trace.append(f"最终结果: {result}")
        return float(result), trace

    def _extract_variables(self, expression: str) -> List[str]:
        variables: List[str] = []
        try:
            tree = ast.parse(expression, mode="eval")
            for node in ast.walk(tree):
                if isinstance(node, ast.Name) and node.id not in ALLOWED_FUNCTIONS:
                    variables.append(node.id)
        except Exception:
            pass
        return list(set(variables))


class CalibrationService:
    def __init__(self, offline_online_mapping: Dict[str, float]):
        self.offline_online_mapping = offline_online_mapping

    def calibrate(
        self, metric_name: str, offline_value: float
    ) -> Tuple[float, str]:
        if metric_name in self.offline_online_mapping:
            ratio = self.offline_online_mapping[metric_name]
            online_value = offline_value * ratio
            explanation = (
                f"离线值 {offline_value} × 校准系数 {ratio} = 线上口径值 {online_value:.6f}"
            )
            return online_value, explanation
        return offline_value, "无校准系数，使用原值"

    def check_calibration_diff(
        self, metric_name: str, offline_value: float, expected_online: float
    ) -> Tuple[bool, float, str]:
        calculated, _ = self.calibrate(metric_name, offline_value)
        diff_pct = abs(calculated - expected_online) / abs(expected_online) * 100 if expected_online != 0 else 0
        is_match = diff_pct < 0.1
        explanation = (
            f"离线转线上: {calculated:.6f}, 线上实际: {expected_online:.6f}, "
            f"差异: {diff_pct:.4f}%, {'一致' if is_match else '不一致'}"
        )
        return is_match, diff_pct, explanation


class CostProcessor:
    def __init__(
        self,
        field_mappings: List[FieldMapping],
        formulas: List[CostFormula],
        calibration_ratios: Dict[str, float],
    ):
        self.field_mapper = FieldMappingService(field_mappings)
        self.calculator = FormulaCalculator(formulas)
        self.calibrator = CalibrationService(calibration_ratios)

    def process_training_log(
        self,
        run_id: str,
        raw_data: Dict[str, Any],
        source_file: str,
        existing_run_ids: List[str],
    ) -> ProcessingRecord:
        record = ProcessingRecord(
            run_id=run_id,
            status=ProcessingStatus.PROCESSING,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

        if run_id in existing_run_ids:
            record.status = ProcessingStatus.NEEDS_CONFIRMATION
            record.confirmation_reason = ConfirmationReason.DUPLICATE_RUN_ID
            record.confirmation_note = f"run_id {run_id} 已存在，需要人工确认是否覆盖"
            record.next_steps = [
                "确认是否为重复数据",
                "如果是重复数据，标记为已处理",
                "如果是新数据，更新原有记录",
            ]
            return record

        training_log, warnings = self.field_mapper.map_fields(
            raw_data, source_file, run_id
        )
        record.training_log = training_log

        if warnings:
            record.confirmation_reason = ConfirmationReason.FIELD_MISMATCH
            record.confirmation_note = "; ".join(warnings)
            record.status = ProcessingStatus.NEEDS_CONFIRMATION
            record.next_steps = [
                "检查字段映射是否正确",
                "补充缺失字段数据",
                "确认处理后继续计算",
            ]
            record.updated_at = datetime.now()
            return record

        input_values = {
            k: float(v)
            for k, v in training_log.mapped_fields.items()
            if isinstance(v, (int, float))
        }

        cost_calibrated: Dict[str, float] = {}
        for metric_name, value in input_values.items():
            calibrated, _ = self.calibrator.calibrate(metric_name, value)
            cost_calibrated[metric_name] = calibrated

        cost_calibrations = self.calculator.calculate(cost_calibrated)
        record.cost_calculations = cost_calibrations

        boundary_violations = [
            c for c in cost_calibrations if not c.is_within_bounds
        ]
        if boundary_violations:
            record.status = ProcessingStatus.NEEDS_CONFIRMATION
            record.confirmation_reason = ConfirmationReason.BOUNDARY_EXCEEDED
            record.confirmation_note = "; ".join(
                [c.boundary_violation or "" for c in boundary_violations]
            )
            record.next_steps = [
                "核实边界值设置是否合理",
                "检查输入数据是否正确",
                "确认异常值后标记为已处理",
            ]
            record.updated_at = datetime.now()
            return record

        record.status = ProcessingStatus.PROCESSED
        record.processed_at = datetime.now()
        record.processed_by = "system"
        record.updated_at = datetime.now()

        return record


def get_default_field_mappings() -> List[FieldMapping]:
    return [
        FieldMapping(
            source_field="训练样本数",
            target_field="sample_count",
            data_type="int",
            is_required=True,
        ),
        FieldMapping(
            source_field="样本量",
            target_field="sample_count",
            data_type="int",
            is_required=False,
        ),
        FieldMapping(
            source_field="训练时长",
            target_field="training_hours",
            data_type="float",
            is_required=True,
        ),
        FieldMapping(
            source_field="训练时间(小时)",
            target_field="training_hours",
            data_type="float",
            is_required=False,
        ),
        FieldMapping(
            source_field="GPU卡数",
            target_field="gpu_count",
            data_type="int",
            is_required=True,
        ),
        FieldMapping(
            source_field="GPU数量",
            target_field="gpu_count",
            data_type="int",
            is_required=False,
        ),
        FieldMapping(
            source_field="GPU单价",
            target_field="gpu_price_per_hour",
            data_type="float",
            is_required=True,
            default_value=12.5,
        ),
        FieldMapping(
            source_field="数据处理成本",
            target_field="data_processing_cost",
            data_type="float",
            is_required=False,
            default_value=0.0,
        ),
        FieldMapping(
            source_field="存储成本",
            target_field="storage_cost",
            data_type="float",
            is_required=False,
            default_value=0.0,
        ),
        FieldMapping(
            source_field="实验名称",
            target_field="experiment_name",
            data_type="str",
            is_required=False,
        ),
        FieldMapping(
            source_field="模型名称",
            target_field="model_name",
            data_type="str",
            is_required=False,
        ),
    ]


def get_default_formulas() -> List[CostFormula]:
    return [
        CostFormula(
            name="GPU计算成本",
            expression="training_hours * gpu_count * gpu_price_per_hour",
            unit="元",
            description="GPU使用时长 × GPU卡数 × GPU小时单价",
            boundary_min=0.0,
            boundary_max=1000000.0,
        ),
        CostFormula(
            name="单位样本成本",
            expression="(training_hours * gpu_count * gpu_price_per_hour) / sample_count",
            unit="元/样本",
            description="总GPU成本 ÷ 训练样本数",
            boundary_min=0.0,
            boundary_max=100.0,
        ),
        CostFormula(
            name="总成本",
            expression="(training_hours * gpu_count * gpu_price_per_hour) + data_processing_cost + storage_cost",
            unit="元",
            description="GPU计算成本 + 数据处理成本 + 存储成本",
            boundary_min=0.0,
            boundary_max=1000000.0,
        ),
    ]


def get_default_calibration_ratios() -> Dict[str, float]:
    return {
        "training_hours": 1.0,
        "gpu_count": 1.0,
        "gpu_price_per_hour": 1.0,
        "sample_count": 0.98,
        "data_processing_cost": 1.05,
        "storage_cost": 1.02,
    }

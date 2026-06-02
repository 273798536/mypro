from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from .models import Beam, Load, LoadType, BoundaryCondition
from .units import Quantity, Unit, UnitSystem, UnitCategory
from .warnings import WarningCollector, WarningLevel, WarningType
from .steps import StepTracker, StepType, Formula


@dataclass
class ValidationResult:
    is_valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    def __bool__(self) -> bool:
        return self.is_valid

    def __str__(self) -> str:
        if self.is_valid and not self.warnings:
            return "验证通过"
        parts = []
        if self.errors:
            parts.append(f"错误 ({len(self.errors)}):\n  " + "\n  ".join(self.errors))
        if self.warnings:
            parts.append(f"警告 ({len(self.warnings)}):\n  " + "\n  ".join(self.warnings))
        return "\n".join(parts)


class InputValidator:
    def __init__(self,
                 unit_system: Optional[UnitSystem] = None,
                 warning_collector: Optional[WarningCollector] = None,
                 step_tracker: Optional[StepTracker] = None):
        self.unit_system = unit_system if unit_system is not None else UnitSystem.metric_engineering()
        self.warnings = warning_collector if warning_collector is not None else WarningCollector()
        self.steps = step_tracker if step_tracker is not None else StepTracker()

    def validate_beam(self, beam: Beam) -> ValidationResult:
        errors = []
        warnings_list = []

        self.steps.add_step(
            step_type=StepType.VALIDATION,
            title="梁基本参数验证",
            description="验证梁长度、边界条件等基本参数的有效性",
            inputs={"梁长度": beam.length, "左支座": beam.left_support.value, "右支座": beam.right_support.value},
        )

        if beam.length.value <= 0:
            errors.append(f"梁长度必须为正，当前值: {beam.length}")
            self.warnings.invalid_input(
                parameter="梁长度",
                value=beam.length,
                reason="长度必须大于0",
                source=beam.source,
            )

        if beam.left_support not in [BoundaryCondition.PINNED, BoundaryCondition.FIXED, BoundaryCondition.ROLLER]:
            errors.append(f"左支座类型 {beam.left_support.value} 不适合简支梁")
        if beam.right_support not in [BoundaryCondition.ROLLER, BoundaryCondition.PINNED, BoundaryCondition.FIXED]:
            errors.append(f"右支座类型 {beam.right_support.value} 不适合简支梁")

        if not (beam.left_support == BoundaryCondition.PINNED and
                beam.right_support == BoundaryCondition.ROLLER):
            warning_msg = f"边界条件 ({beam.left_support.value}, {beam.right_support.value}) 非标准简支梁"
            warnings_list.append(warning_msg)
            self.warnings.non_standard_boundary(
                left_support=beam.left_support.value,
                right_support=beam.right_support.value,
                source=beam.source,
            )

        unit_errors = self._validate_units(beam)
        errors.extend(unit_errors)

        for i, load in enumerate(beam.loads):
            load_result = self.validate_load(load, beam, i + 1)
            errors.extend(load_result.errors)
            warnings_list.extend(load_result.warnings)

        overlap_warnings = self._check_overlapping_loads(beam)
        warnings_list.extend(overlap_warnings)

        is_valid = len(errors) == 0
        result = ValidationResult(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings_list,
        )

        self.steps.add_step(
            step_type=StepType.VALIDATION,
            title="验证结果",
            description="输入参数验证总结",
            outputs={"是否有效": is_valid, "错误数": len(errors), "警告数": len(warnings_list)},
        )

        return result

    def validate_load(self, load: Load, beam: Beam, load_index: int) -> ValidationResult:
        errors = []
        warnings_list = []

        self.steps.add_step(
            step_type=StepType.VALIDATION,
            title=f"载荷 #{load_index} 验证",
            description=f"验证 {load.load_type.value} 的参数有效性",
            inputs={"类型": load.load_type.value, "大小": load.magnitude},
        )

        load_errors = load.validate(beam.length)
        for err in load_errors:
            errors.append(f"载荷 #{load_index}: {err}")
            if "超出梁范围" in err:
                self.warnings.load_out_of_bounds(
                    position=load.position or load.start_position,
                    beam_length=beam.length,
                    source=load.source,
                )

        if load.magnitude.value == 0:
            warnings_list.append(f"载荷 #{load_index} 大小为零，将被忽略")
            self.warnings.zero_load(load_index=load_index, source=load.source)

        expected_categories = {
            LoadType.CONCENTRATED_FORCE: UnitCategory.FORCE,
            LoadType.CONCENTRATED_MOMENT: UnitCategory.MOMENT,
            LoadType.UNIFORM_DISTRIBUTED: UnitCategory.DISTRIBUTED_LOAD,
            LoadType.TRIANGULAR_DISTRIBUTED: UnitCategory.DISTRIBUTED_LOAD,
            LoadType.TRAPEZOIDAL_DISTRIBUTED: UnitCategory.DISTRIBUTED_LOAD,
        }
        expected_category = expected_categories.get(load.load_type)
        if expected_category and load.magnitude.unit.category != expected_category:
            category_names = {
                UnitCategory.FORCE: "力",
                UnitCategory.MOMENT: "力矩",
                UnitCategory.DISTRIBUTED_LOAD: "分布载荷",
            }
            errors.append(
                f"载荷 #{load_index}: {load.load_type.value} 需要 {category_names.get(expected_category, expected_category.value)} 单位，"
                f"实际为 {load.magnitude.unit.symbol} ({load.magnitude.unit.category.value})"
            )

        if load.load_type in [LoadType.CONCENTRATED_FORCE, LoadType.CONCENTRATED_MOMENT]:
            if load.position is not None and load.position.unit.category != UnitCategory.LENGTH:
                errors.append(f"载荷 #{load_index}: 位置单位 {load.position.unit.symbol} 不是长度单位")

        if load.load_type in [LoadType.UNIFORM_DISTRIBUTED,
                              LoadType.TRIANGULAR_DISTRIBUTED,
                              LoadType.TRAPEZOIDAL_DISTRIBUTED]:
            if load.start_position is not None and load.start_position.unit.category != UnitCategory.LENGTH:
                errors.append(f"载荷 #{load_index}: 起始位置单位 {load.start_position.unit.symbol} 不是长度单位")
            if load.end_position is not None and load.end_position.unit.category != UnitCategory.LENGTH:
                errors.append(f"载荷 #{load_index}: 结束位置单位 {load.end_position.unit.symbol} 不是长度单位")

        is_valid = len(errors) == 0
        return ValidationResult(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings_list,
        )

    def _validate_units(self, beam: Beam) -> List[str]:
        errors = []
        quantities_to_check: Dict[str, Quantity] = {"梁长度": beam.length}
        target_units: Dict[str, Unit] = {"梁长度": self.unit_system.length_unit}

        for i, load in enumerate(beam.loads):
            quantities_to_check[f"载荷#{i+1}_大小"] = load.magnitude

            if load.load_type == LoadType.CONCENTRATED_FORCE:
                target_units[f"载荷#{i+1}_大小"] = self.unit_system.force_unit
            elif load.load_type == LoadType.CONCENTRATED_MOMENT:
                target_units[f"载荷#{i+1}_大小"] = self.unit_system.moment_unit
            else:
                target_units[f"载荷#{i+1}_大小"] = self.unit_system.distributed_load_unit

            if load.position is not None:
                quantities_to_check[f"载荷#{i+1}_位置"] = load.position
                target_units[f"载荷#{i+1}_位置"] = self.unit_system.length_unit
            if load.start_position is not None:
                quantities_to_check[f"载荷#{i+1}_起始"] = load.start_position
                target_units[f"载荷#{i+1}_起始"] = self.unit_system.length_unit
            if load.end_position is not None:
                quantities_to_check[f"载荷#{i+1}_结束"] = load.end_position
                target_units[f"载荷#{i+1}_结束"] = self.unit_system.length_unit

        mismatches = {}
        for name, qty in quantities_to_check.items():
            target_unit = target_units.get(name)
            if target_unit and qty.unit != target_unit and qty.unit.category == target_unit.category:
                mismatches[name] = target_unit

        if mismatches:
            for name, target_unit in mismatches.items():
                original_qty = quantities_to_check[name]
                self.warnings.unit_mismatch(
                    parameter=name,
                    actual_unit=original_qty.unit.symbol,
                    expected_unit=target_unit.symbol,
                    source=beam.source,
                )
                converted = original_qty.convert_to(target_unit)
                self.warnings.unit_conversion(
                    original=original_qty,
                    converted=converted,
                    source=beam.source,
                )
                self.steps.add_unit_conversion_step(
                    title=f"{name} 单位转换",
                    description=f"将 {name} 从 {original_qty.unit.symbol} 转换为 {target_unit.symbol}",
                    original=original_qty,
                    converted=converted,
                )

                if "大小" in name and i < len(beam.loads):
                    load_idx = int(name.split("#")[1].split("_")[0]) - 1
                    beam.loads[load_idx].magnitude = converted
                elif "位置" in name and i < len(beam.loads):
                    load_idx = int(name.split("#")[1].split("_")[0]) - 1
                    beam.loads[load_idx].position = converted
                elif "起始" in name and i < len(beam.loads):
                    load_idx = int(name.split("#")[1].split("_")[0]) - 1
                    beam.loads[load_idx].start_position = converted
                elif "结束" in name and i < len(beam.loads):
                    load_idx = int(name.split("#")[1].split("_")[0]) - 1
                    beam.loads[load_idx].end_position = converted

        if beam.length.unit != self.unit_system.length_unit:
            beam.length = beam.length.convert_to(self.unit_system.length_unit)

        return errors

    def _check_overlapping_loads(self, beam: Beam) -> List[str]:
        warnings_list = []
        distributed_loads = [
            (i, load) for i, load in enumerate(beam.loads)
            if load.load_type in [LoadType.UNIFORM_DISTRIBUTED,
                                  LoadType.TRIANGULAR_DISTRIBUTED,
                                  LoadType.TRAPEZOIDAL_DISTRIBUTED]
        ]

        for i in range(len(distributed_loads)):
            idx1, load1 = distributed_loads[i]
            start1 = load1.start_position.to_base().value
            end1 = load1.end_position.to_base().value

            for j in range(i + 1, len(distributed_loads)):
                idx2, load2 = distributed_loads[j]
                start2 = load2.start_position.to_base().value
                end2 = load2.end_position.to_base().value

                if start1 < end2 and start2 < end1:
                    overlap_start = max(start1, start2)
                    overlap_end = min(end1, end2)
                    msg = (f"载荷 #{idx1+1} 和 #{idx2+1} 在位置 "
                           f"{overlap_start:.3f}m - {overlap_end:.3f}m 重叠")
                    warnings_list.append(msg)
                    self.warnings.add(
                        warning_type=WarningType.OVERLAPPING_LOADS,
                        level=WarningLevel.WARNING,
                        message=msg,
                        details={"载荷1": idx1 + 1, "载荷2": idx2 + 1,
                                 "重叠起始": overlap_start, "重叠结束": overlap_end},
                        source=beam.source,
                    )

        return warnings_list

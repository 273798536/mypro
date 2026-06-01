from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime
import json
from .models import Beam, Load, LoadType, BoundaryCondition
from .units import Quantity, Unit, UnitSystem
from .calculator import CalculationResult
from .warnings import WarningCollector, Warning, WarningLevel
from .steps import StepTracker, CalculationStep, StepType
from .io import RawData, ProcessedData
from .validator import ValidationResult


@dataclass
class ReportGenerator:
    include_formulas: bool = True
    include_steps: bool = True
    include_warnings: bool = True
    include_raw_data: bool = True
    include_intermediate: bool = True
    include_unit_validation: bool = True
    precision: int = 4

    def generate_text_report(self,
                              beam: Beam,
                              result: CalculationResult,
                              warnings: WarningCollector,
                              steps: StepTracker,
                              raw_data: Optional[RawData] = None,
                              validation: Optional[ValidationResult] = None,
                              chart_paths: Optional[Dict[str, str]] = None) -> str:
        lines = []
        lines.append("=" * 80)
        lines.append("桥梁简支梁受力分析报告")
        lines.append("Simply Supported Beam Stress Analysis Report")
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * 80)
        lines.append("")

        lines.append("一、原始输入材料")
        lines.append("-" * 50)
        if raw_data:
            lines.extend(self._format_raw_data(raw_data))
        else:
            lines.extend(self._format_beam_input(beam))
        lines.append("")

        if self.include_unit_validation:
            lines.append("二、单位系统与校验")
            lines.append("-" * 50)
            lines.extend(self._format_unit_validation(beam, warnings))
            lines.append("")

        if validation and (validation.errors or validation.warnings):
            lines.append("三、输入验证结果")
            lines.append("-" * 50)
            lines.extend(self._format_validation(validation))
            lines.append("")

        lines.append("四、边界条件与载荷清单")
        lines.append("-" * 50)
        lines.extend(self._format_boundary_and_loads(beam))
        lines.append("")

        if self.include_formulas:
            lines.append("五、计算理论与公式")
            lines.append("-" * 50)
            lines.extend(self._format_formulas())
            lines.append("")

        lines.append("六、计算结果汇总")
        lines.append("-" * 50)
        lines.extend(self._format_results_summary(result))
        lines.append("")

        if self.include_intermediate:
            lines.append("七、关键中间量")
            lines.append("-" * 50)
            lines.extend(self._format_intermediate_values(result, steps))
            lines.append("")

        if self.include_steps:
            lines.append("八、计算步骤详情")
            lines.append("-" * 50)
            lines.extend(self._format_calculation_steps(steps))
            lines.append("")

        if self.include_warnings and warnings:
            lines.append("九、警告与异常")
            lines.append("-" * 50)
            lines.extend(self._format_warnings(warnings))
            lines.append("")

        if chart_paths:
            lines.append("十、图表文件")
            lines.append("-" * 50)
            for name, path in chart_paths.items():
                if path:
                    lines.append(f"  {name}: {path}")
            lines.append("")

        lines.append("十一、平衡条件校验")
        lines.append("-" * 50)
        lines.extend(self._format_equilibrium_check(result))
        lines.append("")

        lines.append("=" * 80)
        lines.append("报告结束")
        lines.append("=" * 80)

        return "\n".join(lines)

    def generate_markdown_report(self,
                                  beam: Beam,
                                  result: CalculationResult,
                                  warnings: WarningCollector,
                                  steps: StepTracker,
                                  raw_data: Optional[RawData] = None,
                                  validation: Optional[ValidationResult] = None,
                                  chart_paths: Optional[Dict[str, str]] = None) -> str:
        lines = []
        lines.append("# 桥梁简支梁受力分析报告")
        lines.append("")
        lines.append(f"> 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")

        lines.append("## 1. 原始输入材料")
        if raw_data:
            lines.extend(self._format_raw_data_md(raw_data))
        else:
            lines.extend(self._format_beam_input_md(beam))
        lines.append("")

        if self.include_unit_validation:
            lines.append("## 2. 单位系统与校验")
            lines.extend(self._format_unit_validation_md(beam, warnings))
            lines.append("")

        if validation and (validation.errors or validation.warnings):
            lines.append("## 3. 输入验证结果")
            lines.extend(self._format_validation_md(validation))
            lines.append("")

        lines.append("## 4. 边界条件与载荷清单")
        lines.extend(self._format_boundary_and_loads_md(beam))
        lines.append("")

        if self.include_formulas:
            lines.append("## 5. 计算理论与公式")
            lines.extend(self._format_formulas_md())
            lines.append("")

        lines.append("## 6. 计算结果汇总")
        lines.extend(self._format_results_summary_md(result))
        lines.append("")

        if self.include_intermediate:
            lines.append("## 7. 关键中间量")
            lines.extend(self._format_intermediate_values_md(result, steps))
            lines.append("")

        if self.include_steps:
            lines.append("## 8. 计算步骤详情")
            lines.extend(self._format_calculation_steps_md(steps))
            lines.append("")

        if self.include_warnings and warnings:
            lines.append("## 9. 警告与异常")
            lines.extend(self._format_warnings_md(warnings))
            lines.append("")

        if chart_paths:
            lines.append("## 10. 图表文件")
            for name, path in chart_paths.items():
                if path:
                    if path.endswith(('.png', '.jpg', '.svg')):
                        lines.append(f"![{name}]({path})")
                    else:
                        lines.append(f"- **{name}**: `{path}`")
            lines.append("")

        lines.append("## 11. 平衡条件校验")
        lines.extend(self._format_equilibrium_check_md(result))
        lines.append("")

        lines.append("---")
        lines.append("*报告由桥梁简支梁受力器自动生成*")

        return "\n".join(lines)

    def generate_json_report(self,
                              beam: Beam,
                              result: CalculationResult,
                              warnings: WarningCollector,
                              steps: StepTracker,
                              raw_data: Optional[RawData] = None,
                              validation: Optional[ValidationResult] = None,
                              chart_paths: Optional[Dict[str, str]] = None) -> str:
        report = {
            "report_metadata": {
                "generated_at": datetime.now().isoformat(),
                "generator": "桥梁简支梁受力器",
                "version": "1.0.0",
            },
            "raw_data": raw_data.to_dict() if raw_data else None,
            "unit_system": {
                "length_unit": beam.length.unit.symbol,
                "force_unit": result.left_reaction.unit.symbol if result.left_reaction else "N",
                "moment_unit": result.max_bending_moment.unit.symbol if result.max_bending_moment else "N·m",
            },
            "beam_properties": {
                "length": str(beam.length),
                "left_support": beam.left_support.value,
                "right_support": beam.right_support.value,
                "name": beam.name,
                "notes": beam.notes,
            },
            "loads": [self._load_to_dict(load, i) for i, load in enumerate(beam.loads)],
            "validation": {
                "is_valid": validation.is_valid if validation else True,
                "errors": validation.errors if validation else [],
                "warnings": validation.warnings if validation else [],
            },
            "formulas": self._formulas_list() if self.include_formulas else [],
            "results": result.to_dict(),
            "intermediate_values": self._intermediate_values_dict(result, steps) if self.include_intermediate else {},
            "calculation_steps": steps.to_dict() if self.include_steps else [],
            "warnings": warnings.to_dict() if self.include_warnings else [],
            "equilibrium_check": {
                "passed": result.equilibrium_check,
                "total_reactions": str(result.total_vertical_force),
            },
            "charts": chart_paths or {},
        }
        return json.dumps(report, ensure_ascii=False, indent=2)

    def save_report(self, report_content: str, filepath: str) -> str:
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        return str(path.absolute())

    def _format_raw_data(self, raw_data: RawData) -> List[str]:
        lines = []
        lines.append("  来源文件:")
        for key, filepath in raw_data.source_files.items():
            lines.append(f"    {key}: {filepath}")
        lines.append("")
        lines.append(f"  导入时间: {raw_data.import_timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        lines.append("  原始输入:")
        lines.append(f"    梁长度: {raw_data.beam_length_raw} {raw_data.beam_length_unit_raw or ''}")
        lines.append(f"    左支座: {raw_data.left_support_raw}")
        lines.append(f"    右支座: {raw_data.right_support_raw}")
        lines.append("")
        lines.append(f"  载荷原始数据 ({len(raw_data.loads_raw)} 项):")
        for i, load in enumerate(raw_data.loads_raw):
            source = load.get('_source', load.get('source', '未知'))
            lines.append(f"    #{i+1} [来源: {source}]: {load}")
        lines.append("")
        if raw_data.notes_raw:
            lines.append("  备注:")
            for note in raw_data.notes_raw:
                lines.append(f"    - {note}")
        if raw_data.class_notes:
            lines.append("  课堂备注:")
            for note in raw_data.class_notes:
                lines.append(f"    - {note}")
        return lines

    def _format_beam_input(self, beam: Beam) -> List[str]:
        lines = []
        lines.append(f"  梁长度: {beam.length}")
        lines.append(f"  左支座: {beam.left_support.value}")
        lines.append(f"  右支座: {beam.right_support.value}")
        if beam.source:
            lines.append(f"  来源: {beam.source}")
        if beam.notes:
            lines.append("  备注:")
            for note in beam.notes:
                lines.append(f"    - {note}")
        return lines

    def _format_unit_validation(self, beam: Beam, warnings: WarningCollector) -> List[str]:
        lines = []
        lines.append(f"  长度单位: {beam.length.unit.symbol}")
        from .warnings import WarningType
        unit_warnings = warnings.get_by_type(WarningType.UNIT_MISMATCH)
        conversion_warnings = warnings.get_by_type(WarningType.UNIT_CONVERSION)

        lines.append("")
        lines.append("  单位使用情况:")
        all_units = set()
        all_units.add(beam.length.unit)
        for load in beam.loads:
            all_units.add(load.magnitude.unit)
            if load.position:
                all_units.add(load.position.unit)
            if load.start_position:
                all_units.add(load.start_position.unit)
        for unit in all_units:
            lines.append(f"    - {unit.symbol} ({unit.category.value})")

        if unit_warnings:
            lines.append("")
            lines.append("  单位不一致警告 (已自动转换):")
            for w in unit_warnings:
                lines.append(f"    - {w.message}")

        return lines

    def _format_boundary_and_loads(self, beam: Beam) -> List[str]:
        lines = []
        lines.append(f"  左支座: {beam.left_support.value} (可提供竖向和水平反力)")
        lines.append(f"  右支座: {beam.right_support.value} (仅提供竖向反力)")
        lines.append("")
        lines.append(f"  载荷清单 ({len(beam.loads)} 项):")
        for i, load in enumerate(beam.loads):
            source = f" [来源: {load.source}]" if load.source else ""
            lines.append(f"  #{i+1}: {load.load_type.value}{source}")
            lines.append(f"      大小: {load.magnitude}")
            if load.load_type in [LoadType.CONCENTRATED_FORCE, LoadType.CONCENTRATED_MOMENT]:
                lines.append(f"      位置: {load.position}")
            else:
                lines.append(f"      范围: {load.start_position} ~ {load.end_position}")
                if load.magnitude_end:
                    lines.append(f"      结束集度: {load.magnitude_end}")
            lines.append(f"      等效力: {load.get_effective_force()}")
            lines.append(f"      形心位置: {load.get_centroid_position()}")
        return lines

    def _format_formulas(self) -> List[str]:
        lines = []
        lines.append("  支座反力计算 (对左支座取矩):")
        lines.append("    ΣM_A = 0  →  R_right = Σ(F_i * a_i) / L")
        lines.append("    ΣF_y = 0  →  R_left = ΣF_i - R_right")
        lines.append("")
        lines.append("  剪力方程:")
        lines.append("    V(x) = R_left - ΣF_i (x ≥ a_i) - Σ∫q(x)dx")
        lines.append("")
        lines.append("  弯矩方程:")
        lines.append("    M(x) = R_left * x - ΣF_i*(x-a_i) - Σ∫∫q(x)dx²")
        lines.append("")
        lines.append("  挠曲线微分方程:")
        lines.append("    EI * d²y/dx² = M(x)")
        lines.append("")
        lines.append("  分布载荷等效力:")
        lines.append("    均布: F_eq = q * (b-a),  形心 x = (a+b)/2")
        lines.append("    三角: F_eq = 0.5 * q_max * (b-a),  形心 x = a + 2(b-a)/3")
        lines.append("    梯形: F_eq = 0.5*(q1+q2)*(b-a)")
        return lines

    def _format_results_summary(self, result: CalculationResult) -> List[str]:
        lines = []
        lines.append(f"  左支座反力 R_left:  {result.left_reaction}")
        lines.append(f"  右支座反力 R_right: {result.right_reaction}")
        lines.append("")
        lines.append(f"  最大剪力 V_max:     {result.max_shear_force}")
        lines.append(f"  最小剪力 V_min:     {result.min_shear_force}")
        lines.append("")
        lines.append(f"  最大弯矩 M_max:     {result.max_bending_moment}")
        lines.append(f"  最小弯矩 M_min:     {result.min_bending_moment}")
        if result.shear_force_zero_positions:
            lines.append("")
            lines.append("  剪力为零位置 (弯矩极值点):")
            for pos in result.shear_force_zero_positions:
                lines.append(f"    x = {pos}")
        if result.max_deflection:
            lines.append("")
            lines.append(f"  最大挠度 δ_max:     {result.max_deflection}")
        return lines

    def _format_intermediate_values(self, result: CalculationResult, steps: StepTracker) -> List[str]:
        lines = []
        eq_steps = steps.get_steps_by_type(StepType.EQUILIBRIUM)
        for step in eq_steps:
            for key, value in step.outputs.items():
                if "误差" in key or "平衡" in key:
                    lines.append(f"  {key}: {value}")

        load_steps = steps.get_steps_by_type(StepType.LOAD_EQUIVALENT)
        if load_steps:
            lines.append("")
            lines.append("  载荷等效处理:")
            for step in load_steps:
                for key, value in step.outputs.items():
                    lines.append(f"    {step.title} - {key}: {value}")

        reaction_steps = steps.get_steps_by_type(StepType.REACTION_CALCULATION)
        if reaction_steps:
            lines.append("")
            lines.append("  反力计算过程:")
            for step in reaction_steps:
                if step.formula:
                    lines.append(f"    {step.formula.expression}")
                    for k, v in step.formula.variables.items():
                        lines.append(f"      {k} = {v}")
        return lines

    def _format_calculation_steps(self, steps: StepTracker) -> List[str]:
        lines = []
        for i, step in enumerate(steps, 1):
            lines.append(f"  [{i}] {step.title}")
            lines.append(f"      类型: {step.step_type.value}")
            lines.append(f"      描述: {step.description}")
            if step.inputs:
                lines.append(f"      输入:")
                for k, v in step.inputs.items():
                    lines.append(f"        {k} = {v}")
            if step.formula:
                lines.append(f"      公式: {step.formula.expression}")
                lines.append(f"        变量:")
                for k, v in step.formula.variables.items():
                    lines.append(f"          {k} = {v}")
                lines.append(f"        结果: {step.formula.result}")
            if step.outputs:
                lines.append(f"      输出:")
                for k, v in step.outputs.items():
                    lines.append(f"        {k} = {v}")
            lines.append("")
        return lines

    def _format_warnings(self, warnings: WarningCollector) -> List[str]:
        lines = []
        level_order = [WarningLevel.CRITICAL, WarningLevel.ERROR, WarningLevel.WARNING, WarningLevel.INFO]
        for level in level_order:
            level_warnings = warnings.get_by_level(level)
            if level_warnings:
                lines.append(f"  [{level.value.upper()}] ({len(level_warnings)} 项):")
                for w in level_warnings:
                    src = f" [{w.source}]" if w.source else ""
                    lines.append(f"    - {w.message}{src}")
                    if w.details:
                        for k, v in w.details.items():
                            lines.append(f"        {k}: {v}")
        if not lines:
            lines.append("  无警告")
        return lines

    def _format_equilibrium_check(self, result: CalculationResult) -> List[str]:
        lines = []
        status = "✓ 通过" if result.equilibrium_check else "✗ 不通过"
        lines.append(f"  平衡校验: {status}")
        lines.append(f"  总竖向反力: {result.total_vertical_force}")
        if result.total_moment:
            lines.append(f"  总力矩: {result.total_moment}")
        return lines

    def _format_raw_data_md(self, raw_data: RawData) -> List[str]:
        lines = []
        lines.append("")
        lines.append("| 项目 | 内容 |")
        lines.append("|------|------|")
        lines.append(f"| 导入时间 | {raw_data.import_timestamp.strftime('%Y-%m-%d %H:%M:%S')} |")
        lines.append(f"| 梁长度 | {raw_data.beam_length_raw} {raw_data.beam_length_unit_raw or ''} |")
        lines.append(f"| 左支座 | {raw_data.left_support_raw} |")
        lines.append(f"| 右支座 | {raw_data.right_support_raw} |")
        lines.append(f"| 载荷数量 | {len(raw_data.loads_raw)} |")
        lines.append("")
        lines.append("**来源文件:**")
        for key, filepath in raw_data.source_files.items():
            lines.append(f"- `{key}`: {filepath}")
        return lines

    def _format_beam_input_md(self, beam: Beam) -> List[str]:
        lines = []
        lines.append("")
        lines.append("| 参数 | 值 |")
        lines.append("|------|----|")
        lines.append(f"| 梁长度 | {beam.length} |")
        lines.append(f"| 左支座 | {beam.left_support.value} |")
        lines.append(f"| 右支座 | {beam.right_support.value} |")
        if beam.source:
            lines.append(f"| 来源 | {beam.source} |")
        return lines

    def _format_unit_validation_md(self, beam: Beam, warnings: WarningCollector) -> List[str]:
        lines = []
        all_units = set()
        all_units.add(beam.length.unit)
        for load in beam.loads:
            all_units.add(load.magnitude.unit)
            if load.position:
                all_units.add(load.position.unit)

        lines.append("")
        lines.append("| 单位 | 类别 |")
        lines.append("|------|------|")
        for unit in sorted(all_units, key=lambda u: u.category.value):
            lines.append(f"| {unit.symbol} | {unit.category.value} |")

        unit_warnings = [w for w in warnings.warnings if w.warning_type.value == "unit_mismatch"]
        if unit_warnings:
            lines.append("")
            lines.append("**单位转换记录:**")
            for w in unit_warnings:
                lines.append(f"- ⚠️ {w.message}")
        return lines

    def _format_validation_md(self, validation: ValidationResult) -> List[str]:
        lines = []
        status = "✅ 验证通过" if validation.is_valid else "❌ 验证失败"
        lines.append(f"")
        lines.append(f"**状态:** {status}")
        if validation.errors:
            lines.append("")
            lines.append("❌ **错误:**")
            for err in validation.errors:
                lines.append(f"- {err}")
        if validation.warnings:
            lines.append("")
            lines.append("⚠️ **警告:**")
            for w in validation.warnings:
                lines.append(f"- {w}")
        return lines

    def _format_boundary_and_loads_md(self, beam: Beam) -> List[str]:
        lines = []
        lines.append("")
        lines.append("### 边界条件")
        lines.append(f"- 左支座: **{beam.left_support.value}**")
        lines.append(f"- 右支座: **{beam.right_support.value}**")
        lines.append("")
        lines.append("### 载荷清单")
        for i, load in enumerate(beam.loads, 1):
            source = f" (来源: `{load.source}`)" if load.source else ""
            lines.append(f"")
            lines.append(f"**#{i}: {load.load_type.value}**{source}")
            lines.append(f"- 大小: `{load.magnitude}`")
            if load.load_type in [LoadType.CONCENTRATED_FORCE, LoadType.CONCENTRATED_MOMENT]:
                lines.append(f"- 位置: `{load.position}`")
            else:
                lines.append(f"- 范围: `{load.start_position}` ~ `{load.end_position}`")
            lines.append(f"- 等效力: `{load.get_effective_force()}`")
            lines.append(f"- 形心: `{load.get_centroid_position()}`")
        return lines

    def _format_formulas_md(self) -> List[str]:
        lines = []
        lines.append("")
        lines.append("```math")
        lines.append("\\text{支座反力:}")
        lines.append("\\sum M_A = 0 \\quad \\Rightarrow \\quad R_{right} = \\frac{\\sum F_i \\cdot a_i}{L}")
        lines.append("\\sum F_y = 0 \\quad \\Rightarrow \\quad R_{left} = \\sum F_i - R_{right}")
        lines.append("")
        lines.append("\\text{剪力方程:}")
        lines.append("V(x) = R_{left} - \\sum F_i \\cdot H(x-a_i) - \\int_0^x q(\\xi) d\\xi")
        lines.append("")
        lines.append("\\text{弯矩方程:}")
        lines.append("M(x) = R_{left} \\cdot x - \\sum F_i \\cdot (x-a_i) \\cdot H(x-a_i)")
        lines.append("")
        lines.append("\\text{挠曲线方程:}")
        lines.append("EI \\cdot \\frac{d^2 y}{dx^2} = M(x)")
        lines.append("```")
        return lines

    def _format_results_summary_md(self, result: CalculationResult) -> List[str]:
        lines = []
        lines.append("")
        lines.append("| 指标 | 值 |")
        lines.append("|------|----|")
        lines.append(f"| 左支座反力 R_left | `{result.left_reaction}` |")
        lines.append(f"| 右支座反力 R_right | `{result.right_reaction}` |")
        lines.append(f"| 最大剪力 V_max | `{result.max_shear_force}` |")
        lines.append(f"| 最小剪力 V_min | `{result.min_shear_force}` |")
        lines.append(f"| 最大弯矩 M_max | `{result.max_bending_moment}` |")
        lines.append(f"| 最小弯矩 M_min | `{result.min_bending_moment}` |")
        if result.max_deflection:
            lines.append(f"| 最大挠度 δ_max | `{result.max_deflection}` |")
        if result.shear_force_zero_positions:
            zeros = ", ".join([f"`{pos}`" for pos in result.shear_force_zero_positions])
            lines.append(f"| 剪力零点 (弯矩极值点) | {zeros} |")
        return lines

    def _format_intermediate_values_md(self, result: CalculationResult, steps: StepTracker) -> List[str]:
        lines = []
        lines.append("")
        eq_steps = steps.get_steps_by_type(StepType.EQUILIBRIUM)
        if eq_steps:
            lines.append("**平衡校验:**")
            for step in eq_steps:
                for k, v in step.outputs.items():
                    lines.append(f"- {k}: `{v}`")

        reaction_steps = steps.get_steps_by_type(StepType.REACTION_CALCULATION)
        if reaction_steps:
            lines.append("")
            lines.append("**反力计算:**")
            for step in reaction_steps:
                if step.formula:
                    lines.append(f"- `{step.formula.expression}`")
                    lines.append("  变量:")
                    for k, v in step.formula.variables.items():
                        lines.append(f"  - `{k} = {v}`")
                    lines.append(f"  → `{step.formula.result}`")

        return lines

    def _format_calculation_steps_md(self, steps: StepTracker) -> List[str]:
        lines = []
        for i, step in enumerate(steps, 1):
            lines.append("")
            lines.append(f"### {i}. {step.title}")
            lines.append(f"*类型: `{step.step_type.value}`*")
            lines.append("")
            lines.append(f"{step.description}")
            if step.inputs:
                lines.append("")
                lines.append("**输入:**")
                for k, v in step.inputs.items():
                    lines.append(f"- `{k}` = `{v}`")
            if step.formula:
                lines.append("")
                lines.append(f"**公式:** `{step.formula.expression}`")
                lines.append("")
                lines.append("**代入变量:**")
                for k, v in step.formula.variables.items():
                    lines.append(f"- `{k}` = `{v}`")
                lines.append("")
                lines.append(f"**结果:** `{step.formula.result}`")
            if step.outputs:
                lines.append("")
                lines.append("**输出:**")
                for k, v in step.outputs.items():
                    lines.append(f"- `{k}` = `{v}`")
        return lines

    def _format_warnings_md(self, warnings: WarningCollector) -> List[str]:
        lines = []
        if not warnings.warnings:
            lines.append("")
            lines.append("✅ 无警告")
            return lines

        level_icons = {
            WarningLevel.CRITICAL: "🔴",
            WarningLevel.ERROR: "🔴",
            WarningLevel.WARNING: "🟡",
            WarningLevel.INFO: "🔵",
        }

        lines.append("")
        for level in [WarningLevel.CRITICAL, WarningLevel.ERROR, WarningLevel.WARNING, WarningLevel.INFO]:
            level_warnings = warnings.get_by_level(level)
            if level_warnings:
                lines.append(f"")
                lines.append(f"{level_icons[level]} **{level.value.upper()} ({len(level_warnings)} 项)**")
                for w in level_warnings:
                    src = f" (`{w.source}`)" if w.source else ""
                    lines.append(f"- {w.message}{src}")
                    if w.details:
                        for k, v in w.details.items():
                            lines.append(f"  - {k}: `{v}`")
        return lines

    def _format_equilibrium_check_md(self, result: CalculationResult) -> List[str]:
        lines = []
        status = "✅ 通过" if result.equilibrium_check else "❌ 不通过"
        lines.append("")
        lines.append(f"**状态:** {status}")
        lines.append(f"- 总竖向反力: `{result.total_vertical_force}`")
        return lines

    def _load_to_dict(self, load: Load, index: int) -> Dict[str, Any]:
        d = {
            "index": index + 1,
            "type": load.load_type.value,
            "magnitude": str(load.magnitude),
            "direction": load.direction,
            "source": load.source,
            "effective_force": str(load.get_effective_force()),
            "centroid_position": str(load.get_centroid_position()),
        }
        if load.position:
            d["position"] = str(load.position)
        if load.start_position:
            d["start_position"] = str(load.start_position)
        if load.end_position:
            d["end_position"] = str(load.end_position)
        if load.magnitude_end:
            d["magnitude_end"] = str(load.magnitude_end)
        return d

    def _formulas_list(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "右支座反力",
                "expression": "R_right = Σ(F_i * a_i) / L",
                "description": "对左支座取矩，力矩平衡",
            },
            {
                "name": "左支座反力",
                "expression": "R_left = ΣF_i - R_right",
                "description": "竖向力平衡",
            },
            {
                "name": "剪力方程",
                "expression": "V(x) = R_left - ΣF_i(left of x)",
                "description": "截面左侧竖向力代数和",
            },
            {
                "name": "弯矩方程",
                "expression": "M(x) = R_left*x - ΣF_i*(x-a_i)",
                "description": "截面左侧力矩代数和",
            },
            {
                "name": "挠曲线方程",
                "expression": "EI * d²y/dx² = M(x)",
                "description": "材料力学基本方程",
            },
        ]

    def _intermediate_values_dict(self, result: CalculationResult, steps: StepTracker) -> Dict[str, Any]:
        data = {}
        for step in steps:
            if step.outputs:
                data[step.title] = {k: str(v) for k, v in step.outputs.items()}
        return data

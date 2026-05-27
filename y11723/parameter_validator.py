import numpy as np
from dataclasses import dataclass
from typing import List, Tuple, Optional, Callable
import inspect
from physics_core import SimulationParams, CalculationTrace


@dataclass
class ValidationResult:
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    corrected_params: Optional[SimulationParams]
    corrections: List[CalculationTrace]


class ParameterValidator:
    MIN_SPEED = 0.001
    MAX_SPEED = 100.0
    MIN_TURNS = 1
    MAX_TURNS = 10000
    MIN_FIELD = 0.0001
    MAX_FIELD = 10.0
    MIN_TIME_STEP = 0.0001
    MAX_TIME_STEP = 0.5
    RECOMMENDED_TIME_STEP_RATIO = 0.01

    def __init__(self):
        self.validation_traces: List[CalculationTrace] = []

    def _trace_correction(self, var_name: str, before: float, after: float, reason: str):
        frame = inspect.currentframe().f_back
        self.validation_traces.append(CalculationTrace(
            source_file=frame.f_code.co_filename,
            line_number=frame.f_lineno,
            function_name=frame.f_code.co_name,
            variable_name=var_name,
            value_before=before,
            value_after=after,
            reason=reason,
            timestamp=float(np.datetime64('now').astype(float))
        ))

    def validate_speed(self, speed: float) -> Tuple[float, List[str], List[str]]:
        errors = []
        warnings = []
        corrected = speed
        
        source_line = inspect.currentframe().f_lineno + 1
        if speed == 0:
            errors.append(
                f"[ERROR] {inspect.currentframe().f_code.co_name} (L{source_line}): "
                f"磁铁速度不能为零！速度=0 m/s 将导致磁通量变化率为零，无法产生感应电流。"
                f"建议速度范围: {self.MIN_SPEED} ~ {self.MAX_SPEED} m/s"
            )
            corrected = self.MIN_SPEED
            self._trace_correction('magnet_speed', 0, corrected, '速度为零，已自动修正为最小允许值')
        
        elif abs(speed) < self.MIN_SPEED:
            warnings.append(
                f"[WARNING] {inspect.currentframe().f_code.co_name} (L{source_line}): "
                f"磁铁速度过小: |v|={abs(speed)} m/s < {self.MIN_SPEED} m/s。"
                f"这可能导致感应电流过于微弱，难以观测。"
            )
            corrected = self.MIN_SPEED if speed > 0 else -self.MIN_SPEED
            self._trace_correction('magnet_speed', speed, corrected, '速度过小，已修正为最小允许值')
        
        elif abs(speed) > self.MAX_SPEED:
            warnings.append(
                f"[WARNING] {inspect.currentframe().f_code.co_name} (L{source_line}): "
                f"磁铁速度过大: |v|={abs(speed)} m/s > {self.MAX_SPEED} m/s。"
                f"高速运动可能导致数值计算不稳定。"
            )
            corrected = self.MAX_SPEED if speed > 0 else -self.MAX_SPEED
            self._trace_correction('magnet_speed', speed, corrected, '速度过大，已修正为最大允许值')
        
        return corrected, errors, warnings

    def validate_turns(self, turns: int) -> Tuple[int, List[str], List[str]]:
        errors = []
        warnings = []
        corrected = turns
        
        source_line = inspect.currentframe().f_lineno + 1
        if not isinstance(turns, int) or turns < self.MIN_TURNS:
            errors.append(
                f"[ERROR] {inspect.currentframe().f_code.co_name} (L{source_line}): "
                f"线圈匝数必须为正整数！匝数={turns}，最小允许值={self.MIN_TURNS}"
            )
            corrected = max(self.MIN_TURNS, int(turns) if isinstance(turns, (int, float)) else self.MIN_TURNS)
            self._trace_correction('coil_turns', turns, corrected, '匝数非法，已修正为最小允许值')
        
        elif turns > self.MAX_TURNS:
            warnings.append(
                f"[WARNING] {inspect.currentframe().f_code.co_name} (L{source_line}): "
                f"线圈匝数过大: N={turns} > {self.MAX_TURNS}。"
                f"过多匝数会增加计算量，且实际线圈电阻不可忽略。"
            )
            corrected = self.MAX_TURNS
            self._trace_correction('coil_turns', turns, corrected, '匝数过大，已修正为最大允许值')
        
        return corrected, errors, warnings

    def validate_time_step(self, time_step: float, total_time: float, speed: float) -> Tuple[float, List[str], List[str]]:
        errors = []
        warnings = []
        corrected = time_step
        
        source_line = inspect.currentframe().f_lineno + 1
        if time_step <= 0:
            errors.append(
                f"[ERROR] {inspect.currentframe().f_code.co_name} (L{source_line}): "
                f"时间步长必须为正数！时间步={time_step} s"
            )
            corrected = self.MIN_TIME_STEP
            self._trace_correction('time_step', time_step, corrected, '时间步非法，已修正为最小允许值')
        
        elif time_step > self.MAX_TIME_STEP:
            warnings.append(
                f"[WARNING] {inspect.currentframe().f_code.co_name} (L{source_line}): "
                f"时间步长过大: Δt={time_step} s > {self.MAX_TIME_STEP} s。"
                f"粗时间步可能导致电流曲线失真，丢失峰值信息。"
                f"建议时间步不超过磁铁通过线圈时间的1/20。"
            )
        
        if speed != 0:
            coil_pass_time = 0.2 / abs(speed)
            recommended_dt = coil_pass_time * self.RECOMMENDED_TIME_STEP_RATIO
            if time_step > recommended_dt * 2:
                warnings.append(
                    f"[WARNING] {inspect.currentframe().f_code.co_name} (L{source_line}): "
                    f"时间步长相对于磁铁速度过粗: Δt={time_step} s，"
                    f"推荐值≈{recommended_dt:.6f} s。"
                    f"这可能导致无法准确捕捉电流峰值。"
                )
        
        num_steps = total_time / time_step
        if num_steps < 20:
            errors.append(
                f"[ERROR] {inspect.currentframe().f_code.co_name} (L{source_line}): "
                f"总步数过少: {num_steps:.1f} 步 < 20 步。"
                f"请减小时间步长或增加总时间。"
            )
        
        return corrected, errors, warnings

    def validate_field_strength(self, field: float) -> Tuple[float, List[str], List[str]]:
        errors = []
        warnings = []
        corrected = field
        
        source_line = inspect.currentframe().f_lineno + 1
        if field <= 0:
            errors.append(
                f"[ERROR] {inspect.currentframe().f_code.co_name} (L{source_line}): "
                f"磁场强度必须为正数！B={field} T"
            )
            corrected = self.MIN_FIELD
            self._trace_correction('magnet_field_strength', field, corrected, '磁场强度非法，已修正为最小允许值')
        
        elif field > self.MAX_FIELD:
            warnings.append(
                f"[WARNING] {inspect.currentframe().f_code.co_name} (L{source_line}): "
                f"磁场强度过大: B={field} T > {self.MAX_FIELD} T。"
                f"普通永磁体磁场强度通常在0.001~0.5 T之间。"
            )
        
        return corrected, errors, warnings

    def validate_sign_consistency(self, params: SimulationParams) -> List[str]:
        warnings = []
        
        source_line = inspect.currentframe().f_lineno + 1
        if params.magnet_speed < 0:
            warnings.append(
                f"[INFO] {inspect.currentframe().f_code.co_name} (L{source_line}): "
                f"磁铁速度为负 (v={params.magnet_speed} m/s)，"
                f"表示磁铁向左运动。感应电流方向将与向右运动时相反。"
                f"楞次定律: 感应电流的方向总是阻碍引起感应电流的磁通量的变化。"
            )
        
        return warnings

    def validate_all(self, params: SimulationParams) -> ValidationResult:
        all_errors = []
        all_warnings = []
        corrections = []
        
        corrected_params = SimulationParams(
            magnet_speed=params.magnet_speed,
            coil_turns=params.coil_turns,
            magnet_field_strength=params.magnet_field_strength,
            time_step=params.time_step,
            total_time=params.total_time,
            coil_radius=params.coil_radius,
            magnet_length=params.magnet_length,
            coil_position=params.coil_position
        )
        
        corrected_speed, speed_errors, speed_warnings = self.validate_speed(params.magnet_speed)
        corrected_params.magnet_speed = corrected_speed
        all_errors.extend(speed_errors)
        all_warnings.extend(speed_warnings)
        
        corrected_turns, turns_errors, turns_warnings = self.validate_turns(params.coil_turns)
        corrected_params.coil_turns = corrected_turns
        all_errors.extend(turns_errors)
        all_warnings.extend(turns_warnings)
        
        corrected_field, field_errors, field_warnings = self.validate_field_strength(params.magnet_field_strength)
        corrected_params.magnet_field_strength = corrected_field
        all_errors.extend(field_errors)
        all_warnings.extend(field_warnings)
        
        corrected_dt, dt_errors, dt_warnings = self.validate_time_step(
            params.time_step, params.total_time, params.magnet_speed
        )
        corrected_params.time_step = corrected_dt
        all_errors.extend(dt_errors)
        all_warnings.extend(dt_warnings)
        
        sign_warnings = self.validate_sign_consistency(corrected_params)
        all_warnings.extend(sign_warnings)
        
        corrections = self.validation_traces.copy()
        self.validation_traces = []
        
        is_valid = len(all_errors) == 0
        
        return ValidationResult(
            is_valid=is_valid,
            errors=all_errors,
            warnings=all_warnings,
            corrected_params=corrected_params if corrections else None,
            corrections=corrections
        )

    def explain_correction(self, trace: CalculationTrace) -> str:
        return (
            f"修正记录 [{trace.timestamp}]:\n"
            f"  位置: {trace.source_file}:{trace.line_number} (函数: {trace.function_name})\n"
            f"  变量: {trace.variable_name}\n"
            f"  原值: {trace.value_before} → 修正后: {trace.value_after}\n"
            f"  原因: {trace.reason}\n"
        )

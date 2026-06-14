from __future__ import annotations

import copy
from typing import Optional

from .models import (
    Anomaly,
    AnomalyType,
    BoundarySample,
    CheckResult,
    CheckStep,
    CheckStatus,
    HistoricalAnswer,
    Material,
    Unit,
    WindowConfig,
)


def _make_step(
    step_id: str,
    step_name: str,
    description: str,
    config: WindowConfig,
    before,
    after,
    detail: str = "",
) -> CheckStep:
    changed = before != after
    return CheckStep(
        step_id=step_id,
        step_name=step_name,
        description=description,
        config_snapshot=config.to_dict(),
        result_before=copy.deepcopy(before),
        result_after=copy.deepcopy(after),
        changed=changed,
        detail=detail,
    )


def _unit_convertible(from_u: Unit, to_u: Unit) -> bool:
    time_units = {Unit.SECOND, Unit.MINUTE}
    count_units = {Unit.PERSON, Unit.COUNT}
    if from_u == to_u:
        return True
    if from_u in time_units and to_u in time_units:
        return True
    if from_u in count_units and to_u in count_units:
        return True
    return False


def _to_minutes(value: float, unit: Unit) -> float:
    if unit == Unit.SECOND:
        return value / 60.0
    return value


def _check_name_match(materials: list[Material], result: CheckResult, answer: HistoricalAnswer) -> None:
    for idx, mat in enumerate(materials):
        if not mat.is_name_matched:
            src_line = mat.source_line or (idx + 2)
            raw_ref = ""
            if answer.raw_rows and idx < len(answer.raw_rows):
                raw_ref = str(answer.raw_rows[idx])
            result.add_anomaly(Anomaly(
                anomaly_type=AnomalyType.NAME_MISMATCH,
                message=f"材料名称不一致：期望「{mat.expected_name}」，实际「{mat.name}」",
                material=mat,
                source_line=src_line,
                raw_reference=raw_ref,
            ))


def _check_empty_set(answer: HistoricalAnswer, result: CheckResult) -> None:
    if answer.has_empty_materials():
        result.add_anomaly(Anomaly(
            anomaly_type=AnomalyType.EMPTY_SET,
            message="历史答案材料集合为空，无法进行窗口边界校验",
            source_line=None,
            raw_reference=str(answer.raw_rows) if answer.raw_rows else None,
        ))


def _check_units(materials: list[Material], config: WindowConfig, result: CheckResult) -> None:
    for idx, mat in enumerate(materials):
        if not _unit_convertible(mat.unit, config.value_unit):
            result.add_anomaly(Anomaly(
                anomaly_type=AnomalyType.UNIT_MISMATCH,
                message=f"材料 {mat.name} 单位「{mat.unit.value}」与目标单位「{config.value_unit.value}」不可换算",
                material=mat,
                source_line=mat.source_line or (idx + 2),
                raw_reference=str(mat.raw_data) if mat.raw_data else None,
            ))


def _detect_sort_stability(materials: list[Material]) -> tuple[bool, list[list[Material]]]:
    by_quantity = sorted(materials, key=lambda m: m.quantity)

    ties: list[list[Material]] = []
    i = 0
    while i < len(by_quantity):
        j = i
        while j + 1 < len(by_quantity) and by_quantity[j + 1].quantity == by_quantity[i].quantity:
            j += 1
        if j > i:
            ties.append(by_quantity[i : j + 1])
        i = j + 1

    stable = len(ties) == 0

    return stable, ties


def _apply_formula(total_quantity: float, window_size_minutes: float) -> float:
    if window_size_minutes <= 0:
        raise ValueError("窗口大小必须为正数")
    return total_quantity / window_size_minutes


def _collect_boundary_samples(
    materials: list[Material],
    computed: float,
    config: WindowConfig,
) -> list[BoundarySample]:
    samples: list[BoundarySample] = []
    qties = [m.quantity for m in materials]
    if qties:
        samples.append(BoundarySample(
            label="材料最小值",
            value=min(qties),
            bound_type="material_min",
            unit=materials[0].unit,
            within_bound=True,
        ))
        samples.append(BoundarySample(
            label="材料最大值",
            value=max(qties),
            bound_type="material_max",
            unit=materials[0].unit,
            within_bound=True,
        ))
    samples.append(BoundarySample(
        label="窗口下限",
        value=config.lower_bound,
        bound_type="lower",
        unit=config.value_unit,
        within_bound=computed >= config.lower_bound - config.tolerance,
    ))
    samples.append(BoundarySample(
        label="窗口上限",
        value=config.upper_bound,
        bound_type="upper",
        unit=config.value_unit,
        within_bound=computed <= config.upper_bound + config.tolerance,
    ))
    samples.append(BoundarySample(
        label="实际计算值",
        value=computed,
        bound_type="computed",
        unit=config.value_unit,
        within_bound=config.lower_bound - config.tolerance <= computed <= config.upper_bound + config.tolerance,
    ))
    return samples


class QueueWindowValidator:
    def __init__(self, config: WindowConfig) -> None:
        self._base_config = copy.deepcopy(config)
        self._current_config = copy.deepcopy(config)

    @property
    def config(self) -> WindowConfig:
        return self._current_config

    def update_config(self, **kwargs) -> None:
        for k, v in kwargs.items():
            if hasattr(self._current_config, k):
                setattr(self._current_config, k, v)

    def reset_config(self) -> None:
        self._current_config = copy.deepcopy(self._base_config)

    def validate(self, answer: HistoricalAnswer) -> CheckResult:
        result = CheckResult(
            status=CheckStatus.PASS,
            historical_answer_id=answer.answer_id,
        )
        materials = list(answer.materials)
        config = self._current_config

        status_before = CheckStatus.PASS.name
        _check_empty_set(answer, result)
        result.add_step(_make_step(
            "s01",
            "空集合检查",
            "检测历史答案材料集合是否为空",
            config,
            status_before,
            result.status.name,
            detail="空集合将导致校验挂起，等待复核人确认",
        ))

        anomalies_before = len(result.anomalies)
        _check_name_match(materials, result, answer)
        result.add_step(_make_step(
            "s02",
            "名称一致性校验",
            "逐条比对材料名称与期望名称",
            config,
            anomalies_before,
            len(result.anomalies),
            detail=f"新增 {len(result.anomalies) - anomalies_before} 条名称不一致异常",
        ))

        anomalies_before = len(result.anomalies)
        _check_units(materials, config, result)
        result.add_step(_make_step(
            "s03",
            "单位可换算性检查",
            "校验材料单位与窗口目标单位是否可换算",
            config,
            anomalies_before,
            len(result.anomalies),
            detail=f"新增 {len(result.anomalies) - anomalies_before} 条单位异常",
        ))

        sort_stable_before: Optional[bool] = None
        sort_stable, ties = _detect_sort_stability(materials)
        result.sort_stable = sort_stable
        if not sort_stable:
            tie_desc = "; ".join(
                f"数量 {t[0].quantity}: " + ",".join(m.material_id for m in t)
                for t in ties
            )
            result.add_anomaly(Anomaly(
                anomaly_type=AnomalyType.SORT_UNSTABLE,
                message=f"排序不稳定：存在数量并列的材料组 [{tie_desc}]，请复核人确认排序",
                source_line=None,
                raw_reference=tie_desc,
            ))
        result.add_step(_make_step(
            "s04",
            "排序稳定性检测",
            "检测是否存在并列数量导致排序顺序不稳定",
            config,
            sort_stable_before,
            sort_stable,
            detail=f"并列组数: {len(ties)}; 是否稳定: {sort_stable}",
        ))

        if answer.has_empty_materials() or not sort_stable:
            result.formula_applied = config.formula
            return result

        total_before = None
        total_quantity = sum(m.quantity for m in materials)
        result.add_step(_make_step(
            "s05",
            "材料数量汇总",
            "对所有材料的数量求和作为总处理量",
            config,
            total_before,
            total_quantity,
            detail=f"材料数 {len(materials)}，单位: {materials[0].unit.value if materials else '-'}",
        ))

        window_minutes_before = None
        window_minutes = _to_minutes(config.window_size, config.window_unit)
        result.add_step(_make_step(
            "s06",
            "窗口大小单位换算",
            f"将窗口大小换算为分钟（基准单位），公式: 原值 * 换算系数",
            config,
            window_minutes_before,
            window_minutes,
            detail=f"{config.window_size} {config.window_unit.value} = {window_minutes} 分钟",
        ))

        computed_before = None
        try:
            computed = _apply_formula(total_quantity, window_minutes)
        except ValueError as exc:
            result.add_anomaly(Anomaly(
                anomaly_type=AnomalyType.FORMULA_ERROR,
                message=f"公式执行错误: {exc}",
                raw_reference=config.formula,
            ))
            computed = None
        result.add_step(_make_step(
            "s07",
            "应用窗口公式",
            f"应用公式: {config.formula}",
            config,
            computed_before,
            computed,
            detail=f"计算结果: {computed} {config.value_unit.value}/分钟" if computed is not None else "公式执行失败",
        ))

        if computed is not None:
            result.computed_value = computed
            result.computed_unit = config.value_unit
            result.formula_applied = config.formula

            within = config.lower_bound - config.tolerance <= computed <= config.upper_bound + config.tolerance
            samples = _collect_boundary_samples(materials, computed, config)
            result.boundary_samples = samples

            bound_before = True
            if not within:
                if computed < config.lower_bound:
                    result.add_anomaly(Anomaly(
                        anomaly_type=AnomalyType.BOUNDARY_BREACH,
                        message=f"计算值 {computed:.4f} {config.value_unit.value} 低于下限 {config.lower_bound}",
                        raw_reference=f"computed={computed}, lower={config.lower_bound}, upper={config.upper_bound}",
                    ))
                else:
                    result.add_anomaly(Anomaly(
                        anomaly_type=AnomalyType.BOUNDARY_BREACH,
                        message=f"计算值 {computed:.4f} {config.value_unit.value} 高于上限 {config.upper_bound}",
                        raw_reference=f"computed={computed}, lower={config.lower_bound}, upper={config.upper_bound}",
                    ))
            result.add_step(_make_step(
                "s08",
                "边界判定",
                "判断计算值是否落在 [下限, 上限] 区间（考虑容差）",
                config,
                bound_before,
                within,
                detail=f"容差={config.tolerance}; 结果={'通过' if within else '越界'}",
            ))

        return result

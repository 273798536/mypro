from __future__ import annotations

import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, Union

from .gap_detector import detect_sampling_gaps
from .material_importer import load_materials_from_dir, summarize_material_impact
from .models import (
    InterfaceResponse,
    ManualOverride,
    Material,
    MaterialStatus,
    PendingItem,
    ParamVersion,
    ProcessedItem,
    ProcessRecord,
    ProcessStatus,
    ProcessStep,
    SamplingGap,
    SitePhoto,
    TerminalSummary,
    WarningResult,
)
from .param_versioning import ResultHistory, get_param_version
from .warning_calculator import compute_warning


def _build_processed_items(materials: list[Material], photos: list[SitePhoto]) -> list[ProcessedItem]:
    items: list[ProcessedItem] = []
    for m in materials:
        detail = {"version": m.version, "source": m.source.value}
        if m.matched_standard_name:
            detail["建议匹配标准名称"] = m.matched_standard_name
        if m.issue_description:
            detail["问题描述"] = m.issue_description
        items.append(ProcessedItem(
            kind="材料",
            identifier=m.material_id,
            display_name=f"{m.name} ({m.version})",
            status=m.status.value,
            detail=detail,
        ))
    for p in photos:
        detail = {
            "sample_index": p.sample_index,
            "speckle_intensity": p.speckle_intensity,
        }
        if p.has_sampling_gap:
            detail["gap_info"] = p.gap_info
        items.append(ProcessedItem(
            kind="现场照片",
            identifier=p.photo_id,
            display_name=p.position_label,
            status="有缺口" if p.has_sampling_gap else "正常",
            detail=detail,
        ))
    return items


def _build_pending_items(
    materials: list[Material], gaps: list[SamplingGap]
) -> list[PendingItem]:
    pending: list[PendingItem] = []
    for m in materials:
        if m.status == MaterialStatus.OLD_VERSION:
            pending.append(PendingItem(
                kind="材料",
                identifier=m.material_id,
                reason=f"检测为旧版材料（{m.version}），其参数可能已被新版覆盖",
                required_action="请确认该旧版材料是否仍适用于本次预警计算；如不适用请替换为新版",
                affected_scope=f"材料「{m.name}」关联的全部采样数据",
            ))
        elif m.status == MaterialStatus.NAME_MISMATCH:
            hint = f"，建议匹配为「{m.matched_standard_name}」" if m.matched_standard_name else ""
            pending.append(PendingItem(
                kind="材料",
                identifier=m.material_id,
                reason=f"材料名称「{m.name}」不在标准清单中{hint}",
                required_action="请确认材料真实名称及对应参数取值，必要时做命名归一化",
                affected_scope=f"材料「{m.name}」及依赖该材料的阈值计算",
            ))
        elif m.status == MaterialStatus.VERBAL:
            pending.append(PendingItem(
                kind="口头备注",
                identifier=m.material_id,
                reason="口头备注未经过标准化录入，权重未定义",
                required_action="请由负责人确认该备注是否纳入计算及对应的影响权重",
                affected_scope=f"备注「{m.name}」对预警结论的定性影响",
            ))
    for g in gaps:
        pending.append(PendingItem(
            kind="采样缺口",
            identifier=g.gap_id,
            reason=g.reason,
            required_action=g.suggested_action,
            affected_scope=g.affected_range,
        ))
    return pending


def build_interface_response(
    materials: list[Material],
    photos: list[SitePhoto],
    gaps: list[SamplingGap],
    params: ParamVersion,
    result: Optional[WarningResult],
    paused: bool,
    manual_overrides: Optional[list[ManualOverride]] = None,
    history: Optional[ResultHistory] = None,
) -> InterfaceResponse:
    overall = (
        ProcessStatus.GAP_PAUSED if paused and not result
        else ProcessStatus.NEEDS_CONFIRM if (gaps or any(m.status != MaterialStatus.NORMAL for m in materials)) and result
        else ProcessStatus.COMPLETED if result
        else ProcessStatus.PENDING
    )
    history_tags: list[str] = []
    if history is not None:
        hist_files = sorted(history.history_dir.glob("result_*.json"))
        for hp in hist_files[-5:]:
            parts = hp.stem.split("_")
            if len(parts) >= 2:
                history_tags.append("_".join(parts[1:-1]))
    return InterfaceResponse(
        chain_run_id=f"RUN-{uuid.uuid4().hex[:8]}",
        overall_status=overall,
        processed=_build_processed_items(materials, photos),
        pending_materials=_build_pending_items(materials, gaps),
        manual_judgments=manual_overrides or [],
        warning_result=result,
        param_version_used=params.version_tag,
        param_version_history=history_tags,
        sampling_gaps=gaps,
    )


def build_terminal_summary(
    response: InterfaceResponse,
    steps: list[ProcessRecord],
) -> TerminalSummary:
    mat_counts: dict[str, int] = {}
    for item in response.processed:
        if item.kind == "材料":
            mat_counts[item.status] = mat_counts.get(item.status, 0) + 1

    remarks: list[str] = []
    if response.warning_result:
        remarks.append(
            f"使用公式: {response.warning_result.formula_used}  "
            f"阈值={response.warning_result.threshold_value} {response.warning_result.intensity_unit}"
        )
    if response.pending_materials:
        remarks.append(f"存在 {len(response.pending_materials)} 项待处理事项，详见 interface_response.json")
    if response.sampling_gaps:
        remarks.append(f"检测到 {len(response.sampling_gaps)} 处采样缺口，处理链已根据参数决定是否暂停")

    return TerminalSummary(
        chain_run_id=response.chain_run_id,
        step_summary=steps,
        warning_level=response.warning_result.warning_level if response.warning_result else None,
        material_counts=mat_counts,
        gap_count=len(response.sampling_gaps),
        pending_count=len(response.pending_materials),
        processed_count=len(response.processed),
        manual_count=len(response.manual_judgments),
        remarks=remarks,
    )


def run_chain(
    input_dir: Union[str, Path],
    output_dir: Union[str, Path],
    param_tag: str,
    allow_gap_calculation: bool = False,
    expected_sample_count: Optional[int] = None,
    manual_overrides: Optional[list[ManualOverride]] = None,
) -> tuple[TerminalSummary, InterfaceResponse, list[ProcessRecord]]:
    input_dir = Path(input_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    material_dir = input_dir / "materials"
    photo_dir = input_dir / "photos"

    steps: list[ProcessRecord] = []

    step_import = ProcessRecord(step=ProcessStep.MATERIAL_IMPORT, status=ProcessStatus.PROCESSING)
    steps.append(step_import)
    materials, photos = load_materials_from_dir(material_dir)
    if photo_dir.exists():
        extra_materials, extra_photos = load_materials_from_dir(photo_dir)
        materials.extend(extra_materials)
        photos.extend(extra_photos)
    step_import.status = ProcessStatus.COMPLETED
    step_import.finished_at = datetime.now()
    step_import.detail = {
        "材料数量": len(materials),
        "照片数量": len(photos),
        "影响追踪摘要": {k: len(v) for k, v in summarize_material_impact(materials).items()},
    }

    params = get_param_version(param_tag)
    history = ResultHistory(output_dir)

    step_gap = ProcessRecord(step=ProcessStep.GAP_DETECTION, status=ProcessStatus.PROCESSING)
    steps.append(step_gap)
    gaps, should_pause = detect_sampling_gaps(photos, params, expected_sample_count)
    step_gap.status = ProcessStatus.GAP_PAUSED if (should_pause and not allow_gap_calculation) else ProcessStatus.COMPLETED
    step_gap.finished_at = datetime.now()
    step_gap.detail = {
        "采样缺口数量": len(gaps),
        "是否触发暂停": should_pause,
        "允许带缺口计算": allow_gap_calculation,
    }

    result: Optional[WarningResult] = None
    step_calc = ProcessRecord(step=ProcessStep.WARNING_CALCULATION, status=ProcessStatus.PROCESSING)
    steps.append(step_calc)
    if (not should_pause) or allow_gap_calculation:
        if photos:
            result = compute_warning(photos, materials, params, exclude_flagged_gaps=not allow_gap_calculation)
            history.record(result, params)
            step_calc.status = ProcessStatus.COMPLETED
            step_calc.detail = {
                "预警级别": result.warning_level.value,
                "阈值": result.threshold_value,
                "最大强度": result.max_intensity,
                "参数版本": params.version_tag,
            }
        else:
            step_calc.status = ProcessStatus.NEEDS_CONFIRM
            step_calc.detail = {"原因": "无可用采样照片"}
    else:
        step_calc.status = ProcessStatus.GAP_PAUSED
        step_calc.detail = {"原因": "采样缺口超限，已按参数暂停计算，可使用 --allow-gap 强制计算"}
    step_calc.finished_at = datetime.now()

    step_fmt = ProcessRecord(step=ProcessStep.RESULT_FORMAT, status=ProcessStatus.PROCESSING)
    steps.append(step_fmt)
    response = build_interface_response(
        materials, photos, gaps, params, result,
        paused=(should_pause and not allow_gap_calculation),
        manual_overrides=manual_overrides,
        history=history,
    )
    summary = build_terminal_summary(response, steps)
    step_fmt.status = ProcessStatus.COMPLETED
    step_fmt.finished_at = datetime.now()
    step_fmt.detail = {"已处理数量": len(response.processed), "待补材料数量": len(response.pending_materials)}

    interface_path = output_dir / "interface_response.json"
    response.save_json(interface_path)
    summary_path = output_dir / "terminal_summary.txt"
    summary_path.write_text(summary.render() + "\n", encoding="utf-8")

    return summary, response, steps

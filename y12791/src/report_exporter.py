from typing import List, Dict
import pandas as pd
from io import BytesIO
from src.models import (
    Reagent, WeighingRecord, FeedingStep, ExperimentRecord,
    SafetyNote, ValidationResult, ValidationIssue
)


SEVERITY_ZH = {
    "high": "高风险",
    "medium": "中风险",
    "low": "低风险"
}


ISSUE_TYPE_ZH = {
    "blank_control_missing": "空白对照缺失",
    "blank_control_ph_missing": "空白对照pH未记录",
    "blank_control_time_missing": "空白对照投料时间未记录",
    "ph_out_of_range": "pH值超出允许范围",
    "ph_missing": "pH值未记录",
    "feeding_order_reversed": "投料顺序颠倒",
    "planned_order_reversed": "计划投料顺序异常",
    "actual_feeding_time_missing": "投料时间未记录",
    "reaction_end_time_missing": "反应结束时间未记录",
    "reaction_start_time_missing": "反应开始时间未记录",
    "reaction_duration_deviation": "反应时长偏差过大",
    "weighed_amount_missing": "实际称量量未填写",
    "weighing_unit_missing": "称量单位未填写",
    "theoretical_unit_missing": "理论用量单位未填写",
    "weigh_time_missing": "称量时间未记录",
    "weighing_operator_missing": "称量操作人未记录"
}


def build_summary_sheet(
    experiment: ExperimentRecord,
    result: ValidationResult,
    result_before: ValidationResult,
    safety_notes: List[SafetyNote]
) -> pd.DataFrame:
    rows = []
    rows.append(["一、批次基本信息"])
    rows.append(["批次编号", experiment.batch_id])
    rows.append(["实验编号", experiment.experiment_id])
    rows.append(["反应名称", experiment.reaction_name or ""])
    rows.append(["实验日期", experiment.experiment_date or ""])
    rows.append(["使用反应釜", experiment.reactor_id or ""])
    rows.append(["操作人员", experiment.operator or ""])
    rows.append(["复核人员", experiment.reviewer or ""])
    rows.append([])
    rows.append(["二、校验结论汇总"])
    rows.append(["最终校验结论", "通过" if result.is_pass else "未通过"])
    rows.append(["校验报告生成时间", result.generated_at])
    rows.append([])
    rows.append(["三、分项校验结果"])
    rows.append(["检查项目", "结果", "说明"])
    rows.append(["1. 空白对照", "合格" if result.blank_control_ok else "异常",
                 "已按规程执行空白对照" if result.blank_control_ok else "存在缺失或记录不全，请见问题清单"])
    rows.append(["2. pH值范围", "合格" if result.ph_all_ok else "异常",
                 "各步投料后pH均在允许范围内" if result.ph_all_ok else "存在越界或未记录，请见问题清单"])
    rows.append(["3. 投料顺序与时间", "合格" if result.feeding_order_ok else "异常",
                 "投料顺序和时间记录完整" if result.feeding_order_ok else "存在顺序颠倒或时间漏记"])
    rows.append(["4. 反应时间", "合格" if result.reaction_time_ok else "异常",
                 "反应开始/结束时间记录完整" if result.reaction_time_ok else "存在时间漏记或时长偏差"])
    rows.append(["5. 称量记录", "合格" if result.weighing_complete else "异常",
                 "称量信息完整" if result.weighing_complete else "存在量值或单位漏填"])
    rows.append([])
    rows.append(["四、安全备注影响说明"])
    changed_count = len(result_before.issues) - len(result.issues)
    rows.append(["安全备注条数", len(safety_notes)])
    rows.append(["影响判断结果的备注数", sum(1 for n in safety_notes if n.affects_judgment)])
    rows.append(["因安全备注撤销的问题条数", changed_count if changed_count > 0 else 0])
    if changed_count > 0:
        rows.append(["备注对结论的影响", f"安全备注已生效，撤销了{changed_count}条问题记录，详见安全备注页"])
    else:
        rows.append(["备注对结论的影响", "无"])

    return pd.DataFrame(rows, columns=["列1", "列2", "列3"])


def build_issues_sheet(result: ValidationResult) -> pd.DataFrame:
    rows = []
    rows.append(["序号", "风险等级", "问题类别", "问题位置", "通俗说明", "处理建议"])
    for i, issue in enumerate(result.issues, 1):
        position = issue.affected_material or "整批次"
        if issue.affected_step:
            position = f"第{issue.affected_step}步 - {position}"
        rows.append([
            i,
            SEVERITY_ZH.get(issue.severity, issue.severity),
            ISSUE_TYPE_ZH.get(issue.issue_type, issue.issue_type),
            position,
            issue.readable_description,
            issue.suggestion or "请相关人员核实处理"
        ])
    if len(result.issues) == 0:
        rows.append(["—", "—", "—", "—", "本批次未发现任何问题，所有校验项均合格。", "—"])
    return pd.DataFrame(rows[1:], columns=rows[0])


def build_ph_detail_sheet(
    steps: List[FeedingStep],
    reagent_map: Dict[str, Reagent],
    result: ValidationResult
) -> pd.DataFrame:
    rows = []
    rows.append([
        "投料步骤", "物料名称", "pH允许范围", "实测pH值", "是否合格", "备注"
    ])
    for step in sorted(steps, key=lambda s: s.step_no):
        reagent = reagent_map.get(step.reagent_id)
        ph_range = "—"
        if reagent and reagent.ph_range_min is not None and reagent.ph_range_max is not None:
            ph_range = f"{reagent.ph_range_min} ~ {reagent.ph_range_max}"
        actual_ph = str(step.ph_value) if step.ph_value is not None else "未记录"
        is_ok = "合格"
        note = step.remark or ""
        for issue in result.issues:
            if issue.affected_step == step.step_no and "pH" in issue.issue_type.upper():
                is_ok = "异常"
                if issue.safety_related:
                    is_ok = "已备注豁免"
                if not note:
                    note = issue.readable_description
                break
        rows.append([
            f"第{step.step_no}步",
            step.reagent_name,
            ph_range,
            actual_ph,
            is_ok,
            note
        ])
    return pd.DataFrame(rows[1:], columns=rows[0])


def build_feeding_steps_sheet(steps: List[FeedingStep]) -> pd.DataFrame:
    rows = []
    rows.append([
        "投料步骤", "物料名称", "计划投料时间", "实际投料时间", "投料人",
        "温度(°C)", "pH值", "是否空白对照", "备注"
    ])
    for step in sorted(steps, key=lambda s: s.step_no):
        rows.append([
            f"第{step.step_no}步",
            step.reagent_name,
            step.planned_time or "未设置",
            step.actual_time or "未记录",
            step.operator or "未记录",
            str(step.temperature) if step.temperature is not None else "—",
            str(step.ph_value) if step.ph_value is not None else "—",
            "是" if step.is_blank_control else "否",
            step.remark or ""
        ])
    return pd.DataFrame(rows[1:], columns=rows[0])


def build_weighing_sheet(records: List[WeighingRecord]) -> pd.DataFrame:
    rows = []
    rows.append([
        "物料名称", "理论用量", "实际称量量", "称量时间",
        "操作人员", "天平编号", "备注"
    ])
    for wr in records:
        theory = f"{wr.theoretical_amount} {wr.theoretical_unit or ''}".strip()
        actual = f"{wr.weighed_amount} {wr.amount_unit or ''}".strip()
        if wr.weighed_amount is None:
            actual = "未记录"
        if wr.theoretical_amount is None:
            theory = "未记录"
        rows.append([
            wr.reagent_name,
            theory,
            actual,
            wr.weigh_time or "未记录",
            wr.operator or "未记录",
            wr.balance_id or "—",
            wr.remark or ""
        ])
    return pd.DataFrame(rows[1:], columns=rows[0])


def build_safety_notes_sheet(
    safety_notes: List[SafetyNote],
    reagent_map: Dict[str, Reagent]
) -> pd.DataFrame:
    rows = []
    rows.append([
        "序号", "相关物料", "备注类型", "备注内容",
        "填写人", "填写时间", "是否影响判定结论", "判定变更理由"
    ])
    for i, note in enumerate(safety_notes, 1):
        reagent = reagent_map.get(note.reagent_id or "")
        material = reagent.name if reagent else (note.reagent_id or "整批次")
        type_zh = {
            "reagent_warning": "物料警示",
            "operation_reminder": "操作提醒",
            "judgment_change": "判定变更",
            "general": "通用备注"
        }.get(note.note_type, note.note_type)
        rows.append([
            i,
            material,
            type_zh,
            note.content,
            note.created_by or "未记录",
            note.created_at or "未记录",
            "是" if note.affects_judgment else "否",
            note.judgment_change_reason or "—"
        ])
    if len(safety_notes) == 0:
        rows.append(["—", "—", "—", "本批次无安全备注", "—", "—", "—", "—"])
    return pd.DataFrame(rows[1:], columns=rows[0])


def build_chromatogram_sheet(experiment: ExperimentRecord) -> pd.DataFrame:
    rows = []
    rows.append(["阶段", "峰序号", "保留时间(分钟)", "峰面积", "峰归属"])

    if experiment.chromatogram_before:
        for idx, p in enumerate(experiment.chromatogram_before.get("peaks", []), 1):
            rows.append([
                "处理前", idx,
                p.get("retention_time", "—"),
                p.get("area", "—"),
                p.get("label", "未知")
            ])
        rows.append([
            "处理前", "—", "主成分纯度(%)",
            experiment.chromatogram_before.get("main_purity", "—"), "—"
        ])
    else:
        rows.append(["处理前", "—", "—", "无谱图数据", "—"])

    rows.append([])

    if experiment.chromatogram_after:
        for idx, p in enumerate(experiment.chromatogram_after.get("peaks", []), 1):
            rows.append([
                "处理后", idx,
                p.get("retention_time", "—"),
                p.get("area", "—"),
                p.get("label", "未知")
            ])
        rows.append([
            "处理后", "—", "主成分纯度(%)",
            experiment.chromatogram_after.get("main_purity", "—"), "—"
        ])
    else:
        rows.append(["处理后", "—", "—", "无谱图数据", "—"])

    return pd.DataFrame(rows[1:], columns=rows[0])


def build_reagent_ledger_sheet(reagents: List[Reagent]) -> pd.DataFrame:
    rows = []
    rows.append([
        "物料编号", "物料名称", "分子式", "纯度", "pH允许范围",
        "供应商", "批号", "收到日期", "有效期至", "储存条件", "备注"
    ])
    for r in reagents:
        purity = f"{r.purity} {r.purity_unit or ''}".strip() if r.purity else "未记录"
        ph_range = "—"
        if r.ph_range_min is not None and r.ph_range_max is not None:
            ph_range = f"{r.ph_range_min} ~ {r.ph_range_max}"
        rows.append([
            r.reagent_id,
            r.name,
            r.formula or "—",
            purity,
            ph_range,
            r.supplier or "—",
            r.batch_no or "—",
            r.received_date or "—",
            r.expiry_date or "—",
            r.storage_condition or "—",
            r.remark or ""
        ])
    return pd.DataFrame(rows[1:], columns=rows[0])


def build_manager_view_sheet(
    experiment: ExperimentRecord,
    result: ValidationResult,
    result_before: ValidationResult,
    safety_notes: List[SafetyNote],
    steps: List[FeedingStep],
    reagent_map: Dict[str, Reagent]
) -> pd.DataFrame:
    def pad(row, n=7):
        return list(row) + [""] * (n - len(row))

    rows = []
    rows.append(pad(["质检主管复核视图"]))
    rows.append(pad([]))
    rows.append(pad(["批次", experiment.batch_id]))
    rows.append(pad(["最终结论", "通过" if result.is_pass else "未通过"]))
    rows.append(pad(["高风险问题数", sum(1 for i in result.issues if i.severity == "high")]))
    rows.append(pad(["中风险问题数", sum(1 for i in result.issues if i.severity == "medium")]))
    rows.append(pad(["低风险问题数", sum(1 for i in result.issues if i.severity == "low")]))
    rows.append(pad([]))

    rows.append(pad(["—— pH越界问题精确定位 ——"]))
    ph_issues = [i for i in result.issues if "ph" in i.issue_type.lower()]
    if ph_issues:
        rows.append(pad(["序号", "所在步骤", "涉及物料", "实测pH", "允许范围", "判定结果", "处理情况"]))
        for idx, issue in enumerate(ph_issues, 1):
            step = next((s for s in steps if s.step_no == issue.affected_step), None)
            reagent = reagent_map.get(step.reagent_id) if step else None
            ph_range = "—"
            if reagent and reagent.ph_range_min is not None:
                ph_range = f"{reagent.ph_range_min} ~ {reagent.ph_range_max}"
            actual_ph = str(step.ph_value) if step and step.ph_value else "未记录"
            rows.append(pad([
                idx,
                f"第{issue.affected_step}步" if issue.affected_step else "整批次",
                issue.affected_material or "—",
                actual_ph,
                ph_range,
                "已豁免" if issue.safety_related else "待处理",
                issue.suggestion or "—"
            ]))
    else:
        rows.append(pad(["本批次不存在pH越界问题。"]))
    rows.append(pad([]))

    rows.append(pad(["—— 本轮复核包含的记录范围 ——"]))
    rows.append(pad(["实验记录", f"{experiment.experiment_id}（{experiment.reaction_name}）"]))
    rows.append(pad(["投料步骤记录", f"{len(steps)} 步"]))
    rows.append(pad(["安全备注条数", f"{len(safety_notes)} 条，其中影响判定 {sum(1 for n in safety_notes if n.affects_judgment)} 条"]))
    rows.append(pad(["历史旧备注", experiment.old_remark or "无"]))
    rows.append(pad(["本次补录备注", experiment.current_remark or "无"]))
    rows.append(pad([]))

    rows.append(pad(["—— 复核关注点提示 ——"]))
    concerns = []
    if not result.blank_control_ok:
        concerns.append("空白对照缺失或不完整，需关注对检测结果本底的影响")
    if sum(1 for n in safety_notes if n.affects_judgment) > 0:
        concerns.append("存在安全备注修改了判定结论，请确认变更理由是否充分")
    if not result.reaction_time_ok:
        concerns.append("反应时间记录不全，需评估对反应转化率的影响")
    if not result.weighing_complete:
        concerns.append("称量记录存在缺项（如漏填单位），请确认物料用量准确")
    if concerns:
        for c in concerns:
            rows.append(pad(["· " + c]))
    else:
        rows.append(pad(["本批次各项记录完整，无特别关注点。"]))

    return pd.DataFrame(rows, columns=["列1", "列2", "列3", "列4", "列5", "列6", "列7"])


def generate_excel_report(
    experiment: ExperimentRecord,
    reagents: List[Reagent],
    weighing_records: List[WeighingRecord],
    safety_notes: List[SafetyNote],
    result: ValidationResult,
    result_before: ValidationResult
) -> bytes:
    reagent_map = {r.reagent_id: r for r in reagents}

    output = BytesIO()
    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        build_manager_view_sheet(
            experiment, result, result_before, safety_notes,
            experiment.feeding_steps, reagent_map
        ).to_excel(writer, sheet_name="主管复核视图", index=False, header=False)

        build_summary_sheet(experiment, result, result_before, safety_notes).to_excel(
            writer, sheet_name="校验结论汇总", index=False, header=False
        )

        build_issues_sheet(result).to_excel(writer, sheet_name="问题清单", index=False)

        build_ph_detail_sheet(experiment.feeding_steps, reagent_map, result).to_excel(
            writer, sheet_name="pH校验明细", index=False
        )

        build_feeding_steps_sheet(experiment.feeding_steps).to_excel(
            writer, sheet_name="投料步骤记录", index=False
        )

        build_weighing_sheet(weighing_records).to_excel(
            writer, sheet_name="称量记录", index=False
        )

        build_safety_notes_sheet(safety_notes, reagent_map).to_excel(
            writer, sheet_name="安全备注", index=False
        )

        build_chromatogram_sheet(experiment).to_excel(
            writer, sheet_name="谱图对比摘要", index=False
        )

        build_reagent_ledger_sheet(reagents).to_excel(
            writer, sheet_name="试剂台账", index=False
        )

        for sheet_name in writer.sheets:
            ws = writer.sheets[sheet_name]
            ws.set_column("A:Z", 22)

    return output.getvalue()

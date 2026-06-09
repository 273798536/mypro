from __future__ import annotations

from app.models import (
    ConstraintViolation,
    ExplanationBundle,
    FitResult,
    OutlierRecord,
    OutlierType,
    ResultClassification,
)


def classify_overall(
    total_points: int,
    outliers: list[OutlierRecord],
    violations: list[ConstraintViolation],
    r_squared: float,
) -> ResultClassification:
    if total_points < 3:
        return ResultClassification.RECOLLECT

    extrapolation_count = sum(1 for o in outliers if o.outlier_type == OutlierType.EXTRAPOLATION)
    residual_count = sum(1 for o in outliers if o.outlier_type == OutlierType.RESIDUAL)
    high_severity = [o for o in outliers if o.severity >= 0.7]

    if violations or len(high_severity) >= 2 or extrapolation_count >= 2:
        return ResultClassification.RECOLLECT
    if r_squared < 0.90 or residual_count >= 2 or extrapolation_count >= 1:
        return ResultClassification.DEFERRED
    return ResultClassification.USABLE


def classify_points(
    total_points: int,
    outliers: list[OutlierRecord],
) -> tuple[list[int], list[int], list[int]]:
    flagged: set[int] = set()
    deferred: set[int] = set()
    recollect: set[int] = set()

    for o in outliers:
        if o.point_index is None:
            continue
        if o.outlier_type == OutlierType.EXTRAPOLATION:
            recollect.add(o.point_index)
        elif o.outlier_type == OutlierType.RESIDUAL:
            if o.severity >= 0.7:
                recollect.add(o.point_index)
            else:
                deferred.add(o.point_index)
        elif o.outlier_type == OutlierType.CONSTRAINT:
            deferred.add(o.point_index)
        flagged.add(o.point_index)

    usable = [i for i in range(total_points) if i not in flagged]
    return usable, sorted(deferred), sorted(recollect)


def build_explanation(
    title: str,
    fit_result: FitResult,
    outliers: list[OutlierRecord],
    violations: list[ConstraintViolation],
    classification: ResultClassification,
    usable: list[int],
    deferred: list[int],
    recollect: list[int],
) -> ExplanationBundle:
    total = len(fit_result.x_data)
    formula = fit_result.model_formula
    r2 = fit_result.r_squared

    parts: list[str] = []
    parts.append(f"{title}：共录入 {total} 个数据点，拟合方程 {formula}，R²={r2:.4f}。")

    if usable:
        parts.append(f"可用数据 {len(usable)} 个（点号：{', '.join(str(i + 1) for i in usable)}）。")
    if deferred:
        parts.append(
            f"暂缓使用 {len(deferred)} 个（点号：{', '.join(str(i + 1) for i in deferred)}），"
            f"需教研编辑结合计算草稿复核残差或约束问题后再决定。"
        )
    if recollect:
        parts.append(
            f"建议重新采集 {len(recollect)} 个（点号：{', '.join(str(i + 1) for i in recollect)}），"
            f"涉及外推越界或高严重度残差，当前样本覆盖不足以支撑结论。"
        )

    if violations:
        parts.append(f"约束违反 {len(violations)} 项：" + "；".join(v.short_explanation for v in violations) + "。")

    summary = " ".join(parts)

    ext_outliers = [o for o in outliers if o.outlier_type == OutlierType.EXTRAPOLATION]
    res_outliers = [o for o in outliers if o.outlier_type == OutlierType.RESIDUAL]

    committee_lines: list[str] = []
    if classification == ResultClassification.USABLE:
        committee_lines.append(
            "【结论：直接可用】拟合质量达标，约束全部满足，所有异常均在可接受范围内，可直接进入投委会表决。"
        )
    elif classification == ResultClassification.DEFERRED:
        committee_lines.append(
            "【结论：需教研编辑复核】拟合存在轻微问题（残差或少量外推），已标注暂缓点，"
            "请教研编辑对照计算草稿人工确认后再反馈投委会。"
        )
    else:
        committee_lines.append(
            "【结论：暂不通过，需补充数据】存在严重问题（约束违反、严重外推或高残差），"
            "按建议重新采集或核对计算草稿缺页后再提交。"
        )

    if ext_outliers:
        committee_lines.append(
            "外推越界 " + str(len(ext_outliers)) + " 处："
            + "；".join(o.short_explanation for o in ext_outliers)
            + "。"
        )
    if res_outliers:
        committee_lines.append(
            "残差异常 " + str(len(res_outliers)) + " 处："
            + "；".join(o.short_explanation for o in res_outliers)
            + "。"
        )

    committee_summary = " ".join(committee_lines)

    editor_lines: list[str] = []
    if deferred or recollect or violations:
        editor_lines.append("教研编辑操作提示：")
    if deferred:
        editor_lines.append(
            f"- 暂缓点 {', '.join(str(i + 1) for i in deferred)}：请打开计算草稿对应页，"
            f"核对原始测量值和录入值，确认无误后可标记为『通过』，或修改后提交。"
        )
    if recollect:
        editor_lines.append(
            f"- 建议重采点 {', '.join(str(i + 1) for i in recollect)}：这些点落在样本覆盖之外或残差过大，"
            f"请确认计算草稿是否缺页、是否存在单位换算错误，必要时通知实验端补采数据。"
        )
    if violations:
        editor_lines.append(
            f"- 约束违反 {len(violations)} 项：请结合参数物理含义判断是否合理，若不合理则驳回并说明原因。"
        )
    editor_note = "\n".join(editor_lines)

    return ExplanationBundle(
        summary=summary,
        usable_points=usable,
        deferred_points=deferred,
        recollect_points=recollect,
        committee_summary=committee_summary,
        editor_note=editor_note,
    )

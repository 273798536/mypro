from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np
import io
import base64
from datetime import datetime
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.figure import Figure
from .data_processor import StudentRecord, records_to_dataframe
from .power_calc import generate_power_curve_data


REPRODUCIBLE_EXAMPLES = [
    {
        "example_id": "EX001",
        "title": "比例差外推越界：p2 接近 0",
        "description": "对照组 p1=0.5，处理组 p2=0.0005（低于推荐下限 0.001），观察外推后样本量急剧增大的现象",
        "params": {"test_type": "proportion", "p1": 0.5, "p2": 0.0005, "alpha": 0.05, "power": 0.8, "alternative": "two-sided"},
        "expected_warning": "p2",
    },
    {
        "example_id": "EX002",
        "title": "比例差外推越界：p1 接近 1",
        "description": "p1=0.9995，p2=0.8，观察外推警告",
        "params": {"test_type": "proportion", "p1": 0.9995, "p2": 0.8, "alpha": 0.05, "power": 0.8, "alternative": "two-sided"},
        "expected_warning": "p1",
    },
    {
        "example_id": "EX003",
        "title": "均值差外推越界：sd 过小",
        "description": "delta=0.5，sd=0.0005（低于推荐下限 0.001），效应量被外推放大",
        "params": {"test_type": "mean", "delta": 0.5, "sd": 0.0005, "alpha": 0.05, "power": 0.8, "alternative": "two-sided"},
        "expected_warning": "sd",
    },
    {
        "example_id": "EX004",
        "title": "比例差正常范围内对照",
        "description": "p1=0.5，p2=0.6，常规参数，无外推警告，结果可作为对照",
        "params": {"test_type": "proportion", "p1": 0.5, "p2": 0.6, "alpha": 0.05, "power": 0.8, "alternative": "two-sided"},
        "expected_warning": "",
    },
    {
        "example_id": "EX005",
        "title": "均值差正常范围内对照",
        "description": "delta=0.5，sd=1.0，常规参数，无外推警告",
        "params": {"test_type": "mean", "delta": 0.5, "sd": 1.0, "alpha": 0.05, "power": 0.8, "alternative": "two-sided"},
        "expected_warning": "",
    },
]


def get_examples_dataframe() -> pd.DataFrame:
    rows = []
    for ex in REPRODUCIBLE_EXAMPLES:
        row = {"example_id": ex["example_id"], "title": ex["title"], "description": ex["description"]}
        row.update(ex["params"])
        row["expected_warning"] = ex["expected_warning"]
        rows.append(row)
    return pd.DataFrame(rows)


def plot_single_record_power_curve(record: StudentRecord) -> Figure:
    fig, ax = plt.subplots(figsize=(8, 5))
    if record.test_type == "proportion":
        p1 = record.params.get("p1", 0.5)
        p2_center = record.params.get("p2", 0.5)
        spread = min(0.49, max(0.05, abs(p2_center - p1) * 3))
        p2_range = np.linspace(max(0.001, p2_center - spread), min(0.999, p2_center + spread), 60)
        n_list = [30, 50, 100, 200]
        for n in n_list:
            from .power_calc import power_proportion
            powers = [power_proportion(p1=p1, p2=float(p2), n1=n,
                                       alpha=record.params.get("alpha", 0.05),
                                       alternative=record.params.get("alternative", "two-sided")).power
                      for p2 in p2_range]
            ax.plot(p2_range, powers, label=f"每组 n={n}")
        ax.axvline(p2_center, color="red", linestyle="--", label=f"当前 p2={p2_center}")
        ax.axvline(p1, color="gray", linestyle=":", label=f"对照 p1={p1}")
        ax.set_xlabel("处理组比例 p2")
        ax.set_title(f"学生 {record.student_id} 题目 {record.question_id}：功效曲线（比例差）")
    else:
        delta_center = record.params.get("delta", 0.5)
        sd = record.params.get("sd", 1.0)
        spread = max(0.2, abs(delta_center) * 2)
        delta_range = np.linspace(delta_center - spread, delta_center + spread, 60)
        n_list = [30, 50, 100, 200]
        from .power_calc import power_mean
        for n in n_list:
            powers = [power_mean(delta=float(d), sd=sd, n1=n,
                                 alpha=record.params.get("alpha", 0.05),
                                 alternative=record.params.get("alternative", "two-sided")).power
                      for d in delta_range]
            ax.plot(delta_range, powers, label=f"每组 n={n}")
        ax.axvline(delta_center, color="red", linestyle="--", label=f"当前 delta={delta_center}")
        ax.set_xlabel("均值差 delta")
        ax.set_title(f"学生 {record.student_id} 题目 {record.question_id}：功效曲线（均值差）")
    ax.axhline(0.8, color="green", linestyle="-.", label="目标功效 0.8")
    ax.set_ylabel("功效 Power")
    ax.set_ylim(0, 1.02)
    ax.legend(fontsize=8)
    ax.grid(alpha=0.3)
    fig.tight_layout()
    return fig


def plot_summary_power_curves(records: List[StudentRecord]) -> List[Tuple[str, Figure]]:
    figs: List[Tuple[str, Figure]] = []
    extra_records = [r for r in records if r.extrapolation_warning]
    normal_records = [r for r in records if r.status in ("success", "warning") and not r.extrapolation_warning]
    for rec in extra_records[:5]:
        name = f"外推样例_{rec.record_id}_{rec.student_id}"
        figs.append((name, plot_single_record_power_curve(rec)))
    if normal_records:
        name = "对照_正常范围样例"
        figs.append((name, plot_single_record_power_curve(normal_records[0])))
    return figs


def fig_to_png_bytes(fig: Figure) -> bytes:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    buf.seek(0)
    return buf.read()


def fig_to_base64(fig: Figure) -> str:
    data = fig_to_png_bytes(fig)
    return base64.b64encode(data).decode("utf-8")


def build_text_narration(record: StudentRecord) -> str:
    lines = []
    lines.append(f"=== 记录 {record.record_id} | 学生 {record.student_id} | 题目 {record.question_id} ===")
    lines.append(f"检验类型：{'比例差' if record.test_type == 'proportion' else '均值差'}")
    lines.append(f"参数：{record.params}")
    if record.status == "missing_data":
        lines.append(f"[数据缺失] {record.error_msg}")
        lines.append(f"缺失字段：{record.warnings}")
    elif record.status == "error":
        lines.append(f"[计算错误] {record.error_msg}")
    elif record.result:
        r = record.result
        if r.sample_size is not None:
            lines.append(f"所需样本量：组1 n1≈{np.ceil(r.n1):.0f}，组2 n2≈{np.ceil(r.n2):.0f}（目标功效 {r.power}）")
        if r.power is not None and r.sample_size is None:
            lines.append(f"在给定样本量 n1={r.n1}, n2={r.n2} 下，功效 ≈ {r.power:.4f}")
        lines.append(f"效应量：{r.effect_size:.4f}")
        lines.append(f"注记：{'；'.join(r.notes)}")
    if record.extrapolation_warning:
        lines.append(f"[外推越界警告] {record.extrapolation_warning}")
    if record.warnings:
        lines.append(f"其他警告：{'; '.join(record.warnings)}")
    if record.history_ref:
        lines.append(f"历史答案参考：{record.history_ref}")
    if record.editor_note:
        lines.append(f"教研编辑处理意见：{record.editor_note}")
    return "\n".join(lines)


def build_narration_text(records: List[StudentRecord], gap_list: List[Dict]) -> str:
    parts = []
    parts.append(f"样本量功效试算报告  生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    parts.append("=" * 60)
    success = sum(1 for r in records if r.status in ("success", "warning"))
    missing = sum(1 for r in records if r.status == "missing_data")
    errors = sum(1 for r in records if r.status == "error")
    parts.append(f"总记录：{len(records)}；成功/警告：{success}；数据缺失：{missing}；计算错误：{errors}")
    if gap_list:
        parts.append("")
        parts.append("--- 待补充数据清单（教研编辑请补全以下缺口）---")
        for g in gap_list:
            parts.append(f"  * 记录 {g['record_id']} 学生 {g['student_id']} 题目 {g['question_id']}: {g['error']}")
    parts.append("")
    parts.append("--- 逐条说明 ---")
    for r in records:
        parts.append(build_text_narration(r))
        parts.append("")
    return "\n".join(parts)


def export_to_excel(records: List[StudentRecord], gap_list: List[Dict],
                    narration: str, figures: List[Tuple[str, Figure]]) -> bytes:
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df = records_to_dataframe(records)
        df.to_excel(writer, sheet_name="计算结果", index=False)
        if gap_list:
            pd.DataFrame(gap_list).to_excel(writer, sheet_name="数据缺口", index=False)
        example_df = get_examples_dataframe()
        example_df.to_excel(writer, sheet_name="可复现样例", index=False)
        lines = narration.splitlines()
        pd.DataFrame({"说明": lines}).to_excel(writer, sheet_name="文字说明", index=False)
    return output.getvalue()


def make_run_label(run_id: Optional[str] = None) -> str:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    rid = (run_id or uuid_short())[:6]
    return f"{ts}_{rid}"


def uuid_short() -> str:
    import uuid
    return uuid.uuid4().hex[:8]


def export_zip_bundle(records: List[StudentRecord], gap_list: List[Dict],
                      run_label: str) -> bytes:
    import zipfile
    narration = build_narration_text(records, gap_list)
    figures = plot_summary_power_curves(records)
    excel_bytes = export_to_excel(records, gap_list, narration, figures)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"样本量功效试算_{run_label}.xlsx", excel_bytes)
        zf.writestr(f"文字说明_{run_label}.txt", narration.encode("utf-8"))
        for name, fig in figures:
            safe_name = name.replace("/", "_").replace("\\", "_")
            zf.writestr(f"图表_{safe_name}_{run_label}.png", fig_to_png_bytes(fig))
        ex_df = get_examples_dataframe()
        zf.writestr(f"可复现样例_{run_label}.csv", ex_df.to_csv(index=False).encode("utf-8-sig"))
    buf.seek(0)
    return buf.read()

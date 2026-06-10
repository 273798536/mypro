import os
import sys
from datetime import datetime
import pandas as pd
import numpy as np
from typing import Optional
from .data_cleaner import CleanedDataset
from .analysis import FullAnalysis, BatchFit


def _model_interpret(batch_id: str, bf: BatchFit) -> str:
    lines = []
    lang = bf.baseline_lang
    fre = bf.baseline_fre
    better = bf.baseline_better

    lines.append(f"▶ {batch_id}")
    lines.append(f"  数据点数: {len(bf.subset)} 个")

    if not lang.success and not fre.success:
        lines.append(f"  ⚠ 两个模型均拟合失败（{lang.message}）")
        return "\n".join(lines)

    if lang.success:
        qmax = lang.params.get("Qmax (mg/g)", 0)
        kl = lang.params.get("KL (L/mg)", 0)
        r2 = lang.r_squared
        lines.append(f"  Langmuir: Qmax={qmax:.2f} mg/g, KL={kl:.4f} L/mg, R²={r2:.4f}")
    if fre.success:
        kf = fre.params.get("KF ((mg/g)(L/mg)^(1/n))", 0)
        n_val = fre.params.get("n", 0)
        r2f = fre.r_squared
        lines.append(f"  Freundlich: KF={kf:.3f}, n={n_val:.2f}, R²={r2f:.4f}")

    lines.append(f"  → 更符合 {better} 模型")

    if better == "Langmuir" and lang.success:
        qmax = lang.params["Qmax (mg/g)"]
        rl = 1.0 / (1.0 + lang.params["KL (L/mg)"] * bf.subset["Ce_mg_L"].max())
        favor = "有利吸附（0<RL<1）" if 0 < rl < 1 else ("不可逆（RL=0）" if rl == 0 else "不利（RL>1）")
        lines.append(f"   解读: 理论饱和吸附量约 {qmax:.1f} mg/g，分离因子RL={rl:.3f} → {favor}")
    elif better == "Freundlich" and fre.success:
        n_val = fre.params.get("n", 1)
        favor_n = "优惠吸附（n>1）" if n_val > 1 else ("线性（n=1）" if abs(n_val - 1) < 0.01 else "非优惠（n<1）")
        lines.append(f"   解读: n={n_val:.2f} → {favor_n}，异质表面主导")

    if bf.changed_conclusion:
        lines.append(f"  ⛔ 结论受边界假设影响！{bf.change_reason}")
    elif bf.alt_scenarios:
        lines.append(f"  ✅ 做了{len(bf.alt_scenarios)}种情景假设，基线结论仍保持稳定")

    return "\n".join(lines)


def _trace_section(cleaned: CleanedDataset) -> str:
    lines = []
    lines.append("=" * 60)
    lines.append("三、清洗留痕：异常处理、单位换算、修改记录")
    lines.append("=" * 60)

    s = cleaned.summary()
    lines.append(f"【总览】原始→清洗后：共 {s['总行数'] + s['删除行数']}→{s['总行数']} 行，"
                 f"删除 {s['删除行数']} 行，错误{s['错误']} 警告{s['警告']} 提示{s['提示']}")
    lines.append("")

    # ERROR 级
    errors = [t for t in cleaned.traces if t.level == "ERROR"]
    if errors:
        lines.append("■ 必须关注（已剔除或严重影响）")
        for t in errors:
            lines.append(f"  [{t.category}] {t.row_id} {t.field}: {t.before} → {t.after}")
            lines.append(f"    原因: {t.reason}")
            if t.consequence:
                lines.append(f"    后果: {t.consequence}")
        lines.append("")

    # WARN 级
    warns = [t for t in cleaned.traces if t.level == "WARN"]
    if warns:
        lines.append("■ 建议复核（可能影响结论）")
        for t in warns:
            lines.append(f"  [{t.category}] {t.row_id} {t.field}: {t.before} → {t.after}")
            lines.append(f"    原因: {t.reason}")
            if t.consequence:
                lines.append(f"    ⚠ {t.consequence}")
        lines.append("")

    # INFO 级（单位换算摘要，不逐条展开）
    infos = [t for t in cleaned.traces if t.level == "INFO" and t.category == "单位换算"]
    if infos:
        lines.append(f"■ 单位换算（共 {len(infos)} 项，已自动归一至 mg/L / K / h / mg）")
        cats = {}
        for t in infos:
            key = (t.field, t.reason)
            cats.setdefault(key, []).append(t.row_id)
        for (field, reason), ids in sorted(cats.items()):
            lines.append(f"  {field}: {', '.join(ids[:6])}{'...' if len(ids) > 6 else ''} → {reason}")
        lines.append("")

    # 修正记录
    fixes = [t for t in cleaned.traces if t.category == "修正记录"]
    if fixes:
        lines.append("■ 人工修正记录")
        for t in fixes:
            lines.append(f"  {t.row_id}: {t.reason}")
        lines.append("")

    return "\n".join(lines)


def _batch_issues_section(cleaned: CleanedDataset) -> str:
    lines = []
    lines.append("=" * 60)
    lines.append("四、批次交叉复核（报告×台账×数据）")
    lines.append("=" * 60)

    # 批号重复
    dups = cleaned.batch_issues.get("重复批号", [])
    if dups:
        lines.append("")
        lines.append("▶ 批号重复卡壳点（课题组必须确认）")
        for d in dups:
            lines.append(f"  ⚠ 批次【{d['批号']}】在批次报告中出现 {d['出现次数']} 次")
            for i, detail in enumerate(d["详情"], 1):
                lines.append(f"    第{i}次: 报告行# {detail['行号']} | "
                             f"合成日期{detail['合成日期']} | {detail['合成人']} | "
                             f"实际产量{detail['实际产量']}g | {detail['备注']}")
            if d.get("关联数据行"):
                lines.append(f"    → 原始吸附数据对应行：{', '.join(d['关联数据行'])}")
            if d.get("提示"):
                lines.append(f"    → 处理建议：{d['提示']}")
        lines.append("")

    # 反应时间漏记 - 详细列出具体卡在哪
    leaks = cleaned.batch_issues.get("漏记时间", [])
    if leaks:
        lines.append("▶ 反应时间漏记卡在哪份材料")
        for lk in leaks:
            lines.append(f"  ⏱ 行 {lk['行号']} | 批次 {lk['材料批次']} | "
                         f"Ce原始值 {lk['平衡浓度原始']} | 备注 {lk['备注'] or '(无)'}")
        lines.append("  （默认补填为24h，见下方敏感性对比看是否改判断）")
        lines.append("")

    # 异常值
    anom = cleaned.batch_issues.get("异常值", [])
    if anom:
        lines.append("▶ 异常值留痕")
        for a in anom:
            lines.append(f"  ❌ {a['行号']}: {a['原因']} | {a['原值']}")
        lines.append("")

    if not dups and not leaks and not anom:
        lines.append("  无批号重复、无时间漏记、无明确异常值记录。")

    return "\n".join(lines)


def _concentration_compare_section(analysis: FullAnalysis) -> str:
    lines = []
    lines.append("=" * 60)
    lines.append("五、浓度/温度/时间：换算前后对比（完整表格）")
    lines.append("=" * 60)
    lines.append("")

    ct = analysis.concentration_trace.copy()
    if ct.empty:
        lines.append("（无数据）")
        return "\n".join(lines)

    ct["C0(mg/L)"] = ct["C0(mg/L)"].round(3)
    ct["Ce(mg/L)"] = ct["Ce(mg/L)"].round(3)
    ct["T(K)"] = ct["T(K)"].round(2)
    ct["t(h)"] = ct["t(h)"].round(2)
    ct["qe(mg/g)"] = ct["qe(mg/g)"].round(3)

    with pd.option_context("display.max_columns", None,
                           "display.width", 200,
                           "display.max_rows", None):
        lines.append(ct.to_string(index=False))

    return "\n".join(lines)


def _sensitivity_section(analysis: FullAnalysis) -> str:
    lines = []
    lines.append("")
    lines.append("=" * 60)
    lines.append("六、边界情景对比：如果漏记/单位假设不同，结果会变吗？")
    lines.append("=" * 60)
    lines.append("")

    changed_count = 0
    stable_count = 0

    for bid, bf in analysis.batches.items():
        if not bf.alt_scenarios:
            continue
        lines.append(f"▶ {bid}（基线最优模型: {bf.baseline_better}）")

        # 基线
        lang = bf.baseline_lang
        if lang.success:
            lines.append(f"  [基线] Langmuir Qmax={lang.params.get('Qmax (mg/g)', 0):.2f} | "
                         f"R²={lang.r_squared:.4f}")

        for sc_name, sc in bf.alt_scenarios.items():
            marker = "⚠" if sc.get("更优模型", "") != bf.baseline_better else "·"
            if marker == "⚠":
                changed_count += 1
            qmax_sc = sc.get("Langmuir", {}).get("Qmax (mg/g)")
            qmax_str = f"Qmax={qmax_sc:.2f}" if qmax_sc is not None else ""
            lines.append(f"  {marker} [{sc_name}] 模型→{sc.get('更优模型', '?')} | "
                         f"R²_L={sc.get('R²_Langmuir', '?')} | R²_F={sc.get('R²_Freundlich', '?')} | {qmax_str}")
            if marker == "⚠" and qmax_sc is not None and lang.success:
                base = lang.params.get("Qmax (mg/g)", 0)
                diff = (qmax_sc - base) / max(base, 1e-6) * 100
                lines.append(f"      → Qmax 差异 {diff:+.1f}%，结论改变！")

        if bf.changed_conclusion:
            lines.append(f"  ⛔ 结论: 该批次拟合结果受边界假设影响，课题组需补实验确认反应时间/单位。")
        else:
            stable_count += 1
            lines.append(f"  ✅ 结论: 虽有记录瑕疵，但所有情景下结论一致，可放心引用。")
        lines.append("")

    if changed_count == 0 and stable_count == 0:
        lines.append("  所有批次均无漏记/单位混用情况，无需敏感性对比。")
    else:
        lines.append(f"【敏感性汇总】共 {changed_count + stable_count} 个情景，"
                     f"其中 {changed_count} 个情景会改变拟合结论，{stable_count} 个保持稳定。")

    return "\n".join(lines)


def _final_conclusion_section(analysis: FullAnalysis, cleaned: CleanedDataset) -> str:
    lines = []
    lines.append("")
    lines.append("=" * 60)
    lines.append("七、给课题组的人话结论")
    lines.append("=" * 60)
    lines.append("")

    # 按性能排序
    perf = []
    for bid, bf in analysis.batches.items():
        if bf.baseline_lang.success:
            perf.append((bid, bf.baseline_lang.params.get("Qmax (mg/g)", 0), bf.baseline_better))
        elif bf.baseline_fre.success:
            perf.append((bid, -1, bf.baseline_better))
    perf.sort(key=lambda x: -x[1])

    lines.append("1. 材料吸附性能排行（按Langmuir Qmax，高→低）:")
    for i, (bid, qmax, better) in enumerate(perf, 1):
        qmax_str = f"{qmax:.1f} mg/g" if qmax > 0 else "（Langmuir未收敛，参考Freundlich）"
        lines.append(f"   {i}. {bid}: {qmax_str}，更符合{better}模型")
    lines.append("")

    lines.append("2. 必处理的遗留问题（不解决别写进文章）:")
    issues = []
    if cleaned.batch_issues.get("重复批号"):
        bids = [d["批号"] for d in cleaned.batch_issues["重复批号"]]
        issues.append(f"  - 批号重复: {', '.join(bids)} → 请核对这些行到底属于哪次投料")
    if cleaned.batch_issues.get("漏记时间"):
        bids = sorted(set(lk["材料批次"] for lk in cleaned.batch_issues["漏记时间"]))
        issues.append(f"  - 反应时间漏记出现在: {', '.join(bids)} → 翻实验记录本/拍照记录补实")
    changed_batches = [bid for bid, bf in analysis.batches.items() if bf.changed_conclusion]
    if changed_batches:
        issues.append(f"  - 边界敏感批次（换假设就变结论）: {', '.join(changed_batches)} → 建议补做动力学预实验或重复等温线")
    if not issues:
        issues.append("  - 本次无遗留问题，数据干净。")
    lines.extend(issues)
    lines.append("")

    lines.append("3. 推荐下一步:")
    if changed_batches:
        lines.append("  ① 先补全反应时间记录，对敏感批次重做 18h/24h 两个时间点确认是否平衡；")
        lines.append("  ② 确认后再引用对应情景的参数；")
    else:
        lines.append("  ① 所有批次数据清洗+拟合逻辑完整，可直接用于撰写；")
    if cleaned.batch_issues.get("重复批号"):
        lines.append("  ③ 批次报告的重复行请在课题组例会确认后归档一份干净版。")

    return "\n".join(lines)


def generate_text_report(
    cleaned: CleanedDataset,
    analysis: FullAnalysis,
    batch_path: Optional[str] = None,
    ledger_path: Optional[str] = None,
    raw_path: Optional[str] = None,
) -> str:
    out = []
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    out.append("╔══════════════════════════════════════════════════════════╗")
    out.append("║          吸附等温线拟合 · 课题组复核版报告                ║")
    out.append("╚══════════════════════════════════════════════════════════╝")
    out.append(f"生成时间: {now}")
    out.append(f"数据文件: {os.path.basename(raw_path) if raw_path else '未提供'}")
    out.append(f"批次报告: {os.path.basename(batch_path) if batch_path else '未提供'}")
    out.append(f"试剂台账: {os.path.basename(ledger_path) if ledger_path else '未提供'}")
    out.append("")
    out.append(analysis.overall_conclusion)
    out.append("")
    out.append("=" * 60)
    out.append("一、拟合结果速览（人话版）")
    out.append("=" * 60)
    out.append("")
    for bid in sorted(analysis.batches.keys()):
        out.append(_model_interpret(bid, analysis.batches[bid]))
        out.append("")

    out.append("")
    out.append("=" * 60)
    out.append("二、复核材料清单（这次分析的是眼前这批具体材料）")
    out.append("=" * 60)
    out.append("")
    out.append(f"  涉及材料批次共 {len(analysis.batches)} 种:")
    for bid, bf in sorted(analysis.batches.items()):
        out.append(f"    · {bid}  ({len(bf.subset)} 个数据点)")
    if ledger_path and os.path.exists(ledger_path):
        try:
            led = pd.read_csv(ledger_path)
            out.append(f"  当次领用试剂共 {len(led)} 项:")
            for _, r in led.iterrows():
                who = r.get("领用人", "?")
                name = r.get("试剂名称", "?")
                date = r.get("领用日期", "?")
                remark = f" — {r['备注']}" if pd.notna(r.get("备注")) else ""
                out.append(f"    · {who} 领 {name} [{date}]{remark}")
        except Exception:
            pass
    out.append("")

    out.append(_trace_section(cleaned))
    out.append(_batch_issues_section(cleaned))
    out.append(_concentration_compare_section(analysis))
    out.append(_sensitivity_section(analysis))
    out.append(_final_conclusion_section(analysis, cleaned))

    out.append("")
    out.append("—— 报告结束，原始数据、清洗中间表、拟合参数均已随output目录导出 ——")
    return "\n".join(out)


def write_output_files(
    output_dir: str,
    cleaned: CleanedDataset,
    analysis: FullAnalysis,
    report_text: str,
):
    os.makedirs(output_dir, exist_ok=True)

    with open(os.path.join(output_dir, "report_课题组复核版.txt"), "w", encoding="utf-8") as f:
        f.write(report_text)

    cleaned.df.to_csv(os.path.join(output_dir, "step1_清洗后数据.csv"), index=False, encoding="utf-8-sig")
    analysis.concentration_trace.to_csv(
        os.path.join(output_dir, "step2_单位换算前后对比.csv"),
        index=False, encoding="utf-8-sig",
    )

    # 批次拟合参数汇总
    rows = []
    for bid, bf in analysis.batches.items():
        row = {"批次": bid, "数据点数": len(bf.subset), "基线最优模型": bf.baseline_better}
        if bf.baseline_lang.success:
            row.update({"Langmuir_Qmax": bf.baseline_lang.params.get("Qmax (mg/g)"),
                        "Langmuir_KL": bf.baseline_lang.params.get("KL (L/mg)"),
                        "Langmuir_R2": bf.baseline_lang.r_squared})
        if bf.baseline_fre.success:
            row.update({"Freundlich_KF": bf.baseline_fre.params.get("KF ((mg/g)(L/mg)^(1/n))"),
                        "Freundlich_n": bf.baseline_fre.params.get("n"),
                        "Freundlich_R2": bf.baseline_fre.r_squared})
        row["是否边界敏感"] = "是" if bf.changed_conclusion else "否"
        row["敏感性结论改变原因"] = bf.change_reason
        rows.append(row)
    pd.DataFrame(rows).to_csv(
        os.path.join(output_dir, "step3_各批次拟合参数汇总.csv"),
        index=False, encoding="utf-8-sig",
    )

    # 留痕日志
    trace_rows = []
    for t in cleaned.traces:
        trace_rows.append({
            "级别": t.level,
            "类别": t.category,
            "行号": t.row_id,
            "字段": t.field,
            "修改前": t.before,
            "修改后": t.after,
            "原因": t.reason,
            "潜在后果": t.consequence,
        })
    pd.DataFrame(trace_rows).to_csv(
        os.path.join(output_dir, "step4_清洗留痕日志.csv"),
        index=False, encoding="utf-8-sig",
    )

    # 敏感性对比
    if analysis.time_leak_impact:
        pd.DataFrame(analysis.time_leak_impact).to_csv(
            os.path.join(output_dir, "step5_敏感性对比_漏记单位假设.csv"),
            index=False, encoding="utf-8-sig",
        )

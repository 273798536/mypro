from __future__ import annotations

import csv
from decimal import Decimal
from pathlib import Path
from typing import Optional

from .models import AllocationRun, USD_TO_CNY_DEFAULT

REMARK_LIMIT = 60   # 备注在文字报告里最多显示的字数


def truncate(text, limit: int = REMARK_LIMIT) -> tuple[str, Optional[str]]:
    """截断长文本，并返回人话原因（不使用字段名/缩写）。"""
    if text is None:
        return "", None
    s = str(text).strip()
    if len(s) <= limit:
        return s, None
    return s[:limit], f"备注比较长，这里只显示前 {limit} 个字，完整内容见明细表（CSV）。"


def _fmt(v, places: int = 2) -> str:
    if v is None or v == "":
        return "—"
    try:
        d = Decimal(str(v))
    except Exception:
        return str(v)
    q = d.quantize(Decimal(10) ** -places)
    return format(q, "f")


def _pct(v) -> str:
    if v is None or v == "":
        return "—"
    try:
        return format((Decimal(str(v)) * Decimal(100)).quantize(Decimal("0.1")), "f") + "%"
    except Exception:
        return str(v)


def _judgment_arrow(before: str, after: str, changed: bool) -> str:
    if changed:
        return f"{before} → {after}"
    return after


CSV_HEADERS = [
    "任务ID", "任务名", "负责人", "团队", "项目", "GPU卡型", "GPU时长(小时)",
    "单价", "币种", "分摊成本", "命中规则", "判断(调整前)", "判断(调整后)",
    "判断是否变化", "是否已确认", "占团队比例", "数据来源说明", "备注",
    "备注(截断后)", "截断原因", "是否已回滚保留",
]


def render_csv(run: AllocationRun, path: Path) -> Path:
    """导出 Excel 可直接打开的 CSV（带 BOM，中文不乱码）。"""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    res = run.result
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(CSV_HEADERS)
        for a in res.get("allocations", []):
            short, reason = truncate(a.get("remark", ""))
            w.writerow([
                a.get("task_id"), a.get("name"), a.get("owner"), a.get("team"),
                a.get("project"), a.get("gpu_card"), _fmt(a.get("gpu_hours")),
                _fmt(a.get("unit_price")), a.get("currency"), _fmt(a.get("resolved_cost")),
                a.get("rule_applied") or "—", a.get("judgment_before"),
                a.get("judgment_after"), "是" if a.get("judgment_changed") else "否",
                "是" if a.get("confirmed") else "否", _pct(a.get("contribution_share")),
                a.get("sources_note"), a.get("remark"), short, reason or "",
                "是" if a.get("rolled_back_preserved") else "否",
            ])
    return path


def render_text(run: AllocationRun, preserved_runs: list, usd_rate: Decimal = USD_TO_CNY_DEFAULT) -> str:
    """生成给不懂代码的人看的文字报告。"""
    res = run.result
    allocations = res.get("allocations", [])
    active = [a for a in allocations if not a.get("rolled_back_preserved")]
    preserved = [a for a in allocations if a.get("rolled_back_preserved")]
    currency_totals = res.get("currency_totals", {})
    team_totals = res.get("team_totals", {})
    changes = res.get("before_after_summary", [])
    needs = res.get("needs_attention", [])
    bad_fb = res.get("bad_feedback", [])

    lines: list[str] = []
    lines.append("=" * 64)
    lines.append("训练任务成本分摊 报告")
    lines.append("=" * 64)
    lines.append(f"版本：第 {run.version} 次" + ("（已回滚，仅供参考）" if run.rolled_back else ""))
    lines.append(f"生成时间：{run.ts}")
    lines.append(f"说明：{run.note}")
    lines.append(f"美元折人民币汇率：1 USD = {usd_rate} CNY")
    lines.append("")
    lines.append("【怎么看这份报告】")
    lines.append("  · 调整前 = 只看原始记录、还没应用晚到的安全规则和人工反馈时的判断；")
    lines.append("  · 调整后 = 应用晚到安全规则 + 补录 + 人工确认之后的最终判断；")
    lines.append("  · 异常(偏高) = 这条任务成本明显高出同团队平均水平，建议重点核对；")
    lines.append("  · 已回滚保留 = 这条任务作废了，不计入合计，但记录留着方便以后查。")
    lines.append("")

    # 1. 总览
    lines.append("-" * 64)
    lines.append("一、总览（合计成本）")
    lines.append("-" * 64)
    if not currency_totals:
        lines.append("  暂无有效成本数据。")
    for cur, total in currency_totals.items():
        lines.append(f"  {cur} 合计：{_fmt(total)}")
    cny_total = Decimal(0)
    for team, vals in team_totals.items():
        cny_total += Decimal(vals.get("cny", "0"))
    lines.append(f"  折合人民币合计：{_fmt(cny_total)} CNY")
    lines.append("")

    # 2. 团队汇总
    lines.append("-" * 64)
    lines.append("二、各团队汇总")
    lines.append("-" * 64)
    for team, vals in team_totals.items():
        parts = [f"{k} {_fmt(v)}" for k, v in vals.items() if k != "cny"]
        lines.append(f"  {team}：折合 {_fmt(vals.get('cny', '0'))} CNY"
                     + (f"（{', '.join(parts)}）" if parts else ""))
    lines.append("")

    # 3. 分布与判定调整（前后差别）
    lines.append("-" * 64)
    lines.append("三、分布统计改变的判断（调整前 → 调整后）")
    lines.append("-" * 64)
    if not changes:
        lines.append("  本次没有任务因分布变化而改变判断。")
    for c in changes:
        lines.append(f"  · {c}")
    lines.append("")

    # 4. 明细
    lines.append("-" * 64)
    lines.append("四、任务明细")
    lines.append("-" * 64)
    for a in active:
        short, reason = truncate(a.get("remark", ""))
        arrow = _judgment_arrow(a.get("judgment_before", "—"),
                                a.get("judgment_after", "—"),
                                bool(a.get("judgment_changed")))
        lines.append(f"[{a.get('task_id')}] {a.get('name')}（负责人 {a.get('owner')}，{a.get('team')}）")
        lines.append(f"  成本：{_fmt(a.get('resolved_cost'))} {a.get('currency')}"
                     f"  占团队：{_pct(a.get('contribution_share'))}"
                     f"  判断：{arrow}"
                     + ("  已确认" if a.get("confirmed") else ""))
        lines.append(f"  来源：{a.get('sources_note')}")
        if short:
            lines.append(f"  备注：{short}")
        if reason:
            lines.append(f"  （{reason}）")
        lines.append("")

    # 5. 保留（已回滚）记录
    lines.append("-" * 64)
    lines.append("五、保留（已回滚）记录 —— 不计入合计，但保留可查")
    lines.append("-" * 64)
    if not preserved:
        lines.append("  本次没有已回滚的任务记录。")
    for a in preserved:
        lines.append(f"  · [{a.get('task_id')}] {a.get('name')}：原成本 {_fmt(a.get('resolved_cost'))} "
                     f"{a.get('currency')}，来源 {a.get('sources_note')}")
    for pr in preserved_runs:
        lines.append(f"  · 整版本回滚：第 {pr.version} 次运行（{pr.ts}）已回滚，"
                     f"其中 {len(pr.result.get('allocations', []))} 条记录仍保留可查，未删除。")
    lines.append("")

    # 6. 需人工处理
    lines.append("-" * 64)
    lines.append("六、需要人工再看一眼")
    lines.append("-" * 64)
    if not needs:
        lines.append("  暂无待处理项。")
    for n in needs:
        lines.append(f"  · {n}")
    if bad_fb:
        lines.append("")
        lines.append("  其中反馈里的问题数据：")
        for r in bad_fb:
            lines.append(f"    - 反馈 {r.get('fb_id')}（任务 {r.get('task_id')}，"
                         f"动作 {r.get('action')}）：{r.get('problem') or '无明显问题'}")
    lines.append("")
    lines.append("=" * 64)
    return "\n".join(lines)


def export(run: AllocationRun, out_dir, fmt: str = "both",
           preserved_runs: Optional[list] = None,
           usd_rate: Decimal = USD_TO_CNY_DEFAULT) -> list[Path]:
    """导出报告。fmt: csv / txt / both。返回写出的文件路径列表。"""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    preserved_runs = preserved_runs or []
    written: list[Path] = []
    if fmt in ("csv", "both"):
        written.append(render_csv(run, out / f"分摊报告_v{run.version}.csv"))
    if fmt in ("txt", "both"):
        text = render_text(run, preserved_runs, usd_rate)
        p = out / f"分摊报告_v{run.version}.txt"
        with open(p, "w", encoding="utf-8") as f:
            f.write(text)
        written.append(p)
    return written

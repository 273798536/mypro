"""导出报告。

模型评审会只看这份导出报告也能看懂：
- 本次处理的是眼前这批具体材料(训练样本/提示词版本/版本回滚丢记录同轮呈现)
- 长文本截断为什么被拦下来(逐条解释)
- 异常不是单个红色数字，而是按 补材料/改口径/待补录/截断 分类并给出下一步
- 人工备注原话保留
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from graycity import diff as diff_mod
from graycity import exceptions as ex_mod
from graycity import rollback as rb_mod
from graycity import truncation as tr_mod
from graycity.models import CityDiff, EvalResult, ExceptionItem
from graycity.rollback import RecoveryOutcome
from graycity.store import DataStore, MAX_LEN


def export(
    store: DataStore,
    results: list[EvalResult],
    diffs: list[CityDiff],
    exc_items: list[ExceptionItem],
    recoveries: list[RecoveryOutcome],
    backfilled: bool = False,
) -> str:
    active = store.active_prompt()
    counts = ex_mod.group_counts(exc_items)
    lines: list[str] = []
    lines.append("# 灰度城市转化差异 复核报告")
    lines.append(f"日期：{date.today().isoformat()}  生效提示词：{active.version}")
    lines.append(f"日志补录状态：{'已补录(灰度对比已随更新重算)' if backfilled else '未补录(含待补录样本)'}")
    lines.append("")

    # 1) 同轮材料
    lines.append("## 1. 本轮材料（同一轮复核）")
    lines.append(
        f"- 训练样本 {len(store.samples)} 条，灰度分组：treatment "
        f"{sum(1 for s in store.samples if s.group == 'treatment')} / "
        f"control {sum(1 for s in store.samples if s.group == 'control')}"
    )
    lines.append(f"- 提示词版本 {len(store.prompt_versions)} 个，生效为 {active.version}")
    lines.append(
        f"- 版本回滚丢记录 {len(store.rollback_losses)} 条："
        f"已恢复 {sum(1 for o in recoveries if o.status == 'recovered')} / "
        f"转人工 {sum(1 for o in recoveries if o.status == 'manual')}"
    )
    lines.append("")

    # 2) 灰度城市转化差异
    lines.append("## 2. 灰度城市转化差异")
    lines.append("城市 | treatment 转化率 | control 转化率 | Δ(pp) | 拦截 | 待补录")
    lines.append("---|---|---|---|---|---")
    for c in diffs:
        lines.append(
            f"{c.city} | {c.treatment_total and f'{c.treatment_rate*100:.1f}%({c.treatment_conv}/{c.treatment_total})' or '-'} | "
            f"{c.control_total and f'{c.control_rate*100:.1f}%({c.control_conv}/{c.control_total})' or '-'} | "
            f"{c.delta_pp:+.2f} | {c.blocked} | {c.pending_backfill}"
        )
    lines.append(f"\n汇总：{diff_mod.summarize(diffs)}")
    lines.append("")

    # 3) 异常分类（不是单一红色数字）
    lines.append("## 3. 异常分类与下一步")
    lines.append(
        f"补材料 {counts.get('补材料', 0)} | 改口径 {counts.get('改口径', 0)} | "
        f"待补录日志 {counts.get('待补录日志', 0)} | 长文本截断 {counts.get('长文本截断', 0)}"
    )
    lines.append("")
    lines.append("样本 | 城市 | 类别 | 详情 | 下一步")
    lines.append("---|---|---|---|---")
    for it in exc_items:
        lines.append(f"{it.sample_id} | {it.city} | {it.category} | {it.detail} | {it.next_step}")
    lines.append("")

    # 4) 长文本截断解释
    trunc_samples = tr_mod.detect(store)
    lines.append(f"## 4. 长文本截断为什么被拦（max_len={MAX_LEN}）")
    if not trunc_samples:
        lines.append("本轮无截断样本。")
    for s in trunc_samples:
        lines.append("")
        lines.append(tr_mod.explain(store, s.id) or "")
    lines.append("")

    # 5) 版本回滚丢记录
    lines.append("## 5. 版本回滚丢记录恢复")
    lines.append("样本 | 丢失字段 | from→to | 状态 | 动作 | 下一步")
    lines.append("---|---|---|---|---|---")
    for o in recoveries:
        lines.append(
            f"{o.loss.sample_id} | {o.loss.lost_field} | {o.loss.from_version}→{o.loss.to_version} | "
            f"{o.status} | {o.action} | {o.next_step}"
        )
    lines.append("")

    # 6) 人工备注（原话保留）
    lines.append("## 6. 人工备注（原话保留，未改写）")
    from graycity import annotate as ann_mod

    for v in ann_mod.list_notes(store):
        lines.append(f'- {v.sample.id}({v.sample.city})："{v.annotation.note}" —— {v.annotation.author}')
    lines.append("")

    # 7) 结论
    lines.append("## 7. 下一步建议")
    if counts.get("待补录日志", 0):
        lines.append("- 先补录待补录日志样本，重跑 `graycity replay --supplement` 后灰度对比会自动更新。")
    if counts.get("补材料", 0):
        lines.append("- 补材料类异常：补充同城同类型训练样本后再下结论。")
    if counts.get("改口径", 0):
        lines.append("- 改口径类异常：复核判定口径/阈值与提示词版本，确认是否调整。")
    if trunc_samples:
        lines.append("- 截断样本：决定补长文本材料还是放宽 max_len 口径。")

    return "\n".join(lines) + "\n"

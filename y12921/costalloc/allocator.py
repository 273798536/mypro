from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional

from .models import (
    AllocationRule, FeedbackRecord, TaskAllocation, TrainingTask,
    USD_TO_CNY_DEFAULT,
)

MIN_TEAM_SIZE = 2          # 团队样本少于此数不判异常，避免误报
ANOMALY_FACTOR = Decimal("2.0")   # 成本超过团队均值的 2 倍判为偏高


@dataclass
class EffTask:
    """分摊计算用的有效任务（已叠加人工反馈的更正/补录）。"""
    task_id: str
    name: str
    owner: str
    team: str
    project: str
    gpu_card: str
    gpu_hours: Optional[Decimal]
    unit_price: Optional[Decimal]
    currency: Optional[str]
    cost_override: Optional[Decimal]        # 权威实际金额（原始记录或人工反馈）
    cost_currency: Optional[str]
    remark: str
    source: str
    status: str
    run_date: str = ""
    confirmed: bool = False
    notes: list = field(default_factory=list)


@dataclass
class AllocationResult:
    allocations: list  # list[TaskAllocation] 含已回滚保留项
    team_totals: dict  # {team: {currency: Decimal, cny: Decimal}}
    currency_totals: dict  # {currency: Decimal}
    needs_attention: list  # 人话待办
    before_after_summary: list  # 判定变化的人话说明
    bad_feedback: list  # list[FeedbackRecord]


def _pick_rule(task: EffTask, rules: list[AllocationRule], include_late: bool) -> Optional[AllocationRule]:
    """按 项目 > 团队 > 卡型 > 全局 的优先级选规则；晚到规则仅在 include_late 时生效；
    卡型不匹配的规则不参与，避免 A100 的单价规则误伤 A10 任务。"""
    best: Optional[AllocationRule] = None
    best_rank = -1
    for r in rules:
        if r.arrived_late and not include_late:
            continue
        if r.effective_from and task.run_date and r.effective_from > task.run_date:
            continue
        if r.gpu_card and r.gpu_card != task.gpu_card:
            continue
        rank = -1
        if r.scope == "project" and r.target == task.project:
            rank = 4
        elif r.scope == "team" and r.target == task.team:
            rank = 3
        elif r.scope == "global" and r.target in ("", "*"):
            rank = 1
        elif r.scope in ("card", "global") and r.gpu_card == task.gpu_card:
            rank = 2
        if rank > best_rank:
            best, best_rank = r, rank
    return best


def _to_cny(amount: Decimal, currency: Optional[str], usd_rate: Decimal) -> Decimal:
    if currency == "USD":
        return amount * usd_rate
    return amount


def _resolve(eff: EffTask, rule: Optional[AllocationRule]) -> tuple[Optional[Decimal], Optional[str], Optional[str], str]:
    """返回 (金额, 币种, 命中规则ID, 人话来源说明)。金额为 None 表示暂未确定。"""
    if eff.cost_override is not None:
        cur = eff.cost_currency or eff.currency
        src = "实际金额直接入账"
        if eff.notes:
            src += "（" + "；".join(eff.notes) + "）"
        return eff.cost_override, cur, None, src
    price = eff.unit_price
    rule_id = None
    if rule is not None and rule.unit_price_override is not None:
        price = rule.unit_price_override
        rule_id = rule.rule_id
    if eff.gpu_hours is not None and price is not None:
        cur = (rule.currency if rule is not None else None) or eff.currency
        src = "按 时长×单价 计算"
        if rule is not None:
            tail = f"（规则 {rule.rule_id}"
            if rule.arrived_late:
                tail += "，晚到安全规则"
            tail += f"，单价 {price}）"
            src += tail
        if eff.notes:
            src += "；" + "；".join(eff.notes)
        return eff.gpu_hours * price, cur, rule_id, src
    return None, eff.currency, None, "成本暂未确定（时长或单价缺失，需人工补录）"


def build_eff_tasks(tasks: list[TrainingTask], feedback: list[FeedbackRecord],
                    apply_feedback: bool) -> list[EffTask]:
    """把训练任务转成有效任务；apply_feedback=True 时叠加更正/补录/确认。"""
    effs: list[EffTask] = []
    by_id: dict[str, EffTask] = {}
    for t in tasks:
        eff = EffTask(
            task_id=t.task_id, name=t.name, owner=t.owner, team=t.team,
            project=t.project, gpu_card=t.gpu_card, gpu_hours=t.gpu_hours,
            unit_price=t.unit_price, currency=t.currency,
            cost_override=t.cost, cost_currency=t.currency if t.cost is not None else None,
            remark=t.remark, source=t.source, status=t.status, run_date=t.run_date,
            notes=list(t.issues),
        )
        effs.append(eff)
        by_id[t.task_id] = eff

    if not apply_feedback:
        return effs

    for r in feedback:
        if not r.ok:
            continue
        eff = by_id.get(r.task_id)
        if eff is None:
            continue
        if r.action == "correct":
            if r.parsed_hours is not None:
                eff.gpu_hours = r.parsed_hours
                eff.notes.append(f"人工更正时长为 {r.parsed_hours}h（{r.reviewer}）")
            if r.parsed_amount is not None:
                eff.cost_override = r.parsed_amount
                eff.cost_currency = r.parsed_currency or eff.currency
                eff.notes.append(f"人工更正实际金额为 {r.parsed_amount} {eff.cost_currency or ''}（{r.reviewer}）")
        elif r.action == "supplement":
            if r.parsed_hours is not None:
                eff.gpu_hours = (eff.gpu_hours or Decimal(0)) + r.parsed_hours
                eff.notes.append(f"补录额外运行 {r.parsed_hours}h（{r.reviewer}）")
            if r.parsed_amount is not None:
                eff.cost_override = r.parsed_amount
                eff.cost_currency = r.parsed_currency or eff.currency
                eff.notes.append(f"补录实际金额 {r.parsed_amount} {eff.cost_currency or ''}（{r.reviewer}）")
        elif r.action == "confirm":
            eff.confirmed = True
            if r.parsed_hours is not None and eff.gpu_hours is not None and r.parsed_hours != eff.gpu_hours:
                eff.notes.append(f"确认时填的时长 {r.parsed_hours}h 与记录 {eff.gpu_hours}h 不一致，需复核")
            else:
                eff.notes.append(f"已人工确认（{r.reviewer}）")
    return effs


def _judge(resolved: dict[str, tuple[Optional[Decimal], Optional[str]]],
           effs: list[EffTask], usd_rate: Decimal, factor: Decimal) -> dict[str, str]:
    """按团队分布统计给出判定：正常 / 异常(偏高) / 待定(数据待补) / 数据不足。"""
    teams: dict[str, list[Decimal]] = {}
    counts: dict[str, int] = {}
    for eff in effs:
        if eff.status == "rolled_back":
            continue
        teams.setdefault(eff.team, [])
        counts[eff.team] = counts.get(eff.team, 0) + 1
        cost, cur = resolved.get(eff.task_id, (None, None, None, ""))[:2]
        if cost is not None:
            teams[eff.team].append(_to_cny(cost, cur, usd_rate))

    means: dict[str, Decimal] = {}
    for team, vals in teams.items():
        if vals:
            means[team] = sum(vals, Decimal(0)) / Decimal(len(vals))

    out: dict[str, str] = {}
    for eff in effs:
        if eff.status == "rolled_back":
            out[eff.task_id] = "已回滚(保留)"
            continue
        cost, cur = resolved.get(eff.task_id, (None, None, None, ""))[:2]
        if cost is None:
            out[eff.task_id] = "待定(数据待补)"
        elif len(teams[eff.team]) < MIN_TEAM_SIZE:
            out[eff.task_id] = "数据不足(样本少)"
        elif means[eff.team] > 0 and _to_cny(cost, cur, usd_rate) > means[eff.team] * factor:
            out[eff.task_id] = "异常(偏高)"
        else:
            out[eff.task_id] = "正常"
    return out


def allocate(tasks: list[TrainingTask], rules: list[AllocationRule],
             feedback: list[FeedbackRecord], usd_rate: Decimal = USD_TO_CNY_DEFAULT,
             anomaly_factor: Decimal = ANOMALY_FACTOR) -> AllocationResult:
    """主分摊：先算 调整前（不含晚到规则、不含人工反馈），再算 调整后，对比判定。"""
    before_effs = build_eff_tasks(tasks, feedback, apply_feedback=False)
    after_effs = build_eff_tasks(tasks, feedback, apply_feedback=True)

    before_resolved = {
        e.task_id: _resolve(e, _pick_rule(e, rules, include_late=False)) for e in before_effs
    }
    after_resolved = {
        e.task_id: _resolve(e, _pick_rule(e, rules, include_late=True)) for e in after_effs
    }

    before_judg = _judge(before_resolved, before_effs, usd_rate, anomaly_factor)
    after_judg = _judge(after_resolved, after_effs, usd_rate, anomaly_factor)

    # 团队合计（调整后，不含已回滚）
    team_totals: dict[str, dict[str, Decimal]] = {}
    currency_totals: dict[str, Decimal] = {}
    for eff in after_effs:
        if eff.status == "rolled_back":
            continue
        cost, cur = after_resolved.get(eff.task_id, (None, None, None, ""))[:2]
        if cost is None:
            continue
        cur = cur or "CNY"
        tt = team_totals.setdefault(eff.team, {"cny": Decimal(0)})
        tt["cny"] += _to_cny(cost, cur, usd_rate)
        tt[cur] = tt.get(cur, Decimal(0)) + cost
        currency_totals[cur] = currency_totals.get(cur, Decimal(0)) + cost

    allocations: list[TaskAllocation] = []
    needs_attention: list[str] = []
    before_after_summary: list[str] = []

    after_by_id = {e.task_id: e for e in after_effs}
    for eff in after_effs:
        cost, cur, rule_id, src_note = after_resolved.get(eff.task_id, (None, None, None, ""))
        jb = before_judg.get(eff.task_id, "—")
        ja = after_judg.get(eff.task_id, "—")
        changed = (jb != ja) and jb != "—" and ja != "—"
        share = None
        if cost is not None and eff.status != "rolled_back":
            cny = _to_cny(cost, cur, usd_rate)
            team_cny = team_totals.get(eff.team, {}).get("cny", Decimal(0))
            if team_cny > 0:
                share = (cny / team_cny)

        if eff.status == "rolled_back":
            needs_attention.append(
                f"{eff.task_id} {eff.name}：已回滚，不计入合计但记录保留可查（来源 {eff.source}）。")

        allocations.append(TaskAllocation(
            task_id=eff.task_id, name=eff.name, owner=eff.owner, team=eff.team,
            project=eff.project, gpu_card=eff.gpu_card, gpu_hours=eff.gpu_hours,
            unit_price=(rule_id and next((r.unit_price_override for r in rules if r.rule_id == rule_id), eff.unit_price)) or eff.unit_price,
            currency=cur or "CNY", resolved_cost=cost if cost is not None else Decimal(0),
            rule_applied=rule_id, judgment_before=jb, judgment_after=ja,
            judgment_changed=changed, confirmed=eff.confirmed,
            rolled_back_preserved=(eff.status == "rolled_back"),
            contribution_share=share, remark=eff.remark, sources_note=src_note,
        ))

        if changed:
            before_after_summary.append(
                f"{eff.task_id} {eff.name}：判定由「{jb}」变为「{ja}」"
                f"——调整后团队「{eff.team}」分布变化（详见来源说明：{src_note}）。")

        for note in eff.notes:
            if "缺失" in note or "待补" in note or "不一致" in note or "暂未确定" in note:
                needs_attention.append(f"{eff.task_id}：{note}")

    bad_feedback = [r for r in feedback if not r.ok]
    # 坏反馈单独放在 bad_feedback 列表里由报告集中展示，避免和待办重复

    return AllocationResult(
        allocations=allocations, team_totals=team_totals,
        currency_totals=currency_totals, needs_attention=needs_attention,
        before_after_summary=before_after_summary, bad_feedback=bad_feedback,
    )

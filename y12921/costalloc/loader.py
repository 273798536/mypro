from __future__ import annotations

import csv
from decimal import Decimal
from pathlib import Path
from typing import Optional

from .models import (
    AllocationRule, FeedbackRecord, TrainingTask,
    parse_hours, parse_money,
)


def _cell(row: dict, *names: str, default: str = "") -> str:
    """兼容旧表/新表不同列名：按优先级取第一个非空列。"""
    for n in names:
        v = row.get(n)
        if v is not None and str(v).strip() != "":
            return str(v).strip()
    return default


def load_tasks(path) -> list[TrainingTask]:
    """从 CSV 加载训练任务，容忍旧表/新表列名差异和脏值，解析问题写入 task.issues。"""
    tasks: list[TrainingTask] = []
    seen_ids: set[str] = set()
    with open(path, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            tid = _cell(row, "task_id", "任务ID", "id")
            if not tid:
                continue
            if tid in seen_ids:
                # 重复行以第一次为准，避免重复计数
                continue
            seen_ids.add(tid)

            hours_raw = _cell(row, "gpu_hours", "时长", "时长(小时)", "GPU小时")
            hp = parse_hours(hours_raw)

            price_raw = _cell(row, "unit_price", "单价", "GPU单价")
            # 单价允许带币种符号，默认币种取 currency 列
            cur_col = _cell(row, "currency", "币种")
            pp = parse_money(price_raw, default_currency=cur_col or None)

            cost_raw = _cell(row, "cost_raw", "实际金额", "金额", "cost")
            cp = parse_money(cost_raw, default_currency=cur_col or pp.currency or None)

            issues: list[str] = []
            if not hp.ok and hours_raw:
                issues.append(hp.problem)
            elif hp.amount is None and hours_raw == "" and cp.amount is None:
                issues.append("时长为空，无法按 时长×单价 估算成本。")
            # 只有在实际金额不可用、需要靠单价估算时，才提示单价的问题，避免噪音
            if not pp.ok and price_raw and cp.amount is None:
                issues.append("单价" + pp.problem)
            if not cp.ok:
                issues.append("金额" + cp.problem)

            task = TrainingTask(
                task_id=tid,
                name=_cell(row, "task_name", "任务名", "名称", "name"),
                owner=_cell(row, "owner", "负责人", "owner"),
                team=_cell(row, "team", "团队", "组"),
                project=_cell(row, "project", "项目"),
                gpu_card=_cell(row, "gpu_card", "卡型", "GPU型号"),
                gpu_hours=hp.amount,
                gpu_hours_raw=hours_raw,
                unit_price=pp.amount,
                unit_price_raw=price_raw,
                currency=cp.currency or pp.currency or (cur_col or None),
                cost=cp.amount,
                cost_raw=cost_raw,
                remark=_cell(row, "remark", "备注", "说明"),
                source=_cell(row, "source", "来源", "表来源"),
                run_date=_cell(row, "run_date", "运行日期", "日期"),
                status=_cell(row, "status", "状态", default="success"),
                issues=issues,
            )
            tasks.append(task)
    return tasks


def load_rules(path) -> list[AllocationRule]:
    rules: list[AllocationRule] = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            rid = _cell(row, "rule_id", "规则ID")
            if not rid:
                continue
            rules.append(AllocationRule.from_dict({
                "rule_id": rid,
                "scope": _cell(row, "scope", "范围", default="global"),
                "target": _cell(row, "target", "对象", default="*"),
                "unit_price_override": _cell(row, "unit_price_override", "单价"),
                "currency": _cell(row, "currency", "币种"),
                "effective_from": _cell(row, "effective_from", "生效日期"),
                "arrived_late": _cell(row, "arrived_late", "晚到", "安全规则晚到"),
                "note": _cell(row, "note", "说明"),
                "gpu_card": _cell(row, "gpu_card", "卡型", "GPU型号"),
            }))
    return rules


def load_feedback(path) -> list[FeedbackRecord]:
    """加载人工反馈，解析 value_raw（可能是金额也可能是时长），并校验任务是否存在。"""
    records: list[FeedbackRecord] = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            fid = _cell(row, "fb_id", "反馈ID")
            if not fid:
                continue
            value_raw = _cell(row, "value_raw", "数值", "值", "amount")
            unit_raw = _cell(row, "unit_raw", "单位", "币种")
            mp = parse_money(value_raw, default_currency=unit_raw or None)
            hp = parse_hours(value_raw)

            parsed_amount = mp.amount
            parsed_currency = mp.currency
            ok = True
            problem = ""

            if mp.ok and mp.amount is not None:
                # 金额有效：按金额处理，不当作时长
                parsed_hours = None
            elif hp.ok and hp.amount is not None:
                # 当成时长
                parsed_amount = None
                parsed_currency = unit_raw or None
                parsed_hours = hp.amount
            else:
                ok = False
                problem = mp.problem or hp.problem or "数值无法识别。"
                parsed_hours = None

            records.append(FeedbackRecord(
                fb_id=fid,
                task_id=_cell(row, "task_id", "任务ID"),
                action=_cell(row, "action", "动作", default="confirm"),
                reviewer=_cell(row, "reviewer", "审核人", "操作人"),
                value_raw=value_raw,
                unit_raw=unit_raw,
                remark=_cell(row, "remark", "备注", "说明"),
                ts=_cell(row, "ts", "时间", "时间戳"),
                parsed_amount=parsed_amount,
                parsed_currency=parsed_currency,
                parsed_hours=parsed_hours,
                ok=ok,
                problem=problem,
            ))
    return records


def validate_feedback(records: list[FeedbackRecord], tasks: list[TrainingTask]) -> None:
    """给反馈补上任务存在性校验问题（漏登任务等），直接写到 problem 上。"""
    known = {t.task_id for t in tasks}
    for r in records:
        if r.task_id and r.task_id not in known:
            extra = (f"反馈 {r.fb_id} 引用的任务 {r.task_id} 在任务表里找不到，"
                     f"可能是漏登的任务，需要先补录任务再确认金额。")
            r.problem = (r.problem + " " + extra).strip() if r.problem else extra
            r.ok = False

from __future__ import annotations

from typing import Dict, List, Tuple, Any
from itertools import product as iterproduct

import pulp

from app.schemas.models import (
    SKU, OrderLine, BoxType, PackingConstraints,
    RecommendReport, BoxAssignment, ConstraintExplanation,
)

ORIENTATIONS = ["LxWxH", "LxHxW", "WxHxL"]


def _orient(sku: SKU, o: str) -> Tuple[float, float, float]:
    l, w, h = sku.length, sku.width, sku.height
    if o == "LxWxH":
        return (l, w, h)
    if o == "LxHxW":
        return (l, h, w)
    return (w, h, l)


def _volume(sku: SKU) -> float:
    return sku.length * sku.width * sku.height


def _box_volume(box: BoxType) -> float:
    return box.length * box.width * box.height


def _fits(box: BoxType, dims: Tuple[float, float, float]) -> bool:
    bd = sorted([box.length, box.width, box.height])
    sd = sorted(dims)
    return all(b >= s for b, s in zip(bd, sd))


def _expand_lines(lines: List[OrderLine], catalog: List[SKU]) -> List[SKU]:
    idx = {s.sku_id: s for s in catalog}
    units: List[SKU] = []
    for ln in lines:
        s = idx[ln.sku_id]
        for _ in range(ln.qty):
            units.append(s)
    return units


def build_and_solve(
    order_id: str,
    lines: List[OrderLine],
    catalog: List[SKU],
    boxes: List[BoxType],
    constraints: PackingConstraints,
) -> RecommendReport:
    sku_by_id = {s.sku_id: s for s in catalog}
    # 校验
    issues: List[str] = []
    for ln in lines:
        if ln.sku_id not in sku_by_id:
            issues.append(f"订单行引用了不存在的 SKU：{ln.sku_id}")
    for s in catalog:
        if s.length <= 0 or s.width <= 0 or s.height <= 0 or s.weight < 0:
            issues.append(f"SKU {s.sku_id} 尺寸/重量非法")
    for b in boxes:
        if b.length <= 0 or b.width <= 0 or b.height <= 0:
            issues.append(f"箱型 {b.box_id} 尺寸非法")
    if issues:
        return RecommendReport(
            order_id=order_id,
            feasible=False,
            objective_value=0.0,
            boxes_opened=0,
            total_cost=0.0,
            split_penalty_total=0.0,
            assignments=[],
            explanations=[],
            issues=issues,
            trace={"precheck": "failed"},
        )

    units = _expand_lines(lines, catalog)
    n = len(units)
    if n == 0:
        return RecommendReport(
            order_id=order_id,
            feasible=True,
            objective_value=0.0,
            boxes_opened=0,
            total_cost=0.0,
            split_penalty_total=0.0,
            assignments=[],
            explanations=[
                ConstraintExplanation("empty", "空订单无需装箱", True, "no items"),
            ],
            issues=[],
        )

    # 预筛选每个商品可行的 (箱型, 方向)
    feasible: Dict[int, List[Tuple[int, str]]] = {}
    for i, u in enumerate(units):
        feas = []
        for bi, b in enumerate(boxes):
            if u.weight > b.max_weight and b.max_weight > 0:
                continue
            for o in ORIENTATIONS:
                if not u.rotation_allowed and o != "LxWxH":
                    continue
                if _fits(b, _orient(u, o)):
                    feas.append((bi, o))
        if not feas:
            issues.append(
                f"SKU {u.sku_id} 在任意箱型中都无法装载（尺寸/旋转/重量限制），来源：{u.source}"
            )
        feasible[i] = feas

    if any(not feasible[i] for i in range(n)):
        return RecommendReport(
            order_id=order_id,
            feasible=False,
            objective_value=0.0,
            boxes_opened=0,
            total_cost=0.0,
            split_penalty_total=0.0,
            assignments=[],
            explanations=[],
            issues=issues,
            trace={"precheck": "no_feasible_box"},
        )

    # 决策变量：每个商品 i -> (box_slot j, orientation)；每个 box_slot 只能选一个 box 类型
    # 为避免无限，box_slot 数取 min(n, max_boxes) 或 n
    max_slots = min(constraints.max_boxes_per_order or n, n)
    J = list(range(max_slots))

    prob = pulp.LpProblem(f"boxpack_{order_id}", pulp.LpMinimize)

    # y[j, bi] = 1 表示 slot j 选用箱型 bi（互斥）
    y = {
        (j, bi): pulp.LpVariable(f"y_{j}_{bi}", cat="Binary")
        for j in J
        for bi in range(len(boxes))
    }
    # z[j] = 1 表示 slot j 被使用
    z = {j: pulp.LpVariable(f"z_{j}", cat="Binary") for j in J}
    # x[i, j, bi, o] = 1 表示商品 i 放在 slot j 上、箱型 bi、方向 o
    x = {
        (i, j, bi, o): pulp.LpVariable(
            f"x_{i}_{j}_{bi}_{o}", cat="Binary"
        )
        for i in range(n)
        for j in J
        for bi in range(len(boxes))
        for o in ORIENTATIONS
        if (bi, o) in feasible[i]
    }

    # 目标：箱型成本 + 拆箱惩罚（每使用一个 slot 一次）
    obj_parts = []
    for j in J:
        for bi, b in enumerate(boxes):
            obj_parts.append(b.cost * y[(j, bi)])
    for j in J:
        obj_parts.append(constraints.split_penalty * z[j])
    prob += pulp.lpSum(obj_parts)

    # 每个 slot 只能选一种箱型或不开
    for j in J:
        prob += (
            pulp.lpSum(y[(j, bi)] for bi in range(len(boxes))) == z[j],
            f"slot_type_unique_{j}",
        )

    # 每个商品必须被装进一个 slot+方向
    for i in range(n):
        expr = pulp.lpSum(
            x[(i, j, bi, o)]
            for j in J
            for bi in range(len(boxes))
            for o in ORIENTATIONS
            if (i, j, bi, o) in x
        )
        prob += (expr == 1, f"assign_{i}")

    # 箱型一致性：若 x[i,j,bi,o]=1 则 y[j,bi]=1
    for i in range(n):
        for (i2, j, bi, o), var in x.items():
            if i2 != i:
                continue
            prob += (var <= y[(j, bi)], f"cons_box_{i}_{j}_{bi}_{o}")

    # 容量约束（体积）- 使用 slot j 的箱型容积
    for j in J:
        expr = pulp.lpSum(
            _volume(units[i]) * x[(i, j, bi, o)]
            for i in range(n)
            for bi in range(len(boxes))
            for o in ORIENTATIONS
            if (i, j, bi, o) in x
        )
        cap = pulp.lpSum(
            _box_volume(boxes[bi]) * y[(j, bi)]
            for bi in range(len(boxes))
        )
        prob += (expr <= cap, f"vol_cap_{j}")

    # 重量约束
    for j in J:
        expr = pulp.lpSum(
            units[i].weight * x[(i, j, bi, o)]
            for i in range(n)
            for bi in range(len(boxes))
            for o in ORIENTATIONS
            if (i, j, bi, o) in x
        )
        cap = pulp.lpSum(
            boxes[bi].max_weight * y[(j, bi)]
            for bi in range(len(boxes))
        )
        prob += (expr <= cap, f"weight_cap_{j}")

    # 易碎/承重：若 slot j 内存在承重有限的易碎品，则其他商品重量之和不超过其 bearing_capacity_kg
    # 简化处理：每个 slot 的 "承重脆弱度" = min(bearing_capacity) (仅对 fragile=true)
    # 对每个 slot j：sum(weight of items in slot that are NOT the fragile bearer)
    #   <= bearing_capacity_kg  * has_bearer + M*(1 - has_bearer)
    # 实际实现：对每个 i，若 units[i].fragile 且 bearing_capacity_kg 非 None，
    #   sum_{k!=i, in same slot} weight_k <= bearing + M*(1 - same_slot)
    M = 1e6
    for i in range(n):
        u = units[i]
        if not u.fragile or u.bearing_capacity_kg is None:
            continue
        limit = u.bearing_capacity_kg
        for j in J:
            # 同一 slot 中其他商品的总重量
            others = pulp.lpSum(
                units[k].weight * x[(k, j, bi, o)]
                for k in range(n) if k != i
                for bi in range(len(boxes))
                for o in ORIENTATIONS
                if (k, j, bi, o) in x
            )
            in_slot = pulp.lpSum(
                x[(i, j, bi, o)]
                for bi in range(len(boxes))
                for o in ORIENTATIONS
                if (i, j, bi, o) in x
            )
            prob += (
                others <= limit * in_slot + M * (1 - in_slot),
                f"bearing_{i}_{j}",
            )

    # 禁止混合易碎品
    if constraints.forbid_mix_fragile:
        for j in J:
            frag_in_slot = pulp.lpSum(
                1 * x[(i, j, bi, o)] if units[i].fragile else 0
                for i in range(n)
                for bi in range(len(boxes))
                for o in ORIENTATIONS
                if (i, j, bi, o) in x
            )
            prob += (frag_in_slot <= 1, f"no_mix_fragile_{j}")

    # 对称破坏：slot 编号靠前的优先被使用
    for j in J:
        if j + 1 < len(J):
            prob += (z[j] >= z[j + 1], f"symmetry_{j}")

    # 求解
    solver = pulp.PULP_CBC_CMD(
        timeLimit=constraints.time_limit_sec,
        gapRel=constraints.gap_tol,
        msg=False,
    )
    try:
        status = prob.solve(solver)
    except pulp.PulpSolverError as e:
        issues.append(f"求解器异常：{e}")
        return RecommendReport(
            order_id=order_id,
            feasible=False,
            objective_value=0.0,
            boxes_opened=0,
            total_cost=0.0,
            split_penalty_total=0.0,
            assignments=[],
            explanations=[],
            issues=issues,
            trace={"solver_error": str(e)},
        )

    status_name = pulp.LpStatus[status]
    feasible = status_name == "Optimal" or (
        status_name == "Not Solved" and getattr(prob, "objective", None) is not None
    )
    if status_name not in ("Optimal",):
        issues.append(f"求解状态：{status_name}")

    assignments: List[BoxAssignment] = []
    if feasible:
        slot_to_box: Dict[int, int] = {}
        for j in J:
            if pulp.value(z[j]) > 0.5:
                for bi in range(len(boxes)):
                    if pulp.value(y[(j, bi)]) > 0.5:
                        slot_to_box[j] = bi
                        break
        # 按 (slot, sku) 聚合
        agg: Dict[Tuple[int, str], Dict[str, Any]] = {}
        for (i, j, bi, o), var in x.items():
            if pulp.value(var) > 0.5:
                key = (j, units[i].sku_id)
                rec = agg.setdefault(
                    key,
                    {
                        "qty": 0,
                        "orientation": o,
                        "box_id": boxes[bi].box_id,
                        "box_name": boxes[bi].name,
                        "sku_id": units[i].sku_id,
                        "warnings": [],
                        "weight": 0.0,
                        "vol": 0.0,
                    },
                )
                rec["qty"] += 1
                rec["weight"] += units[i].weight
                rec["vol"] += _volume(units[i])
                if units[i].fragile:
                    rec["warnings"].append(
                        f"含易碎品，承重上限 {units[i].bearing_capacity_kg}"
                    )
                if not units[i].rotation_allowed:
                    rec["warnings"].append("旋转受限，仅按原方向装载")
        # 统计每 slot 的总体积/重量
        slot_vol: Dict[int, float] = {}
        slot_weight: Dict[int, float] = {}
        for (j, sku), rec in agg.items():
            slot_vol[j] = slot_vol.get(j, 0.0) + rec["vol"]
            slot_weight[j] = slot_weight.get(j, 0.0) + rec["weight"]
        for (j, sku), rec in agg.items():
            bi = slot_to_box[j]
            b = boxes[bi]
            assignments.append(
                BoxAssignment(
                    box_id=rec["box_id"],
                    box_name=rec["box_name"],
                    sku_id=rec["sku_id"],
                    qty=rec["qty"],
                    orientation=rec["orientation"],
                    packed_volume_cm3=round(rec["vol"], 2),
                    box_used_volume_cm3=round(slot_vol[j], 2),
                    box_total_volume_cm3=round(_box_volume(b), 2),
                    weight_in_box_kg=round(slot_weight[j], 3),
                    warnings=rec["warnings"],
                )
            )

        total_cost = round(
            sum(b.cost for j in slot_to_box for b in [boxes[slot_to_box[j]]]), 2
        )
        split_penalty_total = round(
            constraints.split_penalty * len(slot_to_box), 2
        )
        obj = round(total_cost + split_penalty_total, 4)
    else:
        total_cost = 0.0
        split_penalty_total = 0.0
        obj = 0.0

    explanations: List[ConstraintExplanation] = []
    if feasible:
        explanations.append(
            ConstraintExplanation(
                constraint="objective",
                description="目标 = 箱型成本 + 拆箱惩罚",
                active=True,
                detail=f"成本 {total_cost} + 拆箱惩罚 {split_penalty_total} = {obj}",
            )
        )
    explanations.append(
        ConstraintExplanation(
            constraint="rotation", description="旋转限制", active=True,
            detail="未开启旋转的 SKU 仅使用 LxWxH",
        )
    )
    explanations.append(
        ConstraintExplanation(
            constraint="fragile_bearing",
            description="易碎承重",
            active=True,
            detail="易碎品上方承重不得超过 bearing_capacity_kg",
        )
    )
    explanations.append(
        ConstraintExplanation(
            constraint="split_penalty",
            description="拆箱成本",
            active=True,
            detail=f"每多开一箱惩罚 {constraints.split_penalty} 元",
        )
    )

    return RecommendReport(
        order_id=order_id,
        feasible=feasible,
        objective_value=obj,
        boxes_opened=len(set(a.box_id + "#" + str(i) for i, a in enumerate(assignments))) if feasible else 0,
        total_cost=total_cost,
        split_penalty_total=split_penalty_total,
        assignments=assignments,
        explanations=explanations,
        issues=issues,
        trace={
            "solver_status": status_name,
            "num_items": n,
            "num_box_types": len(boxes),
            "split_penalty": constraints.split_penalty,
        },
    )

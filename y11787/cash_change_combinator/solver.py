from __future__ import annotations

from models import ChangeWarning, Combination, SolveResult, WarningKind


def solve(
    amount: int,
    denominations: list[int],
    inventory: dict[int, int],
) -> SolveResult:
    warnings: list[ChangeWarning] = []
    sorted_denoms = sorted(denominations, reverse=True)

    feasible = _find_all_combinations(amount, sorted_denoms, inventory)

    if not feasible:
        warnings.append(
            ChangeWarning(
                kind=WarningKind.INSUFFICIENT_INVENTORY,
                message=f"无法用当前库存凑出应找金额 {amount}",
            )
        )
        return SolveResult(feasible=[], optimal=[], warnings=warnings)

    min_count = min(c.total_count for c in feasible)
    optimal = [c for c in feasible if c.total_count == min_count]

    if len(optimal) > 1:
        descs = [str(c) for c in optimal]
        warnings.append(
            ChangeWarning(
                kind=WarningKind.TIED_OPTIMAL,
                message=(
                    f"最优解并列（最少 {min_count} 张），共 {len(optimal)} 种组合: "
                    + "; ".join(descs)
                ),
            )
        )

    return SolveResult(feasible=feasible, optimal=optimal, warnings=warnings)


def _find_all_combinations(
    amount: int,
    sorted_denoms: list[int],
    inventory: dict[int, int],
) -> list[Combination]:
    results: list[Combination] = []
    current: dict[int, int] = {d: 0 for d in sorted_denoms}
    _backtrack(amount, sorted_denoms, inventory, 0, current, results)
    return results


def _backtrack(
    remaining: int,
    sorted_denoms: list[int],
    inventory: dict[int, int],
    idx: int,
    current: dict[int, int],
    results: list[Combination],
) -> None:
    if remaining == 0:
        counts = {d: current[d] for d in sorted_denoms}
        total = sum(counts.values())
        results.append(Combination(counts=counts, total_count=total))
        return

    if idx >= len(sorted_denoms):
        return

    denom = sorted_denoms[idx]
    max_use = min(remaining // denom, inventory.get(denom, 0))

    for count in range(max_use, -1, -1):
        current[denom] = count
        _backtrack(remaining - denom * count, sorted_denoms, inventory, idx + 1, current, results)

    current[denom] = 0


def solve_with_dp(
    amount: int,
    denominations: list[int],
    inventory: dict[int, int],
) -> SolveResult:
    sorted_denoms = sorted(denominations, reverse=True)
    warnings: list[ChangeWarning] = []

    dp_min: list[float | int] = [float("inf")] * (amount + 1)
    dp_min[0] = 0
    dp_prev: list[tuple[int, int] | None] = [None] * (amount + 1)

    for denom in sorted_denoms:
        limit = inventory.get(denom, 0)
        for _ in range(limit):
            for a in range(amount, denom - 1, -1):
                if dp_min[a - denom] + 1 < dp_min[a]:
                    dp_min[a] = dp_min[a - denom] + 1
                    dp_prev[a] = (a - denom, denom)

    if dp_min[amount] == float("inf"):
        warnings.append(
            ChangeWarning(
                kind=WarningKind.INSUFFICIENT_INVENTORY,
                message=f"无法用当前库存凑出应找金额 {amount}",
            )
        )
        return SolveResult(feasible=[], optimal=[], warnings=warnings)

    optimal_combos = _reconstruct_optimal(amount, dp_min, dp_prev, sorted_denoms)

    all_combos = _find_all_combinations(amount, sorted_denoms, inventory)

    min_count = int(dp_min[amount])
    optimal = [c for c in all_combos if c.total_count == min_count]

    if len(optimal) > 1:
        descs = [str(c) for c in optimal]
        warnings.append(
            ChangeWarning(
                kind=WarningKind.TIED_OPTIMAL,
                message=(
                    f"最优解并列（最少 {min_count} 张），共 {len(optimal)} 种组合: "
                    + "; ".join(descs)
                ),
            )
        )

    return SolveResult(feasible=all_combos, optimal=optimal, warnings=warnings)


def _reconstruct_optimal(
    amount: int,
    dp_min: list[float | int],
    dp_prev: list[tuple[int, int] | None],
    sorted_denoms: list[int],
) -> list[Combination]:
    counts: dict[int, int] = {d: 0 for d in sorted_denoms}
    a = amount
    while a > 0:
        prev_info = dp_prev[a]
        if prev_info is None:
            break
        prev_a, denom = prev_info
        counts[denom] += 1
        a = prev_a

    total = sum(counts.values())
    return [Combination(counts=counts, total_count=total)]

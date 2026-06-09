from __future__ import annotations

import math
from typing import Optional

from .models import ChartSnapshot


class ChartDiff:
    @staticmethod
    def compare(before: Optional[ChartSnapshot], after: Optional[ChartSnapshot]) -> dict:
        result: dict = {
            "compared": False,
            "before_points": 0,
            "after_points": 0,
            "common_keys": [],
            "added_keys": [],
            "removed_keys": [],
            "deltas": {},
            "reversal_count": 0,
        }
        if before is None and after is None:
            return result
        before_pts = before.points if before else {}
        after_pts = after.points if after else {}
        result["before_points"] = len(before_pts)
        result["after_points"] = len(after_pts)
        keys_before = set(before_pts.keys())
        keys_after = set(after_pts.keys())
        result["common_keys"] = sorted(keys_before & keys_after)
        result["added_keys"] = sorted(keys_after - keys_before)
        result["removed_keys"] = sorted(keys_before - keys_after)
        result["compared"] = True
        for k in result["common_keys"]:
            a = before_pts[k]
            b = after_pts[k]
            dx = b[0] - a[0]
            dy = b[1] - a[1]
            dist = math.hypot(dx, dy)
            result["deltas"][k] = {"dx": dx, "dy": dy, "distance": dist}
            if (dx * dx + dy * dy) > 0.01:
                result["reversal_count"] += 1
        return result

    @staticmethod
    def delta_for_item(comparison: dict, item_id: str) -> Optional[tuple[float, float]]:
        deltas = comparison.get("deltas", {})
        if item_id in deltas:
            d = deltas[item_id]
            return (d["dx"], d["dy"])
        return None

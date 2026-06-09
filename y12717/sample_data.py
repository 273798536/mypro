"""可复现的批量样例

包含：
- 正常样例：天气模型、课堂出勤率、赌徒破产（3 状态版）
- 边界样例：空状态、矩阵维度不匹配、非随机矩阵、初始分布写错状态名
"""

from __future__ import annotations

from typing import List, Dict, Any


def build_batch_cases() -> List[Dict[str, Any]]:
    """返回一批样例，每条 dict 可直接喂给 BatchProcessor.add_case"""

    cases: List[Dict[str, Any]] = []

    # ---------- 例 1：天气模型（经典、正常） ----------
    cases.append({
        "label": "天气模型（晴-阴-雨）",
        "states": ["晴天", "阴天", "雨天"],
        "transition_matrix": [
            [0.6, 0.3, 0.1],
            [0.2, 0.5, 0.3],
            [0.1, 0.4, 0.5],
        ],
        "initial_dist": {"晴天": 0.5, "阴天": 0.3, "雨天": 0.2},
    })

    # ---------- 例 2：课堂出勤（两状态，简单） ----------
    cases.append({
        "label": "课堂出勤（出席/缺席）",
        "states": ["出席", "缺席"],
        "transition_matrix": [
            [0.9, 0.1],
            [0.6, 0.4],
        ],
        "initial_dist": {"出席": 0.95, "缺席": 0.05},
    })

    # ---------- 例 3：赌徒破产（3 状态，正常） ----------
    cases.append({
        "label": "赌徒资本（0 元 / 1 元 / 2 元）",
        "states": ["破产(0元)", "持有1元", "赢满(2元)"],
        "transition_matrix": [
            [1.0, 0.0, 0.0],
            [0.5, 0.0, 0.5],
            [0.0, 0.0, 1.0],
        ],
        "initial_dist": {"持有1元": 1.0},
    })

    # ---------- 例 4：网站用户行为（多状态，正常） ----------
    cases.append({
        "label": "网站用户行为路径",
        "states": ["首页", "商品页", "购物车", "结算", "离开"],
        "transition_matrix": [
            [0.1, 0.5, 0.1, 0.05, 0.25],
            [0.15, 0.2, 0.35, 0.1, 0.2],
            [0.05, 0.2, 0.25, 0.35, 0.15],
            [0.0, 0.0, 0.1, 0.7, 0.2],
            [0.0, 0.0, 0.0, 0.0, 1.0],
        ],
        "initial_dist": {"首页": 1.0},
    })

    # ---------- 例 5：边界 - 空状态集合（应失败） ----------
    cases.append({
        "label": "异常样例：空状态",
        "states": [],
        "transition_matrix": [],
        "initial_dist": None,
    })

    # ---------- 例 6：边界 - 转移矩阵维度不匹配（应失败） ----------
    cases.append({
        "label": "异常样例：矩阵维度错",
        "states": ["A", "B", "C"],
        "transition_matrix": [
            [0.5, 0.5],
            [0.3, 0.7],
        ],
        "initial_dist": {"A": 1.0},
    })

    # ---------- 例 7：边界 - 某行和不为 1（应失败） ----------
    cases.append({
        "label": "异常样例：行和不等于1",
        "states": ["低", "中", "高"],
        "transition_matrix": [
            [0.6, 0.3, 0.1],
            [0.2, 0.5, 0.2],
            [0.1, 0.1, 0.1],  # 和为 0.3，错误
        ],
        "initial_dist": {"中": 1.0},
    })

    # ---------- 例 8：边界 - 初始分布引用不存在的状态（应失败） ----------
    cases.append({
        "label": "异常样例：初始状态名错",
        "states": ["正常", "故障"],
        "transition_matrix": [
            [0.95, 0.05],
            [0.4, 0.6],
        ],
        "initial_dist": {"正长": 1.0},  # 错别字
    })

    return cases


if __name__ == "__main__":
    for c in build_batch_cases():
        print(f"- {c['label']}  (状态数={len(c['states'])})")

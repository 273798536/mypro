import itertools
from typing import List, Dict, Tuple
from .models import Question, WeightRecord, ComboItem, ExtrapolationError


class ComboCounter:
    def __init__(
        self,
        max_combo_size: int = 3,
        weight_bounds: Tuple[float, float] = (0.0, 100.0),
        count_bounds: Tuple[int, int] = (1, 10000),
    ):
        self.max_combo_size = max_combo_size
        self.weight_bounds = weight_bounds
        self.count_bounds = count_bounds
        self.errors: List[ExtrapolationError] = []

    def _validate_extrapolation(self, qid: str, weight: float) -> None:
        lower, upper = self.weight_bounds
        if weight < lower or weight > upper:
            error = ExtrapolationError(
                qid=qid,
                field_name="weight",
                current_value=weight,
                lower_bound=lower,
                upper_bound=upper,
                message=(
                    f"[外推越界] 题目[{qid}] 权重={weight} 超出有效范围 [{lower}, {upper}]。"
                    f"卡壳点：权重外推时未做边界裁剪，原始值保留但标记异常。"
                ),
            )
            self.errors.append(error)

    def _validate_count(self, qid: str, count: int) -> None:
        lower, upper = self.count_bounds
        if count < lower or count > upper:
            error = ExtrapolationError(
                qid=qid,
                field_name="count",
                current_value=count,
                lower_bound=lower,
                upper_bound=upper,
                message=(
                    f"[外推越界] 题目[{qid}] 出现次数={count} 超出有效范围 [{lower}, {upper}]。"
                    f"卡壳点：出现次数异常，可能是脏数据或外推越界。"
                ),
            )
            self.errors.append(error)

    def count(
        self,
        questions: List[Question],
        weights: Dict[str, WeightRecord],
        occurrence_counts: Dict[str, int],
    ) -> Tuple[List[ComboItem], List[ExtrapolationError]]:
        self.errors = []
        qid_to_q = {q.qid: q for q in questions}

        for qid, count in occurrence_counts.items():
            self._validate_count(qid, count)
            if qid in weights:
                self._validate_extrapolation(qid, weights[qid].weight)

        combo_items: List[ComboItem] = []

        for size in range(1, self.max_combo_size + 1):
            for combo in itertools.combinations(qid_to_q.keys(), size):
                combo_id = "+".join(sorted(combo))

                combined_weight = 0.0
                has_error = False
                for qid in combo:
                    if qid in weights:
                        w = weights[qid].weight
                        if w < self.weight_bounds[0] or w > self.weight_bounds[1]:
                            has_error = True
                        combined_weight += w

                count = min(
                    (occurrence_counts.get(qid, 0) for qid in combo),
                    default=0,
                )

                status = "error" if has_error else "normal"

                combo_items.append(
                    ComboItem(
                        combo_id=combo_id,
                        question_ids=list(combo),
                        combined_weight=combined_weight,
                        count=count,
                        status=status,
                    )
                )

        return combo_items, self.errors

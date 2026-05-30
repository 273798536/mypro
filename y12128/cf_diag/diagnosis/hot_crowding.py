from cf_diag.core.models import DiagnosisResult

HOT_CROWDING_THRESHOLD = 0.6


def detect_hot_crowding(store, top_n: int = 5) -> list[DiagnosisResult]:
    counts = store.get_item_interaction_count()
    if not counts:
        return []

    total = sum(counts.values())
    sorted_items = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    top_items = sorted_items[:top_n]
    top_total = sum(c for _, c in top_items)
    ratio = top_total / total if total > 0 else 0

    results = []
    if ratio > HOT_CROWDING_THRESHOLD:
        diag = DiagnosisResult(
            diag_type="hot_crowding",
            severity="high" if ratio > 0.8 else "medium",
            details=f"Top{top_n}物品占总交互的{ratio:.1%}（阈值{HOT_CROWDING_THRESHOLD:.0%}），"
                    f"热门物品: {', '.join(iid for iid, _ in top_items)}",
            next_step="增加长尾物品曝光权重或引入探索策略",
            next_contact="推荐策略组负责人",
            item_ids=[iid for iid, _ in top_items],
        )
        store.add_diagnosis(diag)
        results.append(diag)
    return results

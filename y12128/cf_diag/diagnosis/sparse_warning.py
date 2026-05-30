from cf_diag.core.models import DiagnosisResult

SPARSE_RATIO_THRESHOLD = 0.7


def detect_sparse_matrix(store) -> list[DiagnosisResult]:
    if not store.rating_matrix:
        return []

    users = list(store.rating_matrix.keys())
    all_items = store.get_all_items()
    if not users or not all_items:
        return []

    total_cells = len(users) * len(all_items)
    filled_cells = sum(len(ratings) for ratings in store.rating_matrix.values())
    sparsity = 1.0 - (filled_cells / total_cells) if total_cells > 0 else 1.0

    results = []
    if sparsity > SPARSE_RATIO_THRESHOLD:
        diag = DiagnosisResult(
            diag_type="sparse_matrix",
            severity="high" if sparsity > 0.9 else "medium",
            details=f"评分矩阵稀疏度{sparsity:.1%}（阈值{SPARSE_RATIO_THRESHOLD:.0%}），"
                    f"已填{filled_cells}/{total_cells}格，"
                    f"用户数{len(users)}，物品数{len(all_items)}",
            next_step="补充隐式反馈数据或尝试矩阵分解降维",
            next_contact="数据工程组负责人",
        )
        store.add_diagnosis(diag)
        results.append(diag)
    return results

from cf_diag.core.store import DataStore
from cf_diag.importers import (
    import_user_behaviors,
    import_item_tags,
    import_rating_matrix,
    import_exposures,
)
from cf_diag.core.similarity import compute_all_similarities
from cf_diag.core.cold_start import confirm_cold_start, list_pending_cold_starts
from cf_diag.audit.correction import apply_correction
from cf_diag.diagnosis import detect_hot_crowding, detect_sparse_matrix
from cf_diag.diagnosis.routing import build_routing
from cf_diag.report import generate_report, trace_forward, trace_backward
from cf_diag.explain import explain_recommendation
from cf_diag.group_eval import group_evaluate


class CFDiagPipeline:
    def __init__(self):
        self.store = DataStore()

    def load_user_behaviors(self, source) -> "CFDiagPipeline":
        import_user_behaviors(self.store, source)
        return self

    def load_item_tags(self, source) -> "CFDiagPipeline":
        import_item_tags(self.store, source)
        return self

    def load_rating_matrix(self, source) -> "CFDiagPipeline":
        import_rating_matrix(self.store, source)
        return self

    def load_exposures(self, source) -> "CFDiagPipeline":
        import_exposures(self.store, source)
        return self

    def compute_similarities(self) -> "CFDiagPipeline":
        compute_all_similarities(self.store)
        return self

    def run_diagnostics(self) -> "CFDiagPipeline":
        detect_hot_crowding(self.store)
        detect_sparse_matrix(self.store)
        return self

    def apply_correction(
        self, item_a, item_b, method, field, new_value, reason, operator
    ) -> "CFDiagPipeline":
        apply_correction(
            self.store, item_a, item_b, method, field, new_value, reason, operator
        )
        return self

    def confirm_cold_start_item(self, item_id, operator, decision) -> "CFDiagPipeline":
        confirm_cold_start(self.store, item_id, operator, decision)
        return self

    def generate_report(self, output_path=None) -> str:
        return generate_report(self.store, output_path)

    def trace_forward(self, user_id) -> list:
        return trace_forward(self.store, user_id)

    def trace_backward(self, item_id) -> dict:
        return trace_backward(self.store, item_id)

    def explain(self, item_id) -> dict:
        return explain_recommendation(self.store, item_id)

    def evaluate_groups(self) -> dict:
        return group_evaluate(self.store)

    def get_pending_cold_starts(self) -> list:
        return list_pending_cold_starts(self.store)

    def get_routings(self) -> list:
        return build_routing(self.store)

    def get_exposure_impact(self) -> list:
        return self.store.get_changed_after_exposure()

import json
from typing import List, Dict, Optional, Any, Tuple
from dataclasses import dataclass, field
from pathlib import Path

from ..db.dal import (
    add_model, add_eval_run, add_eval_sample, get_samples,
    upsert_manual_judgment, get_manual_judgment, flag_contamination,
    compute_and_save_run_metrics, get_run_metrics, get_run_detail,
    compare_runs, get_eval_runs, add_run_metric, get_all_models
)
from ..db.schema import init_db


@dataclass
class SampleSpec:
    sample_id: str
    query_text: str
    expected_result: str
    actual_result: str
    score_old: float
    score_new: float
    true_label: int
    is_boundary: bool = False
    source_file: str = ""
    source_row: Optional[int] = None
    raw_object: Optional[Dict] = None
    is_contaminated: bool = False
    contamination_type: str = ""
    contamination_desc: str = ""
    manual_label: Optional[int] = None
    manual_reason: str = ""
    manual_judge: str = ""


class VectorIndexTrackerTask:

    def __init__(self, task_name: str = "向量索引任务追踪"):
        init_db()
        self.task_name = task_name
        self.model_id_old: Optional[int] = None
        self.model_id_new: Optional[int] = None
        self.run_id_old: Optional[int] = None
        self.run_id_new: Optional[int] = None
        self.threshold_old: float = 0.5
        self.threshold_new: float = 0.5
        self._samples: List[SampleSpec] = []

    # ---------- 模型 & 运行注册 ----------
    def register_models(
        self,
        old_name: str, old_version: str,
        new_name: str, new_version: str,
        old_desc: str = "", new_desc: str = ""
    ) -> Tuple[int, int]:
        self.model_id_old = add_model(old_name, old_version, old_desc)
        self.model_id_new = add_model(new_name, new_version, new_desc)
        return self.model_id_old, self.model_id_new

    def register_runs(
        self,
        threshold_old: float = 0.5,
        threshold_new: float = 0.5,
        dataset_name: str = "现场评测集_混合版",
        run_desc_old: str = "旧版模型基线跑",
        run_desc_new: str = "新版模型对比跑"
    ) -> Tuple[int, int]:
        if self.model_id_old is None or self.model_id_new is None:
            raise RuntimeError("请先调用 register_models 注册模型")
        self.threshold_old = threshold_old
        self.threshold_new = threshold_new
        self.run_id_old = add_eval_run(
            model_id=self.model_id_old,
            run_name=f"{self.task_name}_旧版_{Path(dataset_name).stem}",
            threshold=threshold_old,
            dataset_name=dataset_name,
            description=run_desc_old
        )
        self.run_id_new = add_eval_run(
            model_id=self.model_id_new,
            run_name=f"{self.task_name}_新版_{Path(dataset_name).stem}",
            threshold=threshold_new,
            dataset_name=dataset_name,
            description=run_desc_new
        )
        return self.run_id_old, self.run_id_new

    # ---------- 样本注入 ----------
    def add_sample_spec(self, spec: SampleSpec):
        self._samples.append(spec)

    def add_sample_specs(self, specs: List[SampleSpec]):
        self._samples.extend(specs)

    def _predict_label(self, score: float, threshold: float) -> int:
        return 1 if score >= threshold else 0

    def inject_all_samples(self):
        if self.run_id_old is None or self.run_id_new is None:
            raise RuntimeError("请先调用 register_runs 注册运行")
        for spec in self._samples:
            pred_old = self._predict_label(spec.score_old, self.threshold_old)
            add_eval_sample(
                run_id=self.run_id_old,
                sample_id=spec.sample_id,
                score=spec.score_old,
                predicted_label=pred_old,
                true_label=spec.true_label,
                query_text=spec.query_text,
                expected_result=spec.expected_result,
                actual_result=spec.actual_result,
                is_boundary=spec.is_boundary,
                source_file=spec.source_file,
                source_row=spec.source_row,
                raw_object=spec.raw_object
            )
            pred_new = self._predict_label(spec.score_new, self.threshold_new)
            add_eval_sample(
                run_id=self.run_id_new,
                sample_id=spec.sample_id,
                score=spec.score_new,
                predicted_label=pred_new,
                true_label=spec.true_label,
                query_text=spec.query_text,
                expected_result=spec.expected_result,
                actual_result=spec.actual_result,
                is_boundary=spec.is_boundary,
                source_file=spec.source_file,
                source_row=spec.source_row,
                raw_object=spec.raw_object
            )

    # ---------- 人工判断（跨版本保留） ----------
    def apply_manual_judgments(self):
        for spec in self._samples:
            if spec.manual_label is not None:
                upsert_manual_judgment(
                    sample_id=spec.sample_id,
                    judge_label=spec.manual_label,
                    judge_reason=spec.manual_reason,
                    judge_name=spec.manual_judge
                )

    # ---------- 污染标记（单独拎出） ----------
    def apply_contamination_flags(self):
        if self.run_id_old is None or self.run_id_new is None:
            return
        samples_old = {s["sample_id"]: s for s in get_samples(run_id=self.run_id_old)}
        samples_new = {s["sample_id"]: s for s in get_samples(run_id=self.run_id_new)}
        for spec in self._samples:
            if spec.is_contaminated:
                so = samples_old.get(spec.sample_id)
                sn = samples_new.get(spec.sample_id)
                if so:
                    flag_contamination(
                        sample_db_id=so["id"],
                        run_id=self.run_id_old,
                        contamination_type=spec.contamination_type,
                        description=spec.contamination_desc,
                        flagged_by="现场老师复核"
                    )
                if sn:
                    flag_contamination(
                        sample_db_id=sn["id"],
                        run_id=self.run_id_new,
                        contamination_type=spec.contamination_type,
                        description=spec.contamination_desc,
                        flagged_by="现场老师复核"
                    )

    # ---------- 指标计算 ----------
    def compute_all_metrics(self):
        if self.run_id_old is None or self.run_id_new is None:
            raise RuntimeError("缺少 run_id")
        m_old = compute_and_save_run_metrics(self.run_id_old, self.threshold_old)
        m_new = compute_and_save_run_metrics(self.run_id_new, self.threshold_new)
        return m_old, m_new

    # ---------- 复核执行 ----------
    def execute(
        self,
        specs: List[SampleSpec],
        old_name: str = "vector-index-v1",
        old_version: str = "20250501",
        new_name: str = "vector-index-v2",
        new_version: str = "20260615",
        threshold_old: float = 0.5,
        threshold_new: float = 0.45,
        dataset_name: str = "现场评测集_混合版"
    ):
        self.register_models(old_name, old_version, new_name, new_version)
        self.register_runs(threshold_old, threshold_new, dataset_name)
        self.add_sample_specs(specs)
        self.apply_manual_judgments()
        self.inject_all_samples()
        self.apply_contamination_flags()
        self.compute_all_metrics()
        return self.build_review_report()

    # ---------- 报告生成 ----------
    def _classify_samples(
        self, samples: List[Dict]
    ) -> Dict[str, List[Dict]]:
        normal, boundary, contaminated, judged = [], [], [], []
        for s in samples:
            if s.get("has_contamination"):
                contaminated.append(s)
            elif s.get("is_boundary"):
                boundary.append(s)
            else:
                normal.append(s)
            if s.get("has_manual_judgment"):
                judged.append(s)
        return {
            "normal": normal,
            "boundary": boundary,
            "contaminated": contaminated,
            "judged": judged
        }

    def build_review_report(self) -> Dict:
        if self.run_id_old is None or self.run_id_new is None:
            raise RuntimeError("请先执行 execute 流程")
        samples_old = get_samples(run_id=self.run_id_old)
        samples_new = get_samples(run_id=self.run_id_new)
        class_old = self._classify_samples(samples_old)
        class_new = self._classify_samples(samples_new)
        comparison = compare_runs(self.run_id_old, self.run_id_new)
        metrics_old = get_run_metrics(self.run_id_old)
        metrics_new = get_run_metrics(self.run_id_new)
        run_old = get_run_detail(self.run_id_old)
        run_new = get_run_detail(self.run_id_new)
        return {
            "task_name": self.task_name,
            "threshold": {
                "old": self.threshold_old,
                "new": self.threshold_new,
                "delta": self.threshold_new - self.threshold_old
            },
            "runs": {
                "old": run_old,
                "new": run_new
            },
            "metrics": {
                "old": metrics_old,
                "new": metrics_new,
                "deltas": {
                    k: {"old": metrics_old.get(k, 0.0),
                        "new": metrics_new.get(k, 0.0),
                        "delta": metrics_new.get(k, 0.0) - metrics_old.get(k, 0.0)}
                    for k in set(metrics_old) | set(metrics_new)
                }
            },
            "sample_breakdown": {
                "old": {k: len(v) for k, v in class_old.items()},
                "new": {k: len(v) for k, v in class_new.items()}
            },
            "sample_groups_old": class_old,
            "sample_groups_new": class_new,
            "changed_predictions": comparison["changed_predictions"],
            "samples_only_in_a": comparison["samples_only_in_a"],
            "samples_only_in_b": comparison["samples_only_in_b"],
        }

import uuid
from typing import List, Dict, Any, Optional, Tuple
from .models import (
    DataSource, JudgmentStatus, CalculationRecord,
    QuestionRecord, ImportBatch,
)
from .db import Database


class ParamEngine:
    DIFFICULTY_BOUNDS = (0.0, 1.0)
    DISCRIMINATION_BOUNDS = (0.0, 1.0)
    GUESS_RATE_BOUNDS = (0.0, 1.0)

    def __init__(self, db: Database):
        self.db = db
        self.batch_id = f"calc_{uuid.uuid4().hex[:8]}"

    def run_all(self) -> Dict[str, Any]:
        questions = self.db.get_questions()
        if not questions:
            return {"batch_id": self.batch_id, "total": 0, "calculated": 0, "edge_cases": 0}

        calc_count = 0
        edge_count = 0
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        for q in questions:
            grouped.setdefault(q["question_id"], []).append(q)

        for qid, variants in grouped.items():
            merged = self._merge_variants(qid, variants)
            results = self._calculate_question(qid, merged)
            calc_count += len(results)
            edge_count += sum(1 for r in results if r.is_edge_case)
            for r in results:
                self.db.insert_calculation(r)

        return {
            "batch_id": self.batch_id,
            "total": len(grouped),
            "calculated": calc_count,
            "edge_cases": edge_count,
        }

    def run_question(self, question_id: str) -> List[CalculationRecord]:
        variants = self.db.get_questions(question_id=question_id)
        if not variants:
            return []
        merged = self._merge_variants(question_id, variants)
        results = self._calculate_question(question_id, merged)
        for r in results:
            self.db.insert_calculation(r)
        return results

    # ---------- 多口径合并（历史答案为主线） ----------
    def _merge_variants(
        self, qid: str, variants: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        merged: Dict[str, Any] = {"question_id": qid, "sources": []}
        hist_first = None
        for v in variants:
            src = v["source"]
            merged["sources"].append({
                "source": src,
                "import_batch_id": v.get("import_batch_id"),
                "raw_id": v.get("id"),
            })
            if src == DataSource.HISTORICAL_ANSWERS.value and hist_first is None:
                hist_first = v

        base = hist_first if hist_first else variants[0]
        for field in (
            "difficulty", "discrimination", "guess_rate",
            "correct_count", "total_count", "mistake_count", "answer_text",
        ):
            merged[field] = base.get(field)

        for v in variants:
            if merged.get("difficulty") is None and v.get("difficulty") is not None:
                merged["difficulty"] = v["difficulty"]
            if merged.get("discrimination") is None and v.get("discrimination") is not None:
                merged["discrimination"] = v["discrimination"]
            if merged.get("guess_rate") is None and v.get("guess_rate") is not None:
                merged["guess_rate"] = v["guess_rate"]
            if merged.get("correct_count") is None and v.get("correct_count") is not None:
                merged["correct_count"] = v["correct_count"]
            if merged.get("total_count") is None and v.get("total_count") is not None:
                merged["total_count"] = v["total_count"]
            if merged.get("mistake_count") is None and v.get("mistake_count") is not None:
                merged["mistake_count"] = v["mistake_count"]

        return merged

    # ---------- 题目多参数计算 ----------
    def _calculate_question(
        self, qid: str, merged: Dict[str, Any]
    ) -> List[CalculationRecord]:
        results: List[CalculationRecord] = []
        source_material = self._build_source_trace(merged)

        results.append(self._calc_correct_rate(qid, merged, source_material))
        results.append(self._calc_difficulty(qid, merged, source_material))
        results.append(self._calc_discrimination(qid, merged, source_material))
        results.append(self._calc_guess_rate(qid, merged, source_material))
        return results

    def _build_source_trace(self, merged: Dict[str, Any]) -> str:
        parts = []
        for s in merged.get("sources", []):
            parts.append(f"{s['source']}@{s.get('import_batch_id', '?')}")
        return "; ".join(parts)

    # ---------- 各参数计算函数 ----------
    def _calc_correct_rate(
        self, qid: str, merged: Dict[str, Any], source_material: str
    ) -> CalculationRecord:
        param = "correct_rate"
        correct = merged.get("correct_count")
        total = merged.get("total_count")
        mistake = merged.get("mistake_count")

        formula_before = "correct_rate = correct_count / total_count"
        raw_value: Optional[float] = None
        judgment_before = JudgmentStatus.PENDING
        explanation_before = "待计算"
        is_edge = False
        edge_type = None
        edge_detail = None

        if correct is not None and total is not None and total == 0:
            raw_value = None
            judgment_before = JudgmentStatus.EDGE_CASE
            explanation_before = "分母为零：总答题人数为 0，无法计算正确率"
            is_edge = True
            edge_type = "division_by_zero"
            edge_detail = (
                f"除零边界：total_count=0, correct_count={correct}, "
                f"mistake_count={mistake}。来源材料：{source_material}"
            )
        elif correct is not None and total is not None and total > 0:
            raw_value = correct / total
            judgment_before = self._judge_rate(raw_value, "correct_rate")
            explanation_before = f"正确率 = {correct} / {total} = {raw_value:.4f}"
        elif mistake is not None and total is not None and total > 0:
            correct_est = max(total - mistake, 0)
            raw_value = correct_est / total
            judgment_before = self._judge_rate(raw_value, "correct_rate")
            explanation_before = (
                f"正确率（由错题反推）= ({total} - {mistake}) / {total} = {raw_value:.4f}"
            )
            formula_before = "correct_rate = (total_count - mistake_count) / total_count"
        elif correct is None and total is None:
            raw_value = None
            judgment_before = JudgmentStatus.NEEDS_REVIEW
            explanation_before = "缺少正确人数/总人数/错题人数，无法计算正确率（学生错题可能缺失）"
            is_edge = True
            edge_type = "missing_data"
            edge_detail = f"缺少学生答题统计。来源材料：{source_material}"

        adjusted_value = raw_value
        formula_after = formula_before
        judgment_after = judgment_before
        explanation_after = explanation_before

        if raw_value is not None and (raw_value < 0 or raw_value > 1):
            is_edge = True
            edge_type = "extrapolation_out_of_bounds"
            old_raw = raw_value
            adjusted_value = max(0.0, min(1.0, raw_value))
            judgment_before = JudgmentStatus.EDGE_CASE
            judgment_after = self._judge_rate(adjusted_value, "correct_rate")
            formula_after = "correct_rate = clamp(correct_count / total_count, 0, 1)"
            explanation_before = (
                f"外推越界：计算值 {raw_value:.4f} 超出 [0,1] 区间，原始：{formula_before}"
            )
            explanation_after = (
                f"外推修正：clamp({old_raw:.4f}, 0, 1) = {adjusted_value:.4f}，"
                f"判断由 {judgment_before.value} 改为 {judgment_after.value}"
            )
            edge_detail = (
                f"外推越界：原值 {old_raw:.4f} 超出 [0,1] 区间，"
                f"已修正为 {adjusted_value:.4f}。来源材料：{source_material}"
            )

        return CalculationRecord(
            question_id=qid,
            batch_id=self.batch_id,
            parameter_name=param,
            raw_value=raw_value,
            adjusted_value=adjusted_value,
            formula_before=formula_before,
            formula_after=formula_after,
            explanation_before=explanation_before,
            explanation_after=explanation_after,
            judgment_before=judgment_before,
            judgment_after=judgment_after,
            is_edge_case=is_edge,
            edge_type=edge_type,
            edge_detail=edge_detail,
            source_material=source_material,
        )

    def _calc_difficulty(
        self, qid: str, merged: Dict[str, Any], source_material: str
    ) -> CalculationRecord:
        param = "difficulty"
        diff = merged.get("difficulty")
        correct = merged.get("correct_count")
        total = merged.get("total_count")

        formula_before = "difficulty = p_value (来自历史答案)"
        raw_value = diff
        judgment_before = JudgmentStatus.PENDING
        explanation_before = "待计算"
        is_edge = False
        edge_type = None
        edge_detail = None

        if raw_value is None and correct is not None and total is not None and total > 0:
            raw_value = correct / total
            formula_before = "difficulty = correct_count / total_count (由答题数据反推)"
        elif raw_value is None and (correct is None or total is None or total == 0):
            if total == 0 and correct is not None:
                is_edge = True
                edge_type = "division_by_zero"
                edge_detail = (
                    f"除零边界：总人数为 0，无法由答题数据反推难度。"
                    f"来源材料：{source_material}"
                )
                explanation_before = "除零边界：总答题人数为 0"
                judgment_before = JudgmentStatus.EDGE_CASE
            else:
                explanation_before = "缺少难度参数及答题统计，无法计算"
                judgment_before = JudgmentStatus.NEEDS_REVIEW
                is_edge = True
                edge_type = "missing_data"
                edge_detail = f"缺少难度数据。来源材料：{source_material}"
            adjusted_value = None
            return CalculationRecord(
                question_id=qid,
                batch_id=self.batch_id,
                parameter_name=param,
                raw_value=raw_value,
                adjusted_value=adjusted_value,
                formula_before=formula_before,
                formula_after=formula_before,
                explanation_before=explanation_before,
                explanation_after=explanation_before,
                judgment_before=judgment_before,
                judgment_after=judgment_before,
                is_edge_case=is_edge,
                edge_type=edge_type,
                edge_detail=edge_detail,
                source_material=source_material,
            )

        judgment_before = self._judge_difficulty(raw_value)
        explanation_before = f"难度 P = {raw_value:.4f}"
        adjusted_value = raw_value
        formula_after = formula_before
        judgment_after = judgment_before
        explanation_after = explanation_before

        lo, hi = self.DIFFICULTY_BOUNDS
        if raw_value < lo or raw_value > hi:
            is_edge = True
            edge_type = "extrapolation_out_of_bounds"
            old_raw = raw_value
            adjusted_value = max(lo, min(hi, raw_value))
            judgment_before = JudgmentStatus.EDGE_CASE
            judgment_after = self._judge_difficulty(adjusted_value)
            formula_after = f"difficulty = clamp(p_value, {lo}, {hi})"
            explanation_before = (
                f"外推越界：难度 {raw_value:.4f} 超出 [{lo}, {hi}] 区间"
            )
            explanation_after = (
                f"外推修正：clamp({old_raw:.4f}, {lo}, {hi}) = {adjusted_value:.4f}，"
                f"判断由 {judgment_before.value} 改为 {judgment_after.value}"
            )
            edge_detail = (
                f"外推越界：难度原值 {old_raw:.4f}，已修正为 {adjusted_value:.4f}。"
                f"来源材料：{source_material}"
            )

        return CalculationRecord(
            question_id=qid,
            batch_id=self.batch_id,
            parameter_name=param,
            raw_value=raw_value,
            adjusted_value=adjusted_value,
            formula_before=formula_before,
            formula_after=formula_after,
            explanation_before=explanation_before,
            explanation_after=explanation_after,
            judgment_before=judgment_before,
            judgment_after=judgment_after,
            is_edge_case=is_edge,
            edge_type=edge_type,
            edge_detail=edge_detail,
            source_material=source_material,
        )

    def _calc_discrimination(
        self, qid: str, merged: Dict[str, Any], source_material: str
    ) -> CalculationRecord:
        param = "discrimination"
        disc = merged.get("discrimination")

        formula_before = "discrimination = d_value (来自历史答案)"
        raw_value = disc
        judgment_before = JudgmentStatus.PENDING
        explanation_before = "待计算"
        is_edge = False
        edge_type = None
        edge_detail = None

        if raw_value is None:
            explanation_before = "缺少区分度参数，跳过计算"
            judgment_before = JudgmentStatus.NEEDS_REVIEW
            is_edge = True
            edge_type = "missing_data"
            edge_detail = f"缺少区分度数据。来源材料：{source_material}"
            return CalculationRecord(
                question_id=qid,
                batch_id=self.batch_id,
                parameter_name=param,
                raw_value=None,
                adjusted_value=None,
                formula_before=formula_before,
                formula_after=formula_before,
                explanation_before=explanation_before,
                explanation_after=explanation_before,
                judgment_before=judgment_before,
                judgment_after=judgment_before,
                is_edge_case=is_edge,
                edge_type=edge_type,
                edge_detail=edge_detail,
                source_material=source_material,
            )

        judgment_before = self._judge_discrimination(raw_value)
        explanation_before = f"区分度 D = {raw_value:.4f}"
        adjusted_value = raw_value
        formula_after = formula_before
        judgment_after = judgment_before
        explanation_after = explanation_before

        lo, hi = self.DISCRIMINATION_BOUNDS
        if raw_value < lo or raw_value > hi:
            is_edge = True
            edge_type = "extrapolation_out_of_bounds"
            old_raw = raw_value
            adjusted_value = max(lo, min(hi, raw_value))
            judgment_before = JudgmentStatus.EDGE_CASE
            judgment_after = self._judge_discrimination(adjusted_value)
            formula_after = f"discrimination = clamp(d_value, {lo}, {hi})"
            explanation_before = (
                f"外推越界：区分度 {raw_value:.4f} 超出 [{lo}, {hi}] 区间"
            )
            explanation_after = (
                f"外推修正：clamp({old_raw:.4f}, {lo}, {hi}) = {adjusted_value:.4f}，"
                f"判断由 {judgment_before.value} 改为 {judgment_after.value}"
            )
            edge_detail = (
                f"外推越界：区分度原值 {old_raw:.4f}，已修正为 {adjusted_value:.4f}。"
                f"来源材料：{source_material}"
            )

        return CalculationRecord(
            question_id=qid,
            batch_id=self.batch_id,
            parameter_name=param,
            raw_value=raw_value,
            adjusted_value=adjusted_value,
            formula_before=formula_before,
            formula_after=formula_after,
            explanation_before=explanation_before,
            explanation_after=explanation_after,
            judgment_before=judgment_before,
            judgment_after=judgment_after,
            is_edge_case=is_edge,
            edge_type=edge_type,
            edge_detail=edge_detail,
            source_material=source_material,
        )

    def _calc_guess_rate(
        self, qid: str, merged: Dict[str, Any], source_material: str
    ) -> CalculationRecord:
        param = "guess_rate"
        guess = merged.get("guess_rate")
        diff = merged.get("difficulty")

        formula_before = "guess_rate (来自历史答案)"
        raw_value = guess
        judgment_before = JudgmentStatus.PENDING
        explanation_before = "待计算"
        is_edge = False
        edge_type = None
        edge_detail = None

        if raw_value is None and diff is not None:
            raw_value = max(1.0 - diff, 0.0) * 0.5
            formula_before = "guess_rate = max(1 - difficulty, 0) * 0.5 (由难度外推)"
            explanation_before = f"猜测率（由难度外推）= max(1-{diff:.4f},0)*0.5 = {raw_value:.4f}"
        elif raw_value is None:
            explanation_before = "缺少猜测率参数及难度，跳过计算"
            judgment_before = JudgmentStatus.NEEDS_REVIEW
            is_edge = True
            edge_type = "missing_data"
            edge_detail = f"缺少猜测率数据。来源材料：{source_material}"
            return CalculationRecord(
                question_id=qid,
                batch_id=self.batch_id,
                parameter_name=param,
                raw_value=None,
                adjusted_value=None,
                formula_before=formula_before,
                formula_after=formula_before,
                explanation_before=explanation_before,
                explanation_after=explanation_before,
                judgment_before=judgment_before,
                judgment_after=judgment_before,
                is_edge_case=is_edge,
                edge_type=edge_type,
                edge_detail=edge_detail,
                source_material=source_material,
            )
        else:
            explanation_before = f"猜测率 = {raw_value:.4f}"

        judgment_before = self._judge_guess_rate(raw_value)
        adjusted_value = raw_value
        formula_after = formula_before
        judgment_after = judgment_before
        explanation_after = explanation_before

        lo, hi = self.GUESS_RATE_BOUNDS
        if raw_value < lo or raw_value > hi:
            is_edge = True
            edge_type = "extrapolation_out_of_bounds"
            old_raw = raw_value
            adjusted_value = max(lo, min(hi, raw_value))
            judgment_before = JudgmentStatus.EDGE_CASE
            judgment_after = self._judge_guess_rate(adjusted_value)
            formula_after = f"guess_rate = clamp(guess_value, {lo}, {hi})"
            explanation_before = (
                f"外推越界：猜测率 {raw_value:.4f} 超出 [{lo}, {hi}] 区间"
            )
            explanation_after = (
                f"外推修正：clamp({old_raw:.4f}, {lo}, {hi}) = {adjusted_value:.4f}，"
                f"判断由 {judgment_before.value} 改为 {judgment_after.value}"
            )
            edge_detail = (
                f"外推越界：猜测率原值 {old_raw:.4f}，已修正为 {adjusted_value:.4f}。"
                f"来源材料：{source_material}"
            )

        return CalculationRecord(
            question_id=qid,
            batch_id=self.batch_id,
            parameter_name=param,
            raw_value=raw_value,
            adjusted_value=adjusted_value,
            formula_before=formula_before,
            formula_after=formula_after,
            explanation_before=explanation_before,
            explanation_after=explanation_after,
            judgment_before=judgment_before,
            judgment_after=judgment_after,
            is_edge_case=is_edge,
            edge_type=edge_type,
            edge_detail=edge_detail,
            source_material=source_material,
        )

    # ---------- 判断函数 ----------
    def _judge_rate(self, value: float, kind: str) -> JudgmentStatus:
        if value >= 0.9:
            return JudgmentStatus.NEEDS_REVIEW
        if value >= 0.6:
            return JudgmentStatus.ACCEPTED
        if value >= 0.3:
            return JudgmentStatus.ACCEPTED
        return JudgmentStatus.NEEDS_REVIEW

    def _judge_difficulty(self, value: float) -> JudgmentStatus:
        if 0.3 <= value <= 0.8:
            return JudgmentStatus.ACCEPTED
        if value < 0.2 or value > 0.9:
            return JudgmentStatus.NEEDS_REVIEW
        return JudgmentStatus.ACCEPTED

    def _judge_discrimination(self, value: float) -> JudgmentStatus:
        if value >= 0.4:
            return JudgmentStatus.ACCEPTED
        if value >= 0.2:
            return JudgmentStatus.ACCEPTED
        return JudgmentStatus.NEEDS_REVIEW

    def _judge_guess_rate(self, value: float) -> JudgmentStatus:
        if value <= 0.25:
            return JudgmentStatus.ACCEPTED
        if value <= 0.4:
            return JudgmentStatus.ACCEPTED
        return JudgmentStatus.NEEDS_REVIEW

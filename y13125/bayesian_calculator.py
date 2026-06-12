from typing import Optional, List, Dict, Any
from datetime import datetime
import math

from models import (
    BayesianInput,
    BayesianResult,
    CalculationStatus,
    ExtrapolationTrace,
    HistoryRecord,
    AnswerVersion,
)


class BayesianCalculator:
    PROBABILITY_MIN = 0.0
    PROBABILITY_MAX = 1.0
    EXTRAPOLATION_TOLERANCE = 0.001

    def calculate(self, input_data: BayesianInput, record: HistoryRecord) -> BayesianResult:
        calculation_log: List[str] = []
        is_extrapolated = False
        extrapolation_trace: Optional[ExtrapolationTrace] = None

        calculation_log.append(f"开始计算记录 {input_data.record_id} 的贝叶斯后验概率")
        calculation_log.append(f"输入参数: 先验={input_data.prior_probability}, "
                              f"似然={input_data.likelihood}, "
                              f"边际似然={input_data.marginal_likelihood}")

        if self._is_empty_input(input_data):
            calculation_log.append("检测到空集合输入，中止计算")
            return BayesianResult(
                posterior_probability=0.0,
                calculation_status=CalculationStatus.EMPTY_INPUT,
                record_id=input_data.record_id,
                question_id=input_data.question_id,
                prior=input_data.prior_probability,
                likelihood=input_data.likelihood,
                evidence=input_data.marginal_likelihood,
                calculation_log=calculation_log,
                raw_formula="P(A|B) = P(B|A) * P(A) / P(B) [未执行 - 空输入]",
            )

        validated_prior, trace_prior = self._validate_and_extrapolate(
            input_data.prior_probability, "先验概率", record, "prior"
        )
        validated_likelihood, trace_likelihood = self._validate_and_extrapolate(
            input_data.likelihood, "似然", record, "likelihood"
        )
        validated_evidence, trace_evidence = self._validate_and_extrapolate(
            input_data.marginal_likelihood, "边际似然", record, "evidence"
        )

        if trace_prior:
            is_extrapolated = True
            extrapolation_trace = trace_prior
            calculation_log.append(f"先验概率外推越界: {trace_prior.original_claim}")
        if trace_likelihood:
            is_extrapolated = True
            extrapolation_trace = trace_likelihood
            calculation_log.append(f"似然外推越界: {trace_likelihood.original_claim}")
        if trace_evidence:
            is_extrapolated = True
            extrapolation_trace = trace_evidence
            calculation_log.append(f"边际似然外推越界: {trace_evidence.original_claim}")

        if validated_evidence == 0:
            calculation_log.append("边际似然为0，无法计算")
            return BayesianResult(
                posterior_probability=0.0,
                calculation_status=CalculationStatus.EXTRAPOLATION_ERROR,
                record_id=input_data.record_id,
                question_id=input_data.question_id,
                prior=validated_prior,
                likelihood=validated_likelihood,
                evidence=validated_evidence,
                is_extrapolated=is_extrapolated,
                extrapolation_trace=extrapolation_trace,
                calculation_log=calculation_log,
                raw_formula="P(A|B) = P(B|A) * P(A) / P(B) [未执行 - 分母为0]",
            )

        raw_formula = (
            f"P(A|B) = {validated_likelihood:.6f} * {validated_prior:.6f} / {validated_evidence:.6f}"
        )

        try:
            posterior = (validated_likelihood * validated_prior) / validated_evidence
            calculation_log.append(f"原始计算结果: {posterior:.6f}")

            posterior_clamped = max(self.PROBABILITY_MIN, min(self.PROBABILITY_MAX, posterior))
            if abs(posterior - posterior_clamped) > self.EXTRAPOLATION_TOLERANCE:
                is_extrapolated = True
                calculation_log.append(
                    f"后验概率 {posterior:.6f} 越界，已钳制到 [{self.PROBABILITY_MIN}, {self.PROBABILITY_MAX}]"
                )

                original_claim = self._find_original_claim_for_posterior(record)
                if original_claim:
                    extrapolation_trace = ExtrapolationTrace(
                        original_claim=original_claim["text"],
                        source_version_id=original_claim["version_id"],
                        source_timestamp=original_claim["timestamp"],
                        extrapolated_value=posterior,
                        boundary=self.PROBABILITY_MAX if posterior > self.PROBABILITY_MAX else self.PROBABILITY_MIN,
                        direction="upper" if posterior > self.PROBABILITY_MAX else "lower",
                        trace_path=[
                            f"版本 {original_claim['version_id']}: {original_claim['text']}",
                            f"计算得到后验概率: {posterior:.6f}",
                            f"越界方向: {'超出上限' if posterior > self.PROBABILITY_MAX else '低于下限'}",
                        ],
                    )
                posterior = posterior_clamped

            calculation_status = (
                CalculationStatus.EXTRAPOLATION_ERROR if is_extrapolated else CalculationStatus.SUCCESS
            )

            calculation_log.append(f"最终后验概率: {posterior:.6f}")

            return BayesianResult(
                posterior_probability=posterior,
                calculation_status=calculation_status,
                record_id=input_data.record_id,
                question_id=input_data.question_id,
                prior=validated_prior,
                likelihood=validated_likelihood,
                evidence=validated_evidence,
                is_extrapolated=is_extrapolated,
                extrapolation_trace=extrapolation_trace,
                calculation_log=calculation_log,
                raw_formula=raw_formula,
            )

        except Exception as e:
            calculation_log.append(f"计算异常: {str(e)}")
            return BayesianResult(
                posterior_probability=0.0,
                calculation_status=CalculationStatus.EXTRAPOLATION_ERROR,
                record_id=input_data.record_id,
                question_id=input_data.question_id,
                prior=validated_prior,
                likelihood=validated_likelihood,
                evidence=validated_evidence,
                is_extrapolated=is_extrapolated,
                extrapolation_trace=extrapolation_trace,
                calculation_log=calculation_log,
                raw_formula=raw_formula + f" [异常: {str(e)}]",
            )

    def _is_empty_input(self, input_data: BayesianInput) -> bool:
        return (
            math.isnan(input_data.prior_probability)
            or math.isnan(input_data.likelihood)
            or math.isnan(input_data.marginal_likelihood)
            or (input_data.prior_probability == 0 and input_data.likelihood == 0 and input_data.marginal_likelihood == 0)
        )

    def _validate_and_extrapolate(
        self, value: float, param_name: str, record: HistoryRecord, param_type: str
    ) -> tuple[float, Optional[ExtrapolationTrace]]:
        if value < self.PROBABILITY_MIN or value > self.PROBABILITY_MAX:
            original_claim = self._find_original_claim(record, param_type)
            clamped_value = max(self.PROBABILITY_MIN, min(self.PROBABILITY_MAX, value))

            trace = None
            if original_claim:
                trace = ExtrapolationTrace(
                    original_claim=original_claim["text"],
                    source_version_id=original_claim["version_id"],
                    source_timestamp=original_claim["timestamp"],
                    extrapolated_value=value,
                    boundary=self.PROBABILITY_MAX if value > self.PROBABILITY_MAX else self.PROBABILITY_MIN,
                    direction="upper" if value > self.PROBABILITY_MAX else "lower",
                    trace_path=[
                        f"参数: {param_name}",
                        f"版本 {original_claim['version_id']}: {original_claim['text']}",
                        f"提取值: {value:.6f}",
                        f"越界方向: {'超出上限' if value > self.PROBABILITY_MAX else '低于下限'}",
                        f"已钳制到: {clamped_value:.6f}",
                    ],
                )
            return clamped_value, trace
        return value, None

    def _find_original_claim(self, record: HistoryRecord, param_type: str) -> Optional[Dict[str, Any]]:
        keywords = {
            "prior": ["先验", "prior", "初始概率", "历史概率"],
            "likelihood": ["似然", "likelihood", "条件概率"],
            "evidence": ["边际似然", "evidence", "全概率"],
        }
        search_keywords = keywords.get(param_type, [])

        for version in sorted(record.answer_versions, key=lambda x: x.timestamp, reverse=True):
            for kw in search_keywords:
                if kw in version.answer_text or (version.remark and kw in version.remark):
                    return {
                        "text": version.answer_text,
                        "version_id": version.version_id,
                        "timestamp": version.timestamp,
                        "remark": version.remark,
                    }
        return None

    def _find_original_claim_for_posterior(self, record: HistoryRecord) -> Optional[Dict[str, Any]]:
        keywords = ["后验", "posterior", "结论", "最终概率", "结果"]
        for version in sorted(record.answer_versions, key=lambda x: x.timestamp, reverse=True):
            for kw in keywords:
                if kw in version.answer_text or (version.remark and kw in version.remark):
                    return {
                        "text": version.answer_text,
                        "version_id": version.version_id,
                        "timestamp": version.timestamp,
                        "remark": version.remark,
                    }
        if record.answer_versions:
            latest = record.get_latest_answer()
            if latest:
                return {
                    "text": latest.answer_text,
                    "version_id": latest.version_id,
                    "timestamp": latest.timestamp,
                    "remark": latest.remark,
                }
        return None

    def calculate_for_chart(self, input_data: BayesianInput) -> float:
        return (input_data.likelihood * input_data.prior_probability) / input_data.marginal_likelihood

    def calculate_for_detail(self, input_data: BayesianInput) -> float:
        prior = max(self.PROBABILITY_MIN, min(self.PROBABILITY_MAX, input_data.prior_probability))
        likelihood = max(self.PROBABILITY_MIN, min(self.PROBABILITY_MAX, input_data.likelihood))
        evidence = max(self.PROBABILITY_MIN, min(self.PROBABILITY_MAX, input_data.marginal_likelihood))
        if evidence == 0:
            return 0.0
        return (likelihood * prior) / evidence

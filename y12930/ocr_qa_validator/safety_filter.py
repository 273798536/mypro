"""安全拦截模块 - 坏数据检测、异常值过滤、敏感内容拦截"""

import re
from typing import List, Dict
from .models import Sample, SafetyCheckResult


class SafetyFilter:
    """安全过滤器 - 对 OCR 问答样本进行质量和安全校验"""

    def __init__(self, config: dict):
        self.min_confidence = config.get("min_confidence", 0.6)
        self.max_text_length_ratio = config.get("max_text_length_ratio", 3.0)
        self.min_question_length = config.get("min_question_length", 2)
        self.max_answer_length = config.get("max_answer_length", 2000)
        self.forbidden_keywords = config.get("forbidden_keywords", [])
        self.empty_answer_blocked = config.get("empty_answer_blocked", True)
        self.gibberish_threshold = config.get("gibberish_threshold", 0.3)

    def check(self, sample: Sample) -> SafetyCheckResult:
        """对单条样本执行完整安全检查

        Args:
            sample: 待检查的样本

        Returns:
            SafetyCheckResult 检查结果
        """
        result = SafetyCheckResult()
        blocked_reasons: List[str] = []
        checks: Dict[str, bool] = {}

        # 1. 置信度检查
        confidence_ok = sample.confidence >= self.min_confidence
        checks["confidence"] = confidence_ok
        if not confidence_ok:
            blocked_reasons.append(
                f"置信度过低: {sample.confidence:.2f} (阈值: {self.min_confidence})"
            )

        # 2. 问题长度检查
        q_len = len(sample.question.strip())
        question_len_ok = q_len >= self.min_question_length
        checks["question_length"] = question_len_ok
        if not question_len_ok:
            blocked_reasons.append(
                f"问题过短: {q_len} 字符 (最小: {self.min_question_length})"
            )

        # 3. 答案长度检查
        a_len = len(sample.answer.strip())
        answer_len_ok = a_len <= self.max_answer_length
        checks["answer_length"] = answer_len_ok
        if not answer_len_ok:
            blocked_reasons.append(
                f"答案过长: {a_len} 字符 (最大: {self.max_answer_length})"
            )

        # 4. 空答案检查
        if self.empty_answer_blocked:
            empty_answer = a_len == 0
            checks["empty_answer"] = not empty_answer
            if empty_answer:
                blocked_reasons.append("答案为空")

        # 5. 文本长度比例检查（答案 vs 问题，防止答非所问的异常数据）
        if q_len > 0 and a_len > 0:
            ratio = a_len / q_len
            ratio_ok = ratio <= self.max_text_length_ratio
            checks["length_ratio"] = ratio_ok
            if not ratio_ok:
                blocked_reasons.append(
                    f"答案/问题长度比例异常: {ratio:.1f} (阈值: {self.max_text_length_ratio})"
                )
        else:
            checks["length_ratio"] = True

        # 6. 敏感关键词检查
        has_forbidden = False
        all_text = f"{sample.question} {sample.answer} {sample.context}"
        for keyword in self.forbidden_keywords:
            if keyword in all_text:
                has_forbidden = True
                blocked_reasons.append(f"包含敏感关键词: {keyword}")
                break
        checks["forbidden_keywords"] = not has_forbidden

        # 7. 乱码/乱文检测（基于有效中文字符比例）
        gibberish_ok = not self._is_gibberish(sample.answer)
        checks["gibberish"] = gibberish_ok
        if not gibberish_ok:
            blocked_reasons.append("答案疑似乱码/无效文本")

        # 汇总结果
        result.passed = all(checks.values())
        result.blocked_reasons = blocked_reasons
        result.checks = checks

        if not result.passed:
            high_risk_checks = ["forbidden_keywords", "gibberish"]
            if any(not checks.get(c, True) for c in high_risk_checks):
                result.risk_level = "high"
            elif len(blocked_reasons) >= 3:
                result.risk_level = "high"
            else:
                result.risk_level = "medium"

        return result

    def _is_gibberish(self, text: str) -> bool:
        """简单的乱码/乱文检测

        通过计算有效字符（中文、英文、数字、常见标点）的比例来判断。
        有效字符比例低于阈值视为乱码。
        """
        if not text or not text.strip():
            return False

        total = len(text.strip())
        if total == 0:
            return True

        valid_pattern = re.compile(
            r"[\u4e00-\u9fff"
            r"a-zA-Z0-9"
            r"\s\u3002\uff1f\uff01\uff0c\u3001\uff1b\uff1a"
            r"\u201c\u201d\u2018\u2019"
            r"\uff08\uff09\u300a\u300b\u3010\u3011\u2026\u2014"
            r",.!?;:'\"()<>\[\]\-/"
            r"]"
        )
        valid_chars = len(valid_pattern.findall(text))
        valid_ratio = valid_chars / total

        return valid_ratio < self.gibberish_threshold

    def batch_check(self, samples: List[Sample]) -> List[tuple]:
        """批量检查样本

        Returns:
            [(sample, check_result), ...]
        """
        results = []
        for sample in samples:
            result = self.check(sample)
            results.append((sample, result))
        return results

    def summarize(self, check_results: List[SafetyCheckResult]) -> dict:
        """汇总一批检查结果的统计信息"""
        total = len(check_results)
        passed = sum(1 for r in check_results if r.passed)
        blocked = total - passed

        reason_counts = {}
        for result in check_results:
            for reason in result.blocked_reasons:
                reason_counts[reason] = reason_counts.get(reason, 0) + 1

        risk_distribution = {"low": 0, "medium": 0, "high": 0}
        for result in check_results:
            risk_distribution[result.risk_level] = (
                risk_distribution.get(result.risk_level, 0) + 1
            )

        return {
            "total": total,
            "passed": passed,
            "blocked": blocked,
            "pass_rate": f"{passed/total*100:.1f}%" if total > 0 else "0%",
            "block_reason_counts": sorted(
                reason_counts.items(), key=lambda x: x[1], reverse=True
            ),
            "risk_distribution": risk_distribution,
        }

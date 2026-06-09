from typing import Optional

from .models import StabilityResult, StabilityVerdict, CounterExample


class ResultExplainer:
    def _format_eigenvalues(self, eigenvalues) -> str:
        if not eigenvalues:
            return "无可计算的特征值"

        parts = []
        for i, ev in enumerate(eigenvalues):
            real = ev.real
            imag = ev.imag
            if abs(imag) < 1e-9:
                parts.append(f"λ{i+1}={real:.4f}")
            else:
                parts.append(f"λ{i+1}={real:.4f}{imag:+.4f}i")
        return ", ".join(parts)

    def _verdict_reason(self, result: StabilityResult) -> str:
        if result.verdict == StabilityVerdict.STABLE:
            unstable = [ev for ev in result.eigenvalues if ev.real > 1e-9]
            margin = [ev for ev in result.eigenvalues if abs(ev.real) <= 1e-9]
            if not unstable and not margin:
                return "全部特征值的实部均为负数，根据李雅普诺夫稳定性判据，系统渐近稳定。"
            return "系统稳定。"

        if result.verdict == StabilityVerdict.UNSTABLE:
            unstable = [ev for ev in result.eigenvalues if ev.real > 1e-9]
            if unstable:
                ev_desc = self._format_eigenvalues(unstable)
                return f"检测到正实部特征值（{ev_desc}），根据李雅普诺夫判据，系统不稳定。"
            return "系统不稳定。"

        if result.verdict == StabilityVerdict.UNKNOWN:
            margin = [ev for ev in result.eigenvalues if abs(ev.real) <= 1e-9]
            if margin:
                ev_desc = self._format_eigenvalues(margin)
                return f"存在零实部特征值（{ev_desc}），处于稳定边界，线性近似无法确定，需进一步非线性分析。"
            return "无法明确判定稳定区，建议检查数据或增加约束。"

        if result.verdict == StabilityVerdict.INSUFFICIENT_DATA:
            return "数据不足（空输入或无效系数），无法进行稳定区分析。"

        return "判定理由待补充。"

    def generate_explanation(self, result: StabilityResult) -> str:
        header = f"【问题 {result.problem_id}】稳定区判定结果: {result.verdict.value}"

        eig_line = f"特征值: {self._format_eigenvalues(result.eigenvalues)}"

        reason = self._verdict_reason(result)

        extras = []
        if result.run_count > 1:
            extras.append(f"已重复运行 {result.run_count} 次，最近一次: {result.last_run_at.strftime('%H:%M:%S')}")
        if result.has_supplement:
            extras.append("存在补录数据，建议人工复核。")
        if result.confirmation_status.value != "pending":
            extras.append(f"人工确认状态: {result.confirmation_status.value}")
        if result.review_notes:
            extras.append(f"复核备注: {result.review_notes}")

        parts = [header, eig_line, reason]
        if extras:
            parts.append(" | ".join(extras))

        return "\n".join(parts)

    def generate_counter_example_diff(self, ce: CounterExample) -> str:
        lines = []
        lines.append(f"=== 反例对比（{ce.example_id}） ===")
        lines.append(f"触发约束: {ce.constraint_triggered}")
        lines.append(f"校验前判定: {ce.verdict_before.value}  →  校验后判定: {ce.verdict_after.value}")

        before_str = ", ".join(f"{k}={v}" for k, v in sorted(ce.coefficients_before.items()))
        lines.append(f"校验前系数: {{{before_str}}}")

        if ce.coefficients_after:
            after_str = ", ".join(f"{k}={v}" for k, v in sorted(ce.coefficients_after.items()))
            lines.append(f"校验后系数: {{{after_str}}}")

            changed = []
            all_keys = set(ce.coefficients_before.keys()) | set(ce.coefficients_after.keys())
            for k in sorted(all_keys):
                b = ce.coefficients_before.get(k)
                a = ce.coefficients_after.get(k)
                if b != a:
                    changed.append(f"{k}: {b} → {a}")
            if changed:
                lines.append(f"差异项: {'; '.join(changed)}")

        if ce.explanation:
            lines.append(f"说明: {ce.explanation}")

        return "\n".join(lines)

    def add_explanation_to_result(self, result: StabilityResult) -> StabilityResult:
        result.explanation = self.generate_explanation(result)
        if result.counter_example:
            result.explanation += "\n\n" + self.generate_counter_example_diff(result.counter_example)
        return result

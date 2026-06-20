"""
指标计算模块（公式、单位、边界值显式化）
Compression Metrics

设计核心：
- 每个指标都有公式（LaTeX + 纯文本）、单位、边界值
- 计算过程的中间值保存在derivation中，小许可以一步步核对
- 每次计算都关联日志引用，指出数据来源
"""

from __future__ import annotations

import math
import uuid
from typing import Dict, List, Optional, Tuple

from .models import (
    BoundaryValue,
    MetricWithFormula,
    ProcessingRecord,
    ProcessingStage,
    TrainingLogEntry,
)


class CompressionMetrics:
    """
    模型压缩常用指标集合

    所有指标都带公式、单位、边界值。
    不会只返回一个光秃秃的float。
    """

    def __init__(self) -> None:
        self._records: List[ProcessingRecord] = []
        self._boundary_registry: Dict[str, BoundaryValue] = {}
        self._register_default_boundaries()

    def _register_default_boundaries(self) -> None:
        """默认边界值定义——可被用户覆盖"""
        self._boundary_registry = {
            "kl_divergence": BoundaryValue(
                metric_name="kl_divergence",
                upper=0.05,
                inclusive_upper=False,
                expected_behavior="KL>5%时压缩保真度不足，需回退量化比特数或增加蒸馏温度",
                associated_conclusion_id="CONCL-KL-BOUND",
            ),
            "compression_ratio": BoundaryValue(
                metric_name="compression_ratio",
                lower=2.0,
                inclusive_lower=True,
                expected_behavior="压缩比<2x说明压缩效率不足，需检查剪枝率或量化位宽",
                associated_conclusion_id="CONCL-RATIO-BOUND",
            ),
            "accuracy_drop_percent": BoundaryValue(
                metric_name="accuracy_drop_percent",
                upper=1.0,
                inclusive_upper=True,
                expected_behavior="精度掉点>1%视为异常，需要回放误判样本定位根因",
                associated_conclusion_id="CONCL-ACC-BOUND",
            ),
            "weight_sparsity": BoundaryValue(
                metric_name="weight_sparsity",
                lower=0.0,
                upper=0.99,
                inclusive_lower=True,
                inclusive_upper=True,
                expected_behavior="稀疏度超出[0, 0.99]说明剪枝配置异常",
                associated_conclusion_id="CONCL-SPARSITY-BOUND",
            ),
            "quantization_bits": BoundaryValue(
                metric_name="quantization_bits",
                lower=1,
                upper=32,
                inclusive_lower=True,
                inclusive_upper=True,
                expected_behavior="位宽超出[1,32]为非法配置",
                associated_conclusion_id="CONCL-BITS-BOUND",
            ),
            "distillation_temperature": BoundaryValue(
                metric_name="distillation_temperature",
                lower=0.1,
                upper=20.0,
                inclusive_lower=True,
                inclusive_upper=True,
                expected_behavior="蒸馏温度越界会导致教师信号畸变",
                associated_conclusion_id="CONCL-TEMP-BOUND",
            ),
            "fisher_information_norm": BoundaryValue(
                metric_name="fisher_information_norm",
                lower=1e-6,
                upper=1e3,
                inclusive_lower=False,
                inclusive_upper=True,
                expected_behavior="Fisher范数越界说明该层参数敏感，不应过度剪枝",
                associated_conclusion_id="CONCL-FISHER-BOUND",
            ),
        }

    def override_boundary(self, name: str, boundary: BoundaryValue) -> None:
        """用户自定义/覆盖边界值"""
        self._boundary_registry[name] = boundary

    def get_boundary(self, name: str) -> Optional[BoundaryValue]:
        return self._boundary_registry.get(name)

    def all_boundaries(self) -> Dict[str, BoundaryValue]:
        return dict(self._boundary_registry)

    def _make_record(self, metric_name: str, inputs: Dict, outputs: Dict,
                     log_refs: List[str], derivation: List[str]) -> ProcessingRecord:
        rec = ProcessingRecord(
            record_id=f"METRIC-{uuid.uuid4().hex[:12]}",
            stage=ProcessingStage.METRIC_CALCULATION,
            action=f"计算指标[{metric_name}]",
            inputs=inputs,
            outputs=outputs,
            log_refs=log_refs,
            operator="CompressionMetrics",
            notes=derivation,
        )
        self._records.append(rec)
        return rec

    def _wrap_with_boundary(self, metric: MetricWithFormula) -> MetricWithFormula:
        b = self._boundary_registry.get(metric.name)
        if b is not None:
            metric.boundary = b
            try:
                metric.is_within_bounds = b.contains(metric.value)
            except Exception:
                metric.is_within_bounds = None
        return metric

    # =============== 具体指标 ===============

    def kl_divergence(self, teacher_logits: List[float], student_logits: List[float],
                      temperature: float = 1.0,
                      log_refs: Optional[List[str]] = None,
                      log_entries: Optional[List[TrainingLogEntry]] = None) -> MetricWithFormula:
        """
        KL散度 (Kullback-Leibler Divergence)

        公式: D_KL(P||Q) = Σ P(x) * log(P(x)/Q(x))
        单位: bits/dim (当log以2为底时) 或 nats (自然对数)
        默认边界: < 0.05
        """
        refs = log_refs or ([e.as_reference() for e in log_entries] if log_entries else [])
        derivation: List[str] = []
        inputs = {"temperature": temperature,
                  "teacher_len": len(teacher_logits),
                  "student_len": len(student_logits)}

        if len(teacher_logits) != len(student_logits):
            raise ValueError(f"teacher/student logits维度不一致: {len(teacher_logits)} vs {len(student_logits)}")

        if len(teacher_logits) == 0:
            raise ValueError("logits为空")

        derivation.append(f"输入维度N={len(teacher_logits)}, 温度T={temperature}")

        def softmax(xs: List[float], T: float) -> List[float]:
            scaled = [x / T for x in xs]
            m = max(scaled)
            exps = [math.exp(s - m) for s in scaled]
            s = sum(exps)
            return [e / s for e in exps]

        p = softmax(teacher_logits, temperature)
        q = softmax(student_logits, temperature)

        derivation.append(f"Teacher Softmax[0..2] = {[f'{v:.4f}' for v in p[:3]]}")
        derivation.append(f"Student Softmax[0..2] = {[f'{v:.4f}' for v in q[:3]]}")

        kl = 0.0
        for i, (pi, qi) in enumerate(zip(p, q)):
            if pi <= 0 or qi <= 0:
                continue
            contrib = pi * (math.log(pi) - math.log(qi))
            kl += contrib

        kl_bits = kl / math.log(2)

        derivation.append(f"Σ计算得到自然对数KL = {kl:.6f} nats")
        derivation.append(f"换底为bits: /log(2) 得 {kl_bits:.6f} bits/dim")

        metric = MetricWithFormula(
            name="kl_divergence",
            value=kl_bits,
            unit="bits/dim",
            formula_latex=r"D_{KL}(P \parallel Q) = \sum_{x} P(x) \log_2\left(\frac{P(x)}{Q(x)}\right), \quad P = \mathrm{softmax}(z_t / T), Q = \mathrm{softmax}(z_s / T)",
            formula_plain="D_KL(P||Q) = Σ P(x) * log2(P(x)/Q(x)), P/T分布由logits经softmax(T)得到",
            derivation=derivation,
            used_log_refs=refs,
        )
        self._wrap_with_boundary(metric)
        self._make_record("kl_divergence", inputs,
                          {"value": metric.value, "unit": metric.unit,
                           "within_bounds": metric.is_within_bounds},
                          refs, derivation)
        return metric

    def compression_ratio(self, original_size_bytes: int, compressed_size_bytes: int,
                          log_refs: Optional[List[str]] = None,
                          log_entries: Optional[List[TrainingLogEntry]] = None) -> MetricWithFormula:
        """
        压缩比

        公式: r = 原始大小 / 压缩后大小
        单位: x (倍)
        默认边界: ≥ 2.0
        """
        refs = log_refs or ([e.as_reference() for e in log_entries] if log_entries else [])
        derivation: List[str] = []
        inputs = {"original_size_bytes": original_size_bytes, "compressed_size_bytes": compressed_size_bytes}

        if compressed_size_bytes <= 0:
            raise ValueError(f"压缩后大小非法: {compressed_size_bytes}")

        ratio = original_size_bytes / compressed_size_bytes
        saved_pct = 1.0 - 1.0 / ratio

        derivation.append(f"原始大小 = {original_size_bytes:,} bytes = {original_size_bytes / 1024 / 1024:.2f} MiB")
        derivation.append(f"压缩大小 = {compressed_size_bytes:,} bytes = {compressed_size_bytes / 1024 / 1024:.2f} MiB")
        derivation.append(f"压缩比 = {original_size_bytes} / {compressed_size_bytes} = {ratio:.2f}x")
        derivation.append(f"空间节省 = {saved_pct * 100:.2f}%")

        metric = MetricWithFormula(
            name="compression_ratio",
            value=ratio,
            unit="x",
            formula_latex=r"r = \frac{S_{original}}{S_{compressed}}, \quad \mathrm{saving} = 1 - 1/r",
            formula_plain="r = 原始字节数 / 压缩后字节数, 节省比例 = 1 - 1/r",
            derivation=derivation,
            used_log_refs=refs,
        )
        self._wrap_with_boundary(metric)
        self._make_record("compression_ratio", inputs,
                          {"value": metric.value, "saved_pct": saved_pct,
                           "within_bounds": metric.is_within_bounds},
                          refs, derivation)
        return metric

    def accuracy_drop_percent(self, baseline_acc: float, compressed_acc: float,
                              log_refs: Optional[List[str]] = None,
                              log_entries: Optional[List[TrainingLogEntry]] = None) -> MetricWithFormula:
        """
        精度掉点

        公式: Δacc = baseline_acc - compressed_acc, 以百分数表示
        单位: %
        默认边界: ≤ 1.0%
        """
        refs = log_refs or ([e.as_reference() for e in log_entries] if log_entries else [])
        derivation: List[str] = []
        inputs = {"baseline_acc": baseline_acc, "compressed_acc": compressed_acc}

        if not (0.0 <= baseline_acc <= 1.0 and 0.0 <= compressed_acc <= 1.0):
            derivation.append(f"警告: 输入acc应在[0,1]区间, got baseline={baseline_acc}, compressed={compressed_acc}")

        delta = baseline_acc - compressed_acc  # 小数形式
        delta_pct = delta * 100.0

        derivation.append(f"基线精度 = {baseline_acc * 100:.4f}%")
        derivation.append(f"压缩后精度 = {compressed_acc * 100:.4f}%")
        derivation.append(f"掉点Δacc = ({baseline_acc} - {compressed_acc}) * 100% = {delta_pct:.4f}%")

        metric = MetricWithFormula(
            name="accuracy_drop_percent",
            value=delta,  # 存小数，format_value时乘100
            unit="%",
            formula_latex=r"\Delta \mathrm{acc} = \mathrm{acc}_{baseline} - \mathrm{acc}_{compressed}",
            formula_plain="Δacc% = (基线精度 - 压缩后精度) * 100",
            derivation=derivation,
            used_log_refs=refs,
        )
        self._wrap_with_boundary(metric)
        self._make_record("accuracy_drop_percent", inputs,
                          {"value": delta_pct, "unit": "%",
                           "within_bounds": metric.is_within_bounds},
                          refs, derivation)
        return metric

    def weight_sparsity(self, total_params: int, zero_params: int,
                        log_refs: Optional[List[str]] = None,
                        log_entries: Optional[List[TrainingLogEntry]] = None) -> MetricWithFormula:
        """
        权重稀疏度

        公式: s = zero_params / total_params
        单位: 比例 (format时显示为%)
        默认边界: [0, 0.99]
        """
        refs = log_refs or ([e.as_reference() for e in log_entries] if log_entries else [])
        derivation: List[str] = []
        inputs = {"total_params": total_params, "zero_params": zero_params}

        if total_params <= 0:
            raise ValueError(f"总参数量非法: {total_params}")

        sparsity = zero_params / total_params

        derivation.append(f"总参数量 = {total_params:,}")
        derivation.append(f"零参数量 = {zero_params:,}")
        derivation.append(f"稀疏度 = {zero_params:,} / {total_params:,} = {sparsity * 100:.2f}%")

        metric = MetricWithFormula(
            name="weight_sparsity",
            value=sparsity,
            unit="%",
            formula_latex=r"s = \frac{\|\mathbf{W}\|_0^{zero}}{\|\mathbf{W}\|_0^{total}}",
            formula_plain="稀疏度 = 零值参数个数 / 总参数个数",
            derivation=derivation,
            used_log_refs=refs,
        )
        self._wrap_with_boundary(metric)
        self._make_record("weight_sparsity", inputs,
                          {"value": sparsity * 100, "unit": "%",
                           "within_bounds": metric.is_within_bounds},
                          refs, derivation)
        return metric

    def fisher_information_norm(self, per_layer_fisher: List[float],
                                log_refs: Optional[List[str]] = None,
                                log_entries: Optional[List[TrainingLogEntry]] = None) -> MetricWithFormula:
        """
        Fisher信息范数 (L2)

        公式: ||F||_2 = sqrt(Σ F_i²)
        单位: (无单位, 相对量)
        默认边界: (1e-6, 1e3]
        """
        refs = log_refs or ([e.as_reference() for e in log_entries] if log_entries else [])
        derivation: List[str] = []
        inputs = {"num_layers": len(per_layer_fisher)}

        if not per_layer_fisher:
            raise ValueError("per_layer_fisher为空")

        sq_sum = 0.0
        for i, fi in enumerate(per_layer_fisher):
            sq_sum += fi * fi
            if i < 5:
                derivation.append(f"F[{i}] = {fi:.6e}, 累计ΣF² = {sq_sum:.6e}")

        norm = math.sqrt(sq_sum)
        derivation.append(f"L2范数 = sqrt({sq_sum:.6e}) = {norm:.6e}")

        metric = MetricWithFormula(
            name="fisher_information_norm",
            value=norm,
            unit="",
            formula_latex=r"\|\mathbf{F}\|_2 = \sqrt{\sum_{l} F_l^2}",
            formula_plain="Fisher L2范数 = sqrt(各层Fisher信息对角线之和的平方)",
            derivation=derivation,
            used_log_refs=refs,
        )
        self._wrap_with_boundary(metric)
        self._make_record("fisher_information_norm", inputs,
                          {"value": norm, "within_bounds": metric.is_within_bounds},
                          refs, derivation)
        return metric

    def drain_records(self) -> List[ProcessingRecord]:
        recs = self._records
        self._records = []
        return recs

    def peek_records(self) -> List[ProcessingRecord]:
        return list(self._records)

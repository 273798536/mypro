from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple

import numpy as np


class DiagnosisLevel(Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"


@dataclass
class DiagnosisMessage:
    level: DiagnosisLevel
    code: str
    source_type: str
    source_id: str
    detail: str
    suggestion: str

    def __str__(self) -> str:
        return (
            f"[{self.level.value}] {self.code} | "
            f"来源类型={self.source_type}, 来源ID={self.source_id} | "
            f"{self.detail} | 建议: {self.suggestion}"
        )


@dataclass
class JudgeScore:
    judge_id: str
    judge_name: str
    comparison_matrix: Optional[np.ndarray] = None
    direct_weights: Optional[np.ndarray] = None
    raw_scores: Optional[Dict[str, Dict[str, float]]] = None
    missing_criteria: List[str] = field(default_factory=list)


@dataclass
class SupplierMaterial:
    supplier_id: str
    supplier_name: str
    criteria_scores: Dict[str, float] = field(default_factory=dict)


@dataclass
class InspectionReport:
    report_id: str
    supplier_id: str
    inspector: str
    criteria_scores: Dict[str, float] = field(default_factory=dict)
    notes: str = ""


RI_TABLE = {1: 0.0, 2: 0.0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49}


def _eigenvector_weights(matrix: np.ndarray) -> np.ndarray:
    eigenvalues, eigenvectors = np.linalg.eig(matrix)
    max_idx = np.argmax(eigenvalues.real)
    principal = eigenvectors[:, max_idx].real
    weights = principal / principal.sum()
    return weights


def _consistency_ratio(matrix: np.ndarray) -> Tuple[float, float, float]:
    n = matrix.shape[0]
    eigenvalues, _ = np.linalg.eig(matrix)
    lambda_max = eigenvalues.real.max()
    ci = (lambda_max - n) / (n - 1) if n > 1 else 0.0
    ri = RI_TABLE.get(n, 1.49)
    cr = ci / ri if ri > 0 else 0.0
    return cr, ci, lambda_max


class MatrixConsistencyScorer:
    def __init__(self, criteria: List[str], cr_threshold: float = 0.1, extreme_z_threshold: float = 2.0):
        self.criteria = criteria
        self.cr_threshold = cr_threshold
        self.extreme_z_threshold = extreme_z_threshold
        self.judge_scores: List[JudgeScore] = []
        self.supplier_materials: List[SupplierMaterial] = []
        self.inspection_reports: List[InspectionReport] = []
        self.diagnoses: List[DiagnosisMessage] = []
        self.judge_weights: Dict[str, np.ndarray] = {}
        self.consensus_weights: Optional[np.ndarray] = None
        self.rankings: List[Dict] = []

    def load_judge_scores(self, scores: List[JudgeScore]) -> None:
        self.judge_scores = scores

    def load_supplier_materials(self, materials: List[SupplierMaterial]) -> None:
        self.supplier_materials = materials

    def load_inspection_reports(self, reports: List[InspectionReport]) -> None:
        self.inspection_reports = reports

    def _validate_judge_scores(self) -> None:
        for js in self.judge_scores:
            if js.comparison_matrix is not None:
                n = js.comparison_matrix.shape[0]
                expected = len(self.criteria)
                if n != expected:
                    self.diagnoses.append(DiagnosisMessage(
                        level=DiagnosisLevel.ERROR,
                        code="MATRIX_DIM_MISMATCH",
                        source_type="评委打分",
                        source_id=js.judge_id,
                        detail=f"评委 {js.judge_name} 的判断矩阵维度为 {n}x{n}，期望 {expected}x{expected}（依据 {expected} 个准则）",
                        suggestion=f"请检查评委 {js.judge_name} 的打分表，确认是否遗漏或多余准则列/行",
                    ))
                neg_mask = js.comparison_matrix <= 0
                if neg_mask.any():
                    rows, cols = np.where(neg_mask)
                    positions = [f"第{r+1}行第{c+1}列" for r, c in zip(rows, cols)]
                    self.diagnoses.append(DiagnosisMessage(
                        level=DiagnosisLevel.ERROR,
                        code="MATRIX_NON_POSITIVE",
                        source_type="评委打分",
                        source_id=js.judge_id,
                        detail=f"评委 {js.judge_name} 的判断矩阵存在非正元素: {', '.join(positions[:5])}",
                        suggestion="判断矩阵元素必须为正数，请核实该评委原始打分记录",
                    ))
            if js.missing_criteria:
                missing_names = ", ".join(js.missing_criteria)
                self.diagnoses.append(DiagnosisMessage(
                    level=DiagnosisLevel.WARNING,
                    code="SCORE_MISSING",
                    source_type="评委打分",
                    source_id=js.judge_id,
                    detail=f"评委 {js.judge_name} 缺少以下准则打分: {missing_names}",
                    suggestion=f"请联系评委 {js.judge_name} 补充 {missing_names} 的打分，或标记该评委对缺失准则的评估为不可用",
                ))
            if js.raw_scores is not None:
                for criterion, scores_dict in js.raw_scores.items():
                    for supplier_id, score in scores_dict.items():
                        if score is None or (isinstance(score, float) and math.isnan(score)):
                            self.diagnoses.append(DiagnosisMessage(
                                level=DiagnosisLevel.WARNING,
                                code="SCORE_NAN",
                                source_type="评委打分",
                                source_id=js.judge_id,
                                detail=f"评委 {js.judge_name} 对供应商 {supplier_id} 的准则「{criterion}」打分为空",
                                suggestion=f"请核实评委 {js.judge_name} 对供应商 {supplier_id} 准则「{criterion}」的原始评分记录",
                            ))

    def _validate_supplier_materials(self) -> None:
        for sm in self.supplier_materials:
            missing = [c for c in self.criteria if c not in sm.criteria_scores]
            if missing:
                missing_names = ", ".join(missing)
                self.diagnoses.append(DiagnosisMessage(
                    level=DiagnosisLevel.WARNING,
                    code="SUPPLIER_SCORE_MISSING",
                    source_type="供应商资料",
                    source_id=sm.supplier_id,
                    detail=f"供应商 {sm.supplier_name} 缺少准则打分: {missing_names}",
                    suggestion=f"请补充供应商 {sm.supplier_name} 在准则「{missing_names}」的自评或证明材料",
                ))

    def _validate_inspection_reports(self) -> None:
        known_suppliers = {sm.supplier_id for sm in self.supplier_materials}
        for ir in self.inspection_reports:
            if ir.supplier_id not in known_suppliers:
                self.diagnoses.append(DiagnosisMessage(
                    level=DiagnosisLevel.WARNING,
                    code="REPORT_SUPPLIER_UNKNOWN",
                    source_type="检查报告",
                    source_id=ir.report_id,
                    detail=f"检查报告 {ir.report_id} 引用了未知供应商 {ir.supplier_id}，无法与供应商资料关联",
                    suggestion=f"请核实供应商ID是否正确，或先录入供应商 {ir.supplier_id} 的基础资料",
                ))
            for criterion, score in ir.criteria_scores.items():
                for sm in self.supplier_materials:
                    if sm.supplier_id == ir.supplier_id and criterion in sm.criteria_scores:
                        diff = abs(score - sm.criteria_scores[criterion])
                        if diff > 20:
                            self.diagnoses.append(DiagnosisMessage(
                                level=DiagnosisLevel.WARNING,
                                code="SCORE_CONFLICT",
                                source_type="检查报告",
                                source_id=ir.report_id,
                                detail=(
                                    f"检查员 {ir.inspector} 对供应商 {sm.supplier_name} 准则「{criterion}」"
                                    f"的评分({score})与供应商资料({sm.criteria_scores[criterion]})差异达 {diff:.1f} 分"
                                ),
                                suggestion=f"请与检查员 {ir.inspector} 和供应商 {sm.supplier_name} 确认准则「{criterion}」的真实得分，不要自行修改口径",
                            ))

    def step1_compute_weights(self) -> Dict[str, np.ndarray]:
        for js in self.judge_scores:
            if js.direct_weights is not None:
                n = len(js.direct_weights)
                expected = len(self.criteria)
                if n != expected:
                    self.diagnoses.append(DiagnosisMessage(
                        level=DiagnosisLevel.ERROR,
                        code="WEIGHT_DIM_MISMATCH",
                        source_type="评委打分",
                        source_id=js.judge_id,
                        detail=f"评委 {js.judge_name} 的直接权重维度为 {n}，期望 {expected}",
                        suggestion=f"请检查评委 {js.judge_name} 的直接权重设置，确保包含 {expected} 个准则的权重",
                    ))
                    continue

                weight_sum = js.direct_weights.sum()
                if not math.isclose(weight_sum, 1.0, abs_tol=1e-6):
                    self.diagnoses.append(DiagnosisMessage(
                        level=DiagnosisLevel.WARNING,
                        code="JUDGE_WEIGHT_NOT_NORMALIZED",
                        source_type="评委打分",
                        source_id=js.judge_id,
                        detail=(
                            f"评委 {js.judge_name} 提供的直接权重之和为 {weight_sum:.6f}，未归一化为1.0。"
                            f"各准则权重: {', '.join([f'{c}={w:.4f}' for c, w in zip(self.criteria, js.direct_weights)])}"
                        ),
                        suggestion=(
                            f"建议对评委 {js.judge_name} 的权重做归一化修正: w_i / Σw；"
                            f"若确认权重无需归一化，请在评审规则中明确说明"
                        ),
                    ))

                self.judge_weights[js.judge_id] = js.direct_weights.copy()
                continue

            if js.comparison_matrix is None:
                self.diagnoses.append(DiagnosisMessage(
                    level=DiagnosisLevel.WARNING,
                    code="NO_JUDGE_DATA",
                    source_type="评委打分",
                    source_id=js.judge_id,
                    detail=f"评委 {js.judge_name} 未提供判断矩阵也未提供直接权重，将被跳过",
                    suggestion=f"请联系评委 {js.judge_name} 补充打分数据",
                ))
                continue
            n = js.comparison_matrix.shape[0]
            if n != len(self.criteria):
                continue
            if (js.comparison_matrix <= 0).any():
                continue

            weights = _eigenvector_weights(js.comparison_matrix)
            cr, ci, lambda_max = _consistency_ratio(js.comparison_matrix)

            if cr > self.cr_threshold:
                self.diagnoses.append(DiagnosisMessage(
                    level=DiagnosisLevel.ERROR,
                    code="CR_EXCEED",
                    source_type="评委打分",
                    source_id=js.judge_id,
                    detail=(
                        f"评委 {js.judge_name} 的判断矩阵一致性比率 CR={cr:.4f}，"
                        f"超过阈值 {self.cr_threshold}（CI={ci:.4f}, λmax={lambda_max:.4f}），该评委权重将被排除"
                    ),
                    suggestion=(
                        f"请将评委 {js.judge_name} 的原始判断矩阵退回修正，"
                        f"重点检查是否存在自相矛盾的赋值（如 A>B, B>C 但 C>A）"
                    ),
                ))
                continue
            else:
                self.diagnoses.append(DiagnosisMessage(
                    level=DiagnosisLevel.INFO,
                    code="CR_PASS",
                    source_type="评委打分",
                    source_id=js.judge_id,
                    detail=f"评委 {js.judge_name} CR={cr:.4f}，一致性通过",
                    suggestion="无需处理",
                ))

            self.judge_weights[js.judge_id] = weights

        return self.judge_weights

    def step2_check_normalization(self) -> Optional[np.ndarray]:
        if not self.judge_weights:
            self.diagnoses.append(DiagnosisMessage(
                level=DiagnosisLevel.ERROR,
                code="NO_VALID_WEIGHTS",
                source_type="系统",
                source_id="-",
                detail="无有效评委权重可供聚合，所有评委判断矩阵均未通过校验",
                suggestion="请先修正各评委判断矩阵中的问题，确保至少有一位评委通过一致性检验",
            ))
            return None

        all_weights = np.array(list(self.judge_weights.values()))
        self.consensus_weights = all_weights.mean(axis=0)

        weight_sum = self.consensus_weights.sum()
        if not math.isclose(weight_sum, 1.0, abs_tol=1e-6):
            per_judge_sums = {jid: f"{w.sum():.6f}" for jid, w in self.judge_weights.items()}
            sum_details = "; ".join(per_judge_sums.values())
            self.diagnoses.append(DiagnosisMessage(
                level=DiagnosisLevel.WARNING,
                code="WEIGHT_NOT_NORMALIZED",
                source_type="权重计算",
                source_id="consensus",
                detail=(
                    f"聚合权重之和为 {weight_sum:.6f}，未归一化为1.0。"
                    f"各评委权重之和: {sum_details}。"
                    f"原因: 当部分评委判断矩阵未通过一致性检验被排除时，"
                    f"剩余评委的特征向量权重虽然各自归一，但均值聚合后浮点累积导致总和非1"
                ),
                suggestion=(
                    "处理建议: (1) 对聚合权重做归一化除法 w_i / Σw 即可修正; "
                    "(2) 若排除评委较多，建议回溯确认排除理由是否合理，避免因排除导致权重偏斜; "
                    "(3) 如需保留所有评委意见，可考虑对未通过一致性的评委做局部修正而非直接排除"
                ),
            ))
            self.consensus_weights = self.consensus_weights / self.consensus_weights.sum()
            self.diagnoses.append(DiagnosisMessage(
                level=DiagnosisLevel.INFO,
                code="WEIGHT_NORMALIZED_FIX",
                source_type="权重计算",
                source_id="consensus",
                detail=f"已自动归一化，修正后权重之和为 {self.consensus_weights.sum():.6f}",
                suggestion="归一化仅为技术修正，业务含义不变；如对权重分布有疑问请复核评委原始判断",
            ))
        else:
            self.diagnoses.append(DiagnosisMessage(
                level=DiagnosisLevel.INFO,
                code="WEIGHT_NORMALIZED",
                source_type="权重计算",
                source_id="consensus",
                detail=f"聚合权重之和为 {weight_sum:.6f}，归一化正常",
                suggestion="无需处理",
            ))

        return self.consensus_weights

    def step3_detect_extreme_judges(self) -> List[Dict]:
        if len(self.judge_weights) < 2:
            self.diagnoses.append(DiagnosisMessage(
                level=DiagnosisLevel.INFO,
                code="EXTREME_SKIP",
                source_type="极端评委检测",
                source_id="-",
                detail="有效评委不足2位，无法进行极端评委检测",
                suggestion="如条件允许，增补评委人数以提高统计可靠性",
            ))
            return []

        judge_ids = list(self.judge_weights.keys())
        all_weights = np.array([self.judge_weights[jid] for jid in judge_ids])
        mean_w = all_weights.mean(axis=0)
        std_w = all_weights.std(axis=0)

        extreme_results = []
        for i, jid in enumerate(judge_ids):
            js_obj = next(js for js in self.judge_scores if js.judge_id == jid)
            w = self.judge_weights[jid]
            z_scores = np.zeros_like(w)
            for k in range(len(w)):
                z_scores[k] = (w[k] - mean_w[k]) / std_w[k] if std_w[k] > 1e-9 else 0.0

            max_z_idx = int(np.argmax(np.abs(z_scores)))
            max_z = z_scores[max_z_idx]
            max_criterion = self.criteria[max_z_idx]

            is_extreme = abs(max_z) > self.extreme_z_threshold
            extreme_results.append({
                "judge_id": jid,
                "judge_name": js_obj.judge_name,
                "is_extreme": is_extreme,
                "max_z_score": float(max_z),
                "extreme_criterion": max_criterion,
                "z_scores": z_scores.tolist(),
            })

            if is_extreme:
                direction = "偏高" if max_z > 0 else "偏低"
                self.diagnoses.append(DiagnosisMessage(
                    level=DiagnosisLevel.WARNING,
                    code="EXTREME_JUDGE",
                    source_type="评委打分",
                    source_id=jid,
                    detail=(
                        f"评委 {js_obj.judge_name} 在准则「{max_criterion}」上的权重Z得分={max_z:.2f}，"
                        f"{direction}于均值超过 {self.extreme_z_threshold} 个标准差，"
                        f"该评委对「{max_criterion}」的赋权为 {w[max_z_idx]:.4f}，"
                        f"而均值为 {mean_w[max_z_idx]:.4f}"
                    ),
                    suggestion=(
                        f"请核实评委 {js_obj.judge_name} 对准则「{max_criterion}」的原始判断值，"
                        f"确认是否存在主观偏好或理解偏差; "
                        f"如确认异常，可在聚合时降低该评委权重或要求其重新评判"
                    ),
                ))
            else:
                self.diagnoses.append(DiagnosisMessage(
                    level=DiagnosisLevel.INFO,
                    code="JUDGE_NORMAL",
                    source_type="评委打分",
                    source_id=jid,
                    detail=f"评委 {js_obj.judge_name} 最大Z得分={max_z:.2f}，未超出极端阈值",
                    suggestion="无需处理",
                ))

        return extreme_results

    def step4_compute_ranking(self) -> List[Dict]:
        if self.consensus_weights is None:
            self.diagnoses.append(DiagnosisMessage(
                level=DiagnosisLevel.ERROR,
                code="NO_CONSENSUS_WEIGHTS",
                source_type="排名计算",
                source_id="-",
                detail="无共识权重，无法计算排名",
                suggestion="请先完成权重计算与归一化步骤",
            ))
            return []

        rankings = []
        for sm in self.supplier_materials:
            score_vec = np.array([sm.criteria_scores.get(c, 0.0) for c in self.criteria])
            weighted_score = float(np.dot(score_vec, self.consensus_weights))
            contribution = {
                c: float(sm.criteria_scores.get(c, 0.0) * self.consensus_weights[i])
                for i, c in enumerate(self.criteria)
            }
            rankings.append({
                "supplier_id": sm.supplier_id,
                "supplier_name": sm.supplier_name,
                "weighted_score": weighted_score,
                "contribution": contribution,
            })

        rankings.sort(key=lambda x: x["weighted_score"], reverse=True)
        for rank, r in enumerate(rankings, 1):
            r["rank"] = rank

        self.rankings = rankings

        if len(rankings) >= 2:
            gap = rankings[0]["weighted_score"] - rankings[1]["weighted_score"]
            top_criterion = max(rankings[0]["contribution"], key=rankings[0]["contribution"].get)
            self.diagnoses.append(DiagnosisMessage(
                level=DiagnosisLevel.INFO,
                code="RANK_EXPLANATION",
                source_type="排名解释",
                source_id=rankings[0]["supplier_id"],
                detail=(
                    f"第1名 {rankings[0]['supplier_name']} 加权总分={rankings[0]['weighted_score']:.2f}，"
                    f"领先第2名 {rankings[1]['supplier_name']} {gap:.2f} 分，"
                    f"主要优势来自准则「{top_criterion}」"
                    f"（贡献 {rankings[0]['contribution'][top_criterion]:.2f} 分）"
                ),
                suggestion="排名解释基于当前权重与评分，如权重调整需重新计算",
            ))

        return rankings

    def run(self) -> Dict:
        self.diagnoses.clear()
        self._validate_judge_scores()
        self._validate_supplier_materials()
        self._validate_inspection_reports()

        self.step1_compute_weights()
        self.step2_check_normalization()
        extreme = self.step3_detect_extreme_judges()
        rankings = self.step4_compute_ranking()

        return {
            "diagnoses": [str(d) for d in self.diagnoses],
            "judge_weights": {jid: w.tolist() for jid, w in self.judge_weights.items()},
            "consensus_weights": self.consensus_weights.tolist() if self.consensus_weights is not None else None,
            "extreme_judges": extreme,
            "rankings": rankings,
        }

    def print_report(self, result: Dict) -> None:
        print("=" * 80)
        print("矩阵一致性评分器 — 完整诊断报告")
        print("=" * 80)

        print("\n【诊断信息】")
        print("-" * 60)
        errors = [d for d in result["diagnoses"] if d.startswith("[ERROR]")]
        warnings = [d for d in result["diagnoses"] if d.startswith("[WARNING]")]
        infos = [d for d in result["diagnoses"] if d.startswith("[INFO]")]
        for d in errors:
            print(f"  ❌ {d}")
        for d in warnings:
            print(f"  ⚠️  {d}")
        for d in infos:
            print(f"  ℹ️  {d}")
        print(f"\n  统计: {len(errors)} 错误, {len(warnings)} 警告, {len(infos)} 信息")

        print("\n【各评委权重】")
        print("-" * 60)
        for jid, weights in result["judge_weights"].items():
            js_obj = next((js for js in self.judge_scores if js.judge_id == jid), None)
            name = js_obj.judge_name if js_obj else jid
            items = [f"{c}={w:.4f}" for c, w in zip(self.criteria, weights)]
            print(f"  {name}: {', '.join(items)} (Σ={sum(weights):.6f})")

        if result["consensus_weights"] is not None:
            print("\n【共识权重（归一化后）】")
            print("-" * 60)
            items = [f"{c}={w:.4f}" for c, w in zip(self.criteria, result["consensus_weights"])]
            print(f"  {', '.join(items)} (Σ={sum(result['consensus_weights']):.6f})")

        print("\n【极端评委检测结果】")
        print("-" * 60)
        for ej in result["extreme_judges"]:
            tag = "⚠️ 极端" if ej["is_extreme"] else "✅ 正常"
            print(f"  {tag} | {ej['judge_name']} | 最大Z={ej['max_z_score']:.2f} | 偏离准则: {ej['extreme_criterion']}")

        print("\n【供应商排名】")
        print("-" * 60)
        for r in result["rankings"]:
            contrib_parts = [f"{c}={v:.2f}" for c, v in r["contribution"].items()]
            print(f"  第{r['rank']}名 | {r['supplier_name']} | 加权总分={r['weighted_score']:.2f} | 贡献分解: {', '.join(contrib_parts)}")

        print("\n" + "=" * 80)

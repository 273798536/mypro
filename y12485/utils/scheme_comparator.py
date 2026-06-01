import json
import os
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import numpy as np

from core.electromagnetic import ElectromagneticField
from models.particle import ParticleSimulator, Particle
from classifier.result_classifier import ResultClassifier, ResultCategory, BatchClassificationResult


@dataclass
class SimulationScheme:
    scheme_id: str
    name: str
    description: str
    em_field: ElectromagneticField
    simulator: ParticleSimulator
    classification: Optional[BatchClassificationResult] = None
    created_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scheme_id": self.scheme_id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
            "classification": self.classification.to_dict() if self.classification else None,
            "metadata": self.metadata,
            "em_field_config": self.em_field.get_config_snapshot(),
            "simulation_config": self.simulator.get_simulation_snapshot()
        }


@dataclass
class SchemeComparison:
    base_scheme_id: str
    compare_scheme_id: str
    diff_summary: str
    field_differences: List[Dict[str, Any]]
    particle_differences: List[Dict[str, Any]]
    classification_differences: List[Dict[str, Any]]
    similarity_score: float
    recommendation: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "base_scheme_id": self.base_scheme_id,
            "compare_scheme_id": self.compare_scheme_id,
            "diff_summary": self.diff_summary,
            "field_differences": self.field_differences,
            "particle_differences": self.particle_differences,
            "classification_differences": self.classification_differences,
            "similarity_score": self.similarity_score,
            "recommendation": self.recommendation
        }


class SchemeComparator:
    def __init__(self):
        self.schemes: Dict[str, SimulationScheme] = {}
        self.scheme_order: List[str] = []
        self.classifier = ResultClassifier()

    def add_scheme(self, name: str, description: str,
                   em_field: ElectromagneticField,
                   simulator: ParticleSimulator,
                   run_classification: bool = True,
                   scheme_id: Optional[str] = None) -> str:
        import uuid
        sid = scheme_id or str(uuid.uuid4())

        classification = None
        if run_classification:
            classification = self.classifier.classify_all(simulator)

        scheme = SimulationScheme(
            scheme_id=sid,
            name=name,
            description=description,
            em_field=em_field,
            simulator=simulator,
            classification=classification
        )

        self.schemes[sid] = scheme
        self.scheme_order.append(sid)

        return sid

    def get_scheme(self, scheme_id: str) -> Optional[SimulationScheme]:
        return self.schemes.get(scheme_id)

    def list_schemes(self) -> List[Dict[str, Any]]:
        result = []
        for sid in self.scheme_order:
            scheme = self.schemes[sid]
            result.append({
                "scheme_id": scheme.scheme_id,
                "name": scheme.name,
                "description": scheme.description,
                "created_at": scheme.created_at.isoformat(),
                "particle_count": len(scheme.simulator.particles),
                "charge_count": len(scheme.em_field.charges),
                "coil_count": len(scheme.em_field.coils),
                "has_classification": scheme.classification is not None,
                "direct_use_count": scheme.classification.direct_use_count if scheme.classification else 0,
                "needs_review_count": scheme.classification.needs_review_count if scheme.classification else 0,
                "not_usable_count": scheme.classification.not_usable_count if scheme.classification else 0
            })
        return result

    def compare_schemes(self, scheme_id1: str, scheme_id2: str) -> Optional[SchemeComparison]:
        if scheme_id1 not in self.schemes or scheme_id2 not in self.schemes:
            return None

        scheme1 = self.schemes[scheme_id1]
        scheme2 = self.schemes[scheme_id2]

        field_diffs = self._compare_fields(scheme1.em_field, scheme2.em_field)
        particle_diffs = self._compare_particles(scheme1.simulator, scheme2.simulator)
        class_diffs = self._compare_classifications(scheme1.classification, scheme2.classification)

        similarity = self._calculate_similarity(field_diffs, particle_diffs, class_diffs)

        summary = self._generate_diff_summary(field_diffs, particle_diffs, class_diffs, similarity)
        recommendation = self._generate_recommendation(similarity, field_diffs, class_diffs)

        return SchemeComparison(
            base_scheme_id=scheme_id1,
            compare_scheme_id=scheme_id2,
            diff_summary=summary,
            field_differences=field_diffs,
            particle_differences=particle_diffs,
            classification_differences=class_diffs,
            similarity_score=similarity,
            recommendation=recommendation
        )

    def _compare_fields(self, f1: ElectromagneticField, f2: ElectromagneticField) -> List[Dict[str, Any]]:
        diffs = []

        charges1 = {c.id: c for c in f1.charges}
        charges2 = {c.id: c for c in f2.charges}

        all_charge_ids = set(charges1.keys()) | set(charges2.keys())

        for cid in all_charge_ids:
            if cid not in charges1:
                diffs.append({
                    "type": "charge_added",
                    "charge_id": cid,
                    "message": f"方案2新增电荷 {cid}"
                })
            elif cid not in charges2:
                diffs.append({
                    "type": "charge_removed",
                    "charge_id": cid,
                    "message": f"方案2移除电荷 {cid}"
                })
            else:
                c1 = charges1[cid]
                c2 = charges2[cid]
                pos_diff = np.linalg.norm(c1.position - c2.position)
                charge_diff = abs(c1.charge - c2.charge)
                if pos_diff > 1e-10 or charge_diff > 1e-20:
                    diffs.append({
                        "type": "charge_modified",
                        "charge_id": cid,
                        "position_diff": float(pos_diff),
                        "charge_diff": float(charge_diff),
                        "message": f"电荷 {cid} 参数变化"
                    })

        coils1 = {c.id: c for c in f1.coils}
        coils2 = {c.id: c for c in f2.coils}

        all_coil_ids = set(coils1.keys()) | set(coils2.keys())

        for cid in all_coil_ids:
            if cid not in coils1:
                diffs.append({
                    "type": "coil_added",
                    "coil_id": cid,
                    "message": f"方案2新增线圈 {cid}"
                })
            elif cid not in coils2:
                diffs.append({
                    "type": "coil_removed",
                    "coil_id": cid,
                    "message": f"方案2移除线圈 {cid}"
                })
            else:
                c1 = coils1[cid]
                c2 = coils2[cid]
                center_diff = np.linalg.norm(c1.center - c2.center)
                current_diff = abs(c1.current - c2.current)
                if center_diff > 1e-10 or current_diff > 1e-10:
                    diffs.append({
                        "type": "coil_modified",
                        "coil_id": cid,
                        "center_diff": float(center_diff),
                        "current_diff": float(current_diff),
                        "message": f"线圈 {cid} 参数变化"
                    })

        return diffs

    def _compare_particles(self, s1: ParticleSimulator, s2: ParticleSimulator) -> List[Dict[str, Any]]:
        diffs = []

        particles1 = {p.id: p for p in s1.particles}
        particles2 = {p.id: p for p in s2.particles}

        all_particle_ids = set(particles1.keys()) | set(particles2.keys())

        for pid in all_particle_ids:
            if pid not in particles1:
                diffs.append({
                    "type": "particle_added",
                    "particle_id": pid,
                    "message": f"方案2新增粒子 {pid}"
                })
            elif pid not in particles2:
                diffs.append({
                    "type": "particle_removed",
                    "particle_id": pid,
                    "message": f"方案2移除粒子 {pid}"
                })
            else:
                p1 = particles1[pid]
                p2 = particles2[pid]
                mass_diff = abs((p1.mass or 0) - (p2.mass or 0))
                charge_diff = abs((p1.charge or 0) - (p2.charge or 0))
                pos_diff = np.linalg.norm(p1.position - p2.position)
                vel_diff = np.linalg.norm(p1.velocity - p2.velocity)

                if mass_diff > 1e-40 or charge_diff > 1e-30 or pos_diff > 1e-10 or vel_diff > 1e-10:
                    diffs.append({
                        "type": "particle_modified",
                        "particle_id": pid,
                        "mass_diff": float(mass_diff),
                        "charge_diff": float(charge_diff),
                        "position_diff": float(pos_diff),
                        "velocity_diff": float(vel_diff),
                        "message": f"粒子 {pid} 参数变化"
                    })

        return diffs

    def _compare_classifications(self, c1: Optional[BatchClassificationResult],
                                  c2: Optional[BatchClassificationResult]) -> List[Dict[str, Any]]:
        diffs = []

        if c1 is None or c2 is None:
            diffs.append({
                "type": "classification_missing",
                "message": "一个或多个方案缺少分类结果"
            })
            return diffs

        if c1.direct_use_count != c2.direct_use_count:
            diffs.append({
                "type": "direct_use_count_diff",
                "count1": c1.direct_use_count,
                "count2": c2.direct_use_count,
                "message": f"可直接使用粒子数: {c1.direct_use_count} → {c2.direct_use_count}"
            })

        if c1.needs_review_count != c2.needs_review_count:
            diffs.append({
                "type": "needs_review_count_diff",
                "count1": c1.needs_review_count,
                "count2": c2.needs_review_count,
                "message": f"需复核粒子数: {c1.needs_review_count} → {c2.needs_review_count}"
            })

        if c1.not_usable_count != c2.not_usable_count:
            diffs.append({
                "type": "not_usable_count_diff",
                "count1": c1.not_usable_count,
                "count2": c2.not_usable_count,
                "message": f"不可用粒子数: {c1.not_usable_count} → {c2.not_usable_count}"
            })

        all_pids = set(c1.particle_results.keys()) | set(c2.particle_results.keys())
        for pid in all_pids:
            r1 = c1.particle_results.get(pid)
            r2 = c2.particle_results.get(pid)

            if r1 and r2 and r1.final_category != r2.final_category:
                diffs.append({
                    "type": "category_change",
                    "particle_id": pid,
                    "from_category": r1.final_category.value,
                    "to_category": r2.final_category.value,
                    "message": f"粒子 {pid} 分类变化: {r1.final_category.value} → {r2.final_category.value}"
                })

        return diffs

    def _calculate_similarity(self, field_diffs: List, particle_diffs: List, class_diffs: List) -> float:
        total_possible = 1.0
        penalty = 0.0

        penalty += len(field_diffs) * 0.05
        penalty += len(particle_diffs) * 0.03
        penalty += len(class_diffs) * 0.1

        return max(0.0, min(1.0, 1.0 - penalty))

    def _generate_diff_summary(self, field_diffs: List, particle_diffs: List,
                                class_diffs: List, similarity: float) -> str:
        parts = []
        if field_diffs:
            parts.append(f"场配置 {len(field_diffs)} 处变化")
        if particle_diffs:
            parts.append(f"粒子配置 {len(particle_diffs)} 处变化")
        if class_diffs:
            parts.append(f"分类结果 {len(class_diffs)} 处变化")

        if not parts:
            return "两个方案完全相同"

        return f"方案相似度 {similarity:.1%}，" + "、".join(parts)

    def _generate_recommendation(self, similarity: float, field_diffs: List, class_diffs: List) -> str:
        if similarity >= 0.9:
            return "两方案高度相似，可任选其一或合并使用"
        elif similarity >= 0.7:
            return "存在一定差异，建议复核变化原因后选择"
        else:
            has_class_improvement = any(
                d.get("type") in ["not_usable_count_diff", "needs_review_count_diff"] and
                d.get("count2", 0) < d.get("count1", 0)
                for d in class_diffs
            )

            if has_class_improvement:
                return "差异较大，但分类结果有改善，建议采用改进后的方案"
            else:
                return "差异较大，需仔细比较后选择或重新设计方案"

    def compare_all_pairs(self) -> List[SchemeComparison]:
        comparisons = []
        scheme_ids = self.scheme_order

        for i in range(len(scheme_ids)):
            for j in range(i + 1, len(scheme_ids)):
                comp = self.compare_schemes(scheme_ids[i], scheme_ids[j])
                if comp:
                    comparisons.append(comp)

        return sorted(comparisons, key=lambda c: c.similarity_score, reverse=True)

    def export_comparison_report(self, output_dir: str) -> None:
        os.makedirs(output_dir, exist_ok=True)

        schemes_list = self.list_schemes()
        comparisons = self.compare_all_pairs()

        report = {
            "generated_at": datetime.now().isoformat(),
            "total_schemes": len(schemes_list),
            "schemes": schemes_list,
            "comparisons": [c.to_dict() for c in comparisons],
            "classification_guide": self.classifier.get_classification_guide()
        }

        filepath = os.path.join(output_dir, "scheme_comparison_report.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        text_report = self._generate_text_report(schemes_list, comparisons)
        text_filepath = os.path.join(output_dir, "scheme_comparison_report.txt")
        with open(text_filepath, 'w', encoding='utf-8') as f:
            f.write(text_report)

        print(f"方案比较报告已导出到: {output_dir}")

    def _generate_text_report(self, schemes: List, comparisons: List) -> str:
        lines = []
        lines.append("=" * 70)
        lines.append("电磁场线粒子厅 - 方案比较报告")
        lines.append("=" * 70)
        lines.append("")

        lines.append("【方案列表】")
        for i, s in enumerate(schemes, 1):
            lines.append(f"{i}. {s['name']}")
            lines.append(f"   描述: {s['description']}")
            lines.append(f"   粒子: {s['particle_count']} 个, 电荷: {s['charge_count']} 个, 线圈: {s['coil_count']} 个")
            if s['has_classification']:
                lines.append(f"   分类: {s['direct_use_count']}个可用 / {s['needs_review_count']}个复核 / {s['not_usable_count']}个不可用")
            lines.append("")

        if comparisons:
            lines.append("【方案对比】")
            for i, comp in enumerate(comparisons, 1):
                s1 = next(s for s in schemes if s['scheme_id'] == comp.base_scheme_id)
                s2 = next(s for s in schemes if s['scheme_id'] == comp.compare_scheme_id)
                lines.append(f"{i}. {s1['name']} ↔ {s2['name']}")
                lines.append(f"   相似度: {comp.similarity_score:.1%}")
                lines.append(f"   摘要: {comp.diff_summary}")
                lines.append(f"   建议: {comp.recommendation}")
                lines.append("")

        lines.append("=" * 70)
        lines.append("复核节点决策支持")
        lines.append("=" * 70)
        lines.append("")
        lines.append("方案选择要点:")
        lines.append("  1. 优先选择 '可直接使用' 粒子数多的方案")
        lines.append("  2. 注意 '需物理老师确认' 的粒子，需人工复核")
        lines.append("  3. '暂时不能算' 的粒子多的方案需谨慎使用")
        lines.append("  4. 保留所有方案的完整链路，便于追溯")
        lines.append("")

        return "\n".join(lines)

    def export_scheme(self, scheme_id: str, output_path: str) -> bool:
        if scheme_id not in self.schemes:
            return False

        scheme = self.schemes[scheme_id]
        data = scheme.to_dict()

        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return True

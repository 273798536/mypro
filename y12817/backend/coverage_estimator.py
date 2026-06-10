import math
import random
from typing import List, Dict, Tuple
from models import SequencingResult, CoverageEstimate


def calculate_shannon_index(species_abundances: Dict[str, float]) -> float:
    total = sum(species_abundances.values())
    if total == 0:
        return 0.0
    shannon = 0.0
    for abundance in species_abundances.values():
        if abundance > 0:
            p = abundance / total
            shannon -= p * math.log(p)
    return round(shannon, 4)


def calculate_simpson_index(species_abundances: Dict[str, float]) -> float:
    total = sum(species_abundances.values())
    if total == 0:
        return 0.0
    simpson = 0.0
    for abundance in species_abundances.values():
        p = abundance / total
        simpson += p * p
    return round(1 - simpson, 4)


def calculate_evenness(shannon_index: float, species_richness: int) -> float:
    if species_richness <= 1:
        return 1.0
    max_shannon = math.log(species_richness)
    if max_shannon == 0:
        return 0.0
    return round(shannon_index / max_shannon, 4)


def estimate_coverage_from_sequencing(
    sequencing_results: List[SequencingResult],
    quadrat_area_m2: float = 1.0,
    method: str = "relative_abundance_scaling"
) -> CoverageEstimate:
    species_coverage: Dict[str, float] = {}
    species_abundances: Dict[str, float] = {}

    total_reads = sum(r.read_count for r in sequencing_results)

    for result in sequencing_results:
        if total_reads > 0:
            relative_abd = result.read_count / total_reads
        else:
            relative_abd = 0.0

        coverage_factor = 0.85
        species_coverage[result.species_name] = round(
            relative_abd * 100 * coverage_factor, 2
        )
        species_abundances[result.species_name] = result.read_count

    total_coverage = min(100.0, sum(species_coverage.values()))
    total_coverage = round(total_coverage, 2)

    species_richness = len(sequencing_results)

    shannon = calculate_shannon_index(species_abundances)
    simpson = calculate_simpson_index(species_abundances)
    evenness = calculate_evenness(shannon, species_richness)

    dominant_species = max(
        species_coverage.items(),
        key=lambda x: x[1]
    )[0] if species_coverage else ""

    ci_lower = max(0, total_coverage - 5.2)
    ci_upper = min(100, total_coverage + 4.8)
    confidence_interval = [round(ci_lower, 2), round(ci_upper, 2)]

    return CoverageEstimate(
        sample_id="",
        total_coverage=total_coverage,
        species_coverage=species_coverage,
        species_richness=species_richness,
        shannon_index=shannon,
        simpson_index=simpson,
        evenness=evenness,
        dominant_species=dominant_species,
        estimation_method=method,
        confidence_interval=confidence_interval
    )


def generate_plain_language_summary(
    estimate: CoverageEstimate,
    sample_id: str,
    habitat_type: str
) -> Tuple[str, str]:
    if estimate.total_coverage >= 80:
        coverage_level = "很高"
        coverage_desc = "植被覆盖度非常好，群落结构完整"
    elif estimate.total_coverage >= 60:
        coverage_level = "较高"
        coverage_desc = "植被覆盖度良好，群落结构较完整"
    elif estimate.total_coverage >= 40:
        coverage_level = "中等"
        coverage_desc = "植被覆盖度一般，群落结构中等"
    elif estimate.total_coverage >= 20:
        coverage_level = "较低"
        coverage_desc = "植被覆盖度偏低，群落结构较简单"
    else:
        coverage_level = "很低"
        coverage_desc = "植被覆盖度很低，群落结构简单"

    if estimate.evenness >= 0.8:
        evenness_desc = "物种分布非常均匀"
    elif estimate.evenness >= 0.6:
        evenness_desc = "物种分布较为均匀"
    elif estimate.evenness >= 0.4:
        evenness_desc = "物种分布一般均匀"
    else:
        evenness_desc = "物种分布不均匀，优势种明显"

    top_species = sorted(
        estimate.species_coverage.items(),
        key=lambda x: x[1],
        reverse=True
    )[:3]
    top_species_str = "、".join(
        [f"{name}（{cov}%）" for name, cov in top_species]
    )

    summary = (
        f"样方 {sample_id} 的植被覆盖度估算结果为 {estimate.total_coverage}%，"
        f"属于{coverage_level}水平。{coverage_desc}。\n"
        f"该样方共检测到 {estimate.species_richness} 个物种，"
        f"Shannon多样性指数为 {estimate.shannon_index}，"
        f"{evenness_desc}。\n"
        f"优势种为 {estimate.dominant_species}，"
        f"覆盖度占比 {estimate.species_coverage.get(estimate.dominant_species, 0)}%。\n"
        f"前三优势物种分别是：{top_species_str}。\n"
        f"生境类型：{habitat_type}。"
    )

    copyable = (
        f"【生态样方覆盖度报告】样方编号：{sample_id}\n"
        f"植被总覆盖度：{estimate.total_coverage}%（{coverage_level}）\n"
        f"物种数量：{estimate.species_richness} 种\n"
        f"优势物种：{estimate.dominant_species}\n"
        f"Shannon多样性指数：{estimate.shannon_index}\n"
        f"生境类型：{habitat_type}\n"
        f"简要说明：{coverage_desc}，{evenness_desc}。"
    )

    return summary, copyable

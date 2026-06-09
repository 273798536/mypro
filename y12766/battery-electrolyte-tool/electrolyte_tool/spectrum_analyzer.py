from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

from .models import (
    ExperimentRecord,
    SpectrumPeak,
    PeakStatus,
    OverlapCase,
)


MATERIAL_REFERENCE_PEAKS: Dict[str, List[float]] = {
    "EC": [1.4, 1.8, 4.5],
    "DMC": [1.2, 3.7],
    "EMC": [1.1, 1.3, 3.6, 4.0],
    "DEC": [0.9, 1.5, 4.1],
    "PC": [1.6, 2.0, 4.8],
    "LiPF6": [3.5, 5.2],
    "LiFSI": [3.3, 5.0],
    "LiTFSI": [3.4, 5.1],
    "VC": [2.8, 6.0],
    "FEC": [2.5, 5.8],
    "PS": [3.0, 7.2],
}


DEFAULT_OVERLAP_THRESHOLD = 0.08


@dataclass
class AnalysisResult:
    sample_id: str
    original_peaks: List[SpectrumPeak]
    rechecked_peaks: List[SpectrumPeak]
    overlap_materials: List[str]
    result_changed: bool
    before_conclusion: str
    after_conclusion: str
    retest_suggestion: str


class SpectrumAnalyzer:
    """谱图分析与谱峰重叠检测"""

    def __init__(
        self,
        overlap_threshold: float = DEFAULT_OVERLAP_THRESHOLD,
        reference_peaks: Optional[Dict[str, List[float]]] = None,
    ):
        self.overlap_threshold = overlap_threshold
        self.reference_peaks = reference_peaks or MATERIAL_REFERENCE_PEAKS

    def analyze_record(self, record: ExperimentRecord) -> AnalysisResult:
        """对单条实验记录进行谱图分析和复核"""
        if not record.spectrum or not record.spectrum.peaks:
            return AnalysisResult(
                sample_id=record.sample_id,
                original_peaks=[],
                rechecked_peaks=[],
                overlap_materials=[],
                result_changed=False,
                before_conclusion=record.result_original or "无谱图数据",
                after_conclusion=record.result_original or "无谱图数据",
                retest_suggestion="请补充谱图数据后再分析",
            )

        original_peaks = [self._copy_peak(p) for p in record.spectrum.peaks]
        rechecked_peaks = [self._copy_peak(p) for p in record.spectrum.peaks]

        for peak in rechecked_peaks:
            peak.original_interpretation = peak.material or peak.note or "未标注"

        self._detect_overlaps(rechecked_peaks)
        self._reassign_materials(rechecked_peaks)

        overlap_materials = []
        for peak in rechecked_peaks:
            if peak.status == PeakStatus.OVERLAP:
                for m in peak.overlap_with:
                    if m and m not in overlap_materials:
                        overlap_materials.append(m)
                if peak.material and peak.material not in overlap_materials:
                    overlap_materials.append(peak.material)

        before_conclusion = record.result_original or self._generate_conclusion(original_peaks)
        after_conclusion = self._generate_conclusion(rechecked_peaks)
        result_changed = before_conclusion != after_conclusion

        retest = self._generate_retest_suggestion(
            original_peaks, rechecked_peaks, overlap_materials, result_changed
        )

        for peak in rechecked_peaks:
            peak.rechecked_interpretation = peak.material or "未确定"

        record.result_rechecked = after_conclusion
        record.retest_suggestion = retest
        if record.spectrum:
            record.spectrum.peaks = rechecked_peaks

        return AnalysisResult(
            sample_id=record.sample_id,
            original_peaks=original_peaks,
            rechecked_peaks=rechecked_peaks,
            overlap_materials=overlap_materials,
            result_changed=result_changed,
            before_conclusion=before_conclusion,
            after_conclusion=after_conclusion,
            retest_suggestion=retest,
        )

    def analyze_batch(self, records: List[ExperimentRecord]) -> List[AnalysisResult]:
        return [self.analyze_record(r) for r in records]

    def _detect_overlaps(self, peaks: List[SpectrumPeak]):
        """检测峰之间的重叠情况"""
        n = len(peaks)
        for i in range(n):
            for j in range(i + 1, n):
                p1, p2 = peaks[i], peaks[j]
                if abs(p1.position - p2.position) <= self.overlap_threshold:
                    if p1.status != PeakStatus.OVERLAP:
                        p1.status = PeakStatus.OVERLAP
                    if p2.status != PeakStatus.OVERLAP:
                        p2.status = PeakStatus.OVERLAP
                    if p2.material and p2.material not in p1.overlap_with:
                        p1.overlap_with.append(p2.material)
                    if p1.material and p1.material not in p2.overlap_with:
                        p2.overlap_with.append(p1.material)

        for peak in peaks:
            matched = self._find_reference_matches(peak.position)
            if len(matched) >= 2:
                peak.status = PeakStatus.OVERLAP
                for m in matched:
                    if m not in peak.overlap_with:
                        peak.overlap_with.append(m)
            elif len(matched) == 1 and not peak.material:
                peak.material = matched[0]

    def _find_reference_matches(self, position: float) -> List[str]:
        """查找与该峰位接近的参考材料"""
        matches: List[str] = []
        for material, ref_positions in self.reference_peaks.items():
            for ref_pos in ref_positions:
                if abs(position - ref_pos) <= self.overlap_threshold:
                    matches.append(material)
                    break
        return matches

    def _reassign_materials(self, peaks: List[SpectrumPeak]):
        """根据参考峰重新复核材料归属"""
        for peak in peaks:
            if peak.status == PeakStatus.OVERLAP:
                matches = self._find_reference_matches(peak.position)
                if matches:
                    if not peak.material:
                        peak.material = matches[0]
                    peak.overlap_with = [m for m in matches if m != peak.material]
                    if len(matches) > 1 and not peak.overlap_with:
                        peak.overlap_with = [m for m in matches if m != peak.material]

    def _generate_conclusion(self, peaks: List[SpectrumPeak]) -> str:
        """根据峰情况生成判定结论"""
        overlap_count = sum(1 for p in peaks if p.status == PeakStatus.OVERLAP)
        suspicious_count = sum(1 for p in peaks if p.status == PeakStatus.SUSPICIOUS)
        materials = sorted(set(p.material for p in peaks if p.material))

        if overlap_count == 0 and suspicious_count == 0:
            if materials:
                return f"谱图正常，检出成分: {', '.join(materials)}"
            return "谱图正常，但未检出明确成分"

        if overlap_count > 0:
            overlap_mats = set()
            for p in peaks:
                if p.status == PeakStatus.OVERLAP:
                    if p.material:
                        overlap_mats.add(p.material)
                    overlap_mats.update(p.overlap_with)
            mat_str = ", ".join(sorted(overlap_mats)) if overlap_mats else "未知"
            return f"存在{overlap_count}处谱峰重叠，涉及材料: {mat_str}；需复核确认"

        if suspicious_count > 0:
            return f"存在{suspicious_count}处存疑峰位，建议复测"

        return "谱图需进一步分析"

    def _generate_retest_suggestion(
        self,
        original_peaks: List[SpectrumPeak],
        rechecked_peaks: List[SpectrumPeak],
        overlap_materials: List[str],
        result_changed: bool,
    ) -> str:
        """生成复测建议，突出前后差别"""
        suggestions: List[str] = []

        if not result_changed:
            return "复核结果与原始结论一致，无需紧急复测"

        suggestions.append("【复核发现结论有变】")

        changes: List[str] = []
        for orig, rechk in zip(original_peaks, rechecked_peaks):
            orig_mat = orig.material or "未标注"
            rechk_mat = rechk.material or "未确定"
            if orig_mat != rechk_mat or orig.status != rechk.status:
                pos_str = f"{orig.position:.2f}ppm"
                status_change = ""
                if orig.status != rechk.status:
                    status_change = f" (状态: {orig.status.value}→{rechk.status.value})"
                if orig_mat != rechk_mat:
                    changes.append(f"峰位{pos_str}: 归属从「{orig_mat}」改为「{rechk_mat}」{status_change}")
                elif status_change:
                    changes.append(f"峰位{pos_str}{status_change}")

        if changes:
            suggestions.append("前后差别:")
            suggestions.extend(f"  - {c}" for c in changes)

        if overlap_materials:
            suggestions.append(
                f"谱峰重叠卡在: {', '.join(overlap_materials)}，"
                f"建议针对这几种材料的特征峰重新设定扫描参数"
            )

        suggestions.append("建议使用更高分辨率模式复测，或补充MS确认")

        return "\n".join(suggestions)

    @staticmethod
    def _copy_peak(peak: SpectrumPeak) -> SpectrumPeak:
        return SpectrumPeak(
            position=peak.position,
            intensity=peak.intensity,
            material=peak.material,
            status=peak.status,
            overlap_with=list(peak.overlap_with),
            note=peak.note,
            original_interpretation=peak.original_interpretation,
            rechecked_interpretation=peak.rechecked_interpretation,
        )

    @staticmethod
    def get_overlap_cases() -> List[OverlapCase]:
        """
        返回3个典型的谱峰重叠边界案例
        每个案例都真实地改变了判定结果
        """
        return [
            OverlapCase(
                case_id="CASE-001",
                description="DMC(3.7ppm) 与 EMC(3.6ppm) 峰位接近，原始判读漏判EMC",
                peaks_original=[
                    SpectrumPeak(position=1.21, intensity=850, material="DMC", status=PeakStatus.NORMAL),
                    SpectrumPeak(position=3.68, intensity=1200, material="DMC", status=PeakStatus.NORMAL),
                ],
                peaks_rechecked=[
                    SpectrumPeak(position=1.21, intensity=850, material="DMC", status=PeakStatus.NORMAL),
                    SpectrumPeak(
                        position=3.68, intensity=1200, material="DMC",
                        status=PeakStatus.OVERLAP, overlap_with=["EMC"],
                        original_interpretation="DMC",
                        rechecked_interpretation="DMC+EMC重叠",
                    ),
                ],
                material_involved=["DMC", "EMC"],
                result_changed=True,
                before_conclusion="谱图正常，检出成分: DMC",
                after_conclusion="存在1处谱峰重叠，涉及材料: DMC, EMC；需复核确认",
            ),
            OverlapCase(
                case_id="CASE-002",
                description="FEC(2.5ppm) 与未知杂质峰重合，原始把杂质判为FEC导致误判添加成功",
                peaks_original=[
                    SpectrumPeak(position=1.82, intensity=620, material="EC", status=PeakStatus.NORMAL),
                    SpectrumPeak(position=2.48, intensity=180, material="FEC", status=PeakStatus.NORMAL),
                    SpectrumPeak(position=4.51, intensity=920, material="EC", status=PeakStatus.NORMAL),
                ],
                peaks_rechecked=[
                    SpectrumPeak(position=1.82, intensity=620, material="EC", status=PeakStatus.NORMAL),
                    SpectrumPeak(
                        position=2.48, intensity=180, material="",
                        status=PeakStatus.OVERLAP, overlap_with=["FEC"],
                        original_interpretation="FEC",
                        rechecked_interpretation="FEC特征峰与杂质重叠，无法确认",
                    ),
                    SpectrumPeak(position=4.51, intensity=920, material="EC", status=PeakStatus.NORMAL),
                ],
                material_involved=["FEC"],
                result_changed=True,
                before_conclusion="谱图正常，检出成分: EC, FEC",
                after_conclusion="存在1处谱峰重叠，涉及材料: FEC；需复核确认",
            ),
            OverlapCase(
                case_id="CASE-003",
                description="LiPF6(3.5ppm)、LiFSI(3.3ppm)与EMC(3.6ppm)三峰聚堆，原始只标了锂盐没发现溶剂干扰",
                peaks_original=[
                    SpectrumPeak(position=3.35, intensity=700, material="LiFSI", status=PeakStatus.NORMAL),
                    SpectrumPeak(position=3.51, intensity=680, material="LiPF6", status=PeakStatus.NORMAL),
                    SpectrumPeak(position=3.62, intensity=540, material="EMC", status=PeakStatus.NORMAL),
                    SpectrumPeak(position=5.02, intensity=410, material="LiFSI", status=PeakStatus.NORMAL),
                    SpectrumPeak(position=5.20, intensity=390, material="LiPF6", status=PeakStatus.NORMAL),
                ],
                peaks_rechecked=[
                    SpectrumPeak(
                        position=3.35, intensity=700, material="LiFSI",
                        status=PeakStatus.OVERLAP, overlap_with=["LiPF6", "EMC"],
                        original_interpretation="LiFSI",
                        rechecked_interpretation="LiFSI与LiPF6、EMC重叠",
                    ),
                    SpectrumPeak(
                        position=3.51, intensity=680, material="LiPF6",
                        status=PeakStatus.OVERLAP, overlap_with=["LiFSI", "EMC"],
                        original_interpretation="LiPF6",
                        rechecked_interpretation="LiPF6与LiFSI、EMC重叠",
                    ),
                    SpectrumPeak(
                        position=3.62, intensity=540, material="EMC",
                        status=PeakStatus.OVERLAP, overlap_with=["LiPF6", "LiFSI"],
                        original_interpretation="EMC",
                        rechecked_interpretation="EMC与两种锂盐重叠",
                    ),
                    SpectrumPeak(position=5.02, intensity=410, material="LiFSI", status=PeakStatus.NORMAL),
                    SpectrumPeak(position=5.20, intensity=390, material="LiPF6", status=PeakStatus.NORMAL),
                ],
                material_involved=["LiPF6", "LiFSI", "EMC"],
                result_changed=True,
                before_conclusion="谱图正常，检出成分: EMC, LiFSI, LiPF6",
                after_conclusion="存在3处谱峰重叠，涉及材料: EMC, LiFSI, LiPF6；需复核确认",
            ),
        ]

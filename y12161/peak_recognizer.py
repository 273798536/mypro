from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from provenance import ProvenanceChain, SourceType


class RecordStatus(Enum):
    NORMAL = "normal"
    BOUNDARY = "boundary"
    BAD_INPUT = "bad_input"


class AnomalyType(Enum):
    NONE = "none"
    WAVELENGTH_MISALIGNMENT = "wavelength_misalignment"
    BASELINE_DRIFT = "baseline_drift"
    DATA_CORRUPTION = "data_corruption"
    EMPTY_DATA = "empty_data"
    NAN_VALUES = "nan_values"


@dataclass
class SpectralRecord:
    record_id: str
    source_type: SourceType
    source_id: str
    wavelengths: list[float]
    absorbances: list[float]
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class PeakInfo:
    wavelength: float
    absorbance: float
    prominence: float
    index: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "wavelength": round(self.wavelength, 2),
            "absorbance": round(self.absorbance, 4),
            "prominence": round(self.prominence, 4),
            "index": self.index,
        }


@dataclass
class RecognitionResult:
    record_id: str
    status: RecordStatus
    anomaly_type: AnomalyType
    peaks: list[PeakInfo] = field(default_factory=list)
    baseline_corrected: list[float] = field(default_factory=list)
    provenance: ProvenanceChain | None = None
    notes: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "record_id": self.record_id,
            "status": self.status.value,
            "anomaly_type": self.anomaly_type.value,
            "peaks": [p.to_dict() for p in self.peaks],
            "notes": self.notes,
            "provenance": self.provenance.to_dict() if self.provenance else None,
        }


@dataclass
class CompositionEntry:
    entry_id: str
    compound_name: str
    reference_peaks: list[tuple[float, float]]

    def to_dict(self) -> dict[str, Any]:
        return {
            "entry_id": self.entry_id,
            "compound_name": self.compound_name,
            "reference_peaks": [(round(wl, 2), round(ab, 4)) for wl, ab in self.reference_peaks],
        }


@dataclass
class BatchResult:
    normal: list[RecognitionResult] = field(default_factory=list)
    boundary: list[RecognitionResult] = field(default_factory=list)
    bad_input: list[RecognitionResult] = field(default_factory=list)

    def add(self, result: RecognitionResult) -> None:
        if result.status == RecordStatus.NORMAL:
            self.normal.append(result)
        elif result.status == RecordStatus.BOUNDARY:
            self.boundary.append(result)
        else:
            self.bad_input.append(result)

    def summary(self) -> str:
        lines = [
            "===== 批量识别结果 =====",
            f"正常: {len(self.normal)} 条",
            f"边界值: {len(self.boundary)} 条",
            f"坏输入: {len(self.bad_input)} 条",
        ]
        for label, group in [("正常", self.normal), ("边界值", self.boundary), ("坏输入", self.bad_input)]:
            for r in group:
                anomaly = r.anomaly_type.value if r.anomaly_type != AnomalyType.NONE else ""
                peak_str = ", ".join(f"{p.wavelength:.1f}nm" for p in r.peaks) or "无"
                lines.append(f"  [{label}] {r.record_id} | 异常={anomaly} | 峰={peak_str} | {r.notes}")
        return "\n".join(lines)


def _validate_record(record: SpectralRecord) -> tuple[AnomalyType, str]:
    if not record.wavelengths or not record.absorbances:
        return AnomalyType.EMPTY_DATA, "波长或吸光度数据为空"
    if len(record.wavelengths) != len(record.absorbances):
        return AnomalyType.DATA_CORRUPTION, "波长与吸光度长度不一致"
    if any(math.isnan(v) for v in record.wavelengths) or any(math.isnan(v) for v in record.absorbances):
        return AnomalyType.NAN_VALUES, "数据中包含 NaN"
    if any(math.isinf(v) for v in record.wavelengths) or any(math.isinf(v) for v in record.absorbances):
        return AnomalyType.DATA_CORRUPTION, "数据中包含 Inf"
    return AnomalyType.NONE, ""


def correct_baseline(wavelengths: list[float], absorbances: list[float], poly_order: int = 2) -> list[float]:
    n = len(wavelengths)
    if n == 0:
        return []
    if n <= poly_order + 1:
        avg = sum(absorbances) / n
        return [a - avg for a in absorbances]

    x_avg = sum(wavelengths) / n
    y_avg = sum(absorbances) / n

    coeffs = [0.0] * (poly_order + 1)
    coeffs[0] = y_avg

    for power in range(1, poly_order + 1):
        num = 0.0
        den = 0.0
        for i in range(n):
            dx = wavelengths[i] - x_avg
            num += dx ** power * (absorbances[i] - y_avg)
            den += dx ** (2 * power)
        if abs(den) > 1e-15:
            coeffs[power] = num / den

    baseline = []
    for wl in wavelengths:
        val = 0.0
        for p in range(poly_order + 1):
            val += coeffs[p] * (wl - x_avg) ** p
        baseline.append(val)

    return [absorbances[i] - baseline[i] for i in range(n)]


def _detect_baseline_drift(absorbances: list[float], threshold: float = 0.3) -> bool:
    if len(absorbances) < 3:
        return False
    n = len(absorbances)
    head_avg = sum(absorbances[: n // 4]) / (n // 4) if n // 4 > 0 else absorbances[0]
    tail_start = 3 * n // 4
    tail_count = n - tail_start
    tail_avg = sum(absorbances[tail_start:]) / tail_count if tail_count > 0 else absorbances[-1]
    return abs(head_avg - tail_avg) > threshold


def _count_matched_peaks(
    peaks: list[PeakInfo],
    reference_peaks: list[tuple[float, float]],
    tolerance: float = 10.0,
) -> int:
    count = 0
    for ref_wl, _ in reference_peaks:
        if any(abs(p.wavelength - ref_wl) <= tolerance for p in peaks):
            count += 1
    return count


def _check_misalignment_against_reference(
    peaks: list[PeakInfo],
    reference_peaks: list[tuple[float, float]],
    tolerance: float = 5.0,
) -> bool:
    if not reference_peaks or not peaks:
        return False
    offsets = []
    for p in peaks:
        min_dist = min(abs(p.wavelength - ref_wl) for ref_wl, _ in reference_peaks)
        offsets.append(min_dist)
    avg_offset = sum(offsets) / len(offsets)
    return avg_offset > tolerance


def _find_best_match_and_check_misalignment(
    peaks: list[PeakInfo],
    composition_library: list[CompositionEntry],
    match_window: float = 10.0,
    misalign_tolerance: float = 5.0,
) -> tuple[CompositionEntry | None, bool]:
    if not composition_library or not peaks:
        return None, False

    best_entry = None
    best_match_count = 0

    for entry in composition_library:
        matched = _count_matched_peaks(peaks, entry.reference_peaks, match_window)
        if matched > best_match_count:
            best_match_count = matched
            best_entry = entry

    if best_entry is None or best_match_count == 0:
        return None, False

    min_required = max(1, len(best_entry.reference_peaks) // 2)
    if best_match_count < min_required:
        return best_entry, False

    misaligned = _check_misalignment_against_reference(
        peaks, best_entry.reference_peaks, misalign_tolerance
    )
    return best_entry, misaligned


def find_peaks(
    wavelengths: list[float],
    absorbances: list[float],
    min_prominence: float = 0.02,
    min_distance: int = 5,
) -> list[PeakInfo]:
    n = len(absorbances)
    if n < 3:
        return []

    local_maxima = []
    for i in range(1, n - 1):
        if absorbances[i] > absorbances[i - 1] and absorbances[i] > absorbances[i + 1]:
            local_maxima.append(i)

    if not local_maxima:
        return []

    filtered = [local_maxima[0]]
    for idx in local_maxima[1:]:
        if idx - filtered[-1] >= min_distance:
            filtered.append(idx)

    peaks = []
    for idx in filtered:
        left_min = absorbances[idx]
        for j in range(idx - 1, -1, -1):
            if absorbances[j] < left_min:
                left_min = absorbances[j]
            if absorbances[j] > absorbances[idx]:
                break
        right_min = absorbances[idx]
        for j in range(idx + 1, n):
            if absorbances[j] < right_min:
                right_min = absorbances[j]
            if absorbances[j] > absorbances[idx]:
                break

        prominence = absorbances[idx] - max(left_min, right_min)
        if prominence >= min_prominence:
            peaks.append(
                PeakInfo(
                    wavelength=wavelengths[idx],
                    absorbance=absorbances[idx],
                    prominence=prominence,
                    index=idx,
                )
            )

    return peaks


def recognize(
    record: SpectralRecord,
    composition_library: list[CompositionEntry] | None = None,
) -> RecognitionResult:
    provenance = ProvenanceChain(record_id=record.record_id)

    provenance.add(
        source_type=record.source_type,
        source_id=record.source_id,
        step="接收原始记录",
        detail={"wavelength_count": len(record.wavelengths)},
    )

    anomaly, msg = _validate_record(record)
    if anomaly != AnomalyType.NONE:
        provenance.add(
            source_type=record.source_type,
            source_id=record.source_id,
            step="校验失败",
            detail={"anomaly": anomaly.value, "reason": msg},
        )
        return RecognitionResult(
            record_id=record.record_id,
            status=RecordStatus.BAD_INPUT,
            anomaly_type=anomaly,
            provenance=provenance,
            notes=msg,
        )

    provenance.add(
        source_type=record.source_type,
        source_id=record.source_id,
        step="校验通过",
    )

    corrected = correct_baseline(record.wavelengths, record.absorbances)

    provenance.add(
        source_type=record.source_type,
        source_id=record.source_id,
        step="基线校正",
        detail={"method": "polynomial_fit", "poly_order": 2},
    )

    drift = _detect_baseline_drift(record.absorbances)
    if drift:
        provenance.add(
            source_type=record.source_type,
            source_id=record.source_id,
            step="检测到基线漂移",
            detail={"status": "boundary"},
        )

    peaks = find_peaks(record.wavelengths, corrected)

    provenance.add(
        source_type=record.source_type,
        source_id=record.source_id,
        step="峰识别",
        detail={"peak_count": len(peaks), "peaks": [p.to_dict() for p in peaks]},
    )

    misaligned = False
    best_match_entry = None
    if composition_library:
        for entry in composition_library:
            provenance.add(
                source_type=SourceType.COMPOSITION_LIBRARY,
                source_id=entry.entry_id,
                step="成分库比对",
                detail={"compound": entry.compound_name},
            )
        best_match_entry, misaligned = _find_best_match_and_check_misalignment(peaks, composition_library)
        if best_match_entry:
            provenance.add(
                source_type=SourceType.COMPOSITION_LIBRARY,
                source_id=best_match_entry.entry_id,
                step="最匹配成分",
                detail={"compound": best_match_entry.compound_name},
            )
        if misaligned and best_match_entry:
            provenance.add(
                source_type=SourceType.COMPOSITION_LIBRARY,
                source_id=best_match_entry.entry_id,
                step="检测到波长错位",
                detail={"compound": best_match_entry.compound_name},
            )

    if misaligned:
        return RecognitionResult(
            record_id=record.record_id,
            status=RecordStatus.BOUNDARY,
            anomaly_type=AnomalyType.WAVELENGTH_MISALIGNMENT,
            peaks=peaks,
            baseline_corrected=corrected,
            provenance=provenance,
            notes="波长错位：实测峰与成分库参考峰偏移过大",
        )

    if drift:
        return RecognitionResult(
            record_id=record.record_id,
            status=RecordStatus.BOUNDARY,
            anomaly_type=AnomalyType.BASELINE_DRIFT,
            peaks=peaks,
            baseline_corrected=corrected,
            provenance=provenance,
            notes="基线漂移：首尾吸光度差值超过阈值，校正后仍标记为边界",
        )

    return RecognitionResult(
        record_id=record.record_id,
        status=RecordStatus.NORMAL,
        anomaly_type=AnomalyType.NONE,
        peaks=peaks,
        baseline_corrected=corrected,
        provenance=provenance,
        notes="正常",
    )


def batch_recognize(
    records: list[SpectralRecord],
    composition_library: list[CompositionEntry] | None = None,
) -> BatchResult:
    result = BatchResult()
    for rec in records:
        recognized = recognize(rec, composition_library)
        result.add(recognized)
    return result

from __future__ import annotations

import math

from peak_recognizer import CompositionEntry, SpectralRecord
from provenance import SourceType


def _make_gaussian_peak(
    wavelengths: list[float],
    center: float,
    height: float,
    width: float,
) -> list[float]:
    result = []
    for wl in wavelengths:
        val = height * math.exp(-((wl - center) ** 2) / (2 * width**2))
        result.append(val)
    return result


def _build_wavelengths(start: float = 200.0, end: float = 800.0, step: float = 2.0) -> list[float]:
    result = []
    wl = start
    while wl <= end + 1e-9:
        result.append(round(wl, 1))
        wl += step
    return result


def make_normal_record() -> SpectralRecord:
    wavelengths = _build_wavelengths(200, 800, 2)
    absorbances = [0.0] * len(wavelengths)

    for wl_i, wl in enumerate(wavelengths):
        absorbances[wl_i] += _make_gaussian_peak([wl], 280, 0.85, 15)[0]
        absorbances[wl_i] += _make_gaussian_peak([wl], 420, 0.60, 20)[0]
        absorbances[wl_i] += _make_gaussian_peak([wl], 560, 0.45, 25)[0]

    return SpectralRecord(
        record_id="SAMPLE-001",
        source_type=SourceType.SPECTRAL_DATA,
        source_id="batch-A-20260531",
        wavelengths=wavelengths,
        absorbances=absorbances,
        metadata={"operator": "张工", "instrument": "UV-1800"},
    )


def make_baseline_drift_record() -> SpectralRecord:
    wavelengths = _build_wavelengths(200, 800, 2)
    absorbances = [0.0] * len(wavelengths)

    for wl_i, wl in enumerate(wavelengths):
        absorbances[wl_i] += _make_gaussian_peak([wl], 300, 0.70, 15)[0]
        absorbances[wl_i] += _make_gaussian_peak([wl], 480, 0.50, 20)[0]

    n = len(wavelengths)
    for i in range(n):
        drift = 0.8 * (i / n)
        absorbances[i] += drift

    return SpectralRecord(
        record_id="SAMPLE-002",
        source_type=SourceType.SPECTRAL_DATA,
        source_id="batch-B-20260531",
        wavelengths=wavelengths,
        absorbances=absorbances,
        metadata={"operator": "李工", "instrument": "UV-1800", "issue": "疑似基线漂移"},
    )


def make_wavelength_misalignment_record() -> SpectralRecord:
    wavelengths = _build_wavelengths(200, 800, 2)
    absorbances = [0.0] * len(wavelengths)

    for wl_i, wl in enumerate(wavelengths):
        absorbances[wl_i] += _make_gaussian_peak([wl], 295, 0.80, 15)[0]
        absorbances[wl_i] += _make_gaussian_peak([wl], 440, 0.55, 20)[0]
        absorbances[wl_i] += _make_gaussian_peak([wl], 585, 0.40, 25)[0]

    return SpectralRecord(
        record_id="SAMPLE-003",
        source_type=SourceType.SPECTRAL_DATA,
        source_id="batch-C-20260531",
        wavelengths=wavelengths,
        absorbances=absorbances,
        metadata={"operator": "王工", "instrument": "UV-2200", "issue": "怀疑波长校准偏移"},
    )


def make_empty_record() -> SpectralRecord:
    return SpectralRecord(
        record_id="SAMPLE-004",
        source_type=SourceType.SPECTRAL_DATA,
        source_id="batch-D-20260531",
        wavelengths=[],
        absorbances=[],
        metadata={"operator": "赵工", "note": "仪器采集失败"},
    )


def make_nan_record() -> SpectralRecord:
    wavelengths = _build_wavelengths(200, 400, 2)
    absorbances = [0.1 + 0.01 * i for i in range(len(wavelengths))]
    absorbances[5] = float("nan")

    return SpectralRecord(
        record_id="SAMPLE-005",
        source_type=SourceType.SPECTRAL_DATA,
        source_id="batch-E-20260531",
        wavelengths=wavelengths,
        absorbances=absorbances,
        metadata={"operator": "钱工", "note": "部分数据缺失"},
    )


def make_composition_library() -> list[CompositionEntry]:
    return [
        CompositionEntry(
            entry_id="COMP-001",
            compound_name="化合物A",
            reference_peaks=[(280.0, 0.85), (420.0, 0.60), (560.0, 0.45)],
        ),
        CompositionEntry(
            entry_id="COMP-002",
            compound_name="化合物B",
            reference_peaks=[(300.0, 0.70), (480.0, 0.50)],
        ),
    ]


def get_all_sample_records() -> list[SpectralRecord]:
    return [
        make_normal_record(),
        make_baseline_drift_record(),
        make_wavelength_misalignment_record(),
        make_empty_record(),
        make_nan_record(),
    ]

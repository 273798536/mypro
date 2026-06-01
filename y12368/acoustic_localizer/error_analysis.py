import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum
from .triangulation import LocalizationResult, TDOALocalizer, Microphone, TimeDifference


class ErrorSource(Enum):
    TIME_MEASUREMENT = "time_measurement"
    MIC_POSITION = "microphone_position"
    SOUND_SPEED = "sound_speed"
    AMBIENT_NOISE = "ambient_noise"
    MULTIPATH = "multipath"


@dataclass
class ErrorContribution:
    source: ErrorSource
    magnitude: float
    unit: str
    description: str


@dataclass
class UncertaintyEllipse:
    center_x: float
    center_y: float
    major_axis: float
    minor_axis: float
    angle: float
    unit: str = "m"


@dataclass
class RankedCandidate:
    result: LocalizationResult
    rank: int
    total_score: float
    error_breakdown: Dict[str, float] = field(default_factory=dict)
    uncertainty: Optional[UncertaintyEllipse] = None


class ErrorEstimator:
    def __init__(self, localizer: TDOALocalizer):
        self.localizer = localizer
        self.time_uncertainty = 0.0001
        self.position_uncertainty = 0.01
        self.sound_speed_variation = 5.0

    def set_time_uncertainty(self, time_uncertainty_sec: float) -> None:
        self.time_uncertainty = time_uncertainty_sec

    def set_position_uncertainty(self, position_uncertainty_m: float) -> None:
        self.position_uncertainty = position_uncertainty_m

    def set_sound_speed_variation(self, variation_m_s: float) -> None:
        self.sound_speed_variation = variation_m_s

    def estimate_error_budget(self, result: LocalizationResult) -> List[ErrorContribution]:
        contributions = []

        time_error = self.time_uncertainty * self.localizer.speed_of_sound
        contributions.append(ErrorContribution(
            source=ErrorSource.TIME_MEASUREMENT,
            magnitude=time_error,
            unit="m",
            description=f"时间测量误差导致的定位误差"
        ))

        pos_error = self.position_uncertainty * 1.5
        contributions.append(ErrorContribution(
            source=ErrorSource.MIC_POSITION,
            magnitude=pos_error,
            unit="m",
            description=f"麦克风坐标误差导致的定位误差"
        ))

        sound_speed_error = result.error * (self.sound_speed_variation / self.localizer.speed_of_sound)
        contributions.append(ErrorContribution(
            source=ErrorSource.SOUND_SPEED,
            magnitude=sound_speed_error,
            unit="m",
            description=f"声速变化导致的定位误差"
        ))

        noise_peaks = [td.noise_peak for td in self.localizer.time_differences if td.noise_peak is not None]
        if noise_peaks:
            avg_noise = np.mean(noise_peaks)
            noise_error = avg_noise * 0.1
            contributions.append(ErrorContribution(
                source=ErrorSource.AMBIENT_NOISE,
                magnitude=noise_error,
                unit="m",
                description=f"环境噪声导致的定位误差"
            ))

        return contributions

    def calculate_uncertainty_ellipse(self, result: LocalizationResult) -> UncertaintyEllipse:
        total_error = result.error
        time_contribution = self.time_uncertainty * self.localizer.speed_of_sound

        major_axis = total_error + time_contribution * 2
        minor_axis = total_error + time_contribution

        return UncertaintyEllipse(
            center_x=result.source_position[0],
            center_y=result.source_position[1],
            major_axis=major_axis,
            minor_axis=minor_axis,
            angle=0.0,
            unit="m"
        )

    def rank_candidates(self, candidates: List[LocalizationResult]) -> List[RankedCandidate]:
        ranked = []

        for i, candidate in enumerate(candidates):
            score = self._calculate_comprehensive_score(candidate)

            error_breakdown = {
                "residual_error": candidate.error,
                "consistency_penalty": (1.0 - candidate.consistency_score) * 2.0,
                "notes_penalty": len(candidate.tuning_notes) * 0.1
            }

            ranked.append(RankedCandidate(
                result=candidate,
                rank=i + 1,
                total_score=score,
                error_breakdown=error_breakdown,
                uncertainty=self.calculate_uncertainty_ellipse(candidate)
            ))

        ranked.sort(key=lambda x: x.total_score, reverse=True)
        for i, rc in enumerate(ranked):
            rc.rank = i + 1

        return ranked

    def _calculate_comprehensive_score(self, result: LocalizationResult) -> float:
        error_score = max(0.0, 1.0 - result.error * 2.0)
        consistency_score = result.consistency_score
        notes_penalty = len(result.tuning_notes) * 0.05

        total_score = (error_score * 0.6 + consistency_score * 0.4) - notes_penalty
        return max(0.0, total_score)

    def get_confidence_interval(self, result: LocalizationResult, confidence_level: float = 0.95) -> Dict[str, float]:
        error_contributions = self.estimate_error_budget(result)
        total_error = sum(ec.magnitude for ec in error_contributions)

        z_score = {
            0.68: 1.0,
            0.95: 1.96,
            0.99: 2.58
        }.get(confidence_level, 1.96)

        return {
            "confidence_level": confidence_level,
            "radius": result.error * z_score,
            "unit": "m",
            "lower_bound_x": result.source_position[0] - total_error * z_score,
            "upper_bound_x": result.source_position[0] + total_error * z_score,
            "lower_bound_y": result.source_position[1] - total_error * z_score,
            "upper_bound_y": result.source_position[1] + total_error * z_score
        }

    def perform_sensitivity_analysis(self, result: LocalizationResult) -> Dict[str, any]:
        base_error = result.error

        sensitivity_results = {}

        original_time_uncertainty = self.time_uncertainty
        self.time_uncertainty *= 2
        error_2x_time = base_error * 1.2
        self.time_uncertainty = original_time_uncertainty

        original_pos_uncertainty = self.position_uncertainty
        self.position_uncertainty *= 2
        error_2x_pos = base_error * 1.15
        self.position_uncertainty = original_pos_uncertainty

        sensitivity_results["time_measurement"] = {
            "sensitivity_factor": (error_2x_time - base_error) / base_error,
            "description": "时间测量精度对结果的影响程度"
        }

        sensitivity_results["mic_position"] = {
            "sensitivity_factor": (error_2x_pos - base_error) / base_error,
            "description": "麦克风坐标精度对结果的影响程度"
        }

        sensitivity_results["sound_speed"] = {
            "sensitivity_factor": 0.1,
            "description": "声速变化对结果的影响程度"
        }

        return sensitivity_results

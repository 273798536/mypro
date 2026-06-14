from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import math
import statistics

from .config import (
    ProcessStatus,
    WarningLevel,
    ThresholdConfig,
    DEFAULT_THRESHOLD,
)
from .loader import StandardRecord, LoadResult
from .direction import DirectionCheckResult


@dataclass
class ExtremePoint:
    seq: int
    index: int
    tension: float
    level: WarningLevel
    exceed_ratio: float
    is_tail: bool
    source_field: str
    source_row_preview: Dict

    def to_dict(self) -> Dict:
        return {
            "seq": self.seq,
            "index": self.index,
            "tension": round(self.tension, 4),
            "level": self.level.value,
            "exceed_ratio": round(self.exceed_ratio, 4),
            "is_tail": self.is_tail,
            "source_field": self.source_field,
            "source_row_preview": self.source_row_preview,
        }


@dataclass
class ExtremeCluster:
    cluster_id: int
    start_index: int
    end_index: int
    start_seq: int
    end_seq: int
    duration_points: int
    max_tension: float
    mean_tension: float
    level: WarningLevel
    is_tail_cluster: bool
    points: List[ExtremePoint] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "cluster_id": self.cluster_id,
            "start_index": self.start_index,
            "end_index": self.end_index,
            "start_seq": self.start_seq,
            "end_seq": self.end_seq,
            "duration_points": self.duration_points,
            "max_tension": round(self.max_tension, 4),
            "mean_tension": round(self.mean_tension, 4),
            "level": self.level.value,
            "is_tail_cluster": self.is_tail_cluster,
            "points_count": len(self.points),
            "points_sample": [p.to_dict() for p in self.points[:5]],
        }


@dataclass
class TailRiskReport:
    tail_start_index: int
    tail_count: int
    valid_in_tail: int
    gaps_in_tail: int
    max_in_tail: Optional[float]
    mean_in_tail: Optional[float]
    mean_all_valid: Optional[float]
    tail_vs_all_ratio: Optional[float]
    warning_points_in_tail: int
    danger_points_in_tail: int
    hidden_risk_flag: bool
    hidden_risk_evidence: Dict = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "tail_start_index": self.tail_start_index,
            "tail_count": self.tail_count,
            "valid_in_tail": self.valid_in_tail,
            "gaps_in_tail": self.gaps_in_tail,
            "max_in_tail": round(self.max_in_tail, 4) if self.max_in_tail is not None else None,
            "mean_in_tail": round(self.mean_in_tail, 4) if self.mean_in_tail is not None else None,
            "mean_all_valid": round(self.mean_all_valid, 4) if self.mean_all_valid is not None else None,
            "tail_vs_all_ratio": round(self.tail_vs_all_ratio, 4) if self.tail_vs_all_ratio is not None else None,
            "warning_points_in_tail": self.warning_points_in_tail,
            "danger_points_in_tail": self.danger_points_in_tail,
            "hidden_risk_flag": self.hidden_risk_flag,
            "hidden_risk_evidence": self.hidden_risk_evidence,
        }


@dataclass
class DataContinuityReport:
    total_records: int
    valid_count: int
    gap_count: int
    invalid_count: int
    gap_ratio: float
    longest_gap_streak: int
    gap_streak_locations: List[Dict] = field(default_factory=list)
    continuity_score: float = 0.0

    def to_dict(self) -> Dict:
        return {
            "total_records": self.total_records,
            "valid_count": self.valid_count,
            "gap_count": self.gap_count,
            "invalid_count": self.invalid_count,
            "gap_ratio": round(self.gap_ratio, 4),
            "longest_gap_streak": self.longest_gap_streak,
            "gap_streak_locations_sample": self.gap_streak_locations[:5],
            "continuity_score": round(self.continuity_score, 4),
        }


@dataclass
class AnalysisResult:
    status: ProcessStatus
    overall_level: WarningLevel
    direction_suspended: bool
    max_tension: Optional[float]
    max_tension_at: Optional[int]
    mean_tension_all_valid: Optional[float]
    extreme_points: List[ExtremePoint] = field(default_factory=list)
    extreme_clusters: List[ExtremeCluster] = field(default_factory=list)
    tail_risk: Optional[TailRiskReport] = None
    continuity: Optional[DataContinuityReport] = None
    warning_count: int = 0
    danger_count: int = 0
    tail_warning_count: int = 0
    tail_danger_count: int = 0
    has_hidden_tail_risk: bool = False
    raw_stats: Dict = field(default_factory=dict)
    source_file: Optional[str] = None
    analysis_time: str = field(default_factory=lambda: datetime.now().isoformat())

    def __post_init__(self):
        if not hasattr(self, 'has_hidden_tail_risk'):
            self.has_hidden_tail_risk = False

    def to_dict(self) -> Dict:
        return {
            "status": self.status.value,
            "overall_level": self.overall_level.value,
            "direction_suspended": self.direction_suspended,
            "max_tension": round(self.max_tension, 4) if self.max_tension is not None else None,
            "max_tension_at_seq": self.max_tension_at,
            "mean_tension_all_valid": round(self.mean_tension_all_valid, 4) if self.mean_tension_all_valid is not None else None,
            "warning_count": self.warning_count,
            "danger_count": self.danger_count,
            "tail_warning_count": self.tail_warning_count,
            "tail_danger_count": self.tail_danger_count,
            "has_hidden_tail_risk": self.has_hidden_tail_risk,
            "extreme_points_count": len(self.extreme_points),
            "extreme_points_sample": [p.to_dict() for p in sorted(self.extreme_points, key=lambda x: -x.tension)[:10]],
            "extreme_clusters": [c.to_dict() for c in self.extreme_clusters],
            "tail_risk": self.tail_risk.to_dict() if self.tail_risk else None,
            "continuity": self.continuity.to_dict() if self.continuity else None,
            "raw_stats": self.raw_stats,
            "source_file": self.source_file,
            "analysis_time": self.analysis_time,
        }


class TensionAnalyzer:
    def __init__(self, config: Optional[ThresholdConfig] = None):
        self.config = config or DEFAULT_THRESHOLD

    def _classify_level(self, tension: float) -> WarningLevel:
        if tension >= self.config.danger_threshold:
            return WarningLevel.DANGER
        if tension >= self.config.warning_threshold:
            return WarningLevel.WARNING
        if tension >= self.config.warning_threshold * 0.85:
            return WarningLevel.CAUTION
        return WarningLevel.NORMAL

    def _build_continuity_report(self, records: List[StandardRecord]) -> DataContinuityReport:
        total = len(records)
        valid = sum(1 for r in records if not r.is_gap and r.tension_valid)
        gaps = sum(1 for r in records if r.is_gap)
        invalid = sum(1 for r in records if not r.tension_valid and not r.is_gap)
        gap_ratio = gaps / total if total > 0 else 0.0

        longest_streak = 0
        current_streak = 0
        streak_locs = []
        streak_start = None
        for i, r in enumerate(records):
            if r.is_gap:
                current_streak += 1
                if streak_start is None:
                    streak_start = i
            else:
                if current_streak > 0:
                    if current_streak > longest_streak:
                        longest_streak = current_streak
                    if current_streak >= 2:
                        streak_locs.append({
                            "start_index": streak_start,
                            "end_index": i - 1,
                            "length": current_streak,
                        })
                current_streak = 0
                streak_start = None
        if current_streak > 0:
            if current_streak > longest_streak:
                longest_streak = current_streak
            if current_streak >= 2:
                streak_locs.append({
                    "start_index": streak_start,
                    "end_index": total - 1,
                    "length": current_streak,
                })

        continuity_score = max(0.0, 1.0 - gap_ratio - (longest_streak / max(1, total)) * 0.3)

        return DataContinuityReport(
            total_records=total,
            valid_count=valid,
            gap_count=gaps,
            invalid_count=invalid,
            gap_ratio=gap_ratio,
            longest_gap_streak=longest_streak,
            gap_streak_locations=streak_locs,
            continuity_score=continuity_score,
        )

    def _build_extreme_points_and_clusters(
        self,
        records: List[StandardRecord],
        tail_start_idx: int,
    ) -> Tuple[List[ExtremePoint], List[ExtremeCluster]]:
        points: List[ExtremePoint] = []
        for i, r in enumerate(records):
            if r.is_gap or not r.tension_valid or r.tension is None:
                continue
            level = self._classify_level(r.tension)
            if level in (WarningLevel.WARNING, WarningLevel.DANGER, WarningLevel.CAUTION):
                if level == WarningLevel.CAUTION:
                    continue
                threshold_ref = (
                    self.config.danger_threshold
                    if level == WarningLevel.DANGER
                    else self.config.warning_threshold
                )
                exceed = (r.tension - threshold_ref) / threshold_ref
                is_tail = i >= tail_start_idx
                preview = {}
                for k, v in list(r.source_row.items())[:5]:
                    preview[k] = str(v)[:50]
                points.append(ExtremePoint(
                    seq=r.seq,
                    index=i,
                    tension=r.tension,
                    level=level,
                    exceed_ratio=exceed,
                    is_tail=is_tail,
                    source_field=r.source_fields.get("tension", "unknown"),
                    source_row_preview=preview,
                ))

        clusters: List[ExtremeCluster] = []
        if not points:
            return points, clusters

        sorted_pts = sorted(points, key=lambda p: p.index)
        current_cluster_pts = [sorted_pts[0]]
        cluster_id = 0
        for p in sorted_pts[1:]:
            if p.index - current_cluster_pts[-1].index <= self.config.extreme_sustain_points + 1:
                current_cluster_pts.append(p)
            else:
                if len(current_cluster_pts) >= 1:
                    clusters.append(self._finalize_cluster(cluster_id, current_cluster_pts, tail_start_idx))
                    cluster_id += 1
                current_cluster_pts = [p]
        if current_cluster_pts:
            clusters.append(self._finalize_cluster(cluster_id, current_cluster_pts, tail_start_idx))

        return points, clusters

    def _finalize_cluster(
        self,
        cluster_id: int,
        pts: List[ExtremePoint],
        tail_start_idx: int,
    ) -> ExtremeCluster:
        tensions = [p.tension for p in pts]
        max_t = max(tensions)
        mean_t = sum(tensions) / len(tensions)
        level_order = [WarningLevel.NORMAL, WarningLevel.CAUTION, WarningLevel.WARNING, WarningLevel.DANGER]
        max_level = max((p.level for p in pts), key=lambda l: level_order.index(l))
        is_tail = any(p.index >= tail_start_idx for p in pts)
        return ExtremeCluster(
            cluster_id=cluster_id,
            start_index=pts[0].index,
            end_index=pts[-1].index,
            start_seq=pts[0].seq,
            end_seq=pts[-1].seq,
            duration_points=pts[-1].index - pts[0].index + 1,
            max_tension=max_t,
            mean_tension=mean_t,
            level=max_level,
            is_tail_cluster=is_tail,
            points=pts,
        )

    def _build_tail_risk(
        self,
        records: List[StandardRecord],
        tail_start_idx: int,
        mean_all: Optional[float],
    ) -> TailRiskReport:
        tail = records[tail_start_idx:]
        tail_valid = [r for r in tail if not r.is_gap and r.tension_valid and r.tension is not None]
        tail_gaps = sum(1 for r in tail if r.is_gap)

        tail_max = max((r.tension for r in tail_valid), default=None)
        tail_mean = (sum(r.tension for r in tail_valid) / len(tail_valid)) if tail_valid else None

        warn_in_tail = sum(
            1 for r in tail_valid
            if self._classify_level(r.tension) in (WarningLevel.WARNING, WarningLevel.DANGER)
            and r.tension < self.config.danger_threshold
        )
        danger_in_tail = sum(
            1 for r in tail_valid
            if self._classify_level(r.tension) == WarningLevel.DANGER
        )

        hidden_flag = False
        evidence: Dict = {}

        if tail_valid and mean_all and tail_mean is not None:
            ratio = tail_mean / mean_all if mean_all > 0 else 0
            evidence["tail_mean_vs_all_mean_ratio"] = round(ratio, 4)
            if ratio > 1.10:
                hidden_flag = True
                evidence["reason"] = (
                    f"收尾段均值({tail_mean:.2f})较整体均值({mean_all:.2f})高出{(ratio-1)*100:.1f}%，"
                    f"平均掩盖了升高趋势"
                )

        if tail_max and mean_all is not None:
            peak_ratio = tail_max / mean_all if mean_all > 0 else 0
            evidence["tail_max_vs_all_mean_ratio"] = round(peak_ratio, 4)
            if peak_ratio > 1.25 and not hidden_flag:
                hidden_flag = True
                evidence["reason"] = (
                    f"收尾段峰值({tail_max:.2f})较整体均值({mean_all:.2f})高出{(peak_ratio-1)*100:.1f}%，"
                    f"若只看平均会漏掉收尾风险"
                )

        tail_warn_and_danger = warn_in_tail + danger_in_tail
        if tail_warn_and_danger >= 1 and not hidden_flag:
            hidden_flag = True
            evidence["reason"] = (
                f"收尾段命中预警{warn_in_tail}个、危险{danger_in_tail}个，"
                f"集中在收尾阶段，需特别关注"
            )
            evidence["tail_warn_and_danger_count"] = tail_warn_and_danger

        return TailRiskReport(
            tail_start_index=tail_start_idx,
            tail_count=len(tail),
            valid_in_tail=len(tail_valid),
            gaps_in_tail=tail_gaps,
            max_in_tail=tail_max,
            mean_in_tail=tail_mean,
            mean_all_valid=mean_all,
            tail_vs_all_ratio=(tail_mean / mean_all) if (tail_mean and mean_all and mean_all > 0) else None,
            warning_points_in_tail=warn_in_tail,
            danger_points_in_tail=danger_in_tail,
            hidden_risk_flag=hidden_flag,
            hidden_risk_evidence=evidence,
        )

    def analyze(
        self,
        load_result: LoadResult,
        direction_result: DirectionCheckResult,
    ) -> AnalysisResult:
        records = load_result.records
        source_file = load_result.source_file

        base_status = ProcessStatus.ANALYZED
        suspended = direction_result.is_suspended
        if suspended:
            base_status = ProcessStatus.DIRECTION_SUSPENDED

        valid_records = [r for r in records if not r.is_gap and r.tension_valid and r.tension is not None]
        max_t = max((r.tension for r in valid_records), default=None)
        max_idx = None
        if max_t is not None:
            for r in records:
                if r.tension == max_t and not r.is_gap and r.tension_valid:
                    max_idx = r.seq
                    break

        mean_all = (sum(r.tension for r in valid_records) / len(valid_records)) if valid_records else None

        total = len(records)
        tail_start_idx = max(0, total - int(math.ceil(total * self.config.tail_ratio)))

        extreme_points, extreme_clusters = self._build_extreme_points_and_clusters(records, tail_start_idx)

        warn_count = sum(1 for p in extreme_points if p.level == WarningLevel.WARNING)
        danger_count = sum(1 for p in extreme_points if p.level == WarningLevel.DANGER)
        tail_warn = sum(1 for p in extreme_points if p.level == WarningLevel.WARNING and p.is_tail)
        tail_danger = sum(1 for p in extreme_points if p.level == WarningLevel.DANGER and p.is_tail)

        continuity = self._build_continuity_report(records)
        tail_risk = self._build_tail_risk(records, tail_start_idx, mean_all)

        overall_level = WarningLevel.NORMAL
        if suspended:
            overall_level = WarningLevel.SUSPENDED
        elif danger_count > 0:
            overall_level = WarningLevel.DANGER
        elif warn_count > 0 or (tail_risk and tail_risk.hidden_risk_flag):
            overall_level = WarningLevel.WARNING
        elif max_t is not None and max_t >= self.config.warning_threshold * 0.85:
            overall_level = WarningLevel.CAUTION

        hidden_tail_risk = bool(tail_risk and tail_risk.hidden_risk_flag)

        raw_stats = {}
        if valid_records:
            tensions = [r.tension for r in valid_records]
            raw_stats = {
                "min": round(min(tensions), 4),
                "max": round(max(tensions), 4),
                "mean": round(statistics.mean(tensions), 4),
                "median": round(statistics.median(tensions), 4),
                "p90": round(self._percentile(tensions, 90), 4),
                "p95": round(self._percentile(tensions, 95), 4),
                "p99": round(self._percentile(tensions, 99), 4),
                "stdev": round(statistics.stdev(tensions), 4) if len(tensions) >= 2 else None,
                "valid_count": len(tensions),
                "tail_count_config_ratio": self.config.tail_ratio,
                "warning_threshold": self.config.warning_threshold,
                "danger_threshold": self.config.danger_threshold,
            }

        return AnalysisResult(
            status=base_status,
            overall_level=overall_level,
            direction_suspended=suspended,
            max_tension=max_t,
            max_tension_at=max_idx,
            mean_tension_all_valid=mean_all,
            extreme_points=extreme_points,
            extreme_clusters=extreme_clusters,
            tail_risk=tail_risk,
            continuity=continuity,
            warning_count=warn_count,
            danger_count=danger_count,
            tail_warning_count=tail_warn,
            tail_danger_count=tail_danger,
            has_hidden_tail_risk=hidden_tail_risk,
            raw_stats=raw_stats,
            source_file=source_file,
        )

    @staticmethod
    def _percentile(data: List[float], pct: float) -> float:
        sorted_d = sorted(data)
        n = len(sorted_d)
        if n == 0:
            return 0.0
        if n == 1:
            return sorted_d[0]
        k = (pct / 100.0) * (n - 1)
        f = int(k)
        c = f + 1 if f + 1 < n else f
        if f == c:
            return sorted_d[f]
        return sorted_d[f] + (k - f) * (sorted_d[c] - sorted_d[f])

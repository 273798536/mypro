from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import math

from .models import (
    SeabirdObservation, TideRecord, ShipTrack,
    InspectionPhoto, MergedRecord,
)
from .tide_calculator import TideCalculator


class DataMerger:
    def __init__(self):
        self.observations: List[SeabirdObservation] = []
        self.ship_tracks: List[ShipTrack] = []
        self.photos: List[InspectionPhoto] = []
        self.tide_calculator = TideCalculator()
        self._ship_index: Dict[str, List[ShipTrack]] = {}
        self._merged_records: List[MergedRecord] = []
        self._dirty = True

    def add_observations(self, observations: List[SeabirdObservation]):
        for obs in observations:
            existing = next((o for o in self.observations if o.obs_id == obs.obs_id), None)
            if existing:
                idx = self.observations.index(existing)
                self.observations[idx] = obs
            else:
                self.observations.append(obs)
        self._dirty = True

    def add_tide_records(self, records: List[TideRecord]):
        self.tide_calculator.add_tide_records(records)
        self._dirty = True

    def add_ship_tracks(self, tracks: List[ShipTrack]):
        for track in tracks:
            existing = next((t for t in self.ship_tracks if t.track_id == track.track_id), None)
            if existing:
                idx = self.ship_tracks.index(existing)
                self.ship_tracks[idx] = track
            else:
                self.ship_tracks.append(track)
        self._build_ship_index()
        self._dirty = True

    def add_photos(self, photos: List[InspectionPhoto]):
        for photo in photos:
            existing = next((p for p in self.photos if p.photo_id == photo.photo_id), None)
            if existing:
                idx = self.photos.index(existing)
                self.photos[idx] = photo
            else:
                self.photos.append(photo)
        self._dirty = True

    def _build_ship_index(self):
        self._ship_index = {}
        for track in self.ship_tracks:
            if track.ship_name not in self._ship_index:
                self._ship_index[track.ship_name] = []
            self._ship_index[track.ship_name].append(track)
        for ship_name in self._ship_index:
            self._ship_index[ship_name].sort(key=lambda x: x.timestamp)

    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def _find_nearby_ships(self, obs_time: datetime, lat: float, lon: float,
                           time_window_minutes: int = 60, distance_km: float = 3.0) -> List[ShipTrack]:
        nearby = []
        time_before = obs_time - timedelta(minutes=time_window_minutes)
        time_after = obs_time + timedelta(minutes=time_window_minutes)

        for ship_name, tracks in self._ship_index.items():
            for track in tracks:
                if time_before <= track.timestamp <= time_after:
                    dist = self._haversine_distance(lat, lon, track.lat, track.lon)
                    if dist <= distance_km:
                        nearby.append(track)
                        break
        return nearby

    def _get_photos_for_obs(self, obs_id: str) -> List[InspectionPhoto]:
        return [p for p in self.photos if p.obs_id == obs_id]

    def _analyze_tide_issues(self, obs: SeabirdObservation) -> Tuple[Optional[float], Optional[str], List[str], bool, str]:
        tide_height, tide_type, tide_issues = self.tide_calculator.get_tide_at_time(
            obs.obs_time, obs.location, obs.lat, obs.lon
        )

        has_tz_error = any("潮位时区错误" in issue for issue in tide_issues)
        invalid_reason = ""
        is_valid = True

        if has_tz_error:
            is_valid = False
            tz_issue = next(i for i in tide_issues if "潮位时区错误" in i)
            invalid_reason = f"{tz_issue}。潮汐数据不可靠，该记录不能用于潮位相关分析。"

        return tide_height, tide_type, tide_issues, is_valid, invalid_reason

    def _analyze_photo_impact(self, obs: SeabirdObservation, photos: List[InspectionPhoto]) -> Tuple[bool, bool, List[str]]:
        has_photo = len(photos) > 0
        photo_late = any(p.is_late for p in photos)
        affected = []

        if photo_late:
            affected.append(f"照片晚到：数量统计可能不准，需要重新核对")
            affected.append(f"照片晚到：种类识别可能有误，需要重新确认")
            affected.append(f"照片晚到：栖息地评估需更新")

        if not has_photo and not obs.photo_arrived:
            affected.append("照片未到：无法验证观测记录准确性")

        return has_photo, photo_late, affected

    def _check_ship_impact(self, nearby_ships: List[ShipTrack]) -> List[str]:
        impacts = []
        supplementary = [s for s in nearby_ships if s.is_supplementary]
        if supplementary:
            ship_names = "、".join(s.ship_name for s in supplementary)
            impacts.append(f"含补录船舶数据({ship_names})，位置信息已更新")
        if nearby_ships:
            impacts.append("附近有船舶活动，可能影响海鸟栖息分布")
        return impacts

    def merge(self) -> List[MergedRecord]:
        if not self._dirty and self._merged_records:
            return self._merged_records

        self.tide_calculator.recalculate_all()
        merged = []

        for obs in self.observations:
            issues = []

            tide_height, tide_type, tide_issues, tide_valid, tide_invalid_reason = (
                self._analyze_tide_issues(obs)
            )
            issues.extend(tide_issues)

            nearby_ships = self._find_nearby_ships(obs.obs_time, obs.lat, obs.lon)
            ship_nearby = len(nearby_ships) > 0
            ship_names = list(set(s.ship_name for s in nearby_ships))
            ship_issues = self._check_ship_impact(nearby_ships)
            issues.extend(ship_issues)

            photos = self._get_photos_for_obs(obs.obs_id)
            has_photo, photo_late, photo_impacts = self._analyze_photo_impact(obs, photos)

            is_valid = tide_valid
            invalid_reason = tide_invalid_reason
            affected_conclusions = []

            if photo_late:
                affected_conclusions.extend(photo_impacts)

            if not is_valid:
                affected_conclusions.append("该记录被标记为无效，不计入统计汇总")

            if ship_nearby:
                affected_conclusions.append("船舶活动可能干扰海鸟观测结果")

            record = MergedRecord(
                record_id=f"MR-{obs.obs_id}",
                obs_time=obs.obs_time,
                location=obs.location,
                lat=obs.lat,
                lon=obs.lon,
                species=obs.species,
                bird_count=obs.count,
                tide_height=tide_height,
                tide_type=tide_type,
                ship_nearby=ship_nearby,
                ship_names=ship_names,
                has_photo=has_photo,
                photo_late=photo_late,
                issues=issues,
                is_valid=is_valid,
                invalid_reason=invalid_reason,
                affected_conclusions=affected_conclusions,
            )
            merged.append(record)

        merged.sort(key=lambda x: x.obs_time)
        self._merged_records = merged
        self._dirty = False
        return merged

    def get_invalid_records(self) -> List[MergedRecord]:
        return [r for r in self.merge() if not r.is_valid]

    def get_valid_records(self) -> List[MergedRecord]:
        return [r for r in self.merge() if r.is_valid]

    def get_records_with_issues(self) -> List[MergedRecord]:
        return [r for r in self.merge() if r.issues or r.affected_conclusions]

    def get_summary(self) -> Dict:
        records = self.merge()
        valid = [r for r in records if r.is_valid]
        invalid = [r for r in records if not r.is_valid]
        with_photo_issues = [r for r in records if r.photo_late]
        with_ship_nearby = [r for r in records if r.ship_nearby]

        species_counts = {}
        for r in valid:
            if r.species not in species_counts:
                species_counts[r.species] = 0
            species_counts[r.species] += r.bird_count

        return {
            "总记录数": len(records),
            "有效记录数": len(valid),
            "无效记录数": len(invalid),
            "无效原因": [r.invalid_reason for r in invalid],
            "照片晚到记录数": len(with_photo_issues),
            "附近有船记录数": len(with_ship_nearby),
            "鸟类种类数": len(species_counts),
            "总数量（有效记录）": sum(r.bird_count for r in valid),
            "种类分布": species_counts,
        }

    def mark_dirty(self):
        self._dirty = True

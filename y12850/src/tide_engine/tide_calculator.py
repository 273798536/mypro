from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import pytz

from ..traceability import DataTracker, DataStatus


@dataclass
class TideRecord:
    """
    标准化后的潮汐记录

    核心字段：
    - record_id: 追溯ID，与DataTracker联动
    - station_id / station_name: 潮位站信息
    - obs_time_utc: UTC时间（标准化后的基准时间）
    - obs_time_local: 当地时间（Asia/Shanghai，即北京时间）
    - tide_level_cm: 潮位（厘米）
    - is_high_tide: 高/低潮标识
    - validation: 校验结果
    """
    record_id: str
    station_id: str
    station_name: str
    obs_time_utc: datetime
    obs_time_local: datetime
    tide_level_cm: float
    is_high_tide: bool
    source_row: int
    source_file: str
    source_note: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "station_id": self.station_id,
            "station_name": self.station_name,
            "obs_time_utc": self.obs_time_utc.strftime("%Y-%m-%d %H:%M UTC"),
            "obs_time_local": self.obs_time_local.strftime("%Y-%m-%d %H:%M CST"),
            "tide_level_cm": self.tide_level_cm,
            "is_high_tide": "高潮" if self.is_high_tide else "低潮",
            "source_row": self.source_row,
            "source_file": self.source_file,
            "source_note": self.source_note,
        }


@dataclass
class TideValidationResult:
    """
    潮汐数据校验结果

    说明：
    - is_valid: 总体是否通过
    - issues: 问题列表，每个问题包含 type/description/suggestion
    - timezone_issue: 是否存在时区相关问题
    - tide_value_issue: 是否存在潮位值异常
    """
    is_valid: bool
    issues: List[Dict[str, str]] = field(default_factory=list)
    timezone_issue: bool = False
    tide_value_issue: bool = False
    corrected_time_utc: Optional[datetime] = None
    corrected_time_local: Optional[datetime] = None

    @property
    def primary_issue_type(self) -> Optional[str]:
        if self.timezone_issue:
            return "潮位时区错"
        if self.tide_value_issue:
            return "潮位值异常"
        return None

    @property
    def next_action(self) -> Optional[str]:
        if not self.issues:
            return None
        actions = []
        for issue in self.issues:
            if issue.get("suggestion"):
                actions.append(issue["suggestion"])
        return "；".join(actions) if actions else None


class TideCalculator:
    """
    潮汐计算引擎

    核心职责：
    1. 解析原始潮汐数据（时间字符串 + 上报时区）
    2. 时区标准化（统一转为UTC和北京时间）
    3. 检测"潮位时区错"等异常
    4. 校验潮位值合理性
    5. 与DataTracker联动，给每条记录打状态标签

    "潮位时区错"典型场景：
    上报时区写UTC，但实际观测值是北京时间，或反之。
    检测策略：结合同站点其他记录的时间规律判断。
    """

    LOCAL_TZ = pytz.timezone("Asia/Shanghai")
    UTC_TZ = pytz.UTC

    TIDE_LEVEL_MIN = 0
    TIDE_LEVEL_MAX = 600

    def __init__(self, tracker: Optional[DataTracker] = None):
        self.tracker = tracker or DataTracker()
        self._records: List[TideRecord] = []

    def _parse_time_with_tz(
        self, time_str: str, tz_name: str
    ) -> Tuple[Optional[datetime], Optional[str]]:
        """解析时间字符串并结合指定时区，返回 (UTC时间, 错误信息)"""
        try:
            naive = datetime.strptime(time_str, "%Y-%m-%d %H:%M")
        except ValueError:
            return None, f"时间格式无法解析: {time_str}"

        try:
            tz = pytz.timezone(tz_name)
        except pytz.UnknownTimeZoneError:
            return None, f"未知时区: {tz_name}"

        localized = tz.localize(naive, is_dst=None)
        return localized.astimezone(self.UTC_TZ), None

    def _heuristic_timezone_check(
        self,
        station_id: str,
        parsed_utc: datetime,
        same_type_times: List[datetime],
        is_high_tide: bool,
        reported_tz_name: str,
    ) -> Tuple[bool, Optional[str]]:
        """
        启发式时区一致性检查

        策略：
        1. 同站**同类型**（高潮/低潮分别比较）的出现时间应集中在相近时段；
           若与同类型其他记录相差约6.5-9.5小时（接近8小时时差），高度疑似时区错标。
        2. 先验规则：中国沿海高潮通常出现在北京时间 1-5时 / 13-17时，
           低潮在 7-11时 / 19-23时。若上报时区为UTC但时间恰好落在上述
           北京时间典型时段内，疑似北京时间被误标为UTC。
        """
        current_utc_hour = parsed_utc.hour + parsed_utc.minute / 60.0

        if len(same_type_times) >= 3:
            hours = [t.hour + t.minute / 60.0 for t in same_type_times]
            mean_hour = np.mean(hours)
            diff = abs(current_utc_hour - mean_hour)
            diff = min(diff, 24 - diff)
            if 6.5 <= diff <= 9.5:
                return True, (
                    f"同站同类型记录UTC时段集中在 {mean_hour:.1f}时，"
                    f"本条为 {current_utc_hour:.1f}时，偏差 {diff:.1f}小时，"
                    f"与8小时时差吻合，疑似时区错标"
                )

        if reported_tz_name.upper() == "UTC":
            local_hour_if_wrong = current_utc_hour + 8
            local_hour_if_wrong = local_hour_if_wrong % 24
            if is_high_tide:
                if (1 <= local_hour_if_wrong <= 5) or (13 <= local_hour_if_wrong <= 17):
                    return True, (
                        f"上报时区为UTC，但该时刻若按北京时间 {local_hour_if_wrong:.0f}时"
                        f"看，恰好落在高潮典型时段，疑似北京时间被误标为UTC"
                    )
            else:
                if (7 <= local_hour_if_wrong <= 11) or (19 <= local_hour_if_wrong <= 23):
                    return True, (
                        f"上报时区为UTC，但该时刻若按北京时间 {local_hour_if_wrong:.0f}时"
                        f"看，恰好落在低潮典型时段，疑似北京时间被误标为UTC"
                    )

        return False, None

    def _validate_tide_value(
        self, tide_level_cm: float, is_high_tide: bool
    ) -> List[Dict[str, str]]:
        """校验潮位值合理性"""
        issues = []
        if tide_level_cm < self.TIDE_LEVEL_MIN or tide_level_cm > self.TIDE_LEVEL_MAX:
            issues.append({
                "type": "潮位值异常",
                "description": (
                    f"潮位 {tide_level_cm}cm 超出合理范围 "
                    f"[{self.TIDE_LEVEL_MIN}, {self.TIDE_LEVEL_MAX}]cm"
                ),
                "suggestion": "需重新采集该时刻潮位数据，核对观测记录",
            })
        else:
            if is_high_tide and tide_level_cm < 80:
                issues.append({
                    "type": "潮位值异常",
                    "description": f"标记为高潮但潮位仅 {tide_level_cm}cm，偏低",
                    "suggestion": "复核该记录是高潮还是低潮，必要时改口径",
                })
            if (not is_high_tide) and tide_level_cm > 250:
                issues.append({
                    "type": "潮位值异常",
                    "description": f"标记为低潮但潮位达 {tide_level_cm}cm，偏高",
                    "suggestion": "复核该记录是高潮还是低潮，必要时改口径",
                })
        return issues

    def process_tide_table(self, df_raw: pd.DataFrame) -> List[TideRecord]:
        """
        处理整份潮汐表

        输入：原始DataFrame（包含 obs_time_str, reported_timezone 等字段）
        输出：标准化后的 TideRecord 列表，同时写入 DataTracker
        """
        self._records = []
        station_type_times: Dict[Tuple[str, bool], List[datetime]] = {}

        for _, row in df_raw.iterrows():
            raw_dict = row.to_dict()
            source_row = int(row.get("source_row", 0))
            source_file = row.get("source_file", "unknown.xlsx")
            source_note = row.get("source_note", "")
            station_id = row.get("station_id", "UNK")
            station_name = row.get("station_name", "未知站")
            time_str = row.get("obs_time_str", "")
            reported_tz = row.get("reported_timezone", "Asia/Shanghai")
            tide_level = float(row.get("tide_level_cm", 0))
            is_high = bool(row.get("is_high_tide", 0))

            issues = []
            timezone_issue = False
            corrected_utc = None
            corrected_local = None

            parsed_utc, err = self._parse_time_with_tz(time_str, reported_tz)
            if err:
                issues.append({
                    "type": "潮位时区错",
                    "description": err,
                    "suggestion": "检查时间字符串和时区字段是否完整",
                })
                timezone_issue = True

            type_key = (station_id, is_high)
            if parsed_utc is not None:
                station_type_times.setdefault(type_key, []).append(parsed_utc)

            value_issues = self._validate_tide_value(tide_level, is_high)
            issues.extend(value_issues)

            if parsed_utc is not None and type_key in station_type_times:
                tz_bad, tz_desc = self._heuristic_timezone_check(
                    station_id, parsed_utc, station_type_times[type_key], is_high, reported_tz
                )
                if tz_bad:
                    timezone_issue = True
                    issues.append({
                        "type": "潮位时区错",
                        "description": tz_desc,
                        "suggestion": (
                            "核对上报时区是否正确；若观测值实际为北京时间，"
                            "请将 reported_timezone 改为 Asia/Shanghai，"
                            "或在原时间基础上修正 8 小时"
                        ),
                    })
                    if reported_tz == "UTC":
                        corrected_utc = parsed_utc - timedelta(hours=8)
                    else:
                        corrected_utc = parsed_utc + timedelta(hours=8)
                    corrected_local = corrected_utc.astimezone(self.LOCAL_TZ)

            is_valid = len(issues) == 0

            if timezone_issue and not is_valid:
                status = DataStatus.RECOLLECT
            elif len([i for i in issues if i["type"] == "潮位值异常"]) > 0:
                status = DataStatus.PENDING
            else:
                status = DataStatus.AVAILABLE

            primary = next((i["type"] for i in issues), None)
            description = "；".join(i["description"] for i in issues) if issues else None
            suggestion = "；".join(i["suggestion"] for i in issues if i.get("suggestion")) if issues else None

            tracked = self.tracker.track_record(
                source_row=source_row,
                source_file=source_file,
                source_note=source_note,
                data_status=status,
                issue_type=primary,
                issue_description=description,
                next_action=suggestion,
                raw_data=raw_dict,
            )

            final_utc = corrected_utc or parsed_utc or datetime(1970, 1, 1, tzinfo=self.UTC_TZ)
            final_local = corrected_local or (
                final_utc.astimezone(self.LOCAL_TZ) if final_utc else datetime(1970, 1, 1, tzinfo=self.LOCAL_TZ)
            )

            rec = TideRecord(
                record_id=tracked.record_id,
                station_id=station_id,
                station_name=station_name,
                obs_time_utc=final_utc,
                obs_time_local=final_local,
                tide_level_cm=tide_level,
                is_high_tide=is_high,
                source_row=source_row,
                source_file=source_file,
                source_note=source_note,
            )
            self._records.append(rec)

        return self._records

    def get_dataframe(self) -> pd.DataFrame:
        return pd.DataFrame([r.to_dict() for r in self._records])

    def get_tracker(self) -> DataTracker:
        return self.tracker

    def interpolate_tide(self, station_id: str, target_time: datetime) -> Optional[float]:
        """
        简单插值估算某时刻的潮位

        基于同站点已有的高低潮记录做线性插值。
        生产环境可替换为更精确的调和分析模型。
        """
        station_records = [
            r for r in self._records
            if r.station_id == station_id
        ]
        if len(station_records) < 2:
            return None

        sorted_recs = sorted(station_records, key=lambda r: r.obs_time_utc)
        target_utc = target_time.astimezone(self.UTC_TZ) if target_time.tzinfo else self.UTC_TZ.localize(target_time)

        prev_rec = None
        next_rec = None
        for r in sorted_recs:
            if r.obs_time_utc <= target_utc:
                prev_rec = r
            if r.obs_time_utc >= target_utc and next_rec is None:
                next_rec = r
                break

        if prev_rec is None and next_rec:
            return next_rec.tide_level_cm
        if next_rec is None and prev_rec:
            return prev_rec.tide_level_cm
        if prev_rec and next_rec and prev_rec.record_id == next_rec.record_id:
            return prev_rec.tide_level_cm
        if prev_rec and next_rec:
            total = (next_rec.obs_time_utc - prev_rec.obs_time_utc).total_seconds()
            if total <= 0:
                return prev_rec.tide_level_cm
            frac = (target_utc - prev_rec.obs_time_utc).total_seconds() / total
            return prev_rec.tide_level_cm + (next_rec.tide_level_cm - prev_rec.tide_level_cm) * frac
        return None

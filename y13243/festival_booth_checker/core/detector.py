from typing import List

from .models import BoothRecord, AnomalyRecord, BoothStatus, AnomalyType, AnomalyLevel
from .config import Config


class AnomalyDetector:
    def __init__(self, config: Config):
        self.config = config

    def detect(self, record: BoothRecord) -> List[AnomalyRecord]:
        anomalies: List[AnomalyRecord] = []

        if not record.authorization_visible or self._check_auth_hidden(record):
            anomalies.append(AnomalyRecord(
                type=AnomalyType.AUTHORIZATION_HIDDEN,
                level=AnomalyLevel.MAJOR,
                description="授权期限藏在备注字段中，未在醒目位置展示",
                location="授权期限字段 / 备注字段",
                suggestion="请将授权期限独立存放至专用字段，并在公示材料正文显示",
                screenshot_hint="截图：摊位表备注栏，圈出含授权期限的备注单元格"
            ))

        t_warn = self.config["timing_offset_warning_ms"]
        t_crit = self.config["timing_offset_critical_ms"]
        if abs(record.timing_offset_ms) >= t_crit:
            level = AnomalyLevel.CRITICAL if abs(record.timing_offset_ms) >= t_crit else AnomalyLevel.MAJOR
            anomalies.append(AnomalyRecord(
                type=AnomalyType.TIMING_OFFSET,
                level=level,
                description=f"时码偏差 {record.timing_offset_ms}ms（超过阈值 {t_crit}ms）",
                location="演出时间编排表",
                suggestion="请与音控组确认实际演出时间",
                screenshot_hint="截图：曲目时间轴与系统时间对比，标注偏差位置"
            ))
        elif abs(record.timing_offset_ms) >= t_warn:
            anomalies.append(AnomalyRecord(
                type=AnomalyType.TIMING_OFFSET,
                level=AnomalyLevel.MINOR,
                description=f"时码偏差 {record.timing_offset_ms}ms（在允许范围但需留意）",
                location="演出时间编排表",
                suggestion="标记为'待复核'，现场音控确认后更新",
                screenshot_hint="截图：时间编排表中该摊位对应时间段"
            ))

        if not record.setlist_complete:
            anomalies.append(AnomalyRecord(
                type=AnomalyType.INCOMPLETE_SETLIST,
                level=AnomalyLevel.MAJOR,
                description="曲目表未凑齐，分批提交中",
                location="曲目清单",
                suggestion="待曲目表齐全后再提交完整版本",
                screenshot_hint="截图：当前已提交曲目页，标注缺失部分"
            ))

        return anomalies

    def _check_auth_hidden(self, record: BoothRecord) -> bool:
        keywords = self.config["anomaly_keywords"]["authorization_hidden"]
        auth = record.authorization_period
        raw_note = ""
        if isinstance(record.raw_data, dict):
            raw_note = (
                record.raw_data.get("备注", "")
                or record.raw_data.get("remark", "")
                or record.raw_data.get("note", "")
            )
        date_indicators = ["至", "到", "-", "有效", "起止", "起", "止", "年", "月", "日"]
        note_has_auth_date = (
            any(x in raw_note for x in ["授权", "期限", "许可", "核准"])
            and any(d in raw_note for d in date_indicators)
        )
        if not auth:
            return note_has_auth_date
        auth_has_remark = any(kw in auth for kw in keywords)
        note_has_auth = any(kw in raw_note for kw in keywords) and any(x in raw_note for x in ["授权", "期限", "至", "有效"])
        return auth_has_remark or note_has_auth_date or (note_has_auth and not record.authorization_visible)

    def determine_status(self, record: BoothRecord, anomalies: List[AnomalyRecord]) -> BoothStatus:
        unresolved = [a for a in anomalies if not a.resolved]
        if not unresolved:
            return BoothStatus.PASSED
        has_critical = any(a.level == AnomalyLevel.CRITICAL for a in unresolved)
        has_major = any(a.level == AnomalyLevel.MAJOR for a in unresolved)
        has_incomplete = any(a.type == AnomalyType.INCOMPLETE_SETLIST for a in unresolved)
        if has_critical:
            return BoothStatus.NEED_REVIEW
        if has_incomplete:
            return BoothStatus.NEED_EVIDENCE
        if has_major:
            return BoothStatus.NEED_REVIEW
        return BoothStatus.NEED_REVIEW

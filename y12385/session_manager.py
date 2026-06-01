import uuid
from datetime import datetime
from typing import List, Dict, Optional, Any
from dataclasses import asdict

from models import (
    TherapySession,
    Issue,
    IssueType,
    IssueSeverity,
    ArchiveRecord,
    EmotionLevel,
)
from validator import SessionValidator


class IssueManager:
    def __init__(self):
        self.validator = SessionValidator()

    def get_issue_list(self, session: TherapySession, include_resolved: bool = False) -> List[Issue]:
        if include_resolved:
            return session.issues
        return [issue for issue in session.issues if not issue.resolved]

    def get_issues_by_type(self, session: TherapySession, issue_type: IssueType) -> List[Issue]:
        return [issue for issue in session.issues if issue.issue_type == issue_type]

    def get_issues_by_severity(self, session: TherapySession, severity: IssueSeverity) -> List[Issue]:
        return [issue for issue in session.issues if issue.severity == severity]

    def resolve_issue(self, session: TherapySession, issue_id: str) -> bool:
        for issue in session.issues:
            if issue.issue_id == issue_id:
                issue.resolved = True
                issue.resolved_at = datetime.now()
                return True
        return False

    def recheck_session(self, session: TherapySession) -> List[Issue]:
        new_issues = self.validator.validate_session(session)
        existing_ids = {issue.issue_id for issue in session.issues}

        for new_issue in new_issues:
            if not any(
                existing.issue_type == new_issue.issue_type
                and existing.location == new_issue.location
                and not existing.resolved
                for existing in session.issues
            ):
                session.issues.append(new_issue)

        return new_issues

    def generate_alert(self, session: TherapySession) -> Dict[str, Any]:
        high_severity = [
            issue for issue in session.issues
            if issue.severity == IssueSeverity.HIGH and not issue.resolved
        ]

        alerts = {
            "session_id": session.session_id,
            "has_alerts": len(high_severity) > 0,
            "high_severity_count": len(high_severity),
            "alerts": [],
        }

        for issue in high_severity:
            alerts["alerts"].append(
                {
                    "issue_id": issue.issue_id,
                    "type": issue.issue_type.value,
                    "severity": issue.severity.value,
                    "description": issue.description,
                    "location": issue.location,
                }
            )

        return alerts


class PrivacyMask:
    MASK_CHAR = "*"

    @staticmethod
    def mask_text(text: str, mask_level: int = 1) -> str:
        if not text:
            return text

        if mask_level == 0:
            return text

        keywords = SessionValidator.PRIVACY_KEYWORDS
        masked = text
        for keyword in keywords:
            if keyword in masked:
                if mask_level >= 2:
                    replacement = PrivacyMask.MASK_CHAR * len(keyword)
                else:
                    replacement = keyword[0] + PrivacyMask.MASK_CHAR * (len(keyword) - 1)
                masked = masked.replace(keyword, replacement)
        return masked

    @staticmethod
    def mask_session(session: TherapySession, mask_level: int) -> TherapySession:
        session.privacy_mask_level = mask_level
        return session


class ArchiveManager:
    def __init__(self):
        self.archive_records: Dict[str, List[ArchiveRecord]] = {}
        self.issue_manager = IssueManager()
        self.privacy_mask = PrivacyMask()

    def archive_session(
        self,
        session: TherapySession,
        privacy_mask_level: int = 0,
        emotion_summary: Optional[Dict[str, Any]] = None,
        export_content: Optional[str] = None,
    ) -> ArchiveRecord:
        session.is_archived = True
        session.privacy_mask_level = privacy_mask_level

        archive = ArchiveRecord(
            archive_id=f"arc_{uuid.uuid4().hex[:8]}",
            session_id=session.session_id,
            privacy_mask_level=privacy_mask_level,
            emotion_summary=emotion_summary,
            export_content=export_content,
        )

        if session.session_id not in self.archive_records:
            self.archive_records[session.session_id] = []
        self.archive_records[session.session_id].append(archive)

        return archive

    def rearchive_session(
        self,
        session: TherapySession,
        new_privacy_mask_level: int,
        emotion_analyzer,
        exporter,
    ) -> ArchiveRecord:
        session.privacy_mask_level = new_privacy_mask_level
        self.issue_manager.recheck_session(session)

        emotion_summary = emotion_analyzer.analyze_session(session)
        export_content = exporter.export_session(session)

        return self.archive_session(
            session,
            privacy_mask_level=new_privacy_mask_level,
            emotion_summary=emotion_summary,
            export_content=export_content,
        )

    def get_archive_history(self, session_id: str) -> List[ArchiveRecord]:
        return self.archive_records.get(session_id, [])

    def get_latest_archive(self, session_id: str) -> Optional[ArchiveRecord]:
        history = self.get_archive_history(session_id)
        if history:
            return history[-1]
        return None


class EmotionAnalyzer:
    def analyze_session(self, session: TherapySession) -> Dict[str, Any]:
        emotion = session.emotion
        summary = {
            "session_id": session.session_id,
            "client_id": session.client_id,
            "has_before": emotion.before is not None,
            "has_during": emotion.during is not None,
            "has_after": emotion.after is not None,
            "before_value": emotion.before.value if emotion.before else None,
            "during_value": emotion.during.value if emotion.during else None,
            "after_value": emotion.after.value if emotion.after else None,
        }

        if emotion.before and emotion.after:
            delta = emotion.after.value - emotion.before.value
            summary["emotion_delta"] = delta
            if delta > 0:
                summary["trend"] = "改善"
            elif delta < 0:
                summary["trend"] = "恶化"
            else:
                summary["trend"] = "稳定"
        else:
            summary["emotion_delta"] = None
            summary["trend"] = "数据不足"

        return summary

    def analyze_trend(self, sessions: List[TherapySession]) -> Dict[str, Any]:
        sorted_sessions = sorted(sessions, key=lambda s: s.start_time)
        after_values = []

        for session in sorted_sessions:
            if session.emotion.after:
                after_values.append(session.emotion.after.value)

        if len(after_values) < 2:
            return {"overall_trend": "数据不足", "sessions_analyzed": len(after_values)}

        first_half_avg = sum(after_values[: len(after_values) // 2]) / (len(after_values) // 2)
        second_half_avg = sum(after_values[len(after_values) // 2 :]) / (
            len(after_values) - len(after_values) // 2
        )

        if second_half_avg > first_half_avg + 0.5:
            trend = "整体改善"
        elif second_half_avg < first_half_avg - 0.5:
            trend = "整体恶化"
        else:
            trend = "整体稳定"

        return {
            "overall_trend": trend,
            "sessions_analyzed": len(after_values),
            "first_half_avg": round(first_half_avg, 2),
            "second_half_avg": round(second_half_avg, 2),
        }


class SessionExporter:
    def __init__(self, mask_level: int = 0):
        self.mask_level = mask_level

    def export_session(self, session: TherapySession) -> str:
        mask = PrivacyMask()

        public_notes = mask.mask_text(session.public_notes, session.privacy_mask_level)
        private_notes = mask.mask_text(session.private_notes, session.privacy_mask_level)

        lines = [
            "=" * 60,
            f"音乐治疗会话记录导出",
            "=" * 60,
            f"会话ID: {session.session_id}",
            f"来访者ID: {session.client_id}",
            f"开始时间: {session.start_time.strftime('%Y-%m-%d %H:%M:%S')}",
            f"结束时间: {session.end_time.strftime('%Y-%m-%d %H:%M:%S') if session.end_time else '未结束'}",
            f"隐私遮罩级别: {session.privacy_mask_level}",
            "",
            "--- 情绪记录 ---",
            f"治疗前: {session.emotion.before.value if session.emotion.before else '未记录'}",
            f"治疗中: {session.emotion.during.value if session.emotion.during else '未记录'}",
            f"治疗后: {session.emotion.after.value if session.emotion.after else '未记录'}",
            "",
            "--- 播放曲目 ---",
        ]

        for i, track in enumerate(session.played_tracks, 1):
            track_notes = mask.mask_text(track.notes, session.privacy_mask_level)
            lines.append(f"  {i}. 曲目ID: {track.track_id}")
            lines.append(f"     开始时间: {track.start_time.strftime('%H:%M:%S')}")
            if track_notes:
                lines.append(f"     备注: {track_notes}")

        lines.extend(
            [
                "",
                "--- 公开备注 ---",
                public_notes if public_notes else "无",
                "",
                "--- 私密备注 ---",
                private_notes if private_notes else "无",
                "",
                "--- 问题清单 ---",
            ]
        )

        unresolved = [issue for issue in session.issues if not issue.resolved]
        if unresolved:
            for issue in unresolved:
                lines.append(
                    f"  [{issue.severity.value}] {issue.issue_type.value}: {issue.description}"
                )
        else:
            lines.append("  无未解决问题")

        lines.append("=" * 60)

        return "\n".join(lines)

    def export_summary(self, sessions: List[TherapySession]) -> str:
        lines = [
            "=" * 60,
            f"音乐治疗会话汇总",
            "=" * 60,
            f"总会话数: {len(sessions)}",
            "",
        ]

        for session in sessions:
            status = "已归档" if session.is_archived else "进行中"
            issues_count = len([i for i in session.issues if not i.resolved])
            lines.append(
                f"- {session.session_id}: {session.start_time.strftime('%Y-%m-%d')} | {status} | 未解决问题: {issues_count}"
            )

        lines.append("=" * 60)
        return "\n".join(lines)

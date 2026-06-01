import uuid
import re
from typing import List, Dict, Set
from collections import Counter
from models import (
    TherapySession,
    Issue,
    IssueType,
    IssueSeverity,
    EmotionLevel,
    PlayedTrack,
)


class SessionValidator:
    PRIVACY_KEYWORDS = [
        "电话", "手机", "地址", "住址", "身份证", "银行卡", "密码",
        "微信", "QQ", "邮箱", "工作单位", "学校", "家人", "配偶", "子女",
        "收入", "工资", "诊断", "病史", "过敏", "用药",
        "手机号", "电话号码", "家庭住址", "居住地址",
    ]

    def __init__(self):
        pass

    def validate_session(self, session: TherapySession) -> List[Issue]:
        issues = []
        issues.extend(self._check_emotion_missing(session))
        issues.extend(self._check_track_duplicates(session))
        issues.extend(self._check_privacy_leak(session))
        return issues

    def _check_emotion_missing(self, session: TherapySession) -> List[Issue]:
        issues = []
        emotion = session.emotion

        missing_fields = []
        if emotion.before is None:
            missing_fields.append("治疗前情绪")
        if emotion.during is None:
            missing_fields.append("治疗中情绪")
        if emotion.after is None:
            missing_fields.append("治疗后情绪")

        if missing_fields:
            severity = IssueSeverity.HIGH if len(missing_fields) >= 2 else IssueSeverity.MEDIUM
            issue = Issue(
                issue_id=f"iss_{uuid.uuid4().hex[:8]}",
                issue_type=IssueType.EMOTION_MISSING,
                severity=severity,
                description=f"缺少情绪记录：{', '.join(missing_fields)}",
                location=f"session:{session.session_id}:emotion",
            )
            issues.append(issue)

        return issues

    def _check_track_duplicates(self, session: TherapySession) -> List[Issue]:
        issues = []
        track_counter: Counter = Counter()

        for played in session.played_tracks:
            track_counter[played.track_id] += 1

        for track_id, count in track_counter.items():
            if count > 1:
                issue = Issue(
                    issue_id=f"iss_{uuid.uuid4().hex[:8]}",
                    issue_type=IssueType.TRACK_DUPLICATE,
                    severity=IssueSeverity.LOW,
                    description=f"曲目重复播放：曲目ID {track_id} 共播放 {count} 次",
                    location=f"session:{session.session_id}:tracks:{track_id}",
                )
                issues.append(issue)

        return issues

    def _check_privacy_leak(self, session: TherapySession) -> List[Issue]:
        issues = []

        private_in_public = self._find_privacy_keywords(session.public_notes)
        if private_in_public:
            issue = Issue(
                issue_id=f"iss_{uuid.uuid4().hex[:8]}",
                issue_type=IssueType.PRIVACY_LEAK,
                severity=IssueSeverity.HIGH,
                description=f"公开备注中检测到隐私敏感词：{', '.join(private_in_public)}",
                location=f"session:{session.session_id}:public_notes",
            )
            issues.append(issue)

        for i, played in enumerate(session.played_tracks):
            leaked = self._find_privacy_keywords(played.notes)
            if leaked:
                issue = Issue(
                    issue_id=f"iss_{uuid.uuid4().hex[:8]}",
                    issue_type=IssueType.PRIVACY_LEAK,
                    severity=IssueSeverity.HIGH,
                    description=f"曲目备注中检测到隐私敏感词：{', '.join(leaked)}",
                    location=f"session:{session.session_id}:tracks:{i}:notes",
                )
                issues.append(issue)

        return issues

    def _find_privacy_keywords(self, text: str) -> List[str]:
        if not text:
            return []

        found = []
        text_lower = text.lower()
        for keyword in self.PRIVACY_KEYWORDS:
            if keyword in text or keyword.lower() in text_lower:
                found.append(keyword)
        return found

    def validate_and_attach(self, session: TherapySession) -> TherapySession:
        issues = self.validate_session(session)
        session.issues = issues
        return session

    def get_issue_summary(self, session: TherapySession) -> Dict[str, any]:
        summary = {
            "total": len(session.issues),
            "by_type": {},
            "by_severity": {},
            "unresolved": 0,
            "resolved": 0,
        }

        for issue in session.issues:
            itype = issue.issue_type.value
            iseverity = issue.severity.value

            summary["by_type"][itype] = summary["by_type"].get(itype, 0) + 1
            summary["by_severity"][iseverity] = summary["by_severity"].get(iseverity, 0) + 1

            if issue.resolved:
                summary["resolved"] += 1
            else:
                summary["unresolved"] += 1

        return summary

    def has_privacy_issues(self, session: TherapySession) -> bool:
        return any(issue.issue_type == IssueType.PRIVACY_LEAK and not issue.resolved for issue in session.issues)

    def get_high_severity_issues(self, session: TherapySession) -> List[Issue]:
        return [issue for issue in session.issues if issue.severity == IssueSeverity.HIGH and not issue.resolved]

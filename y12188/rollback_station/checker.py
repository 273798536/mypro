from .models import (
    VersionSnapshot, RollbackRecord, CheckIssue,
    IssueType, SampleClass,
)


class VersionChecker:
    def __init__(self, snapshots: list, rollback_records: list = None):
        self.snapshots = sorted(snapshots, key=lambda s: s.version_id)
        self.rollback_records = rollback_records or []
        self.rollback_map = {}
        for r in self.rollback_records:
            key = f"{r.from_version}->{r.to_version}"
            self.rollback_map[key] = r

    def check_all(self) -> list:
        issues = []
        if len(self.snapshots) < 2:
            return issues
        for i in range(1, len(self.snapshots)):
            prev = self.snapshots[i - 1]
            curr = self.snapshots[i]
            issues.extend(self._check_pair(prev, curr))
        return issues

    def _check_pair(self, prev: VersionSnapshot, curr: VersionSnapshot) -> list:
        issues = []
        issues.extend(self._check_same_name_overwrite(prev, curr))
        issues.extend(self._check_track_missing(prev, curr))
        issues.extend(self._check_wrong_version_feedback(prev, curr))
        return issues

    def _check_same_name_overwrite(self, prev: VersionSnapshot, curr: VersionSnapshot) -> list:
        issues = []
        common = prev.track_names() & curr.track_names()
        for name in common:
            old_t = prev.get_track(name)
            new_t = curr.get_track(name)
            if old_t.file_hash != new_t.file_hash and old_t.file_path == new_t.file_path:
                is_rollback = self._is_rollback_track(prev.version_id, curr.version_id, name)
                sample_class = self._classify_same_name_overwrite(old_t, new_t, is_rollback)
                record_pointer = self._find_rollback_record_pointer(prev.version_id, curr.version_id, name)
                explanation = self._plain_explain_overwrite(old_t, new_t, sample_class, is_rollback)
                issues.append(CheckIssue(
                    issue_type=IssueType.SAME_NAME_OVERWRITE,
                    sample_class=sample_class,
                    track_name=name,
                    detail=(
                        f"轨道'{name}'在{prev.version_id}和{curr.version_id}之间"
                        f"文件路径相同({old_t.file_path})但内容哈希变化"
                        f"({old_t.file_hash[:8]}..->{new_t.file_hash[:8]}..)"
                    ),
                    version_ref=f"{prev.version_id}->{curr.version_id}",
                    record_pointer=record_pointer,
                    plain_explanation=explanation,
                ))
        return issues

    def _classify_same_name_overwrite(self, old_t, new_t, is_rollback: bool) -> SampleClass:
        if is_rollback:
            return SampleClass.BOUNDARY
        if old_t.last_modified_by != new_t.last_modified_by:
            return SampleClass.BAD
        if old_t.parameters == new_t.parameters:
            return SampleClass.NORMAL
        return SampleClass.BOUNDARY

    def _is_rollback_track(self, from_ver: str, to_ver: str, track_name: str) -> bool:
        key = f"{from_ver}->{to_ver}"
        rec = self.rollback_map.get(key)
        if rec and track_name in rec.affected_tracks:
            return True
        reverse_key = f"{to_ver}->{from_ver}"
        rec = self.rollback_map.get(reverse_key)
        if rec and track_name in rec.affected_tracks:
            return True
        return False

    def _find_rollback_record_pointer(self, from_ver: str, to_ver: str, track_name: str) -> str:
        for key, rec in self.rollback_map.items():
            if track_name in rec.affected_tracks:
                if from_ver in key or to_ver in key:
                    return f"回滚记录: {rec.operator} {rec.timestamp} {rec.reason}"
        return ""

    def _plain_explain_overwrite(self, old_t, new_t, sample_class: SampleClass, is_rollback: bool) -> str:
        if sample_class == SampleClass.BAD:
            return (
                f"这条轨道'{old_t.track_name}'的音频文件被人换过了，"
                f"但文件名完全没变。之前是{old_t.last_modified_by}负责的，"
                f"现在是{new_t.last_modified_by}改的——不同的人用了同一个文件名，"
                f"这在交接时特别容易搞混，必须确认哪个版本才是对的。"
            )
        if is_rollback:
            return (
                f"轨道'{old_t.track_name}'被回滚了，文件名没变但内容回到了旧版本。"
                f"这属于正常回滚操作，但要注意：如果回滚后还有人按新版本继续干活，"
                f"后续就会对不上。"
            )
        if sample_class == SampleClass.BOUNDARY:
            return (
                f"轨道'{old_t.track_name}'的文件内容变了但文件名没改，"
                f"参数也跟着调整了。虽然可能是正常修改，"
                f"但建议确认一下是不是有人误操作覆盖了旧文件。"
            )
        return (
            f"轨道'{old_t.track_name}'的文件内容有更新，"
            f"文件名没变，是同一人维护的，参数也一致，大概率是正常更新。"
        )

    def _check_track_missing(self, prev: VersionSnapshot, curr: VersionSnapshot) -> list:
        issues = []
        lost = prev.track_names() - curr.track_names()
        gained = curr.track_names() - prev.track_names()
        for name in lost:
            old_t = prev.get_track(name)
            is_rollback = self._is_rollback_track(prev.version_id, curr.version_id, name)
            sample_class = SampleClass.BOUNDARY if is_rollback else SampleClass.BAD
            record_pointer = self._find_rollback_record_pointer(prev.version_id, curr.version_id, name)
            explanation = self._plain_explain_missing(name, prev.version_id, curr.version_id, is_rollback)
            issues.append(CheckIssue(
                issue_type=IssueType.TRACK_MISSING,
                sample_class=sample_class,
                track_name=name,
                detail=f"轨道'{name}'存在于{prev.version_id}但在{curr.version_id}中缺失",
                version_ref=f"{prev.version_id}->{curr.version_id}",
                record_pointer=record_pointer,
                plain_explanation=explanation,
            ))
        for name in gained:
            explanation = self._plain_explain_new_track(name, prev.version_id, curr.version_id)
            issues.append(CheckIssue(
                issue_type=IssueType.TRACK_MISSING,
                sample_class=SampleClass.NORMAL,
                track_name=name,
                detail=f"轨道'{name}'在{curr.version_id}中新增，不存在于{prev.version_id}",
                version_ref=f"{prev.version_id}->{curr.version_id}",
                record_pointer="",
                plain_explanation=explanation,
            ))
        return issues

    def _plain_explain_missing(self, name, from_ver, to_ver, is_rollback) -> str:
        if is_rollback:
            return (
                f"轨道'{name}'在{from_ver}到{to_ver}之间消失了，"
                f"但查到有回滚操作，可能是回滚时被一起撤掉了。"
                f"请确认这个轨道是否需要保留。"
            )
        return (
            f"轨道'{name}'在{from_ver}还有，到{to_ver}就没了。"
            f"没有找到对应的回滚记录，这意味着很可能是在某次保存时被误删了，"
            f"或者工程文件损坏导致轨道丢失。这种情况通常需要从备份恢复。"
        )

    def _plain_explain_new_track(self, name, from_ver, to_ver) -> str:
        return f"轨道'{name}'是{to_ver}新增的，{from_ver}里没有。属于正常新增。"

    def _check_wrong_version_feedback(self, prev: VersionSnapshot, curr: VersionSnapshot) -> list:
        issues = []
        common = prev.track_names() & curr.track_names()
        for name in common:
            old_t = prev.get_track(name)
            new_t = curr.get_track(name)
            if old_t.file_hash == new_t.file_hash and old_t.parameters != new_t.parameters:
                explanation = self._plain_explain_wrong_version(name, prev.version_id, curr.version_id)
                issues.append(CheckIssue(
                    issue_type=IssueType.WRONG_VERSION_FEEDBACK,
                    sample_class=SampleClass.BOUNDARY,
                    track_name=name,
                    detail=(
                        f"轨道'{name}'音频内容未变但参数发生变化"
                        f"({prev.version_id}->{curr.version_id})"
                    ),
                    version_ref=f"{prev.version_id}->{curr.version_id}",
                    record_pointer=f"参见版本快照: {prev.version_id} / {curr.version_id}",
                    plain_explanation=explanation,
                ))
        return issues

    def _plain_explain_wrong_version(self, name, from_ver, to_ver) -> str:
        return (
            f"轨道'{name}'的音频文件本身没换，但混音参数(音量/声像/效果器)改了。"
            f"这说明有人在{from_ver}到{to_ver}之间调了参数但可能用了旧版音频，"
            f"或者反馈修改时引用了错误的版本。请确认参数调整对应的是哪一版音频。"
        )

    def classify_issues(self, issues: list) -> dict:
        buckets = {
            SampleClass.NORMAL: [],
            SampleClass.BOUNDARY: [],
            SampleClass.BAD: [],
        }
        for issue in issues:
            buckets[issue.sample_class].append(issue)
        return buckets

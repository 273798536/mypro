from .models import VersionSnapshot, MergeConflict, CheckIssue, IssueType, SampleClass


class MergeConflictDetector:
    def __init__(self, snapshots: list):
        self.snapshots = sorted(snapshots, key=lambda s: s.version_id)

    def detect_conflicts(self, prev: VersionSnapshot, curr: VersionSnapshot) -> list:
        conflicts = []
        common = prev.track_names() & curr.track_names()
        for name in common:
            old_t = prev.get_track(name)
            new_t = curr.get_track(name)
            eng_changed = self._engineering_changed(old_t, new_t)
            param_changed = self._params_changed(old_t, new_t)
            if eng_changed and param_changed:
                if old_t.last_modified_by != new_t.last_modified_by:
                    conflicts.append(MergeConflict(
                        track_name=name,
                        engineering_version=prev.version_id,
                        param_version=curr.version_id,
                        engineer_author=old_t.last_modified_by,
                        param_author=new_t.last_modified_by,
                        engineering_change=self._describe_eng_change(old_t, new_t),
                        param_change=self._describe_param_change(old_t, new_t),
                    ))
        return conflicts

    def detect_all(self) -> list:
        all_conflicts = []
        for i in range(1, len(self.snapshots)):
            prev = self.snapshots[i - 1]
            curr = self.snapshots[i]
            all_conflicts.extend(self.detect_conflicts(prev, curr))
        return all_conflicts

    def conflicts_to_issues(self, conflicts: list) -> list:
        issues = []
        for c in conflicts:
            explanation = self._plain_explain_conflict(c)
            issues.append(CheckIssue(
                issue_type=IssueType.MERGE_CONFLICT,
                sample_class=SampleClass.BAD,
                track_name=c.track_name,
                detail=(
                    f"轨道'{c.track_name}'工程结构和轨道参数被不同的人同时修改: "
                    f"工程({c.engineer_author}): {c.engineering_change}; "
                    f"参数({c.param_author}): {c.param_change}"
                ),
                version_ref=f"{c.engineering_version}->{c.param_version}",
                record_pointer=(
                    f"工程维护: {c.engineer_author}, "
                    f"参数维护: {c.param_author}"
                ),
                plain_explanation=explanation,
            ))
        return issues

    def _engineering_changed(self, old_t, new_t) -> bool:
        return old_t.file_hash != new_t.file_hash or old_t.file_path != new_t.file_path

    def _params_changed(self, old_t, new_t) -> bool:
        return old_t.parameters != new_t.parameters

    def _describe_eng_change(self, old_t, new_t) -> str:
        changes = []
        if old_t.file_hash != new_t.file_hash:
            changes.append("文件内容变化")
        if old_t.file_path != new_t.file_path:
            changes.append(f"路径: {old_t.file_path}->{new_t.file_path}")
        return "; ".join(changes) if changes else "无变化"

    def _describe_param_change(self, old_t, new_t) -> str:
        changes = []
        for key in set(list(old_t.parameters.keys()) + list(new_t.parameters.keys())):
            old_val = old_t.parameters.get(key)
            new_val = new_t.parameters.get(key)
            if old_val != new_val:
                changes.append(f"{key}: {old_val}->{new_val}")
        return "; ".join(changes) if changes else "无变化"

    def _plain_explain_conflict(self, c: MergeConflict) -> str:
        return (
            f"轨道'{c.track_name}'同时被两个人改了不同的东西："
            f"{c.engineer_author}改了工程结构（{c.engineering_change}），"
            f"{c.param_author}改了混音参数（{c.param_change}）。"
            f"这两组修改互相不知道对方的存在，直接合并可能丢数据。"
            f"需要两个人当面确认，到底以谁的为准，还是两边都要保留。"
            f"不要自动选一边——选错了后面就要返工。"
        )

from .models import VersionSnapshot, TrackState, RollbackRecord


class SnapshotStore:
    def __init__(self):
        self._snapshots: list = []
        self._rollback_records: list = []
        self._track_diff_cache: dict = {}

    def add_snapshot(self, snapshot: VersionSnapshot):
        self._snapshots.append(snapshot)
        self._snapshots.sort(key=lambda s: s.version_id)
        self._track_diff_cache.clear()

    def add_rollback_record(self, record: RollbackRecord):
        self._rollback_records.append(record)

    def get_snapshots(self) -> list:
        return list(self._snapshots)

    def get_rollback_records(self) -> list:
        return list(self._rollback_records)

    def get_snapshot(self, version_id: str):
        for s in self._snapshots:
            if s.version_id == version_id:
                return s
        return None

    def track_diff(self, from_version: str, to_version: str) -> dict:
        cache_key = f"{from_version}->{to_version}"
        if cache_key in self._track_diff_cache:
            return self._track_diff_cache[cache_key]

        prev = self.get_snapshot(from_version)
        curr = self.get_snapshot(to_version)
        if not prev or not curr:
            return {}

        prev_names = prev.track_names()
        curr_names = curr.track_names()

        diff = {
            "added": curr_names - prev_names,
            "removed": prev_names - curr_names,
            "common": prev_names & curr_names,
            "hash_changed": set(),
            "param_changed": set(),
            "unchanged": set(),
        }

        for name in diff["common"]:
            old_t = prev.get_track(name)
            new_t = curr.get_track(name)
            hash_changed = old_t.file_hash != new_t.file_hash
            param_changed = old_t.parameters != new_t.parameters
            if hash_changed:
                diff["hash_changed"].add(name)
            if param_changed:
                diff["param_changed"].add(name)
            if not hash_changed and not param_changed:
                diff["unchanged"].add(name)

        self._track_diff_cache[cache_key] = diff
        return diff

    def rollback_at_version(self, version_id: str) -> list:
        results = []
        for r in self._rollback_records:
            if r.from_version == version_id or r.to_version == version_id:
                results.append(r)
        return results

    def unified_source_view(self) -> dict:
        view = {}
        for s in self._snapshots:
            view[s.version_id] = {
                "snapshot": s,
                "rollbacks": self.rollback_at_version(s.version_id),
                "track_names": s.track_names(),
            }
        return view

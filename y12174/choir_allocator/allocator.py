import json
from pathlib import Path
from typing import Optional

from .models import (
    Member,
    Song,
    PartRequirement,
    LeaveRecord,
    SkillLevel,
    Assignment,
    PartBalance,
    SongBalance,
    AdjustmentRecord,
    SongAllocation,
    AllocationResult,
    SKILL_ORDER,
    PART_ORDER,
)


def load_members(path: Path) -> list[Member]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return [
        Member(
            id=m["id"],
            name=m["name"],
            voice_parts=m["voice_parts"],
            skill_level=SkillLevel(m["skill_level"]),
            status=m.get("status", "active"),
        )
        for m in data
    ]


def load_songs(path: Path) -> list[Song]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return [
        Song(
            id=s["id"],
            name=s["name"],
            required_parts=[
                PartRequirement(part=p["part"], count=p["count"])
                for p in s["required_parts"]
            ],
        )
        for s in data
    ]


def load_leaves(path: Optional[Path]) -> list[LeaveRecord]:
    if path is None or not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return [LeaveRecord(member_id=l["member_id"], reason=l["reason"]) for l in data]


def _skill_score(level: SkillLevel) -> float:
    return float(SKILL_ORDER[level])


def _cluster_risk(skill_dist: dict[str, int], total: int) -> str:
    if total == 0:
        return "none"
    adv = skill_dist.get("advanced", 0)
    beg = skill_dist.get("beginner", 0)
    if total >= 2 and adv == total:
        return "high"
    if total >= 3 and adv >= total - 1 and beg == 0:
        return "medium"
    if total >= 2 and beg == total:
        return "high"
    return "low"


def _compute_part_balance(
    part: str, assignments: list[Assignment], required: int
) -> PartBalance:
    part_assignments = [a for a in assignments if a.voice_part == part]
    assigned_count = len(part_assignments)
    fill_rate = assigned_count / required if required > 0 else 0.0

    skill_dist: dict[str, int] = {"beginner": 0, "intermediate": 0, "advanced": 0}
    total_score = 0.0
    for a in part_assignments:
        skill_dist[a.skill_level.value] += 1
        total_score += _skill_score(a.skill_level)

    avg_skill = total_score / assigned_count if assigned_count > 0 else 0.0
    cluster_risk = _cluster_risk(skill_dist, assigned_count)

    return PartBalance(
        part=part,
        assigned_count=assigned_count,
        required_count=required,
        fill_rate=fill_rate,
        skill_distribution=skill_dist,
        avg_skill_score=avg_skill,
        cluster_risk=cluster_risk,
        gap=assigned_count < required,
    )


def _compute_song_balance(
    song: Song, assignments: list[Assignment]
) -> SongBalance:
    req_map = {pr.part: pr.count for pr in song.required_parts}
    part_balances = []
    for pr in song.required_parts:
        pb = _compute_part_balance(pr.part, assignments, pr.count)
        part_balances.append(pb)

    total_required = sum(req_map.values())
    total_assigned = sum(pb.assigned_count for pb in part_balances)
    overall_fill = total_assigned / total_required if total_required > 0 else 0.0

    max_cluster = max(
        (pb.cluster_risk for pb in part_balances), key=lambda r: ["none", "low", "medium", "high"].index(r)
    )

    return SongBalance(
        song_id=song.id,
        song_name=song.name,
        overall_fill_rate=overall_fill,
        overall_cluster_risk=max_cluster,
        part_balances=part_balances,
    )


class ChoirAllocator:
    def __init__(
        self,
        members: list[Member],
        songs: list[Song],
        leaves: list[LeaveRecord],
    ):
        self.members = members
        self.songs = songs
        self.leaves = leaves
        self._leave_ids = {l.member_id for l in leaves}
        self._seq = 0

    def allocate(self) -> AllocationResult:
        result = AllocationResult()

        available = [m for m in self.members if m.id not in self._leave_ids]
        on_leave = [m for m in self.members if m.id in self._leave_ids]

        if on_leave:
            names = ", ".join(m.name for m in on_leave)
            leave_reasons = []
            for l in self.leaves:
                member = next((m for m in self.members if m.id == l.member_id), None)
                if member:
                    leave_reasons.append(f"{member.name}({l.reason})")
            result.global_warnings.append(
                f"请假成员: {', '.join(leave_reasons)} — 共{len(on_leave)}人缺席"
            )

        for song in self.songs:
            song_alloc = self._allocate_song(song, available)
            result.songs.append(song_alloc)

        return result

    def _next_seq(self) -> int:
        self._seq += 1
        return self._seq

    def _allocate_song(self, song: Song, available: list[Member]) -> SongAllocation:
        alloc = SongAllocation(song_id=song.id, song_name=song.name)
        assigned_member_ids: set[str] = set()

        req_map = {pr.part: pr.count for pr in song.required_parts}

        for part in PART_ORDER:
            if part not in req_map:
                continue
            needed = req_map[part]

            candidates = [
                m
                for m in available
                if m.id not in assigned_member_ids and part in m.voice_parts
            ]

            candidates.sort(
                key=lambda m: (
                    -(SKILL_ORDER[m.skill_level]),
                    m.voice_parts.index(part) if part in m.voice_parts else 99,
                )
            )

            placed = 0
            for m in candidates:
                if placed >= needed:
                    break
                a = Assignment(
                    seq=self._next_seq(),
                    member_id=m.id,
                    member_name=m.name,
                    song_id=song.id,
                    song_name=song.name,
                    voice_part=part,
                    skill_level=m.skill_level,
                    is_primary=(m.voice_parts.index(part) == 0)
                    if part in m.voice_parts
                    else False,
                )
                alloc.assignments.append(a)
                assigned_member_ids.add(m.id)
                placed += 1

            if placed < needed:
                alloc.warnings.append(
                    f"[音域缺失] {part}: 需要{needed}人, 仅找到{placed}人, 缺{needed - placed}人"
                )

        balance = _compute_song_balance(song, alloc.assignments)

        for pb in balance.part_balances:
            if pb.cluster_risk in ("high", "medium") and pb.assigned_count > 0:
                label = "高手扎堆" if pb.cluster_risk == "high" else "水平偏科"
                parts = []
                for sk, cnt in pb.skill_distribution.items():
                    if cnt > 0:
                        parts.append(f"{sk}×{cnt}")
                alloc.warnings.append(
                    f"[{label}] {pb.part}: {'; '.join(parts)} — 建议从其他声部调剂或补充新成员"
                )

        adjustments = self._rebalance_for_clustering(
            song, alloc, available, assigned_member_ids
        )
        alloc.adjustments = adjustments

        alloc.balance = _compute_song_balance(song, alloc.assignments)

        return alloc

    def _rebalance_for_clustering(
        self,
        song: Song,
        alloc: SongAllocation,
        available: list[Member],
        assigned_member_ids: set[str],
    ) -> list[AdjustmentRecord]:
        adjustments: list[AdjustmentRecord] = []
        balance = _compute_song_balance(song, alloc.assignments)
        step = 0

        for pb in balance.part_balances:
            if pb.cluster_risk not in ("high", "medium"):
                continue
            if pb.assigned_count == 0:
                continue

            high_part = pb.part
            is_expert_cluster = pb.skill_distribution.get("advanced", 0) == pb.assigned_count

            for other_pb in balance.part_balances:
                if other_pb.part == high_part:
                    continue
                if other_pb.assigned_count == 0:
                    continue

                other_skill_dist = other_pb.skill_distribution
                other_has_beginner = other_skill_dist.get("beginner", 0) > 0
                other_has_intermediate = other_skill_dist.get("intermediate", 0) > 0
                other_has_advanced = other_skill_dist.get("advanced", 0) > 0

                if is_expert_cluster and not (other_has_beginner or other_has_intermediate):
                    continue

                other_assignments = [
                    a for a in alloc.assignments if a.voice_part == other_pb.part
                ]

                candidates = []
                for oa in other_assignments:
                    if is_expert_cluster and oa.skill_level == SkillLevel.ADVANCED:
                        continue
                    if not is_expert_cluster and oa.skill_level == SkillLevel.BEGINNER:
                        continue
                    member = next(
                        (m for m in available if m.id == oa.member_id), None
                    )
                    if member is None:
                        continue
                    if high_part in member.voice_parts:
                        candidates.append((oa, member))

                if not candidates:
                    continue

                candidates.sort(key=lambda c: SKILL_ORDER[c[0].skill_level])
                chosen_a, chosen_m = candidates[0]

                if is_expert_cluster:
                    reason = (
                        f"调剂: {chosen_m.name}({chosen_a.skill_level.value})可唱{high_part}, "
                        f"从{other_pb.part}调入可分散高级扎堆"
                    )
                else:
                    reason = (
                        f"调剂: {chosen_m.name}({chosen_a.skill_level.value})可唱{high_part}, "
                        f"从{other_pb.part}调入可提升整体水平"
                    )

                step += 1
                adjustments.append(
                    AdjustmentRecord(
                        step=step,
                        member_id=chosen_m.id,
                        member_name=chosen_m.name,
                        song_id=song.id,
                        song_name=song.name,
                        from_part=other_pb.part,
                        to_part=high_part,
                        reason=reason,
                    )
                )

                break

        return adjustments


def run_allocation(
    members_path: Path,
    songs_path: Path,
    leaves_path: Optional[Path],
) -> AllocationResult:
    members = load_members(members_path)
    songs = load_songs(songs_path)
    leaves = load_leaves(leaves_path)
    allocator = ChoirAllocator(members, songs, leaves)
    return allocator.allocate()

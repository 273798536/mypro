from datetime import date
from typing import List, Dict, Tuple
from collections import defaultdict

from models import (
    TrackOwnership,
    PlatformPlayback,
    NeighboringRightsContract,
    DataIssue,
    ConflictType,
    RecordStatus
)


class DataValidator:
    def __init__(self):
        self.issues: List[DataIssue] = []

    def validate_all(
        self,
        ownerships: List[TrackOwnership],
        playbacks: List[PlatformPlayback],
        contracts: List[NeighboringRightsContract]
    ) -> List[DataIssue]:
        self.issues = []

        self._detect_duplicate_contract_no(contracts)
        self._detect_late_versions(contracts, ownerships)
        self._detect_ownership_overlap(ownerships)
        self._detect_playback_supplements(playbacks)
        self._detect_ratio_expirations(contracts, ownerships)
        self._detect_data_inconsistencies(ownerships, contracts)

        return self.issues

    def _detect_duplicate_contract_no(self, contracts: List[NeighboringRightsContract]) -> None:
        contract_no_map: Dict[str, List[NeighboringRightsContract]] = defaultdict(list)
        for contract in contracts:
            contract_no_map[contract.contract_no].append(contract)

        for contract_no, contract_list in contract_no_map.items():
            if len(contract_list) > 1:
                active_contracts = [c for c in contract_list if c.status == RecordStatus.CONFIRMED]
                if len(active_contracts) > 1:
                    issue = DataIssue(
                        conflict_type=ConflictType.DUPLICATE_CONTRACT_NO,
                        severity="high",
                        description=f"合同编号 {contract_no} 存在 {len(active_contracts)} 份有效合同",
                        related_records=[c.contract_id for c in active_contracts],
                        suggestion=f"请核实以下合同的有效性：{', '.join([c.contract_name for c in active_contracts])}。建议保留最新版本或实际生效的合同，将其余标记为'已被取代'。",
                        affected_amount=0.0
                    )
                    self.issues.append(issue)

    def _detect_late_versions(
        self,
        contracts: List[NeighboringRightsContract],
        ownerships: List[TrackOwnership]
    ) -> None:
        contract_no_map: Dict[str, List[NeighboringRightsContract]] = defaultdict(list)
        for contract in contracts:
            contract_no_map[contract.contract_no].append(contract)

        for contract_no, contract_list in contract_no_map.items():
            if len(contract_list) > 1:
                sorted_contracts = sorted(contract_list, key=lambda c: c.version)
                latest_version = sorted_contracts[-1]
                for contract in sorted_contracts[:-1]:
                    if contract.status == RecordStatus.CONFIRMED:
                        issue = DataIssue(
                            conflict_type=ConflictType.LATE_VERSION,
                            severity="medium",
                            description=f"合同 {contract.contract_name} (版本 {contract.version}) 存在更新版本 {latest_version.version}",
                            related_records=[contract.contract_id, latest_version.contract_id],
                            suggestion=f"旧版本合同 {contract.contract_name} 应标记为'已被取代'，新版本 {latest_version.contract_name} 需复核权属信息是否同步更新。",
                            affected_amount=0.0
                        )
                        self.issues.append(issue)
                        contract.is_late_arrival = True

    def _detect_ownership_overlap(self, ownerships: List[TrackOwnership]) -> None:
        ownership_map: Dict[Tuple[str, str], List[TrackOwnership]] = defaultdict(list)
        for ownership in ownerships:
            if ownership.status != RecordStatus.CONFIRMED:
                continue
            key = (ownership.track_id, ownership.right_type.value)
            ownership_map[key].append(ownership)

        for (track_id, right_type), ownership_list in ownership_map.items():
            if len(ownership_list) <= 1:
                continue

            for i, own1 in enumerate(ownership_list):
                for own2 in ownership_list[i+1:]:
                    overlap = self._check_date_overlap(
                        own1.effective_start, own1.effective_end,
                        own2.effective_start, own2.effective_end
                    )
                    if overlap:
                        total_ratio = own1.ownership_ratio + own2.ownership_ratio
                        if total_ratio > 1.0:
                            issue = DataIssue(
                                conflict_type=ConflictType.OWNERSHIP_OVERLAP,
                                severity="high",
                                description=f"曲目 {own1.track_name}({track_id}) 的 {right_type} 存在权属重叠，总比例 {total_ratio:.2%} 超过100%",
                                related_records=[own1.source_contract_id, own2.source_contract_id],
                                suggestion=f"权属方 {own1.owner_name}({own1.ownership_ratio:.1%}) 与 {own2.owner_name}({own2.ownership_ratio:.1%}) 存在重叠。请核实合同约定的分账比例和生效时间，必要时按各自有效时间拆分计算。",
                                affected_amount=0.0
                            )
                            self.issues.append(issue)
                        elif total_ratio < 1.0:
                            issue = DataIssue(
                                conflict_type=ConflictType.OWNERSHIP_OVERLAP,
                                severity="warning",
                                description=f"曲目 {own1.track_name}({track_id}) 的 {right_type} 权属比例合计 {total_ratio:.2%}，不足100%",
                                related_records=[own1.source_contract_id, own2.source_contract_id],
                                suggestion=f"权属比例合计不足100%，差额部分 {1-total_ratio:.1%} 将作为平台留存或待后续补充权属信息。",
                                affected_amount=0.0
                            )
                            self.issues.append(issue)

    def _detect_playback_supplements(self, playbacks: List[PlatformPlayback]) -> None:
        for playback in playbacks:
            if playback.is_supplementary:
                issue = DataIssue(
                    conflict_type=ConflictType.PLAYBACK_SUPPLEMENT,
                    severity="medium",
                    description=f"曲目 {playback.track_name} 在 {playback.platform} 存在播放量补录数据",
                    related_records=[playback.playback_id, playback.original_playback_id] if playback.original_playback_id else [playback.playback_id],
                    suggestion=f"该数据为补录数据（{playback.supplementary_note or '无备注'}），将覆盖或补充原始数据进行分账计算。请确认补录的原因和影响范围。",
                    affected_amount=playback.revenue_amount
                )
                self.issues.append(issue)

    def _detect_ratio_expirations(
        self,
        contracts: List[NeighboringRightsContract],
        ownerships: List[TrackOwnership]
    ) -> None:
        today = date.today()

        for contract in contracts:
            if contract.status != RecordStatus.CONFIRMED:
                continue

            if contract.effective_end and contract.effective_end < today:
                issue = DataIssue(
                    conflict_type=ConflictType.RATIO_EXPIRED,
                    severity="high",
                    description=f"合同 {contract.contract_name} 的分账比例已于 {contract.effective_end} 过期",
                    related_records=[contract.contract_id],
                    suggestion=f"该合同已过期，涉及曲目 {len(contract.tracks_covered)} 首。请尽快签署新合同或确认是否沿用原比例。本次分账将按原合同比例计算，但请尽快更新合同信息。",
                    affected_amount=0.0
                )
                self.issues.append(issue)

        for ownership in ownerships:
            if ownership.status != RecordStatus.CONFIRMED:
                continue

            if ownership.effective_end and ownership.effective_end < today:
                issue = DataIssue(
                    conflict_type=ConflictType.RATIO_EXPIRED,
                    severity="medium",
                    description=f"曲目 {ownership.track_name} 的 {ownership.right_type.value} 权属比例已于 {ownership.effective_end} 过期",
                    related_records=[ownership.source_contract_id],
                    suggestion=f"该权属信息已过期。请确认是否有新的权属协议，本次分账将按原比例计算。",
                    affected_amount=0.0
                )
                self.issues.append(issue)

    def _detect_data_inconsistencies(
        self,
        ownerships: List[TrackOwnership],
        contracts: List[NeighboringRightsContract]
    ) -> None:
        contract_map = {c.contract_id: c for c in contracts}

        for ownership in ownerships:
            contract = contract_map.get(ownership.source_contract_id)
            if not contract:
                continue

            if ownership.right_type != contract.right_type:
                issue = DataIssue(
                    conflict_type=ConflictType.DATA_INCONSISTENCY,
                    severity="high",
                    description=f"曲目 {ownership.track_name} 的权属权利类型 {ownership.right_type.value} 与合同 {contract.contract_name} 的 {contract.right_type.value} 不一致",
                    related_records=[ownership.source_contract_id],
                    suggestion="权属信息与合同约定的权利类型不一致，请核实数据源，以合同约定为准进行修正。",
                    affected_amount=0.0
                )
                self.issues.append(issue)

            if ownership.ownership_ratio > contract.revenue_sharing_ratio:
                issue = DataIssue(
                    conflict_type=ConflictType.DATA_INCONSISTENCY,
                    severity="warning",
                    description=f"曲目 {ownership.track_name} 的权属比例 {ownership.ownership_ratio:.1%} 超过合同约定上限 {contract.revenue_sharing_ratio:.1%}",
                    related_records=[ownership.source_contract_id],
                    suggestion=f"权属比例超过合同约定上限，将按合同比例 {contract.revenue_sharing_ratio:.1%} 进行分账计算。",
                    affected_amount=0.0
                )
                self.issues.append(issue)

    @staticmethod
    def _check_date_overlap(
        start1: date, end1: date,
        start2: date, end2: date
    ) -> bool:
        latest_start = max(start1, start2)
        earliest_end = min(end1 or date.max, end2 or date.max)
        return latest_start <= earliest_end

    def get_issues_by_type(self, conflict_type: ConflictType) -> List[DataIssue]:
        return [i for i in self.issues if i.conflict_type == conflict_type]

    def get_issue_summary(self) -> Dict[str, int]:
        summary: Dict[str, int] = defaultdict(int)
        for issue in self.issues:
            summary[issue.conflict_type.value] += 1
        return dict(summary)

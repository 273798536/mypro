from datetime import date
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
from uuid import uuid4

from models import (
    TrackOwnership,
    PlatformPlayback,
    NeighboringRightsContract,
    SettlementDetail,
    SettlementBatch,
    SettlementReport,
    DataIssue,
    ConflictType,
    RecordStatus,
    RightType
)
from data_validator import DataValidator


class SettlementEngine:
    def __init__(self):
        self.validator = DataValidator()

    def calculate_settlement(
        self,
        settlement_month: str,
        ownerships: List[TrackOwnership],
        playbacks: List[PlatformPlayback],
        contracts: List[NeighboringRightsContract],
        batch_id: Optional[str] = None
    ) -> Tuple[SettlementBatch, List[SettlementDetail], List[DataIssue]]:
        if not batch_id:
            batch_id = f"BATCH_{settlement_month}_{str(uuid4())[:8]}"

        batch = SettlementBatch(
            batch_id=batch_id,
            settlement_month=settlement_month,
            status="processing"
        )

        issues = self.validator.validate_all(ownerships, playbacks, contracts)
        batch.issues_summary = self.validator.get_issue_summary()

        filtered_playbacks = [p for p in playbacks if p.settlement_month == settlement_month]
        filtered_ownerships = [o for o in ownerships if o.status == RecordStatus.CONFIRMED]
        filtered_contracts = [c for c in contracts if c.status == RecordStatus.CONFIRMED]

        details = self._process_playbacks(
            batch_id,
            filtered_playbacks,
            filtered_ownerships,
            filtered_contracts,
            issues
        )

        batch.total_revenue = sum(d.total_revenue for d in details) / len(set(d.track_id for d in details)) if details else 0
        batch.total_settlement = sum(d.settlement_amount for d in details)
        batch.status = "completed"
        batch.completed_at = date.today()

        return batch, details, issues

    def _process_playbacks(
        self,
        batch_id: str,
        playbacks: List[PlatformPlayback],
        ownerships: List[TrackOwnership],
        contracts: List[NeighboringRightsContract],
        all_issues: List[DataIssue]
    ) -> List[SettlementDetail]:
        details: List[SettlementDetail] = []
        contract_map = {c.contract_id: c for c in contracts}

        ownerships_by_track: Dict[str, List[TrackOwnership]] = defaultdict(list)
        for ownership in ownerships:
            ownerships_by_track[ownership.track_id].append(ownership)

        for playback in playbacks:
            track_ownerships = ownerships_by_track.get(playback.track_id, [])

            if not track_ownerships:
                continue

            details.extend(self._calculate_track_settlement(
                batch_id,
                playback,
                track_ownerships,
                contract_map,
                all_issues
            ))

        return details

    def _calculate_track_settlement(
        self,
        batch_id: str,
        playback: PlatformPlayback,
        ownerships: List[TrackOwnership],
        contract_map: Dict[str, NeighboringRightsContract],
        all_issues: List[DataIssue]
    ) -> List[SettlementDetail]:
        details: List[SettlementDetail] = []
        track_issues = [i for i in all_issues if playback.track_id in str(i.related_records)]

        ownerships_by_type: Dict[RightType, List[TrackOwnership]] = defaultdict(list)
        for ownership in ownerships:
            ownerships_by_type[ownership.right_type].append(ownership)

        for right_type, type_ownerships in ownerships_by_type.items():
            total_ratio = sum(o.ownership_ratio for o in type_ownerships)

            if total_ratio == 0:
                continue

            normalized_ratio = total_ratio if total_ratio <= 1.0 else 1.0

            for ownership in type_ownerships:
                detail = self._create_settlement_detail(
                    batch_id,
                    playback,
                    ownership,
                    right_type,
                    contract_map,
                    normalized_ratio,
                    track_issues
                )
                details.append(detail)

        return details

    def _create_settlement_detail(
        self,
        batch_id: str,
        playback: PlatformPlayback,
        ownership: TrackOwnership,
        right_type: RightType,
        contract_map: Dict[str, NeighboringRightsContract],
        total_ratio: float,
        track_issues: List[DataIssue]
    ) -> SettlementDetail:
        contract = contract_map.get(ownership.source_contract_id)
        contract_ratio = contract.revenue_sharing_ratio if contract else 1.0

        effective_ratio = ownership.ownership_ratio
        effective_ratio = min(effective_ratio, contract_ratio)

        final_ratio = effective_ratio / total_ratio if total_ratio > 0 else 0

        settlement_amount = playback.revenue_amount * final_ratio

        processing_notes = []
        detail_issues = [i for i in track_issues if ownership.source_contract_id in i.related_records]

        if ownership.ownership_ratio > contract_ratio:
            processing_notes.append(
                f"权属比例 {ownership.ownership_ratio:.1%} 超过合同上限 {contract_ratio:.1%}，已按合同比例计算"
            )

        if total_ratio > 1.0:
            processing_notes.append(
                f"权属重叠，按比例归一化计算（原比例 {ownership.ownership_ratio:.1%}，归一化后 {final_ratio:.1%}）"
            )

        if playback.is_supplementary:
            processing_notes.append(
                f"播放量补录数据：{playback.supplementary_note or '无备注'}"
            )

        supplementary_impact = None
        if playback.is_supplementary:
            supplementary_impact = {
                "original_playback_id": playback.original_playback_id,
                "supplementary_note": playback.supplementary_note,
                "additional_amount": settlement_amount,
                "impact_description": f"因补录增加分账金额: {settlement_amount:.2f}元"
            }

        detail = SettlementDetail(
            detail_id=f"DET_{str(uuid4())[:12]}",
            settlement_batch_id=batch_id,
            track_id=playback.track_id,
            track_name=playback.track_name,
            isrc=playback.isrc,
            platform=playback.platform,
            play_count=playback.play_count,
            total_revenue=playback.revenue_amount,
            right_type=right_type,
            owner_id=ownership.owner_id,
            owner_name=ownership.owner_name,
            ownership_ratio=ownership.ownership_ratio,
            contract_ratio=contract_ratio,
            final_ratio=final_ratio,
            settlement_amount=round(settlement_amount, 2),
            issues=detail_issues,
            processing_notes=processing_notes,
            is_supplementary=playback.is_supplementary,
            supplementary_impact=supplementary_impact
        )

        return detail

    def generate_report(
        self,
        batch: SettlementBatch,
        details: List[SettlementDetail],
        issues: List[DataIssue]
    ) -> SettlementReport:
        summary = self._generate_summary(batch, details, issues)
        handling_suggestions = self._generate_handling_suggestions(issues, details)
        supplementary_impacts = self._collect_supplementary_impacts(details)

        report = SettlementReport(
            batch_id=batch.batch_id,
            settlement_month=batch.settlement_month,
            generated_at=date.today(),
            summary=summary,
            details=details,
            issues=issues,
            handling_suggestions=handling_suggestions,
            supplementary_impacts=supplementary_impacts
        )

        return report

    def _generate_summary(
        self,
        batch: SettlementBatch,
        details: List[SettlementDetail],
        issues: List[DataIssue]
    ) -> Dict:
        tracks_count = len(set(d.track_id for d in details))
        owners_count = len(set(d.owner_id for d in details))
        platforms_count = len(set(d.platform for d in details))

        high_issues = len([i for i in issues if i.severity == "high"])
        medium_issues = len([i for i in issues if i.severity == "medium"])
        warning_issues = len([i for i in issues if i.severity == "warning"])

        supplementary_details = [d for d in details if d.is_supplementary]
        supplementary_amount = sum(d.settlement_amount for d in supplementary_details)

        return {
            "batch_id": batch.batch_id,
            "settlement_month": batch.settlement_month,
            "total_revenue": round(batch.total_revenue, 2),
            "total_settlement": round(batch.total_settlement, 2),
            "tracks_count": tracks_count,
            "owners_count": owners_count,
            "platforms_count": platforms_count,
            "details_count": len(details),
            "issues_summary": {
                "total": len(issues),
                "high": high_issues,
                "medium": medium_issues,
                "warning": warning_issues,
                "by_type": batch.issues_summary
            },
            "supplementary_info": {
                "count": len(supplementary_details),
                "amount": round(supplementary_amount, 2)
            },
            "created_at": str(batch.created_at),
            "completed_at": str(batch.completed_at)
        }

    def _generate_handling_suggestions(
        self,
        issues: List[DataIssue],
        details: List[SettlementDetail]
    ) -> List[str]:
        suggestions = []
        issue_types = set(i.conflict_type for i in issues)

        if ConflictType.OWNERSHIP_OVERLAP in issue_types:
            overlap_tracks = set()
            for issue in [i for i in issues if i.conflict_type == ConflictType.OWNERSHIP_OVERLAP]:
                for detail in details:
                    track_id_in_issue = any(detail.track_id in str(rec) for rec in issue.related_records)
                    owner_in_issue = any(detail.owner_id in str(rec) for rec in issue.related_records)
                    if track_id_in_issue or owner_in_issue:
                        overlap_tracks.add(detail.track_name)
            if overlap_tracks:
                suggestions.append(
                    f"【权属重叠处理】以下曲目存在权属比例问题：{', '.join(list(overlap_tracks)[:5])}等。"
                    f"建议：1) 核对各权属方的合同约定；2) 若比例超过100%，需与各方确认分配方式；"
                    f"3) 若比例不足100%，差额部分将暂留平台。"
                )

        if ConflictType.RATIO_EXPIRED in issue_types:
            expired_contracts = [i for i in issues if i.conflict_type == ConflictType.RATIO_EXPIRED]
            suggestions.append(
                f"【比例过期处理】共发现 {len(expired_contracts)} 份已过期的合同或权属信息。"
                f"建议：1) 尽快与合作方签署新合同；2) 确认是否沿用原比例进行后续分账；"
                f"3) 更新系统中的合同有效期。"
            )

        if ConflictType.DUPLICATE_CONTRACT_NO in issue_types:
            suggestions.append(
                "【重复合同处理】存在合同编号重复的情况。"
                "建议：1) 核实每份合同的签署背景；2) 标记无效合同为'已被取代'；"
                "3) 建立合同版本管理机制。"
            )

        if ConflictType.PLAYBACK_SUPPLEMENT in issue_types:
            supplementary_details = [d for d in details if d.is_supplementary]
            total_impact = sum(d.settlement_amount for d in supplementary_details)
            suggestions.append(
                f"【补录数据处理】本期包含播放量补录，影响金额 {total_impact:.2f} 元。"
                f"建议：1) 确认补录原因的合理性；2) 记录补录对历史分账的影响；"
                f"3) 与相关合作方沟通补录事宜。"
            )

        if ConflictType.LATE_VERSION in issue_types:
            suggestions.append(
                "【晚到版本处理】存在晚到的合同版本。"
                "建议：1) 核对新旧版本的差异；2) 确认新版本的生效时间；"
                "3) 评估是否需要追溯调整之前的分账。"
            )

        return suggestions

    def _collect_supplementary_impacts(self, details: List[SettlementDetail]) -> List[Dict]:
        impacts = []
        for detail in details:
            if detail.is_supplementary and detail.supplementary_impact:
                impacts.append({
                    "track_name": detail.track_name,
                    "platform": detail.platform,
                    "owner_name": detail.owner_name,
                    "additional_amount": detail.settlement_amount,
                    "note": detail.supplementary_impact.get("impact_description", "")
                })
        return impacts

    def query_details(
        self,
        details: List[SettlementDetail],
        track_id: Optional[str] = None,
        owner_id: Optional[str] = None,
        platform: Optional[str] = None,
        has_issues: Optional[bool] = None
    ) -> List[SettlementDetail]:
        result = details

        if track_id:
            result = [d for d in result if d.track_id == track_id]
        if owner_id:
            result = [d for d in result if d.owner_id == owner_id]
        if platform:
            result = [d for d in result if d.platform == platform]
        if has_issues is not None:
            result = [d for d in result if (len(d.issues) > 0) == has_issues]

        return result

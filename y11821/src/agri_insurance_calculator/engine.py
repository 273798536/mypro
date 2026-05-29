from typing import List, Dict, Tuple
from collections import defaultdict
from datetime import datetime
import uuid

from .models import (
    FarmerArchive, LandParcel, SignatureRecord,
    DamageLevel, VoucherStatus, CalculationResult,
    VoucherRecord, ConclusionTrace, SourceReference,
    DataSource, ActionItem, DedupResult, LevelChangeRecord
)
from .dedup import detect_and_resolve_overlaps, apply_dedup_to_area
from .level_handler import (
    check_level_consistency, check_missing_signatures,
    check_area_consistency, DAMAGE_LEVEL_ORDER
)


DAMAGE_RATIO = {
    DamageLevel.NONE: 0.0,
    DamageLevel.MILD: 0.2,
    DamageLevel.MODERATE: 0.4,
    DamageLevel.SEVERE: 0.7,
    DamageLevel.TOTAL: 1.0,
}


def calculate_compensation(
    area: float,
    damage_level: DamageLevel,
    insurance_amount_per_mu: float
) -> float:
    ratio = DAMAGE_RATIO.get(damage_level, 0.0)
    return round(area * insurance_amount_per_mu * ratio, 2)


def determine_voucher_status(
    farmer_id: str,
    has_missing_signature: bool,
    has_overlap: bool,
    has_level_change: bool,
    has_area_mismatch: bool
) -> VoucherStatus:
    if has_missing_signature:
        return VoucherStatus.REJECTED
    if has_overlap or has_area_mismatch:
        return VoucherStatus.DISPUTED
    if has_level_change:
        return VoucherStatus.PENDING
    return VoucherStatus.APPROVED


class InsuranceCalculator:
    def __init__(
        self,
        farmers: List[FarmerArchive],
        parcels: List[LandParcel],
        signatures: List[SignatureRecord],
        apply_dedup: bool = True
    ):
        self.farmers = farmers
        self.original_parcels = parcels
        self.signatures = signatures
        self.apply_dedup = apply_dedup

        self.farmer_map = {f.farmer_id: f for f in farmers}
        self.signature_map = {s.farmer_id: s for s in signatures}

        self.processed_parcels: List[LandParcel] = []
        self.dedup_results: List[DedupResult] = []
        self.dedup_actions: List[ActionItem] = []
        self.level_changes: List[LevelChangeRecord] = []
        self.level_actions: List[ActionItem] = []
        self.final_levels: Dict[str, DamageLevel] = {}
        self.missing_sigs: List[SignatureRecord] = []
        self.sig_actions: List[ActionItem] = []
        self.final_areas: Dict[str, float] = {}
        self.area_actions: List[ActionItem] = []
        self.overlap_farmers: set = set()
        self.area_mismatch_farmers: set = set()
        self.level_change_farmers: set = set()
        self.missing_sig_farmers: set = set()

    def run(self) -> CalculationResult:
        self._process_dedup()
        self._process_level_checks()
        self._process_signature_checks()
        self._process_area_checks()
        return self._generate_result()

    def _process_dedup(self):
        self.processed_parcels, self.dedup_results, self.dedup_actions = detect_and_resolve_overlaps(
            self.original_parcels,
            apply_dedup=self.apply_dedup
        )
        if self.apply_dedup:
            self.processed_parcels = apply_dedup_to_area(
                self.processed_parcels,
                self.dedup_results
            )
        self.overlap_farmers = {
            self.farmer_map[r.original_parcel_id.split('_')[0]].farmer_id
            for r in self.dedup_results
            if r.original_parcel_id.split('_')[0] in self.farmer_map
        }
        for r in self.dedup_results:
            for parcel in self.processed_parcels:
                if parcel.parcel_id == r.original_parcel_id:
                    self.overlap_farmers.add(parcel.farmer_id)
                    break

    def _process_level_checks(self):
        self.level_changes, self.level_actions, self.final_levels = check_level_consistency(
            self.farmers,
            self.processed_parcels,
            self.signatures
        )
        self.level_change_farmers = {lc.farmer_id for lc in self.level_changes}

    def _process_signature_checks(self):
        self.missing_sigs, self.sig_actions = check_missing_signatures(self.signatures)
        self.missing_sig_farmers = {s.farmer_id for s in self.missing_sigs}

    def _process_area_checks(self):
        self.final_areas, self.area_actions = check_area_consistency(
            self.farmers,
            self.processed_parcels,
            self.signatures
        )
        self.area_mismatch_farmers = {
            farmer_id for farmer_id in self.final_areas
            if farmer_id in {a.related_conclusion.split('_')[-1] for a in self.area_actions}
        }
        for action in self.area_actions:
            farmer_id = action.related_conclusion.replace('area_mismatch_', '')
            self.area_mismatch_farmers.add(farmer_id)

    def _generate_result(self) -> CalculationResult:
        batch_id = f"BATCH-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        farmer_parcels = defaultdict(list)
        for parcel in self.processed_parcels:
            farmer_parcels[parcel.farmer_id].append(parcel)

        vouchers = []
        total_original_area = 0.0
        total_deduplicated_area = 0.0
        total_compensation = 0.0

        status_summary: Dict[VoucherStatus, int] = defaultdict(int)
        damage_summary: Dict[DamageLevel, float] = defaultdict(float)

        all_actions = []
        all_actions.extend(self.dedup_actions)
        all_actions.extend(self.level_actions)
        all_actions.extend(self.sig_actions)
        all_actions.extend(self.area_actions)

        for farmer in self.farmers:
            farmer_id = farmer.farmer_id
            farmer_name = farmer.name

            parcels_for_farmer = farmer_parcels.get(farmer_id, [])
            original_area = sum(p.area for p in self.original_parcels if p.farmer_id == farmer_id)
            dedup_area = sum(p.area for p in parcels_for_farmer)

            final_area = self.final_areas.get(farmer_id, min(dedup_area, farmer.insured_area))
            final_level = self.final_levels.get(farmer_id, DamageLevel.NONE)

            insurance_per_mu = farmer.insurance_amount / farmer.insured_area if farmer.insured_area > 0 else 0
            compensation = calculate_compensation(final_area, final_level, insurance_per_mu)

            has_overlap = farmer_id in self.overlap_farmers
            has_level_change = farmer_id in self.level_change_farmers
            has_missing_sig = farmer_id in self.missing_sig_farmers
            has_area_mismatch = farmer_id in self.area_mismatch_farmers

            status = determine_voucher_status(
                farmer_id,
                has_missing_sig,
                has_overlap,
                has_level_change,
                has_area_mismatch
            )

            traces = []
            issues = []
            farmer_actions = []

            area_trace = ConclusionTrace(
                conclusion_id=f"area_{farmer_id}",
                conclusion=f"{farmer_name}的赔付面积确定为{final_area:.2f}亩",
                value=final_area,
                sources=[farmer.source_ref],
                calculation_steps=[
                    f"农户档案投保面积: {farmer.insured_area:.2f}亩",
                    f"卫星图斑总面积(去重后): {dedup_area:.2f}亩",
                    f"签字表申报面积: {self.signature_map.get(farmer_id).reported_area:.2f}亩" if farmer_id in self.signature_map else "无签字表记录",
                    f"取值规则: 取档案与图斑较小值，同时参考签字表",
                    f"最终赔付面积: {final_area:.2f}亩"
                ]
            )
            for parcel in parcels_for_farmer:
                area_trace.add_source(parcel.source_ref)
            traces.append(area_trace)

            level_trace = ConclusionTrace(
                conclusion_id=f"level_{farmer_id}",
                conclusion=f"{farmer_name}的灾损等级确定为{final_level.value}",
                value=final_level.value,
                sources=[farmer.source_ref],
                calculation_steps=[
                    f"保险类型: {farmer.insurance_type}",
                    f"单位保额: {insurance_per_mu:.2f}元/亩",
                    f"灾损等级: {final_level.value}",
                    f"赔付比例: {DAMAGE_RATIO[final_level] * 100:.0f}%"
                ]
            )
            if farmer_id in self.signature_map:
                level_trace.add_source(self.signature_map[farmer_id].source_ref)
            traces.append(level_trace)

            comp_trace = ConclusionTrace(
                conclusion_id=f"comp_{farmer_id}",
                conclusion=f"{farmer_name}的赔付金额计算为{compensation:.2f}元",
                value=compensation,
                sources=[farmer.source_ref],
                calculation_steps=[
                    f"计算公式: 赔付面积 × 单位保额 × 赔付比例",
                    f"代入数值: {final_area:.2f} × {insurance_per_mu:.2f} × {DAMAGE_RATIO[final_level]}",
                    f"计算过程: {final_area:.2f} × {insurance_per_mu:.2f} = {final_area * insurance_per_mu:.2f}",
                    f"计算过程: {final_area * insurance_per_mu:.2f} × {DAMAGE_RATIO[final_level]} = {compensation:.2f}",
                    f"最终赔付金额: {compensation:.2f}元"
                ]
            )
            traces.append(comp_trace)

            if has_overlap:
                issues.append("图斑存在重叠，已触发面积去重")
            if has_level_change:
                issues.append("灾损等级存在变更，需复核")
            if has_missing_sig:
                issues.append("缺少村干部签字确认")
            if has_area_mismatch:
                issues.append("三源面积数据不一致")

            for action in all_actions:
                action_farmer_id = None
                if 'dedup' in action.related_conclusion:
                    for r in self.dedup_results:
                        if r.trace.conclusion_id == action.related_conclusion:
                            for p in self.processed_parcels:
                                if p.parcel_id == r.original_parcel_id:
                                    action_farmer_id = p.farmer_id
                                    break
                elif 'level' in action.related_conclusion:
                    action_farmer_id = action.related_conclusion.replace('level_change_', '')
                elif 'sig' in action.related_conclusion:
                    action_farmer_id = action.related_conclusion.replace('missing_sig_', '')
                    if action_farmer_id.startswith('action_sig_'):
                        sig_id = action.related_conclusion.replace('action_sig_', '')
                        for s in self.signatures:
                            if s.record_id == sig_id:
                                action_farmer_id = s.farmer_id
                                break
                elif 'area' in action.related_conclusion:
                    action_farmer_id = action.related_conclusion.replace('area_mismatch_', '')
                    if action_farmer_id.startswith('action_area_'):
                        action_farmer_id = action.related_conclusion.replace('action_area_', '')

                if action_farmer_id == farmer_id:
                    farmer_actions.append(action)

            voucher = VoucherRecord(
                voucher_id=f"V-{farmer_id}-{datetime.now().strftime('%Y%m%d')}",
                farmer_id=farmer_id,
                farmer_name=farmer_name,
                village=farmer.village,
                status=status,
                area=final_area,
                damage_level=final_level,
                compensation_amount=compensation,
                traces=traces,
                action_items=farmer_actions,
                issues=issues
            )
            vouchers.append(voucher)

            total_original_area += original_area
            total_deduplicated_area += final_area
            total_compensation += compensation
            status_summary[status] += 1
            damage_summary[final_level] += final_area

        result = CalculationResult(
            batch_id=batch_id,
            total_farmers=len(self.farmers),
            total_original_area=round(total_original_area, 2),
            total_deduplicated_area=round(total_deduplicated_area, 2),
            total_compensation=round(total_compensation, 2),
            status_summary=dict(status_summary),
            damage_summary=dict(damage_summary),
            vouchers=vouchers,
            dedup_results=self.dedup_results,
            level_changes=self.level_changes,
            action_items=all_actions,
            missing_signatures=self.missing_sigs
        )
        return result

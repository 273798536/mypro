from typing import List, Dict, Tuple
from collections import defaultdict

from .models import (
    FarmerArchive, LandParcel, SignatureRecord,
    DamageLevel, VoucherStatus, LevelChangeRecord,
    ConclusionTrace, SourceReference, DataSource,
    ActionItem, SignatureRecord
)


DAMAGE_LEVEL_ORDER = {
    DamageLevel.NONE: 0,
    DamageLevel.MILD: 1,
    DamageLevel.MODERATE: 2,
    DamageLevel.SEVERE: 3,
    DamageLevel.TOTAL: 4,
}


def parse_damage_level(text: str) -> DamageLevel:
    text = text.strip()
    mapping = {
        '无损失': DamageLevel.NONE,
        '无': DamageLevel.NONE,
        '正常': DamageLevel.NONE,
        '轻度': DamageLevel.MILD,
        '轻微': DamageLevel.MILD,
        '中度': DamageLevel.MODERATE,
        '较重': DamageLevel.MODERATE,
        '重度': DamageLevel.SEVERE,
        '严重': DamageLevel.SEVERE,
        '绝收': DamageLevel.TOTAL,
        '全部损失': DamageLevel.TOTAL,
        '颗粒无收': DamageLevel.TOTAL,
    }
    return mapping.get(text, DamageLevel.NONE)


def check_level_consistency(
    farmers: List[FarmerArchive],
    parcels: List[LandParcel],
    signatures: List[SignatureRecord]
) -> Tuple[List[LevelChangeRecord], List[ActionItem], Dict[str, DamageLevel]]:
    farmer_parcels = defaultdict(list)
    for parcel in parcels:
        farmer_parcels[parcel.farmer_id].append(parcel)

    farmer_sigs = {}
    for sig in signatures:
        farmer_sigs[sig.farmer_id] = sig

    level_changes = []
    action_items = []
    final_levels = {}

    for farmer in farmers:
        farmer_id = farmer.farmer_id
        farmer_name = farmer.name

        sig_level = DamageLevel.NONE
        sig_record = farmer_sigs.get(farmer_id)
        if sig_record:
            sig_level = parse_damage_level(sig_record.reported_damage)

        parcel_level = DamageLevel.NONE
        parcel_ref = None
        for parcel in farmer_parcels.get(farmer_id, []):
            if DAMAGE_LEVEL_ORDER[parcel.damage_level] > DAMAGE_LEVEL_ORDER[parcel_level]:
                parcel_level = parcel.damage_level
                parcel_ref = parcel.source_ref

        archive_level = DamageLevel.NONE
        if sig_level != parcel_level:
            if DAMAGE_LEVEL_ORDER[sig_level] > DAMAGE_LEVEL_ORDER[parcel_level]:
                final_level = sig_level
                reason = f"签字表申报等级({sig_level.value})高于卫星图斑判定等级({parcel_level.value})，按高标准执行"
                original_level = parcel_level
                new_level = sig_level
            else:
                final_level = parcel_level
                reason = f"卫星图斑判定等级({parcel_level.value})高于签字表申报等级({sig_level.value})，按高标准执行"
                original_level = sig_level
                new_level = parcel_level

            trace = ConclusionTrace(
                conclusion_id=f"level_change_{farmer_id}",
                conclusion=f"{farmer_name}的灾损等级从{original_level.value}变更为{new_level.value}",
                value=new_level.value,
                sources=[
                    farmer.source_ref,
                    sig_record.source_ref if sig_record else parcel_ref,
                    parcel_ref if parcel_ref else farmer.source_ref,
                ],
                calculation_steps=[
                    f"农户档案投保信息: {farmer.insurance_type}, 保额{farmer.insurance_amount}元",
                    f"签字表申报等级: {sig_level.value} (来源: {sig_record.file_path if sig_record else '无'})",
                    f"卫星图斑判定等级: {parcel_level.value} (来源: {parcel_ref.file_path if parcel_ref else '无'})",
                    f"等级比较规则: 取较高等级作为最终赔付等级",
                    f"决策: {reason}"
                ]
            )

            action = ActionItem(
                action_id=f"action_level_{farmer_id}",
                type="等级变更复核",
                description=f"{farmer_name}的灾损等级存在差异: 签字表{sig_level.value} vs 卫星图斑{parcel_level.value}，最终确定为{new_level.value}，需复核确认",
                responsible_person="理赔员/驻村干部",
                contact=f"联系农户电话: {farmer.phone}",
                file_to_modify=farmer.file_path,
                field_to_fix=f"farmers.{farmer_id}.damage_level (需补充到农户档案)",
                priority="高" if DAMAGE_LEVEL_ORDER[new_level] >= DAMAGE_LEVEL_ORDER[DamageLevel.SEVERE] else "中",
                status="待复核",
                related_conclusion=trace.conclusion_id
            )

            change_record = LevelChangeRecord(
                farmer_id=farmer_id,
                farmer_name=farmer_name,
                original_level=original_level,
                new_level=new_level,
                reason=reason,
                trace=trace,
                action_item=action
            )

            level_changes.append(change_record)
            action_items.append(action)
            final_levels[farmer_id] = new_level
        else:
            final_levels[farmer_id] = sig_level

    return level_changes, action_items, final_levels


def check_missing_signatures(
    signatures: List[SignatureRecord]
) -> Tuple[List[SignatureRecord], List[ActionItem]]:
    missing = []
    action_items = []

    for sig in signatures:
        if not sig.has_signature:
            missing.append(sig)

            trace = ConclusionTrace(
                conclusion_id=f"missing_sig_{sig.record_id}",
                conclusion=f"{sig.farmer_name}的签字表缺少村干部签字确认",
                value=False,
                sources=[sig.source_ref],
                calculation_steps=[
                    f"检查签字表记录: {sig.record_id}",
                    f"签字状态: {'有签字' if sig.has_signature else '无签字'}",
                    f"处理: 标记为待补签，需联系村干部确认"
                ]
            )

            action = ActionItem(
                action_id=f"action_sig_{sig.record_id}",
                type="签字缺失补全",
                description=f"{sig.farmer_name}(村:{sig.village})的报案签字表缺少村干部签字，申报面积{sig.reported_area}亩，损失{sig.reported_damage}，需补签后才能进入正常赔付流程",
                responsible_person="村主任/包片干部",
                contact="联系村两委安排签字",
                file_to_modify=sig.file_path,
                field_to_fix=f"records.{sig.record_id}.has_signature / .signatory / .signature_date",
                priority="高",
                status="待补签",
                related_conclusion=trace.conclusion_id
            )
            action_items.append(action)

    return missing, action_items


def check_area_consistency(
    farmers: List[FarmerArchive],
    parcels: List[LandParcel],
    signatures: List[SignatureRecord]
) -> Tuple[Dict[str, float], List[ActionItem]]:
    farmer_parcels = defaultdict(list)
    for parcel in parcels:
        farmer_parcels[parcel.farmer_id].append(parcel)

    farmer_sigs = {}
    for sig in signatures:
        farmer_sigs[sig.farmer_id] = sig

    final_areas = {}
    action_items = []

    for farmer in farmers:
        farmer_id = farmer.farmer_id
        farmer_name = farmer.name

        archive_area = farmer.insured_area
        sig_area = farmer_sigs.get(farmer_id, None)
        sig_area_val = sig_area.reported_area if sig_area else 0
        parcel_area = sum(p.area for p in farmer_parcels.get(farmer_id, []))

        max_area = max(archive_area, sig_area_val, parcel_area)
        min_area = min(archive_area, sig_area_val, parcel_area)

        if max_area - min_area > 0.5:
            trace = ConclusionTrace(
                conclusion_id=f"area_mismatch_{farmer_id}",
                conclusion=f"{farmer_name}的面积数据不一致: 档案{archive_area:.2f}亩, 签字表{sig_area_val:.2f}亩, 图斑{parcel_area:.2f}亩",
                value=min(archive_area, parcel_area),
                sources=[
                    farmer.source_ref,
                    sig_area.source_ref if sig_area else farmer.source_ref,
                ],
                calculation_steps=[
                    f"农户档案投保面积: {archive_area:.2f}亩",
                    f"签字表申报面积: {sig_area_val:.2f}亩",
                    f"卫星图斑测量面积: {parcel_area:.2f}亩",
                    f"取值规则: 取档案与图斑的较小值 {min(archive_area, parcel_area):.2f}亩作为赔付基数",
                    f"差异原因: 三者口径不统一，需核实"
                ]
            )

            action = ActionItem(
                action_id=f"action_area_{farmer_id}",
                type="面积口径统一",
                description=f"{farmer_name}的面积数据存在差异: 档案{archive_area:.2f}亩、签字表{sig_area_val:.2f}亩、图斑{parcel_area:.2f}亩，需现场丈量确认",
                responsible_person="理赔员/测绘员",
                contact=f"联系农户: {farmer.phone}",
                file_to_modify=farmer.file_path,
                field_to_fix=f"farmers.{farmer_id}.insured_area 或对应图斑/签字表记录",
                priority="高",
                status="待核实",
                related_conclusion=trace.conclusion_id
            )
            action_items.append(action)
            final_areas[farmer_id] = min(archive_area, parcel_area)
        else:
            final_areas[farmer_id] = min(archive_area, parcel_area, sig_area_val) if sig_area else min(archive_area, parcel_area)

    return final_areas, action_items

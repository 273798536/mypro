from datetime import datetime
from typing import List, Dict, Any, Optional

from .models import (
    MonitorRecord,
    ReagentRecord,
    AnomalyRecord,
    ANOMALY_TYPES,
)


BLANK_CONTROL_WARN_MIN = 0.000
BLANK_CONTROL_WARN_MAX = 0.060
SAMPLE_MIN_MG_L = 0.00
SAMPLE_MAX_MG_L = 50.0


def _make_anomaly_id(prefix: str, monitor_id: str, idx: int) -> str:
    return f"{prefix}_{monitor_id}_{idx}"


def check_blank_control_missing(
    monitor: MonitorRecord, reagent_map: Dict[str, ReagentRecord], anomaly_idx: int
) -> Optional[AnomalyRecord]:
    if monitor.blank_control_value is None:
        reagent_evidence = []
        for rid in monitor.reagent_ids:
            if rid in reagent_map:
                r = reagent_map[rid]
                reagent_evidence.append(
                    f"{r.name}(批号{r.batch_no}, {r.manufacturer})"
                )

        explanation_parts = [
            f"本次{monitor.sample_name}（样品编号{monitor.sample_id}）的氨氮检测记录中，",
            "空白对照值这一栏没有填写。",
            "空白对照是判断试剂是否污染、操作是否规范的关键基线，",
            "没有这个数值，检测结果的可信度会大打折扣。",
        ]
        if reagent_evidence:
            explanation_parts.append(
                f"本次实验使用了以下试剂：{', '.join(reagent_evidence)}，"
                "请核对这些试剂的领用记录和开瓶时间，看看是否有漏登的情况。"
            )
        else:
            explanation_parts.append(
                "另外，这份记录也没有关联试剂台账编号，建议补录试剂使用情况以便追溯。"
            )

        return AnomalyRecord(
            anomaly_id=_make_anomaly_id("BLANK", monitor.record_id, anomaly_idx),
            monitor_record_id=monitor.record_id,
            anomaly_type="BLANK_CONTROL_MISSING",
            severity="critical",
            description=f"样品[{monitor.sample_name}]空白对照值未填写",
            plain_explanation="".join(explanation_parts),
            reagent_evidence=monitor.reagent_ids,
            related_fields=["blank_control_value", "blank_control_unit"],
            retest_suggestion=(
                "建议立即使用同批次试剂重新做空白对照，确认试剂有效后再对原样品进行复测。"
                "如果原样品已耗尽，请重新采样，并在记录中注明'补样复测'。"
            ),
            action_suggestion=(
                "1. 先检查试剂台账，确认所用试剂是否在有效期内；"
                "2. 重新配置空白对照溶液并测定吸光度；"
                "3. 若空白值偏高，排查纯水、比色皿、纳氏试剂是否受污染；"
                "4. 将补测的空白值和复测结果一并补录到系统中，备注清楚原因。"
            ),
        )
    return None


def check_blank_control_abnormal(
    monitor: MonitorRecord, reagent_map: Dict[str, ReagentRecord], anomaly_idx: int
) -> Optional[AnomalyRecord]:
    if monitor.blank_control_value is None:
        return None
    val = monitor.blank_control_value
    if val < BLANK_CONTROL_WARN_MIN or val > BLANK_CONTROL_WARN_MAX:
        unit = monitor.blank_control_unit or "吸光度"
        reagent_evidence = []
        for rid in monitor.reagent_ids:
            if rid in reagent_map:
                r = reagent_map[rid]
                reagent_evidence.append(
                    f"{r.name}(批号{r.batch_no}, 有效期至{r.expiry_date.strftime('%Y-%m-%d') if r.expiry_date else '未知'})"
                )

        direction = "偏高" if val > BLANK_CONTROL_WARN_MAX else "偏低"
        return AnomalyRecord(
            anomaly_id=_make_anomaly_id("BLANK_ABN", monitor.record_id, anomaly_idx),
            monitor_record_id=monitor.record_id,
            anomaly_type="BLANK_CONTROL_ABNORMAL",
            severity="major",
            description=(
                f"样品[{monitor.sample_name}]空白对照值{val}{unit}{direction}"
                f"（正常范围约{BLANK_CONTROL_WARN_MIN}-{BLANK_CONTROL_WARN_MAX}）"
            ),
            plain_explanation=(
                f"本次{monitor.sample_name}的空白对照测得值为{val}{unit}，{direction}于常规范围。"
                "空白对照偏高通常意味着纯水受氨污染、纳氏试剂变质或比色皿未清洗干净；"
                "偏低则可能是试剂未充分混匀或仪器未校准。"
                + (
                    f"请核对本次使用的试剂：{', '.join(reagent_evidence)}。"
                    if reagent_evidence
                    else "建议补录本次使用的试剂信息，以便进一步排查。"
                )
            ),
            reagent_evidence=monitor.reagent_ids,
            related_fields=["blank_control_value", "blank_control_unit"],
            retest_suggestion=(
                "更换新的无氨纯水，清洗比色皿后重新测定空白；"
                "如果使用的纳氏试剂已接近有效期或出现沉淀，建议更换新试剂后再测。"
            ),
            action_suggestion=(
                "1. 用新鲜无氨纯水做3次平行空白，取均值；"
                "2. 检查纳氏试剂是否有浑浊或变红，必要时重新配置；"
                "3. 校准分光光度计波长；"
                "4. 记录排查过程和结论，附在原始记录后。"
            ),
        )
    return None


def check_unit_missing(
    monitor: MonitorRecord, reagent_map: Dict[str, ReagentRecord], anomaly_idx: int
) -> Optional[AnomalyRecord]:
    missing = []
    if monitor.sample_value is not None and not monitor.sample_unit:
        missing.append("样品检测值单位")
    if monitor.blank_control_value is not None and not monitor.blank_control_unit:
        missing.append("空白对照单位")
    if missing:
        return AnomalyRecord(
            anomaly_id=_make_anomaly_id("UNIT", monitor.record_id, anomaly_idx),
            monitor_record_id=monitor.record_id,
            anomaly_type="UNIT_MISSING",
            severity="minor",
            description=f"样品[{monitor.sample_name}]{'、'.join(missing)}未填写",
            plain_explanation=(
                f"{monitor.sample_name}（编号{monitor.sample_id}）的检测记录中，"
                f"{'和'.join(missing)}没有写。"
                "虽然数值填了，但没有单位就像说'身高170'却不说厘米还是毫米一样，别人无法判断这个数值合不合理。"
                "氨氮常用单位是mg/L（毫克每升），吸光度一般写'A'或不写单位。"
            ),
            reagent_evidence=[],
            related_fields=["sample_unit", "blank_control_unit"],
            retest_suggestion="一般不需要复测，直接询问当时的检测人员补填单位即可。",
            action_suggestion=(
                "1. 查同批次其他记录的单位写法，保持一致；"
                "2. 若确实记不清，备注'单位为mg/L（根据本实验室常规标注补录）'；"
                "3. 提醒同事以后写完数值顺手把单位写上。"
            ),
        )
    return None


def check_reagent_issues(
    monitor: MonitorRecord, reagent_map: Dict[str, ReagentRecord], now: datetime, anomaly_idx: int
) -> List[AnomalyRecord]:
    results = []
    idx = anomaly_idx

    if not monitor.reagent_ids:
        results.append(AnomalyRecord(
            anomaly_id=_make_anomaly_id("REAG_NOLOG", monitor.record_id, idx),
            monitor_record_id=monitor.record_id,
            anomaly_type="REAGENT_NOT_LOGGED",
            severity="major",
            description=f"样品[{monitor.sample_name}]未关联试剂台账",
            plain_explanation=(
                f"{monitor.sample_name}的这份检测记录没有关联任何试剂台账编号。"
                "万一结果有争议，就没法追查到当时用了哪一批纳氏试剂、酒石酸钾钠有没有过期。"
                "请补录本次实验使用的试剂编号，尤其是纳氏试剂和标准溶液的批号。"
            ),
            reagent_evidence=[],
            related_fields=["reagent_ids"],
            retest_suggestion="无需复测，但必须补录试剂信息。",
            action_suggestion=(
                "1. 查看当日试剂领用登记本或出入库记录；"
                "2. 回忆当天实验台上开着哪几瓶试剂；"
                "3. 将试剂编号回填到记录中，备注'补录'。"
            ),
        ))
        idx += 1
    else:
        for rid in monitor.reagent_ids:
            r = reagent_map.get(rid)
            if r is None:
                results.append(AnomalyRecord(
                    anomaly_id=_make_anomaly_id("REAG_NOLOG", monitor.record_id, idx),
                    monitor_record_id=monitor.record_id,
                    anomaly_type="REAGENT_NOT_LOGGED",
                    severity="major",
                    description=f"样品[{monitor.sample_name}]关联的试剂[{rid}]在台账中找不到",
                    plain_explanation=(
                        f"记录里写了用试剂{rid}，但试剂台账里根本没有这个编号。"
                        "要么是编号写错了，要么是这瓶试剂领用的时候没登台账。"
                        "请对照实物核对一下，把正确的试剂编号补上。"
                    ),
                    reagent_evidence=[rid],
                    related_fields=["reagent_ids"],
                    retest_suggestion="无需复测，但必须核对清楚试剂信息。",
                    action_suggestion=(
                        "1. 查找试剂瓶实物标签上的批号；"
                        "2. 检查台账是否有漏登；"
                        "3. 修正编号或补登台账，并在备注中说明。"
                    ),
                ))
                idx += 1
            elif r.expiry_date and r.expiry_date < now:
                results.append(AnomalyRecord(
                    anomaly_id=_make_anomaly_id("REAG_EXP", monitor.record_id, idx),
                    monitor_record_id=monitor.record_id,
                    anomaly_type="REAGENT_EXPIRED",
                    severity="critical",
                    description=(
                        f"样品[{monitor.sample_name}]使用的试剂[{r.name}({rid})]"
                        f"已于{r.expiry_date.strftime('%Y-%m-%d')}过期"
                    ),
                    plain_explanation=(
                        f"本次检测用的{r.name}（编号{rid}，批号{r.batch_no}）"
                        f"到{r.expiry_date.strftime('%Y年%m月%d日')}就过期了，"
                        f"而检测是在{monitor.monitor_date.strftime('%Y年%m月%d日') if monitor.monitor_date else '当天'}做的。"
                        "过期试剂尤其是纳氏试剂会导致显色异常，结果可能完全不准。"
                    ),
                    reagent_evidence=[rid],
                    related_fields=["reagent_ids", "expiry_date"],
                    retest_suggestion=(
                        "必须使用在有效期内的新试剂对原样进行复测；"
                        "如果原样品不够了，要重新采样并注明'因试剂过期重新采样'。"
                    ),
                    action_suggestion=(
                        "1. 立即将过期试剂从实验台移走，贴'停用'标签；"
                        "2. 开启新批次试剂，做好开瓶登记；"
                        "3. 用新试剂重新做空白和样品；"
                        "4. 在原始记录上标注'原结果因试剂过期作废'。"
                    ),
                ))
                idx += 1
    return results


def check_operator_missing(
    monitor: MonitorRecord, reagent_map: Dict[str, ReagentRecord], anomaly_idx: int
) -> Optional[AnomalyRecord]:
    if not monitor.operator:
        return AnomalyRecord(
            anomaly_id=_make_anomaly_id("OP", monitor.record_id, anomaly_idx),
            monitor_record_id=monitor.record_id,
            anomaly_type="OPERATOR_MISSING",
            severity="minor",
            description=f"样品[{monitor.sample_name}]未填写检测人员",
            plain_explanation=(
                f"{monitor.sample_name}这份记录没写是谁做的。"
                "万一结果有疑问或者需要补测，找不到当事人就很麻烦。"
                "请尽快补填检测人姓名。"
            ),
            reagent_evidence=[],
            related_fields=["operator"],
            retest_suggestion="不需要复测，补填姓名即可。",
            action_suggestion=(
                "1. 查当日值班表或问一下同事；"
                "2. 确认后把名字填上；"
                "3. 如果是多人协作，写主检人即可。"
            ),
        )
    return None


def check_reviewer_missing(
    monitor: MonitorRecord, reagent_map: Dict[str, ReagentRecord], anomaly_idx: int
) -> Optional[AnomalyRecord]:
    if monitor.sample_value is not None and not monitor.reviewer:
        return AnomalyRecord(
            anomaly_id=_make_anomaly_id("REV", monitor.record_id, anomaly_idx),
            monitor_record_id=monitor.record_id,
            anomaly_type="REVIEWER_MISSING",
            severity="info",
            description=f"样品[{monitor.sample_name}]未填写审核人员",
            plain_explanation=(
                f"{monitor.sample_name}的检测结果已经填了，但还没有人审核签字。"
                "按规定检测记录需要第二个人复核，确认数值、单位、计算公式都没问题。"
                "请找质检主管或有资质的同事审一下。"
            ),
            reagent_evidence=[],
            related_fields=["reviewer"],
            retest_suggestion="不需要复测，走审核流程即可。",
            action_suggestion=(
                "1. 把原始记录和计算过程一起交给审核人；"
                "2. 审核无误后签字；"
                "3. 如有修改请按规范划改并签名。"
            ),
        )
    return None


def check_remark_incomplete(
    monitor: MonitorRecord, reagent_map: Dict[str, ReagentRecord], anomaly_idx: int
) -> Optional[AnomalyRecord]:
    if monitor.remarks:
        r = monitor.remarks.strip()
        if r.endswith(("补", "补录", "...", "…", "待", "等")):
            return AnomalyRecord(
                anomaly_id=_make_anomaly_id("RMK", monitor.record_id, anomaly_idx),
                monitor_record_id=monitor.record_id,
                anomaly_type="REMARK_INCOMPLETE",
                severity="info",
                description=f"样品[{monitor.sample_name}]备注内容不完整（以'{r[-2:]}'结尾）",
                plain_explanation=(
                    f"{monitor.sample_name}的备注写了'{monitor.remarks}'，"
                    "看起来像是写了一半没写完。比如写了'补'却没说补什么，"
                    "写了'待'却没说待什么。请把补录原因、异常情况说明白，"
                    "不然过几个月再看谁也记不清当时是什么状况。"
                ),
                reagent_evidence=[],
                related_fields=["remarks"],
                retest_suggestion="不需要复测，把备注写完整就行。",
                action_suggestion=(
                    "1. 回忆当时为什么要写备注；"
                    "2. 完整写明异常原因和处理方式，例如："
                    "'补录：原记录空白对照值漏填，已用同批次试剂补测，结果为0.032A'；"
                    "3. 签上补录人姓名和日期。"
                ),
            )
    return None


def check_standard_curve_missing(
    monitor: MonitorRecord, reagent_map: Dict[str, ReagentRecord], anomaly_idx: int
) -> Optional[AnomalyRecord]:
    if monitor.sample_value is not None and not monitor.standard_curve_id:
        return AnomalyRecord(
            anomaly_id=_make_anomaly_id("CURVE", monitor.record_id, anomaly_idx),
            monitor_record_id=monitor.record_id,
            anomaly_type="STANDARD_CURVE_MISSING",
            severity="major",
            description=f"样品[{monitor.sample_name}]未关联标准曲线编号",
            plain_explanation=(
                f"{monitor.sample_name}的检测结果已经填了，"
                "但没写用了哪条标准曲线来计算浓度。"
                "不同日期做的标曲斜率和截距都不一样，没有标曲编号就没法复核这个数值是怎么算出来的。"
                "请查一下当天的标曲记录，把编号填上。"
            ),
            reagent_evidence=[],
            related_fields=["standard_curve_id"],
            retest_suggestion=(
                "如果能找到当天的标曲数据，直接补填编号即可；"
                "如果完全找不到标曲记录，原结果无法追溯，建议重做标曲并复测样品。"
            ),
            action_suggestion=(
                "1. 查标曲记录本或仪器打印记录；"
                "2. 确认日期一致后填入编号；"
                "3. 若标曲丢失，按规范重新配置标准系列并制作新曲线。"
            ),
        )
    return None


def detect_anomalies(
    monitors: List[MonitorRecord],
    reagents: List[ReagentRecord],
) -> List[AnomalyRecord]:
    reagent_map = {r.reagent_id: r for r in reagents}
    now = datetime.now()
    all_anomalies: List[AnomalyRecord] = []

    for monitor in monitors:
        idx = 0

        a = check_blank_control_missing(monitor, reagent_map, idx)
        if a:
            all_anomalies.append(a)
            idx += 1

        a = check_blank_control_abnormal(monitor, reagent_map, idx)
        if a:
            all_anomalies.append(a)
            idx += 1

        a = check_unit_missing(monitor, reagent_map, idx)
        if a:
            all_anomalies.append(a)
            idx += 1

        reagent_anoms = check_reagent_issues(monitor, reagent_map, now, idx)
        all_anomalies.extend(reagent_anoms)
        idx += len(reagent_anoms)

        a = check_operator_missing(monitor, reagent_map, idx)
        if a:
            all_anomalies.append(a)
            idx += 1

        a = check_reviewer_missing(monitor, reagent_map, idx)
        if a:
            all_anomalies.append(a)
            idx += 1

        a = check_remark_incomplete(monitor, reagent_map, idx)
        if a:
            all_anomalies.append(a)
            idx += 1

        a = check_standard_curve_missing(monitor, reagent_map, idx)
        if a:
            all_anomalies.append(a)
            idx += 1

    return all_anomalies

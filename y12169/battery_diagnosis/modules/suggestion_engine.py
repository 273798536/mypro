from typing import List
from collections import defaultdict

from ..core.models import (
    DiagnosisResult, AnomalyInstance, FactorContribution,
    AnomalyType, RangeEstimate
)


SUGGESTION_TEMPLATES = {
    AnomalyType.LOW_TEMPERATURE: [
        ("low", "低温天气建议提前预热电池, 可提升续航约5-10%"),
        ("medium", "建议使用车棚或地下车库停放, 减少低温对电池的影响"),
        ("high", "极寒天气下建议开启电池保温模式, 避免续航大幅下降"),
        ("critical", "极端低温环境下建议减少长途行驶, 规划充电路线时预留更多余量")
    ],
    AnomalyType.FAST_CHARGING_EXCESS: [
        ("low", "建议适当减少快充频率, 每周快充不超过3次为宜"),
        ("medium", "快充会加速电池衰减, 建议日常使用慢充为主, 快充用于应急"),
        ("high", "频繁快充已明显影响电池性能, 建议调整充电习惯, 慢充比例不低于70%"),
        ("critical", "过度快充可能导致电池过热和加速衰减, 建议减少长途出行, 优化充电规划")
    ],
    AnomalyType.ABNORMAL_TRIP: [
        ("low", "部分行程数据质量较低, 建议检查车辆数据采集设备"),
        ("medium", "检测到异常能耗行程, 建议检查轮胎气压和制动系统是否正常"),
        ("high", "多次行程能耗异常偏高, 建议进行车辆检修, 排除机械故障"),
        ("critical", "持续高能耗可能意味着电池或动力系统故障, 建议立即到服务站检测")
    ],
    AnomalyType.BATTERY_DEGRADATION: [
        ("low", "电池健康度略有下降, 属正常损耗, 继续保持良好使用习惯"),
        ("medium", "电池已出现明显衰减, 建议优化充电习惯, 避免深度放电"),
        ("high", "电池衰减较为严重, 建议预约电池检测, 评估是否需要校准或维修"),
        ("critical", "电池衰减已影响正常使用, 建议尽快到授权服务站进行电池检测和评估更换")
    ],
    AnomalyType.DRIVING_HABIT: [
        ("low", "建议保持平稳驾驶, 避免急加速急刹车, 可提升续航"),
        ("medium", "高速行驶和频繁加速会增加能耗, 建议使用经济模式, 保持合理车速"),
        ("high", "驾驶习惯对续航影响较大, 建议学习节能驾驶技巧, 减少空调使用"),
        ("critical", "激进驾驶风格严重影响续航和电池寿命, 建议调整驾驶方式")
    ]
}

GENERAL_SUGGESTIONS = [
    "定期进行电池校准（满充后慢充至涓流充电结束），可提升SOC估算准确性",
    "避免长期停放时电池电量低于20%或高于80%",
    "每3个月进行一次完整的充放电循环，有助于保持电池活性",
    "建议使用原厂充电器和充电线，确保充电安全和效率",
    "定期检查车辆固件更新，厂家可能会优化电池管理系统算法"
]


class SuggestionEngine:
    def generate(self, diagnosis_result: DiagnosisResult) -> List[str]:
        suggestions = []
        seen_suggestions = set()

        for anomaly in diagnosis_result.anomalies:
            templates = SUGGESTION_TEMPLATES.get(anomaly.anomaly_type, [])
            if not templates:
                continue

            severity_levels = {"low": 0, "medium": 1, "high": 2, "critical": 3}
            current_level = severity_levels.get(anomaly.severity, 1)

            for severity, suggestion in templates:
                if severity_levels.get(severity, 0) <= current_level:
                    if suggestion not in seen_suggestions:
                        suggestions.append(f"[{anomaly.anomaly_type.value}] {suggestion}")
                        seen_suggestions.add(suggestion)

        for factor in diagnosis_result.factor_breakdown:
            if factor.contribution_percent > 20:
                if factor.factor == AnomalyType.LOW_TEMPERATURE:
                    s = f"低温是主要影响因素(贡献{factor.contribution_percent:.1f}%), 建议做好车辆保温, 出行前预热电池"
                elif factor.factor == AnomalyType.FAST_CHARGING_EXCESS:
                    s = f"频繁快充是主要影响因素(贡献{factor.contribution_percent:.1f}%), 建议优先使用慢充"
                elif factor.factor == AnomalyType.BATTERY_DEGRADATION:
                    s = f"电池衰减是主要影响因素(贡献{factor.contribution_percent:.1f}%), 建议联系服务站检测电池状态"
                elif factor.factor == AnomalyType.DRIVING_HABIT:
                    s = f"驾驶习惯是主要影响因素(贡献{factor.contribution_percent:.1f}%), 建议采用节能驾驶方式"
                elif factor.factor == AnomalyType.ABNORMAL_TRIP:
                    s = f"行程异常是主要影响因素(贡献{factor.contribution_percent:.1f}%), 建议检查车辆状态"
                else:
                    continue

                if s not in seen_suggestions:
                    suggestions.append(s)
                    seen_suggestions.add(s)

        re = diagnosis_result.range_estimate
        range_deficit = re.nominal_range_km - re.actual_estimated_range_km
        if range_deficit > 50:
            s = f"实际续航({re.actual_estimated_range_km:.0f}km)较标称值({re.nominal_range_km:.0f}km)低{range_deficit:.0f}km, 建议综合采取上述改善措施"
            if s not in seen_suggestions:
                suggestions.append(s)
                seen_suggestions.add(s)

        if re.battery_health_percent < 90:
            s = f"当前电池健康度{re.battery_health_percent:.1f}%, 建议每6个月进行一次专业电池检测"
            if s not in seen_suggestions:
                suggestions.append(s)
                seen_suggestions.add(s)

        if re.confidence_score < 0.6:
            s = f"当前估算置信度较低({re.confidence_score:.2f}), 建议积累更多行程数据以提高诊断准确性"
            if s not in seen_suggestions:
                suggestions.append(s)
                seen_suggestions.add(s)

        for general_suggestion in GENERAL_SUGGESTIONS[:2]:
            if general_suggestion not in seen_suggestions:
                suggestions.append(general_suggestion)
                seen_suggestions.add(general_suggestion)

        return suggestions


def generate_suggestions(diagnosis_result: DiagnosisResult) -> List[str]:
    engine = SuggestionEngine()
    return engine.generate(diagnosis_result)

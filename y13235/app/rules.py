from .models import CalculationRule


DEFAULT_CALCULATION_RULE = CalculationRule(
    name="琴房课时进步评分规则",
    version="v1.0",
    description="基于多维度音频特征评估学生课时进步情况",
    formula={
        "tempo_accuracy": "节拍偏差率的反向归一化，偏差越小得分越高",
        "pitch_accuracy": "音准偏差半音数的反向归一化",
        "rhythm_stability": "节奏波动系数的反向归一化",
        "expression_score": "强弱动态变化幅度与参考曲线的匹配度",
        "overall_score": "tempo*0.3 + pitch*0.3 + rhythm*0.25 + expression*0.15"
    },
    thresholds={
        "excellent": 90.0,
        "good": 75.0,
        "pass": 60.0,
        "suspicious_low": 40.0,
        "suspicious_high": 98.0
    }
)

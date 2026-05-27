from __future__ import annotations

import io
import csv
import json
from datetime import datetime, timezone
from typing import List

from .models import AnomalyRecord, ExperimentResult, PosteriorStats, Experiment


def _format_pct(value: float) -> str:
    return f"{value * 100:.2f}%"


def _format_float(value: float, digits: int = 4) -> str:
    return f"{value:.{digits}f}"


def _explain_risk(risk: float) -> str:
    if risk < 0.001:
        return "风险极低，可放心选择"
    elif risk < 0.01:
        return "风险较低"
    elif risk < 0.05:
        return "存在一定风险，需综合评估"
    elif risk < 0.1:
        return "风险较高，建议增加样本或调整策略"
    else:
        return "风险很高，建议暂缓决策"


def _explain_win_prob(prob: float) -> str:
    if prob >= 0.95:
        return "几乎确定胜出"
    elif prob >= 0.8:
        return "较大概率胜出"
    elif prob >= 0.6:
        return "略占优势"
    elif prob >= 0.4:
        return "基本持平"
    elif prob >= 0.2:
        return "略处劣势"
    else:
        return "大概率劣势"


def _explain_anomaly(anomaly: AnomalyRecord) -> str:
    explainers = {
        "SAMPLE_IMBALANCE": "样本量严重不均会导致组间可比性下降，建议检查分配逻辑或重新抽样",
        "SAMPLE_IMBALANCE_CHISQ": "卡方检验发现统计上显著的样本不均，但实际比值在可接受范围内，可继续分析",
        "EARLY_STOPPING": "提前停止实验会引入选择偏差，后验估计可能偏乐观，建议补充数据或调整先验",
        "RECENT_STOP": "实验刚停止，数据可能存在滞后效应，建议在停止后3-7天再复盘",
        "LOW_SAMPLE_SIZE": "样本量不足会导致后验分布较宽，可信区间较大，结论不稳健",
        "LOW_CONVERSION_COUNT": "转化事件太少，估计精度有限，建议先积累更多转化后再判断",
        "LOW_TOTAL_SAMPLE": "总样本量偏低，可能存在系统性偏差，建议延长实验或扩大流量",
        "LOW_BASE_RATE": "极低转化率下先验影响显著，建议使用非信息先验(Beta(1,1))或增加样本",
        "PRIOR_DOMINANCE": "先验对后验影响较大，说明数据量不足以覆盖先验，建议增加样本或使用弱先验",
    }
    return explainers.get(anomaly.code, anomaly.message)


def generate_json_report(exp: Experiment, result: ExperimentResult) -> str:
    report = {
        "experiment": {
            "id": exp.id,
            "source_name": exp.source.name,
            "source_description": exp.source.description,
            "created_at": exp.created_at.isoformat(),
            "updated_at": exp.updated_at.isoformat(),
            "current_version": exp.current_version,
            "revision_count": len(exp.revisions),
            "notes": exp.notes,
        },
        "results": {
            "computed_at": result.computed_at.isoformat(),
            "version": result.version,
            "posterior_stats": [
                {
                    **s.model_dump(),
                    "explanations": {
                        "win_probability": _explain_win_prob(s.probability_better_than_baseline),
                        "risk": _explain_risk(s.risk),
                        "lift_direction": "正向" if s.expected_lift > 0 else ("负向" if s.expected_lift < 0 else "持平"),
                    },
                }
                for s in result.posterior_stats
            ],
            "win_probability_matrix": result.win_probability_matrix,
            "recommendation": {
                "recommended_variant": result.recommended_variant,
                "confidence": result.recommendation_confidence,
            },
            "anomalies": [
                {
                    **a.model_dump(),
                    "explanation": _explain_anomaly(a),
                }
                for a in result.anomalies
            ],
        },
        "history": [
            {
                "version": r.version,
                "modified_at": r.modified_at.isoformat(),
                "modified_by": r.modified_by,
                "change_summary": r.change_summary,
                "snapshot": r.data_snapshot,
            }
            for r in exp.revisions
        ],
    }
    return json.dumps(report, ensure_ascii=False, indent=2, default=str)


def generate_csv_report(exp: Experiment, result: ExperimentResult) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer)

    writer.writerow(["== 贝叶斯 A/B 实验复盘报告 =="])
    writer.writerow(["实验ID", exp.id])
    writer.writerow(["实验名称", exp.source.name])
    writer.writerow(["创建时间", exp.created_at.strftime("%Y-%m-%d %H:%M:%S")])
    writer.writerow(["当前版本", f"v{exp.current_version}"])
    writer.writerow(["修正次数", len(exp.revisions)])
    if exp.notes:
        writer.writerow(["备注", exp.notes])
    writer.writerow([])

    writer.writerow(["== 后验分析结果 =="])
    writer.writerow(["变体", "后验均值", "后验中位数", "95%CI下限", "95%CI上限",
                     "胜率P(>对照)", "期望提升", "风险", "样本量", "转化数",
                     "观测转化率", "胜率解读", "风险解读"])
    for s in result.posterior_stats:
        writer.writerow([
            s.variant,
            _format_float(s.posterior_mean),
            _format_float(s.posterior_median),
            _format_float(s.ci_lower),
            _format_float(s.ci_upper),
            _format_pct(s.probability_better_than_baseline),
            _format_pct(s.expected_lift),
            _format_float(s.risk, 6),
            s.sample_size,
            s.conversions,
            _format_pct(s.observed_rate),
            _explain_win_prob(s.probability_better_than_baseline),
            _explain_risk(s.risk),
        ])
    writer.writerow([])

    writer.writerow(["== 推荐结论 =="])
    if result.recommended_variant:
        writer.writerow(["推荐变体", result.recommended_variant])
        writer.writerow(["推荐置信度", result.recommendation_confidence or ""])
    else:
        writer.writerow(["推荐", "暂不推荐，数据不足或风险过高"])
    writer.writerow([])

    writer.writerow(["== 异常检测 =="])
    if result.anomalies:
        writer.writerow(["级别", "代码", "消息", "解读"])
        for a in result.anomalies:
            writer.writerow([a.level.value, a.code, a.message, _explain_anomaly(a)])
    else:
        writer.writerow(["未检测到异常"])
    writer.writerow([])

    writer.writerow(["== 修正历史 =="])
    if exp.revisions:
        writer.writerow(["版本", "修改时间", "修改人", "修改摘要"])
        for r in exp.revisions:
            writer.writerow([
                f"v{r.version}",
                r.modified_at.strftime("%Y-%m-%d %H:%M:%S"),
                r.modified_by or "-",
                r.change_summary,
            ])
    else:
        writer.writerow(["无修正记录"])
    writer.writerow([])

    writer.writerow(["== 胜率矩阵 =="])
    matrix = result.win_probability_matrix
    if matrix:
        variants = list(matrix.keys())
        writer.writerow([""] + variants)
        for v in variants:
            row = [v]
            for other in variants:
                val = matrix[v].get(other, 0.5)
                row.append(_format_pct(val))
            writer.writerow(row)

    return buffer.getvalue().encode("utf-8-sig")


def generate_report(exp: Experiment, result: ExperimentResult, fmt: str = "json") -> tuple[str | bytes, str]:
    if fmt == "csv":
        return generate_csv_report(exp, result), "text/csv"
    return generate_json_report(exp, result), "application/json"
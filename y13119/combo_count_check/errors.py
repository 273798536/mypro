"""
稳定错误码与失败提示
======================
错误码、退出码、提示文案一旦发布不可随意修改。
日常值班脚本依赖这些字符串做告警聚合与匹配。
"""
import sys
from typing import Dict, List


EXIT_OK = 0
EXIT_DATA_MISSING = 2
EXIT_OUTLIER_DETECTED = 3
EXIT_COUNT_MISMATCH = 4
EXIT_INVALID_PARAM = 5


ERROR_MESSAGES: Dict[int, str] = {
    EXIT_OK: "验算完成，无异常",
    EXIT_DATA_MISSING: "[E_DATA_MISSING] 输入数据文件缺失或无法读取",
    EXIT_OUTLIER_DETECTED: "[E_OUTLIER] 检测到外推越界记录，已单独拎出，未并入正常结果",
    EXIT_COUNT_MISMATCH: "[E_COUNT_MISMATCH] 组合计数一致性校验未通过",
    EXIT_INVALID_PARAM: "[E_INVALID_PARAM] 参数不合法",
}


def format_outlier_alerts(outliers_df) -> List[str]:
    alerts = []
    for _, row in outliers_df.iterrows():
        alerts.append(
            f"[OUTLIER] combo_key={row['combo_key']} "
            f"current_count={row['current_count']} "
            f"historical={row.get('historical_count', 'N/A')} "
            f"reason={row.get('outlier_reason', '')}"
        )
    return alerts


def format_mismatch_alerts(check_result_df) -> List[str]:
    alerts = []
    failed = check_result_df.loc[~check_result_df["check_passed"]]
    for _, row in failed.iterrows():
        alerts.append(
            f"[MISMATCH] combo_key={row['combo_key']} "
            f"historical={row['historical_count']} "
            f"current={row['current_count']} "
            f"detail={row['fail_reason']}"
        )
    return alerts


def exit_with_summary(result: Dict, raise_on_outlier: bool = False) -> int:
    """
    统一退出逻辑。退出码稳定：
    - 0 全通过
    - 3 有外推越界（仅当 raise_on_outlier=True 时非零退出）
    - 4 有计数不一致
    - 3+4=7 两种问题都有
    """
    code = EXIT_OK
    if result.get("outlier_keys"):
        if raise_on_outlier:
            code |= EXIT_OUTLIER_DETECTED
    if result.get("failed_keys"):
        code |= EXIT_COUNT_MISMATCH
    print(ERROR_MESSAGES.get(code, f"[E_UNKNOWN] 未知退出码 {code}"), file=sys.stderr)
    for line in format_outlier_alerts(result.get("outliers")):
        print(line, file=sys.stderr)
    for line in format_mismatch_alerts(result.get("check_result")):
        print(line, file=sys.stderr)
    return code

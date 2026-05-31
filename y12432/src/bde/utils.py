from .config import REVIEW_STATUS, ANOMALY_TYPES


def status_text(code):
    return REVIEW_STATUS.get(code, code)


def anomaly_text(code):
    return ANOMALY_TYPES.get(code, code)


def normalize_hs_code(hs_code):
    if not hs_code:
        return ""
    return str(hs_code).strip().replace(".", "").replace(" ", "")


def validate_hs_code(hs_code):
    normalized = normalize_hs_code(hs_code)
    if not normalized:
        return False, "税则号为空"
    if len(normalized) < 4 or len(normalized) > 10:
        return False, f"税则号长度异常: {len(normalized)}位"
    if not normalized.isdigit():
        return False, "税则号包含非数字字符"
    return True, ""


def parse_period(period_str):
    if not period_str:
        return None
    period_str = str(period_str).strip()
    period_str = period_str.replace("-", "").replace("/", "")
    if len(period_str) == 6 and period_str.isdigit():
        return f"{period_str[:4]}{period_str[4:]}"
    return period_str


def format_period(year, month):
    return f"{year:04d}{month:02d}"


def normalize_period(period_str):
    return parse_period(period_str)

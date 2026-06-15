from typing import Optional
import re


def anomaly_reason_to_human(
    anomaly_type: Optional[str],
    current_note: Optional[str],
    filename: str,
    track_name: str,
    contract_scan_ref: Optional[str] = None
) -> str:
    if not anomaly_type:
        return "暂无异常"

    base = {
        "filename_mismatch": f"文件名「{filename}」和曲目表上的「{track_name}」对不上",
        "missing": f"曲目表上有「{track_name}」，但找不到对应的扫描件或文件",
        "extra": f"有个文件「{filename}」在曲目表里找不到对应曲目",
        "other": f"「{track_name or filename}」存在异常需要关注",
    }

    msg = base.get(anomaly_type, base["other"])

    if current_note:
        msg += f"，当前说明：{current_note}"

    return msg


def bad_data_hint(
    contract_scan_ref: Optional[str],
    current_source: Optional[str],
    is_anomaly: bool
) -> Optional[str]:
    if not is_anomaly:
        return None

    hints = []
    if contract_scan_ref:
        hints.append(f"原始材料定位：合同扫描件 {contract_scan_ref}")
    else:
        hints.append("未找到合同扫描件关联记录，请核对原始材料")

    source_label = {
        "system": "系统自动识别，建议人工复核",
        "contract": "来自合同扫描件，可核对原件",
        "manual": "来自后补备注，需与提交人确认口径",
        "verbal": "来自口头说明，无书面记录，请留痕",
    }
    if current_source:
        hints.append(f"来源说明：{source_label.get(current_source, current_source)}")

    return "；".join(hints) if hints else None


def extract_scan_line(ref: Optional[str]) -> Optional[str]:
    if not ref:
        return None
    m = re.search(r"(第\s*\d+\s*行|line\s*\d+|L\d+)", ref, re.IGNORECASE)
    return m.group(1) if m else ref

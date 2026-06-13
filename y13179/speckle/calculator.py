from typing import List

from .types import SensorRecord
from .units import format_steps


def build_calc_trace(records: List[SensorRecord]) -> str:
    blocks = []
    for rec in records:
        header = (
            f"===== 行#{rec.row_index}  设备 {rec.device_id}  "
            f"{rec.timestamp.strftime('%Y-%m-%d %H:%M:%S')} ====="
        )
        lines = [header]
        lines.append(f"原始值: {rec.raw_value} {rec.raw_unit}")
        lines.append(f"归一化后: {rec.normalized_value:.6g} {rec.normalized_unit}")
        lines.append("换算过程:")
        lines.append(format_steps(rec.calc_steps))

        if rec.speckle_contrast is not None:
            cs = _contrast_steps(rec.raw_value, rec.raw_unit,
                                 rec.normalized_value, rec.normalized_unit,
                                 rec.speckle_contrast)
            lines.append("散斑衬比计算:")
            lines.append(format_steps(cs))
            rec.calc_steps.extend(cs)

        if rec.speckle_size_um is not None:
            lines.append(f"散斑尺寸 (已给值): {rec.speckle_size_um} μm")

        if rec.remarks:
            lines.append("备注时间线（保留所有历史）:")
            for rm in rec.remarks:
                mark = "  ★最新★" if rm.is_latest else ""
                lines.append(f"  [{rm.timestamp}] {rm.author}@{rm.timestamp.strftime('%Y-%m-%d')}: "
                             f"{rm.content}{mark}")

        if rec.screenshots:
            lines.append("截图版本链（保留旧版本）:")
            for s in rec.screenshots:
                lines.append(f"  {s.version} [{s.timestamp}] {s.caption}  ->  {s.path}")

        lines.append("")
        blocks.append("\n".join(lines))
    return "\n".join(blocks)


def _contrast_steps(raw_val: float, raw_unit: str,
                    norm_val: float, norm_unit: str,
                    contrast: float) -> List[str]:
    steps = []
    steps.append(f"[衬比定义] 衬比 K = σ / I，给定 K = {contrast}")
    steps.append(f"[代入强度] 已归一化光强 I = {norm_val:.6g} {norm_unit} (归一化基准值)")
    steps.append(f"[标准差推算] σ = K × I = {contrast} × {norm_val:.6g} = {contrast * norm_val:.6g}")
    steps.append(f"[校验] 若使用原始值 {raw_val} {raw_unit}，则 σ' = {contrast * raw_val:.6g}（与上面数量级对比可反推单位是否混写）")
    return steps

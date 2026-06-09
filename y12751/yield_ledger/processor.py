from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd


PH_LOWER = 6.5
PH_UPPER = 8.0
PH_UPPER_STRICT = 7.5


BLANK_MISSING_REASONS = {
    "no_blank_record": "该批次未记录空白对照实验数据",
    "blank_absent_column": "表格中缺少空白对照列",
    "blank_value_empty": "空白对照单元格为空或未填写",
    "blank_value_invalid": "空白对照数值无法识别（含文字或乱码）",
}


REAGENT_KEYWORDS = ["试剂", "reagent", "药品", "物料"]
BATCH_KEYWORDS = ["批次", "batch", "报告", "report", "补录"]


@dataclass
class ProcessResult:
    merged_data: pd.DataFrame
    ph_anomalies: list[dict]
    blank_missing: list[dict]
    other_issues: list[dict]
    source_files: list[str]
    total_records: int = 0
    normal_count: int = 0
    abnormal_count: int = 0
    ph_out_of_range_count: int = 0
    blank_missing_count: int = 0
    strict_ph: bool = True
    ph_switch_diff: list[dict] = field(default_factory=list)


def _read_any(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix in (".xlsx", ".xls"):
        return pd.read_excel(path, dtype=object)
    if suffix == ".csv":
        return pd.read_csv(path, dtype=object)
    raise ValueError(f"不支持的文件格式：{suffix}")


def _detect_column(df: pd.DataFrame, candidates: list[str]) -> str | None:
    lower_map = {c.lower(): c for c in df.columns}
    for cand in candidates:
        cand_l = cand.lower()
        if cand_l in lower_map:
            return lower_map[cand_l]
        for col in df.columns:
            if cand_l in str(col).lower():
                return col
    return None


def _parse_ph(value: Any) -> tuple[float | None, str | None]:
    if value is None:
        return None, "blank_value_empty"
    if isinstance(value, (int, float)):
        if pd.isna(value):
            return None, "blank_value_empty"
        return float(value), None
    s = str(value).strip()
    if not s or s.lower() in {"nan", "none", "na", "n/a", "-", "—", "/"}:
        return None, "blank_value_empty"
    m = re.search(r"(-?\d+(?:\.\d+)?)", s)
    if not m:
        return None, "blank_value_invalid"
    return float(m.group(1)), None


def _classify_file(path: Path, df: pd.DataFrame) -> str:
    name = path.name.lower()
    cols = " ".join(str(c).lower() for c in df.columns)
    if any(k in name for k in BATCH_KEYWORDS) or any(k in cols for k in BATCH_KEYWORDS):
        return "batch"
    if any(k in name for k in REAGENT_KEYWORDS) or any(k in cols for k in REAGENT_KEYWORDS):
        return "reagent"
    return "unknown"


class YieldLedgerProcessor:
    def __init__(self, input_dir: Path, strict_ph: bool = True):
        self.input_dir = Path(input_dir)
        self.strict_ph = strict_ph
        self.result = ProcessResult(
            merged_data=pd.DataFrame(),
            ph_anomalies=[],
            blank_missing=[],
            other_issues=[],
            source_files=[],
            strict_ph=strict_ph,
        )

    def _list_data_files(self) -> list[Path]:
        files = []
        for p in sorted(self.input_dir.rglob("*")):
            if p.is_file() and p.suffix.lower() in (".xlsx", ".xls", ".csv"):
                if not p.name.startswith("~$"):
                    files.append(p)
        return files

    def run(self) -> ProcessResult:
        files = self._list_data_files()
        if not files:
            self.result.other_issues.append({
                "类型": "输入问题",
                "位置": str(self.input_dir),
                "说明": "输入目录中未找到任何 Excel 或 CSV 文件",
            })
            return self.result

        reagent_dfs: list[pd.DataFrame] = []
        batch_dfs: list[pd.DataFrame] = []

        for f in files:
            self.result.source_files.append(str(f.relative_to(self.input_dir)))
            try:
                df = _read_any(f)
            except Exception as e:
                self.result.other_issues.append({
                    "类型": "文件读取失败",
                    "位置": f.name,
                    "说明": f"读取文件时出错：{e}",
                })
                continue
            df["_源文件"] = f.name
            category = _classify_file(f, df)
            if category == "batch":
                batch_dfs.append(df)
            else:
                reagent_dfs.append(df)

        merged = self._merge_records(reagent_dfs, batch_dfs)
        if merged.empty:
            self.result.other_issues.append({
                "类型": "数据为空",
                "位置": "所有文件",
                "说明": "未能从输入文件中解析出有效记录",
            })
            return self.result

        self.result.merged_data = merged
        self._validate_all()
        self._count_stats()
        return self.result

    def _merge_records(
        self, reagent_dfs: list[pd.DataFrame], batch_dfs: list[pd.DataFrame]
    ) -> pd.DataFrame:
        frames = reagent_dfs + batch_dfs
        if not frames:
            return pd.DataFrame()
        normalized_frames = [self._normalize_columns(f) for f in frames]
        merged = pd.concat(normalized_frames, ignore_index=True, sort=False)

        batch_col = "批次号" if "批次号" in merged.columns else _detect_column(
            merged, ["批次号", "批号", "batch", "批次编号", "批次"]
        )
        if batch_col and not merged.empty:
            valid_mask = merged[batch_col].notna() & (merged[batch_col].astype(str).str.strip() != "")
            merged_valid = merged[valid_mask].copy()
            merged_others = merged[~valid_mask].copy()
            merged_valid["_原始顺序"] = range(len(merged_valid))
            merged_valid = merged_valid.sort_values(
                by=[batch_col, "_原始顺序"], na_position="last", kind="stable"
            )
            merged_valid = merged_valid.drop_duplicates(subset=[batch_col], keep="last")
            merged = pd.concat([merged_valid, merged_others], ignore_index=True, sort=False)
            merged = merged.reset_index(drop=True)
        return merged

    def _normalize_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        rename_map = {}
        col_candidates = {
            "批次号": ["批次号", "批号", "batch", "批次编号", "批次"],
            "反应名称": ["反应名称", "反应", "名称", "反应类型", "项目名称"],
            "投料量": ["投料量", "投料", "投入量", "起始量", "质量", "重量"],
            "投料单位": ["投料单位", "单位", "投料单位(g)", "单位(g)", "规格"],
            "收率": ["收率", "产率", "yield", "得率"],
            "pH": ["pH", "pH值", "ph", "酸碱度"],
            "空白对照": ["空白对照", "空白", "blank", "对照", "空白样"],
            "谱图编号": ["谱图编号", "谱图", "图谱", "图谱编号", "HPLC编号", "谱图ID"],
            "操作人": ["操作人", "实验员", "操作员", "负责人"],
            "日期": ["日期", "实验日期", "时间", "date"],
            "备注": ["备注", "说明", "note", "补录备注"],
        }
        for std_name, cands in col_candidates.items():
            found = _detect_column(df, cands)
            if found and found != std_name:
                rename_map[found] = std_name
        if rename_map:
            df = df.rename(columns=rename_map)
        return df

    def _ph_bounds(self) -> tuple[float, float]:
        return PH_LOWER, PH_UPPER_STRICT if self.strict_ph else PH_UPPER

    def _check_ph(self, row: pd.Series, idx: int) -> dict | None:
        ph_col = "pH" if "pH" in row.index else _detect_column(
            pd.DataFrame([row]), ["pH", "pH值", "ph", "酸碱度"]
        )
        if not ph_col or ph_col not in row.index:
            return None
        val, err = _parse_ph(row.get(ph_col))
        if err == "blank_value_invalid":
            return {
                "序号": idx + 1,
                "批次号": self._safe_get(row, "批次号", "(未填)"),
                "pH原始值": str(row.get(ph_col, "")),
                "问题类型": "pH 数值无法识别",
                "判定模式": "严格" if self.strict_ph else "宽松",
                "判定结果": "需复核",
                "处理建议": "请核实 pH 读数后补录，当前记为异常",
            }
        if val is None:
            return None
        lo, hi = self._ph_bounds()
        lo_relax, hi_relax = PH_LOWER, PH_UPPER

        strict_out = not (lo <= val <= hi)
        relax_out = not (lo_relax <= val <= hi_relax)

        if not strict_out and not relax_out:
            return None

        entry = {
            "序号": idx + 1,
            "批次号": self._safe_get(row, "批次号", "(未填)"),
            "pH 测量值": val,
            "允许范围(严格)": f"{lo} ~ {hi}",
            "允许范围(宽松)": f"{lo_relax} ~ {hi_relax}",
            "判定模式": "严格" if self.strict_ph else "宽松",
        }

        diff_note = ""
        if strict_out and not relax_out:
            diff_note = (
                "宽松模式下 pH 处于安全区间（6.5~8.0），但严格模式下上限为 7.5，"
                "切换为严格模式后判定结果由 '合格' 变为 '异常'，收率结果需要复核。"
            )
            final = "异常(严格模式触发)"
        elif strict_out and relax_out:
            diff_note = "无论严格或宽松模式，pH 均越界，反应结果判定为异常。"
            final = "异常"
        else:
            diff_note = ""
            final = "正常"

        entry["判定结果"] = final
        entry["对收率的影响"] = diff_note if diff_note else "pH 在允许范围内"
        entry["处理建议"] = self._ph_advice(val, lo, hi)
        return entry

    def _ph_advice(self, val: float, lo: float, hi: float) -> str:
        if val < lo:
            return (
                f"pH={val} 偏酸，低于下限 {lo}。"
                "建议检查缓冲液是否失效、是否有酸性杂质混入，确认后再决定是否重算收率。"
            )
        if val > hi:
            return (
                f"pH={val} 偏碱，高于上限 {hi}。"
                "建议确认是否加碱过量、是否发生水解等副反应，可能需要重新纯化或重做。"
            )
        return "pH 在允许范围内"

    def _check_blank(self, row: pd.Series, idx: int) -> dict | None:
        blank_col = "空白对照" if "空白对照" in row.index else None
        if blank_col is None:
            return {
                "序号": idx + 1,
                "批次号": self._safe_get(row, "批次号", "(未填)"),
                "问题类型": "空白对照缺失",
                "具体原因": BLANK_MISSING_REASONS["blank_absent_column"],
                "对收率的影响": (
                    "没有空白对照就无法扣除本底信号，谱图积分结果可能被背景噪声放大，"
                    "导致收率计算偏高，数据可信度不足。"
                ),
                "处理建议": (
                    "请联系原实验人员补做空白对照；若无法补做，应在报告中注明 '未做空白对照，"
                    "结果仅供参考'，并由实验室管理员审批后入账。"
                ),
            }

        raw = row.get(blank_col)
        _, err_code = _parse_ph(raw) if raw is not None else (None, "blank_value_empty")
        if isinstance(raw, (int, float)) and not pd.isna(raw):
            return None
        s = str(raw).strip() if raw is not None else ""
        if not s or s.lower() in {"nan", "none", "na", "n/a", "-", "—", "/", "未做", "无"}:
            return {
                "序号": idx + 1,
                "批次号": self._safe_get(row, "批次号", "(未填)"),
                "问题类型": "空白对照缺失",
                "具体原因": BLANK_MISSING_REASONS["blank_value_empty"],
                "原始值": s if s else "(空)",
                "对收率的影响": (
                    "未填写空白对照数值，无法进行本底扣除，收率可能比真实值偏高。"
                ),
                "处理建议": (
                    "请核查对应批次的原始记录与谱图，确认空白对照是否实际做过；"
                    "若未做，按实验室管理员流程审批；若做过，请补录数值。"
                ),
            }
        if not re.search(r"\d+(?:\.\d+)?", s):
            return {
                "序号": idx + 1,
                "批次号": self._safe_get(row, "批次号", "(未填)"),
                "问题类型": "空白对照缺失",
                "具体原因": BLANK_MISSING_REASONS["blank_value_invalid"],
                "原始值": s,
                "对收率的影响": (
                    "空白对照单元格内容为文字或乱码，无法解析成数值，"
                    "等同于缺失，收率计算缺乏基线。"
                ),
                "处理建议": (
                    "请确认原始记录，该位置应填写吸光度/峰面积等数值；"
                    "修正后重新导入。"
                ),
            }
        return None

    def _check_units(self, row: pd.Series, idx: int) -> dict | None:
        amt = self._safe_get(row, "投料量")
        unit = self._safe_get(row, "投料单位")
        if amt in (None, "", "(未填)"):
            return None
        if unit in (None, "", "(未填)"):
            return {
                "序号": idx + 1,
                "批次号": self._safe_get(row, "批次号", "(未填)"),
                "问题类型": "单位缺失",
                "具体说明": f"投料量记录为 {amt}，但未填写单位（g / mg / mL 等）",
                "对收率的影响": (
                    "投料量没有单位就无法判断反应规模，后续计算摩尔收率或质量收率都会出错。"
                ),
                "处理建议": "请根据原始实验记录补全单位后再入账。",
            }
        return None

    def _check_spectrum_diff(self, row: pd.Series, idx: int) -> dict | None:
        ph_issue = self._check_ph(row, idx)
        if not ph_issue:
            return None
        if "严格模式触发" not in ph_issue.get("判定结果", ""):
            return None
        return {
            "序号": idx + 1,
            "批次号": self._safe_get(row, "批次号", "(未填)"),
            "谱图编号": self._safe_get(row, "谱图编号", "(未填)"),
            "pH": ph_issue.get("pH 测量值"),
            "宽松模式判定": "合格",
            "严格模式判定": "异常",
            "谱图判读前后差别": (
                f"pH={ph_issue.get('pH 测量值')} 处于 7.5~8.0 的灰色地带。"
                "宽松模式下可判为合格，谱图可直接用于收率计算；"
                "切换到严格模式后，该批次被标为异常，需要管理员复核谱图，"
                "重点检查是否有碱性杂质峰、产物是否出现降解。"
            ),
            "建议操作": (
                "请管理员在谱图上标注关注区域（保留时间、峰面积变化），"
                "并签字确认是否接受该批次收率。"
            ),
        }

    def _validate_all(self) -> None:
        df = self.result.merged_data
        for idx, row in df.iterrows():
            ph_issue = self._check_ph(row, idx)
            if ph_issue:
                self.result.ph_anomalies.append(ph_issue)
            blank_issue = self._check_blank(row, idx)
            if blank_issue:
                self.result.blank_missing.append(blank_issue)
            unit_issue = self._check_units(row, idx)
            if unit_issue:
                self.result.other_issues.append(unit_issue)
            spec_diff = self._check_spectrum_diff(row, idx)
            if spec_diff:
                self.result.ph_switch_diff.append(spec_diff)

    def _count_stats(self) -> None:
        df = self.result.merged_data
        self.result.total_records = len(df)
        abnormal_idx = {x.get("序号") - 1 for x in self.result.ph_anomalies} | \
                       {x.get("序号") - 1 for x in self.result.blank_missing} | \
                       {x.get("序号") - 1 for x in self.result.other_issues}
        self.result.abnormal_count = len(abnormal_idx)
        self.result.normal_count = self.result.total_records - self.result.abnormal_count
        self.result.ph_out_of_range_count = len(self.result.ph_anomalies)
        self.result.blank_missing_count = len(self.result.blank_missing)

    @staticmethod
    def _safe_get(row: pd.Series, key: str, default: str = "(未填)") -> str:
        if key not in row.index:
            return default
        val = row.get(key)
        if val is None:
            return default
        if isinstance(val, float) and pd.isna(val):
            return default
        s = str(val).strip()
        return s if s else default

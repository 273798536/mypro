import pandas as pd
import os
from typing import List, Dict, Tuple, Any
from app.models import (
    ExperimentRecord, TemperatureCurve, DataIssue,
    Batch, TemperatureUnit, IssueType, IssueSeverity, ImportFile
)
from app.utils.temperature_utils import parse_temperature_unit, extract_temperature_value
from app.utils.precision_utils import (
    check_weighing_precision,
    human_readable_precision_issue,
    human_readable_unit_mixed_issue,
    human_readable_missing_field
)
from datetime import datetime

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")


COLUMN_ALIASES = {
    "record_no": ["记录编号", "编号", "序号", "No.", "No", "编号/No", "Record No", "record_no"],
    "experiment_date": ["实验日期", "日期", "测试日期", "Date", "date", "实验时间"],
    "sample_weight": ["样品质量", "质量", "称量质量", "样品重量", "Weight", "Sample Weight", "weight", "称样量"],
    "sample_weight_unit": ["质量单位", "单位", "Unit", "weight_unit"],
    "weighing_precision": ["称量精度", "精度", "天平精度", "Precision", "precision"],
    "reaction_condition": ["反应条件", "条件", "Condition", "Reaction Condition", "工艺条件"],
    "reaction_temperature": ["反应温度", "温度", "Temperature", "Temp", "T", "反应温度/°C", "床层温度"],
    "space_velocity": ["空速", "体积空速", "GHSV", "WHSV", "Space Velocity", "SV"],
    "initial_activity": ["初始活性", "初活性", "活性(0h)", "0h活性", "Initial Activity", "Activity_0"],
    "final_activity": ["最终活性", "末活性", "活性(终)", "Final Activity", "Activity_final", "稳定活性"],
    "decay_rate": ["衰减率", "失活速率", "活性衰减率", "Decay Rate", "Deactivation Rate"],
    "raw_remark": ["备注", "说明", "Remark", "Remarks", "Note", "Notes", "原始备注"],
    "supplementary_note": ["补录备注", "补充说明", "补充备注", "补录", "后续备注"],
    "time_point": ["时间点", "时间", "Time", "t", "反应时间", "运行时间"],
    "time_unit": ["时间单位", "Time Unit"],
    "temperature_value": ["温度", "Temperature", "Temp", "T", "瞬时温度"],
    "temperature_unit": ["温度单位", "单位", "Unit"],
    "activity_value": ["活性", "Activity", "转化率", "Conversion", "活性值"]
}


def _match_column(df_columns: List[str], target_field: str) -> str:
    aliases = COLUMN_ALIASES.get(target_field, [target_field])
    for col in df_columns:
        col_stripped = str(col).strip()
        for alias in aliases:
            if alias.lower() == col_stripped.lower() or alias in col_stripped:
                return col
    return None


def _safe_float(val) -> float:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, (int, float)):
        return float(val)
    val_str = str(val).strip()
    if not val_str or val_str in ["-", "/", "N/A", "n/a", "NA", "无", "未测"]:
        return None
    try:
        return float(val_str)
    except (ValueError, TypeError):
        return None


def _safe_str(val) -> str:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    val_str = str(val).strip()
    if not val_str or val_str in ["nan", "None", "NaN"]:
        return None
    return val_str


def _read_file_safely(file_path: str) -> Dict[str, pd.DataFrame]:
    ext = os.path.splitext(file_path)[1].lower()
    sheets = {}

    if ext in [".xlsx", ".xls"]:
        try:
            xls = pd.ExcelFile(file_path)
            for sheet_name in xls.sheet_names:
                try:
                    df = pd.read_excel(xls, sheet_name=sheet_name, header=None)
                    sheets[sheet_name] = df
                except Exception:
                    continue
        except Exception:
            pass
    elif ext == ".csv":
        try:
            df = pd.read_csv(file_path, header=None, encoding='utf-8')
            sheets["Sheet1"] = df
        except UnicodeDecodeError:
            try:
                df = pd.read_csv(file_path, header=None, encoding='gbk')
                sheets["Sheet1"] = df
            except Exception:
                pass

    return sheets


def _detect_header_row(df: pd.DataFrame) -> int:
    best_row = 0
    best_score = 0

    for i in range(min(10, len(df))):
        row = df.iloc[i].astype(str).tolist()
        matched_fields = set()

        for cell_val in row:
            cell = str(cell_val).strip()
            if not cell or cell.lower() == "nan":
                continue
            for field, aliases in COLUMN_ALIASES.items():
                for alias in aliases:
                    if alias == cell or alias in cell:
                        if len(cell) <= len(alias) + 4:
                            matched_fields.add(field)
                        break

        score = len(matched_fields)
        if score > best_score:
            best_score = score
            best_row = i

    if best_score >= 2:
        return best_row
    return 0


def parse_data_file(file_path: str, file_name: str, batch: Batch, db) -> Tuple[int, int, List[DataIssue], List[str]]:
    sheets = _read_file_safely(file_path)
    if not sheets:
        return 0, 0, [], [f"无法读取文件: {file_name}"]

    warnings = []
    all_experiments = []
    all_curves = []
    all_issues = []
    all_sheet_names = []

    import_file = ImportFile(
        batch_id=batch.id,
        file_name=file_name,
        file_path=file_path,
        file_type=os.path.splitext(file_name)[1].lower(),
        sheet_names=",".join(sheets.keys())
    )
    db.add(import_file)

    for sheet_name, raw_df in sheets.items():
        all_sheet_names.append(sheet_name)
        if len(raw_df) < 2:
            warnings.append(f"工作表 '{sheet_name}' 数据太少, 已跳过")
            continue

        header_row = _detect_header_row(raw_df)
        df = raw_df.iloc[header_row:].copy()
        df.columns = df.iloc[0].astype(str).tolist()
        df = df.iloc[1:].reset_index(drop=True)

        cols = df.columns.tolist()

        has_time = _match_column(cols, "time_point") is not None
        has_activity_curve = _match_column(cols, "activity_value") is not None
        has_temperature_curve = _match_column(cols, "temperature_value") is not None
        is_curve_sheet = (has_time and (has_activity_curve or has_temperature_curve))

        has_sample = _match_column(cols, "sample_weight") is not None
        has_init_activity = _match_column(cols, "initial_activity") is not None
        is_experiment_sheet = has_sample or has_init_activity

        if is_curve_sheet:
            curves, curve_issues = _parse_curve_sheet(df, cols, file_name, sheet_name, batch.id)
            all_curves.extend(curves)
            all_issues.extend(curve_issues)
        elif is_experiment_sheet:
            experiments, exp_issues = _parse_experiment_sheet(df, cols, file_name, sheet_name, batch.id)
            all_experiments.extend(experiments)
            all_issues.extend(exp_issues)
        else:
            warnings.append(f"工作表 '{sheet_name}' 未能识别数据类型, 已跳过")

    for exp in all_experiments:
        db.add(exp)
    for curve in all_curves:
        db.add(curve)
    for issue in all_issues:
        db.add(issue)

    db.commit()

    return len(all_experiments), len(all_curves), all_issues, warnings


def _parse_experiment_sheet(df: pd.DataFrame, cols: List[str],
                              file_name: str, sheet_name: str,
                              batch_id: int) -> Tuple[List[ExperimentRecord], List[DataIssue]]:
    experiments = []
    issues = []

    col_map = {}
    for field in COLUMN_ALIASES.keys():
        col_map[field] = _match_column(cols, field)

    for idx, row in df.iterrows():
        row_num = idx + 3
        try:
            record_no = _safe_str(row[col_map["record_no"]]) if col_map["record_no"] else None
            sample_weight = _safe_float(row[col_map["sample_weight"]]) if col_map["sample_weight"] else None
            weight_unit = _safe_str(row[col_map["sample_weight_unit"]]) if col_map["sample_weight_unit"] else "g"
            precision_raw = _safe_str(row[col_map["weighing_precision"]]) if col_map["weighing_precision"] else None

            temp_raw = _safe_str(row[col_map["reaction_temperature"]]) if col_map["reaction_temperature"] else None
            temp_value = extract_temperature_value(temp_raw) if temp_raw else None
            temp_unit = parse_temperature_unit(temp_raw) if temp_raw else TemperatureUnit.UNKNOWN

            exp = ExperimentRecord(
                batch_id=batch_id,
                record_no=record_no,
                experiment_date=_safe_str(row[col_map["experiment_date"]]) if col_map["experiment_date"] else None,
                sample_weight=sample_weight,
                sample_weight_unit=weight_unit or "g",
                weighing_precision=precision_raw,
                reaction_condition=_safe_str(row[col_map["reaction_condition"]]) if col_map["reaction_condition"] else None,
                reaction_temperature=temp_value,
                temperature_unit=temp_unit,
                temperature_raw=temp_raw,
                space_velocity=_safe_str(row[col_map["space_velocity"]]) if col_map["space_velocity"] else None,
                initial_activity=_safe_float(row[col_map["initial_activity"]]) if col_map["initial_activity"] else None,
                final_activity=_safe_float(row[col_map["final_activity"]]) if col_map["final_activity"] else None,
                decay_rate=_safe_float(row[col_map["decay_rate"]]) if col_map["decay_rate"] else None,
                raw_remark=_safe_str(row[col_map["raw_remark"]]) if col_map["raw_remark"] else None,
                supplementary_note=_safe_str(row[col_map["supplementary_note"]]) if col_map["supplementary_note"] else None,
                source_sheet=sheet_name,
                source_row=row_num
            )
            experiments.append(exp)

            row_issues = _validate_experiment_row(exp, file_name, sheet_name, row_num, batch_id)
            issues.extend(row_issues)

        except Exception as e:
            issues.append(DataIssue(
                batch_id=batch_id,
                issue_type=IssueType.MISSING_FIELD,
                severity=IssueSeverity.WARNING,
                location=f"工作表:{sheet_name} 第{row_num}行",
                description=f"解析该行时出错: {str(e)}",
                human_readable_desc=f"第{row_num}行数据格式异常, 请检查该行是否有合并单元格或非法字符",
                source_file=file_name,
                source_sheet=sheet_name,
                source_row=row_num
            ))

    return experiments, issues


def _parse_curve_sheet(df: pd.DataFrame, cols: List[str],
                        file_name: str, sheet_name: str,
                        batch_id: int) -> Tuple[List[TemperatureCurve], List[DataIssue]]:
    curves = []
    issues = []

    col_map = {}
    for field in ["time_point", "time_unit", "temperature_value", "temperature_unit", "activity_value"]:
        col_map[field] = _match_column(cols, field)

    prev_temp = None
    for idx, row in df.iterrows():
        row_num = idx + 3
        try:
            time_point = _safe_float(row[col_map["time_point"]]) if col_map["time_point"] else None
            if time_point is None:
                continue

            temp_raw = _safe_str(row[col_map["temperature_value"]]) if col_map["temperature_value"] else None
            temp_value = extract_temperature_value(temp_raw) if temp_raw else None
            temp_unit = parse_temperature_unit(temp_raw) if temp_raw else TemperatureUnit.UNKNOWN
            activity = _safe_float(row[col_map["activity_value"]]) if col_map["activity_value"] else None

            is_abnormal = False
            abnormal_reason = None

            if temp_raw and temp_unit == TemperatureUnit.UNKNOWN:
                is_abnormal = True
                abnormal_reason = f"温度单位不明确: '{temp_raw}', 请补录单位"
                issues.append(DataIssue(
                    batch_id=batch_id,
                    issue_type=IssueType.UNIT_AMBIGUOUS,
                    severity=IssueSeverity.WARNING,
                    location=f"曲线数据 {sheet_name} 第{row_num}行",
                    description=f"温度 '{temp_raw}' 缺少明确单位",
                    human_readable_desc=human_readable_unit_mixed_issue(temp_raw, file_name, sheet_name, row_num),
                    source_file=file_name,
                    source_sheet=sheet_name,
                    source_row=row_num
                ))

            if temp_value is not None and prev_temp is not None:
                diff = abs(temp_value - prev_temp)
                if diff > 200:
                    is_abnormal = True
                    abnormal_reason = (abnormal_reason or "") + f" 温度突变: 前后值相差{diff:.1f}度以上"

            curve = TemperatureCurve(
                batch_id=batch_id,
                time_point=time_point,
                time_unit=_safe_str(row[col_map["time_unit"]]) if col_map["time_unit"] else "h",
                temperature_value=temp_value,
                temperature_unit=temp_unit,
                temperature_raw=temp_raw,
                activity_value=activity,
                is_abnormal=is_abnormal,
                abnormal_reason=abnormal_reason,
                source_sheet=sheet_name,
                source_row=row_num
            )
            curves.append(curve)
            prev_temp = temp_value if temp_value is not None else prev_temp

        except Exception as e:
            issues.append(DataIssue(
                batch_id=batch_id,
                issue_type=IssueType.ABNORMAL_CURVE,
                severity=IssueSeverity.WARNING,
                location=f"温度曲线 {sheet_name} 第{row_num}行",
                description=f"解析曲线数据出错: {str(e)}",
                human_readable_desc=f"第{row_num}行曲线数据格式有问题, 请检查原始记录",
                source_file=file_name,
                source_sheet=sheet_name,
                source_row=row_num
            ))

    return curves, issues


def _validate_experiment_row(exp: ExperimentRecord, file_name: str,
                              sheet_name: str, row_num: int,
                              batch_id: int) -> List[DataIssue]:
    issues = []

    if exp.sample_weight is None:
        issues.append(DataIssue(
            batch_id=batch_id,
            issue_type=IssueType.MISSING_FIELD,
            severity=IssueSeverity.ERROR,
            location=f"实验记录 {sheet_name} 第{row_num}行: 样品质量",
            description="样品质量字段缺失",
            human_readable_desc=human_readable_missing_field("sample_weight", file_name, sheet_name, row_num),
            source_file=file_name,
            source_sheet=sheet_name,
            source_row=row_num
        ))
    else:
        precision_issues = check_weighing_precision(exp.sample_weight, exp.weighing_precision, exp.sample_weight_unit)
        for pi in precision_issues:
            issues.append(DataIssue(
                batch_id=batch_id,
                issue_type=IssueType.WEIGHING_PRECISION_LOW,
                severity=IssueSeverity.WARNING,
                location=f"实验记录 {sheet_name} 第{row_num}行: 称量精度",
                description=pi,
                human_readable_desc=human_readable_precision_issue(exp.sample_weight, exp.sample_weight_unit),
                source_file=file_name,
                source_sheet=sheet_name,
                source_row=row_num
            ))

    if exp.temperature_raw and exp.temperature_unit == TemperatureUnit.UNKNOWN:
        issues.append(DataIssue(
            batch_id=batch_id,
            issue_type=IssueType.TEMPERATURE_UNIT_MIXED,
            severity=IssueSeverity.WARNING,
            location=f"实验记录 {sheet_name} 第{row_num}行: 反应温度",
            description=f"温度单位不明确: '{exp.temperature_raw}'",
            human_readable_desc=human_readable_unit_mixed_issue(exp.temperature_raw, file_name, sheet_name, row_num),
            source_file=file_name,
            source_sheet=sheet_name,
            source_row=row_num
        ))

    if exp.initial_activity is None:
        issues.append(DataIssue(
            batch_id=batch_id,
            issue_type=IssueType.MISSING_FIELD,
            severity=IssueSeverity.ERROR,
            location=f"实验记录 {sheet_name} 第{row_num}行: 初始活性",
            description="初始活性字段缺失",
            human_readable_desc=human_readable_missing_field("initial_activity", file_name, sheet_name, row_num),
            source_file=file_name,
            source_sheet=sheet_name,
            source_row=row_num
        ))

    return issues

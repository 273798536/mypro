"""数据加载模块：加载设备铭牌、循环样本数据，识别采样缺口。

强化点：
- 输入文件列名校验，缺列时给出可操作的错误提示
- 坏数据原因精确到字段和具体值，附带原始行号追溯
- 采样缺口标记附带间隔时长，便于运营判断是否真实缺口
- 所有异常捕获后给出明确的上下文信息
"""
import os
import csv
import warnings
import pandas as pd
from typing import Tuple, List, Dict


NAMEPLATE_REQUIRED_COLS = [
    "设备编号", "型号", "额定功率(kW)", "COP上限", "COP下限",
    "最高出水温度(℃)", "最低出水温度(℃)", "循环流量(m³/h)",
]

SAMPLES_REQUIRED_COLS = [
    "设备编号", "循环序号", "采样时间", "出水温度(℃)",
    "回水温度(℃)", "功耗(kW)", "流量(m³/h)",
]


class DataValidationError(Exception):
    """数据校验异常，附带详细的错误原因。"""
    pass


def _safe_read_csv(path: str, file_label: str, dtype: Dict = None) -> pd.DataFrame:
    """安全读取 CSV，捕获解析错误并给出可操作的提示。

    会处理：
    - 字段数不一致（某行多/少了逗号）：提示具体行号和修复方法
    - 编码错误：提示转 UTF-8
    - 空文件：提示补数据
    """
    try:
        read_kwargs = {
            "dtype": dtype or {},
            "quoting": csv.QUOTE_MINIMAL,
            "encoding": "utf-8",
        }
        pd_ver = tuple(map(int, pd.__version__.split(".")[:2]))
        if pd_ver >= (1, 3):
            read_kwargs["on_bad_lines"] = "error"
        else:
            read_kwargs["error_bad_lines"] = True

        with warnings.catch_warnings(record=True) as caught_warnings:
            warnings.simplefilter("always")
            df = pd.read_csv(path, **read_kwargs)
            for w in caught_warnings:
                if issubclass(w.category, pd.errors.ParserWarning):
                    raise DataValidationError(
                        f"{file_label} 解析警告：{w.message}\n"
                        f"  → 可能存在格式问题，建议检查逗号、引号是否配对。"
                    )

        return df

    except pd.errors.ParserError as e:
        err_msg = str(e)
        hint = ""
        if "Expected" in err_msg and "fields in line" in err_msg:
            try:
                parts = err_msg.split("Expected ")[1].split(" fields in line ")
                expected = int(parts[0])
                rest = parts[1].split(", saw ")
                line_no = int(rest[0])
                saw = int(rest[1].split()[0])
                hint = (
                    f"第 {line_no} 行字段数不一致：期望 {expected} 列，实际 {saw} 列。\n"
                    f"  → 通常是因为备注字段含未加引号的英文逗号。\n"
                    f"  → 修复方法：要么用双引号把备注括起来，要么把英文逗号 ',' 改成中文顿号 '、'。\n"
                    f"  → 参考修复：`边界样本-高COP(温差9.5,功耗低)` 改为 `\"边界样本-高COP(温差9.5、功耗低)\"`"
                )
            except (IndexError, ValueError):
                hint = f"解析错误详情：{err_msg}\n  → 请检查文件格式是否符合 CSV 规范。"
        raise DataValidationError(f"{file_label} 解析失败：{hint}") from e

    except UnicodeDecodeError as e:
        raise DataValidationError(
            f"{file_label} 编码错误：{e}。请另存为 UTF-8 格式（不要带 BOM）。"
        ) from e
    except pd.errors.EmptyDataError as e:
        raise DataValidationError(f"{file_label} 内容为空或格式损坏：{e}") from e


def _validate_columns(df: pd.DataFrame, required: List[str],
                      file_label: str) -> None:
    """校验必填列，缺列则抛异常。"""
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise DataValidationError(
            f"{file_label}缺少必填列：{missing}。"
            f"当前列名：{df.columns.tolist()}。"
            f"请参考运营接手指南中的模板补充。"
        )


def load_nameplate(input_dir: str) -> pd.DataFrame:
    """加载设备铭牌数据，返回 DataFrame。

    查找顺序：nameplate.csv → nameplate.xlsx
    缺失必填列会抛 DataValidationError。
    """
    csv_path = os.path.join(input_dir, "nameplate.csv")
    xlsx_path = os.path.join(input_dir, "nameplate.xlsx")

    df = None
    src_label = None
    try:
        if os.path.exists(csv_path):
            df = _safe_read_csv(csv_path, "nameplate.csv", dtype={"设备编号": str})
            src_label = f"nameplate.csv (行:{len(df)})"
        elif os.path.exists(xlsx_path):
            df = pd.read_excel(xlsx_path, dtype={"设备编号": str})
            src_label = f"nameplate.xlsx (行:{len(df)})"
        else:
            raise DataValidationError(
                f"未找到设备铭牌文件。请在 {input_dir} 下放置 "
                f"nameplate.csv 或 nameplate.xlsx。"
            )

        df.columns = df.columns.str.strip()
        _validate_columns(df, NAMEPLATE_REQUIRED_COLS, src_label)

        dup_devices = df[df.duplicated("设备编号", keep=False)]["设备编号"].unique().tolist()
        if dup_devices:
            raise DataValidationError(
                f"{src_label} 存在重复设备编号：{dup_devices}，"
                f"请去重后重新运行。"
            )

        if len(df) == 0:
            raise DataValidationError(f"{src_label} 内容为空，请补充设备铭牌。")

        df["_铭牌原始行号"] = range(2, len(df) + 2)
        return df

    except DataValidationError:
        raise
    except UnicodeDecodeError as e:
        raise DataValidationError(
            f"nameplate.csv 编码错误：{e}。请另存为 UTF-8 格式。"
        ) from e
    except pd.errors.EmptyDataError as e:
        raise DataValidationError(
            f"nameplate.csv 内容为空或格式损坏：{e}"
        ) from e


def load_samples(input_dir: str) -> pd.DataFrame:
    """加载循环样本数据，识别采样缺口和坏数据。

    每条样本附加：
    - 坏数据 / 坏数据原因：精确到字段和值
    - 采样缺口 / 采样间隔_分钟：具体间隔时长
    - _样本原始行号：CSV 行号，便于人工复核
    """
    csv_path = os.path.join(input_dir, "samples.csv")
    xlsx_path = os.path.join(input_dir, "samples.xlsx")

    df = None
    src_label = None
    try:
        if os.path.exists(csv_path):
            df = _safe_read_csv(csv_path, "samples.csv", dtype={"设备编号": str})
            src_label = f"samples.csv"
        elif os.path.exists(xlsx_path):
            df = pd.read_excel(xlsx_path, dtype={"设备编号": str})
            src_label = f"samples.xlsx"
        else:
            raise DataValidationError(
                f"未找到样本数据文件。请在 {input_dir} 下放置 "
                f"samples.csv 或 samples.xlsx。"
            )

        df.columns = df.columns.str.strip()
        _validate_columns(df, SAMPLES_REQUIRED_COLS, src_label)

        if len(df) == 0:
            raise DataValidationError(f"{src_label} 内容为空，请补充样本数据。")

        df["_样本原始行号"] = range(2, len(df) + 2)

        if "采样时间" in df.columns:
            df["采样时间"] = pd.to_datetime(df["采样时间"], errors="coerce")
            invalid_time_mask = df["采样时间"].isna()
            if invalid_time_mask.any():
                bad_rows = df.loc[invalid_time_mask, "_样本原始行号"].tolist()
                raise DataValidationError(
                    f"采样时间格式无效（原始行：{bad_rows}）。"
                    f"请使用 YYYY-MM-DD HH:MM:SS 格式。"
                )

        df = _mark_gaps(df)
        df = _mark_bad_data(df)
        return df

    except DataValidationError:
        raise
    except UnicodeDecodeError as e:
        raise DataValidationError(
            f"samples.csv 编码错误：{e}。请另存为 UTF-8 格式。"
        ) from e
    except pd.errors.EmptyDataError as e:
        raise DataValidationError(
            f"samples.csv 内容为空或格式损坏：{e}"
        ) from e


def _mark_gaps(df: pd.DataFrame) -> pd.DataFrame:
    """标记采样缺口：相邻采样间隔超过 30 分钟视为缺口。

    增加「采样间隔_分钟」列记录具体间隔，方便判断。
    """
    if "采样时间" not in df.columns or "设备编号" not in df.columns:
        df["采样缺口"] = False
        df["采样间隔_分钟"] = None
        return df

    df = df.sort_values(["设备编号", "采样时间"]).reset_index(drop=True)
    df["采样缺口"] = False
    df["采样间隔_分钟"] = None

    for device in df["设备编号"].unique():
        mask = df["设备编号"] == device
        indices = df.index[mask]
        times = df.loc[mask, "采样时间"]
        diffs = times.diff()
        gap_mask = diffs > pd.Timedelta(minutes=30)
        gap_indices = indices[gap_mask]
        df.loc[gap_indices, "采样缺口"] = True
        df.loc[gap_indices, "采样间隔_分钟"] = (
            diffs[gap_mask].dt.total_seconds() / 60
        ).round(1).tolist()

    return df


def _mark_bad_data(df: pd.DataFrame) -> pd.DataFrame:
    """标记明显坏数据（空值、温度/功耗为负、进出水温颠倒等）。

    坏数据原因格式："字段:原因(实际值=X)"，便于运营直接对照原始行。
    """
    df["坏数据"] = False
    df["坏数据原因"] = ""

    def _add_reason(mask_series, reason):
        reasons = df.loc[mask_series, "坏数据原因"].apply(
            lambda x: x + reason + ";" if reason not in x else x
        )
        df.loc[mask_series, "坏数据原因"] = reasons
        df.loc[mask_series, "坏数据"] = True

    numeric_checks = [
        ("出水温度(℃)", "空值"),
        ("回水温度(℃)", "空值"),
        ("功耗(kW)", "空值"),
        ("流量(m³/h)", "空值"),
    ]
    for col, reason in numeric_checks:
        if col in df.columns:
            null_mask = df[col].isna()
            if null_mask.any():
                vals = df.loc[null_mask, col].astype(str).tolist()
                for i, idx in enumerate(df.index[null_mask]):
                    val_str = f"(原值={vals[i]})"
                    row_num = df.at[idx, "_样本原始行号"]
                    _add_reason(
                        pd.Series([True] * len(df), index=df.index) & (df.index == idx),
                        f"{col}:{reason}{val_str}[行{row_num}]"
                    )

    neg_checks = [
        ("出水温度(℃)", "负值"),
        ("回水温度(℃)", "负值"),
        ("功耗(kW)", "负值"),
        ("流量(m³/h)", "负值或零"),
    ]
    for col, reason in neg_checks:
        if col in df.columns:
            notna_mask = df[col].notna()
            if col == "流量(m³/h)":
                neg_mask = notna_mask & (df[col] <= 0)
            else:
                neg_mask = notna_mask & (df[col] < 0)
            if neg_mask.any():
                for idx in df.index[neg_mask]:
                    val = df.at[idx, col]
                    row_num = df.at[idx, "_样本原始行号"]
                    _add_reason(
                        pd.Series([True] * len(df), index=df.index) & (df.index == idx),
                        f"{col}:{reason}(实际值={val})[行{row_num}]"
                    )

    if "出水温度(℃)" in df.columns and "回水温度(℃)" in df.columns:
        valid_mask = df["出水温度(℃)"].notna() & df["回水温度(℃)"].notna()
        reverse_mask = valid_mask & (df["出水温度(℃)"] < df["回水温度(℃)"])
        if reverse_mask.any():
            for idx in df.index[reverse_mask]:
                out_v = df.at[idx, "出水温度(℃)"]
                back_v = df.at[idx, "回水温度(℃)"]
                row_num = df.at[idx, "_样本原始行号"]
                _add_reason(
                    pd.Series([True] * len(df), index=df.index) & (df.index == idx),
                    f"进出水温颠倒(出水={out_v}℃<回水={back_v}℃)[行{row_num}]"
                )

    if "功耗(kW)" in df.columns and "额定功率(kW)" in df.columns:
        pass

    return df


def load_note(input_dir: str) -> str:
    """加载后补说明文本（note.txt），不存在则返回空字符串。"""
    note_path = os.path.join(input_dir, "note.txt")
    if os.path.exists(note_path):
        try:
            with open(note_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                return content
        except UnicodeDecodeError as e:
            raise DataValidationError(
                f"note.txt 编码错误：{e}。请另存为 UTF-8 格式。"
            ) from e
    return ""


def list_input_files(input_dir: str) -> List[str]:
    """列出输入目录下的所有文件。"""
    if not os.path.exists(input_dir):
        return []
    return sorted(os.listdir(input_dir))

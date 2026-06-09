import os
from datetime import datetime
import pandas as pd
from .batch_record import BatchRecordManager, ProcessingRecord


def _parse_datetime(val: str) -> datetime:
    val = str(val).strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%Y/%m/%d %H:%M:%S", "%Y/%m/%d"):
        try:
            return datetime.strptime(val, fmt)
        except ValueError:
            continue
    return datetime.now()


def load_weight_sheet(file_path: str) -> pd.DataFrame:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"称量单文件不存在: {file_path}")
    df = pd.read_csv(file_path, dtype=str).fillna("")
    required = {"批号", "样品名称", "称量日期"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"称量单缺少必要列: {', '.join(missing)}")
    return df


def load_peak_area(file_path: str) -> pd.DataFrame:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"色谱峰面积文件不存在: {file_path}")
    df = pd.read_csv(file_path, dtype=str).fillna("")
    required = {"批号", "样品名称", "记录编号", "进样时间"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"色谱峰面积文件缺少必要列: {', '.join(missing)}")
    return df


def load_interpretation(file_path: str) -> pd.DataFrame:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"谱图判读记录文件不存在: {file_path}")
    df = pd.read_csv(file_path, dtype=str).fillna("")
    required = {"批号", "判读日期"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"谱图判读记录缺少必要列: {', '.join(missing)}")
    return df


def build_batch_records(weight_df: pd.DataFrame, peak_df: pd.DataFrame, interp_df: pd.DataFrame) -> BatchRecordManager:
    manager = BatchRecordManager()

    peak_groups = peak_df.groupby("记录编号")
    weight_groups = weight_df.groupby("批号")

    interp_map = {}
    for batch, g in interp_df.groupby("批号"):
        g = g.copy()
        g["_it"] = g["判读日期"].apply(_parse_datetime)
        g = g.sort_values("_it").reset_index(drop=True)
        recs = []
        for _, r in g.iterrows():
            d = {k: v for k, v in r.items() if k != "_it"}
            d["_it"] = r["_it"]
            recs.append(d)
        interp_map[batch] = {"rows": recs, "used": [False] * len(recs)}

    batch_weight_index = {}
    for batch_no in weight_groups.groups:
        w_rows = weight_groups.get_group(batch_no).copy()
        w_rows["_wt"] = w_rows["称量日期"].apply(_parse_datetime)
        w_rows = w_rows.sort_values("_wt").reset_index(drop=True)
        batch_weight_index[batch_no] = {"rows": w_rows, "used": [False] * len(w_rows)}

    sorted_peak_keys = sorted(
        peak_groups.groups.keys(),
        key=lambda rid: _parse_datetime(peak_groups.get_group(rid).iloc[0]["进样时间"]),
    )

    for record_id in sorted_peak_keys:
        peaks = peak_groups.get_group(record_id)
        peak_list = peaks.to_dict("records")
        first_peak = peak_list[0]
        batch_no = first_peak["批号"]
        sample_name = first_peak["样品名称"]

        weight_info = None
        weight_time = None
        if batch_no in batch_weight_index:
            w_data = batch_weight_index[batch_no]
            p_time = _parse_datetime(first_peak["进样时间"])
            best_idx = -1
            best_delta = float("inf")
            for idx, wr in w_data["rows"].iterrows():
                if w_data["used"][idx]:
                    continue
                w_time = wr["_wt"]
                delta = abs((p_time - w_time).total_seconds())
                if delta < best_delta:
                    best_delta = delta
                    best_idx = idx
            if best_idx >= 0:
                wr = w_data["rows"].iloc[best_idx]
                w_data["used"][best_idx] = True
                weight_info = {k: v for k, v in wr.items() if k != "_wt"}
                weight_time = wr["_wt"]

        record_time = _parse_datetime(first_peak["进样时间"])

        interp = None
        final_decision = None
        if batch_no in interp_map:
            i_data = interp_map[batch_no]
            best_idx = -1
            best_delta = float("inf")
            for idx, c in enumerate(i_data["rows"]):
                if i_data["used"][idx]:
                    continue
                c_time = c["_it"]
                delta = abs((record_time - c_time).total_seconds())
                if delta < best_delta:
                    best_delta = delta
                    best_idx = idx
            if best_idx >= 0:
                c = i_data["rows"][best_idx]
                i_data["used"][best_idx] = True
                interp = {k: v for k, v in c.items() if k != "_it"}
                final_decision = interp.get("复核结论") or interp.get("处理意见") or ""

        rec = ProcessingRecord(
            batch_no=batch_no,
            sample_name=sample_name,
            record_id=record_id,
            record_type="色谱检测",
            record_time=record_time,
            raw_data={"色谱记录": first_peak},
            peak_areas=peak_list,
            interpretation=interp,
            weight_info=weight_info,
            final_decision=final_decision,
        )
        manager.add_record(rec)

    for batch_no, w_rows in weight_groups:
        if batch_no not in manager._records:
            for _, wr in w_rows.iterrows():
                rec = ProcessingRecord(
                    batch_no=batch_no,
                    sample_name=wr.get("样品名称", ""),
                    record_id=wr.get("称量单号", f"WEIGHT-{batch_no}"),
                    record_type="称量记录",
                    record_time=_parse_datetime(wr["称量日期"]),
                    raw_data={"称量记录": wr.to_dict()},
                    weight_info=wr.to_dict(),
                )
                manager.add_record(rec)

    return manager

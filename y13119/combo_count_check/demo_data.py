"""
演示数据生成
==============
数据虽然量少，但结构要和真实生产数据一致：
- history_answers: 历史答案（含旧说法）
- current_records: 当前待验算记录（含一条正常、一条外推越界）
- supplementary_notes: 后补说明
"""
import os
import pandas as pd


DEMO_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def ensure_dir():
    os.makedirs(DEMO_DIR, exist_ok=True)


def build_history_answers() -> pd.DataFrame:
    return pd.DataFrame([
        {
            "combo_key": "A|华东|线上",
            "category": "A",
            "region": "华东",
            "channel": "线上",
            "historical_count": 1250,
            "answer_version": "v2025.11",
            "answered_by": "analyst_meng",
            "answered_at": "2025-11-20",
            "note": "旧口径：含试用用户",
            "source": "history",
        },
        {
            "combo_key": "A|华东|线下",
            "category": "A",
            "region": "华东",
            "channel": "线下",
            "historical_count": 830,
            "answer_version": "v2025.11",
            "answered_by": "analyst_meng",
            "answered_at": "2025-11-20",
            "note": "旧口径",
            "source": "history",
        },
        {
            "combo_key": "B|华北|线上",
            "category": "B",
            "region": "华北",
            "channel": "线上",
            "historical_count": 2100,
            "answer_version": "v2025.10",
            "answered_by": "analyst_old",
            "answered_at": "2025-10-15",
            "note": "历史旧说法，已作废但仍在库里",
            "source": "history",
        },
        {
            "combo_key": "B|华北|线下",
            "category": "B",
            "region": "华北",
            "channel": "线下",
            "historical_count": 640,
            "answer_version": "v2025.11",
            "answered_by": "analyst_meng",
            "answered_at": "2025-11-21",
            "note": "正常历史答案",
            "source": "history",
        },
    ])


def build_current_records() -> pd.DataFrame:
    return pd.DataFrame([
        {
            "combo_key": "A|华东|线上",
            "category": "A",
            "region": "华东",
            "channel": "线上",
            "current_count": 1249,
            "extrapolation_flag": False,
            "data_source": "ods_main_table",
            "stat_date": "2026-06-10",
            "note": "一条正常记录",
        },
        {
            "combo_key": "A|华东|线下",
            "category": "A",
            "region": "华东",
            "channel": "线下",
            "current_count": 831,
            "extrapolation_flag": False,
            "data_source": "ods_main_table",
            "stat_date": "2026-06-10",
            "note": "正常",
        },
        {
            "combo_key": "B|华北|线上",
            "category": "B",
            "region": "华北",
            "channel": "线上",
            "current_count": 5200000,
            "extrapolation_flag": True,
            "data_source": "extrapolated_fill",
            "stat_date": "2026-06-10",
            "note": "外推越界样例：历史2100，当前外推到520万，明显越界",
        },
        {
            "combo_key": "B|华北|线下",
            "category": "B",
            "region": "华北",
            "channel": "线下",
            "current_count": 641,
            "extrapolation_flag": False,
            "data_source": "ods_main_table",
            "stat_date": "2026-06-10",
            "note": "正常",
        },
    ])


def build_supplementary_notes() -> pd.DataFrame:
    return pd.DataFrame([
        {
            "combo_key": "A|华东|线上",
            "note_type": "caliber_change",
            "note_content": "2025-12起口径调整：试用用户不再计入，历史值未回刷",
            "added_by": "analyst_meng",
            "added_at": "2026-06-09",
        },
        {
            "combo_key": "B|华北|线上",
            "note_type": "data_quality",
            "note_content": "当日源数据缺失，采用线性外推填充，需人工复核",
            "added_by": "etl_ops",
            "added_at": "2026-06-11",
        },
    ])


def generate_all_demo_data():
    ensure_dir()
    hist = build_history_answers()
    curr = build_current_records()
    notes = build_supplementary_notes()

    hist.to_csv(os.path.join(DEMO_DIR, "history_answers.csv"), index=False, encoding="utf-8")
    curr.to_csv(os.path.join(DEMO_DIR, "current_records.csv"), index=False, encoding="utf-8")
    notes.to_csv(os.path.join(DEMO_DIR, "supplementary_notes.csv"), index=False, encoding="utf-8")
    return hist, curr, notes


if __name__ == "__main__":
    h, c, n = generate_all_demo_data()
    print(f"演示数据已生成：历史答案 {len(h)} 条 / 当前记录 {len(c)} 条 / 后补说明 {len(n)} 条")

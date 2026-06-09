import pandas as pd
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)


def generate_sample_experiment_data():
    rows = []

    rows.append({
        "记录编号": "CAT-2025-001",
        "实验日期": "2025-11-15",
        "样品质量": 0.5234,
        "称量精度": "0.0001g",
        "反应条件": "固定床反应器, 常压",
        "反应温度": "450°C",
        "空速": "3000 h⁻¹",
        "初始活性": 92.5,
        "最终活性": 85.3,
        "衰减率": None,
        "备注": "常规测试",
        "补录备注": None
    })

    rows.append({
        "记录编号": "CAT-2025-002",
        "实验日期": "2025-11-16",
        "样品质量": 0.51,
        "称量精度": None,
        "反应条件": "固定床反应器, 常压",
        "反应温度": "450",
        "空速": "3000 h⁻¹",
        "初始活性": 91.8,
        "最终活性": 82.1,
        "衰减率": None,
        "备注": "天平精度不够, 只记到0.01g",
        "补录备注": "2025-11-17补: 天平当天校准中, 暂用精度低的"
    })

    rows.append({
        "记录编号": "CAT-2025-003",
        "实验日期": "2025-11-17",
        "样品质量": 0.5,
        "称量精度": None,
        "反应条件": None,
        "反应温度": "842°F",
        "空速": "3000 h⁻¹",
        "初始活性": None,
        "最终活性": 80.5,
        "衰减率": None,
        "备注": "旧表转抄, 数据不全",
        "补录备注": "温度单位是华氏度, 当时老工程师习惯用°F"
    })

    rows.append({
        "记录编号": "CAT-2025-004",
        "实验日期": "2025-11-18",
        "样品质量": 0.4987,
        "称量精度": "0.0001g",
        "反应条件": "固定床, 加压0.5MPa",
        "反应温度": "723K",
        "空速": "2500 h⁻¹",
        "初始活性": 89.7,
        "最终活性": 78.4,
        "衰减率": None,
        "备注": "热力学计算用开尔文单位",
        "补录备注": None
    })

    rows.append({
        "记录编号": "CAT-2025-005",
        "实验日期": None,
        "样品质量": None,
        "称量精度": None,
        "反应条件": "反应器未记录",
        "反应温度": None,
        "空速": None,
        "初始活性": None,
        "最终活性": None,
        "衰减率": None,
        "备注": "数据缺失严重, 待补充",
        "补录备注": "这条记录基本作废, 但先保留追踪"
    })

    rows.append({
        "记录编号": "CAT-2025-006",
        "实验日期": "2025-11-20",
        "样品质量": 0.5312,
        "称量精度": "0.0001g",
        "反应条件": "固定床反应器, 常压",
        "反应温度": "460°C",
        "空速": "3000 h⁻¹",
        "初始活性": 93.2,
        "最终活性": 86.7,
        "衰减率": None,
        "备注": None,
        "补录备注": "2025-11-22补: 这条数据没问题"
    })

    df = pd.DataFrame(rows)

    filepath = os.path.join(DATA_DIR, "催化剂活性衰减实验记录_2025年11月.xlsx")

    with pd.ExcelWriter(filepath, engine='xlsxwriter') as writer:
        wb = writer.book
        ws = wb.add_worksheet("实验记录表")

        title_fmt = wb.add_format({'bold': True, 'font_size': 14, 'align': 'center'})
        subtitle_fmt = wb.add_format({'italic': True, 'font_color': '#666666'})

        ws.merge_range('A1:L1', '催化剂活性衰减实验记录（2025年11月批次）', title_fmt)
        ws.merge_range('A2:L2', '备注: 本批数据包含旧表转抄、补录数据, 温度单位不统一, 请注意核对', subtitle_fmt)

        header_fmt = wb.add_format({
            'bold': True, 'bg_color': '#D6E4F0', 'border': 1, 'align': 'center', 'valign': 'vcenter'
        })
        normal_fmt = wb.add_format({'border': 1, 'text_wrap': True, 'valign': 'top'})
        highlight_fmt = wb.add_format({'bg_color': '#FFF2CC', 'border': 1, 'text_wrap': True, 'valign': 'top'})

        headers = list(df.columns)
        for col, h in enumerate(headers):
            ws.write(2, col, h, header_fmt)

        for r_idx, row in enumerate(df.itertuples(index=False)):
            excel_row = r_idx + 3
            row_has_issue = False
            if r_idx in [1, 2, 4]:
                row_has_issue = True

            for c_idx, val in enumerate(row):
                fmt = highlight_fmt if row_has_issue else normal_fmt
                if val is None or (isinstance(val, float) and pd.isna(val)):
                    ws.write(excel_row, c_idx, "", fmt)
                else:
                    ws.write(excel_row, c_idx, val, fmt)

        widths = [14, 14, 12, 14, 22, 14, 14, 12, 12, 10, 30, 36]
        for i, w in enumerate(widths):
            ws.set_column(i, i, w)

    print(f"生成实验记录样例: {filepath}")
    return filepath


def generate_sample_curve_data():
    rows = []

    for t in [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]:
        base_temp = 450
        base_activity = 93.0 - t * 0.35

        if t == 0:
            temp_str = "450°C"
            act = 93.2
        elif t == 6:
            temp_str = "752"
            act = base_activity
        elif t == 8:
            temp_str = "200°C"
            act = base_activity
        elif t == 14:
            temp_str = "450"
            act = base_activity - 5
        elif t == 18:
            temp_str = "455°F"
            act = base_activity
        else:
            temp_str = f"{base_temp}°C"
            act = base_activity

        rows.append({
            "时间/h": t,
            "温度": temp_str,
            "活性/%": round(act, 2)
        })

    df = pd.DataFrame(rows)

    filepath = os.path.join(DATA_DIR, "温度-活性曲线数据_补录.xlsx")

    with pd.ExcelWriter(filepath, engine='xlsxwriter') as writer:
        wb = writer.book

        ws1 = wb.add_worksheet("曲线数据表")
        title_fmt = wb.add_format({'bold': True, 'font_size': 14, 'align': 'center'})
        note_fmt = wb.add_format({'italic': True, 'font_color': '#993300', 'text_wrap': True})

        ws1.merge_range('A1:C1', '催化剂温度-活性曲线数据', title_fmt)
        ws1.merge_range('A2:C2',
                        '⚠注意: 第6小时数据温度单位缺失; 第8小时温度明显偏低(可能抄录错误); '
                        '第14小时温度单位不明且活性偏低; 第18小时用了华氏度',
                        note_fmt)
        ws1.set_row(1, 45)

        header_fmt = wb.add_format({
            'bold': True, 'bg_color': '#D6E4F0', 'border': 1, 'align': 'center'
        })
        normal_fmt = wb.add_format({'border': 1, 'align': 'center'})
        bad_fmt = wb.add_format({'bg_color': '#FCE4D6', 'border': 1, 'align': 'center', 'font_color': '#990000'})

        for col, h in enumerate(df.columns):
            ws1.write(2, col, h, header_fmt)

        for r_idx, row in enumerate(df.itertuples(index=False)):
            excel_row = r_idx + 3
            is_bad = (r_idx in [3, 4, 7, 9])

            for c_idx, val in enumerate(row):
                fmt = bad_fmt if is_bad else normal_fmt
                ws1.write(excel_row, c_idx, val, fmt)

        ws1.set_column(0, 0, 10)
        ws1.set_column(1, 1, 14)
        ws1.set_column(2, 2, 12)

        ws2 = wb.add_worksheet("补录说明")
        ws2.write('A1', '补录备注说明', wb.add_format({'bold': True, 'font_size': 13}))
        notes = [
            '1. 本曲线是从实验室记录本上抄录的, 原始记录有墨水晕染',
            '2. 第6小时那行, 记录本上只写了数字752, 可能是°F也可能是K, 待确认',
            '3. 第8小时的200°C明显不对, 怀疑是400°C抄录时漏写了4',
            '4. 第18小时原记录用的是华氏度, 因为当时换了个老工程师值班',
            '5. 第14小时活性数据偏低, 可能是取样时的问题'
        ]
        note_fmt2 = wb.add_format({'text_wrap': True})
        for i, n in enumerate(notes):
            ws2.write(i + 2, 0, n, note_fmt2)
        ws2.set_column(0, 0, 70)

    print(f"生成温度曲线样例: {filepath}")
    return filepath


if __name__ == "__main__":
    generate_sample_experiment_data()
    generate_sample_curve_data()
    print("样例数据生成完成!")

"""生成贴近日常的氨氮监测示例数据

包含：
- 旧表格式的监测记录（列名不规范）
- 空白对照缺失
- 空白对照值异常偏高/偏低
- 漏填单位
- 补录备注未写完
- 试剂过期
- 试剂未登台账
- 操作人员/审核人员漏填
- 标准曲线缺失
"""
import os
import pandas as pd
from datetime import datetime, timedelta


def generate_sample_data(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)

    now = datetime.now()

    monitor_data = {
        "记录编号": [
            "NH3N-2025-0601-001",
            "NH3N-2025-0601-002",
            "NH3N-2025-0601-003",
            "NH3N-2025-0602-001",
            "NH3N-2025-0602-002",
            "NH3N-2025-0603-001",
            "NH3N-2025-0603-002",
            "NH3N-2025-0604-001",
        ],
        "样品编号": [
            "S-20250601-01",
            "S-20250601-02",
            "S-20250601-03",
            "S-20250602-01",
            "S-20250602-02",
            "S-20250603-01",
            "S-20250603-02",
            "S-20250604-01",
        ],
        "样品名称": [
            "进水口",
            "生化池出水",
            "总排放口",
            "进水口",
            "总排放口",
            "进水口",
            "总排放口",
            "应急采样-1#",
        ],
        "检测日期": [
            (now - timedelta(days=9)).strftime("%Y/%m/%d"),
            (now - timedelta(days=9)).strftime("%Y-%m-%d"),
            (now - timedelta(days=9)).strftime("%Y.%m.%d"),
            (now - timedelta(days=8)).strftime("%Y-%m-%d"),
            (now - timedelta(days=8)).strftime("%Y-%m-%d"),
            (now - timedelta(days=7)).strftime("%Y-%m-%d"),
            (now - timedelta(days=7)).strftime("%Y-%m-%d"),
            (now - timedelta(days=6)).strftime("%Y-%m-%d"),
        ],
        "空白值": [
            0.032,
            "",
            0.158,
            0.028,
            0.001,
            0.035,
            0.040,
            0.029,
        ],
        "空白单位": [
            "A",
            "",
            "A",
            "",
            "A",
            "A",
            "A",
            "A",
        ],
        "测定值": [
            0.456,
            0.312,
            0.678,
            0.389,
            0.245,
            0.512,
            0.298,
            1.876,
        ],
        "单位": [
            "",
            "A",
            "A",
            "A",
            "A",
            "",
            "A",
            "A",
        ],
        "标曲编号": [
            "CURVE-20250528",
            "CURVE-20250528",
            "",
            "CURVE-20250602",
            "CURVE-20250602",
            "CURVE-20250603",
            "CURVE-20250603",
            "",
        ],
        "检测人": [
            "张工",
            "李工",
            "李工",
            "",
            "王工",
            "张工",
            "张工",
            "李工",
        ],
        "审核人": [
            "陈主管",
            "",
            "陈主管",
            "",
            "陈主管",
            "陈主管",
            "",
            "",
        ],
        "试剂编号": [
            "REAG-001、REAG-003",
            "REAG-001,REAG-003",
            "REAG-002;REAG-003",
            "REAG-001/REAG-004",
            "REAG-999",
            "REAG-001、REAG-003",
            "",
            "REAG-005,REAG-003",
        ],
        "备注": [
            "",
            "补录：原记录丢失，根据实验本补",
            "",
            "原记录空白漏填，补",
            "正常",
            "",
            "样品浊度较高，已絮凝处理，待",
            "应急监测，备注待补...",
        ],
    }
    df_monitor = pd.DataFrame(monitor_data)
    monitor_path = os.path.join(output_dir, "氨氮监测记录表_2025年6月上旬.xlsx")
    df_monitor.to_excel(monitor_path, index=False)

    reagent_data = {
        "试剂编号": [
            "REAG-001",
            "REAG-002",
            "REAG-003",
            "REAG-004",
            "REAG-005",
        ],
        "试剂名称": [
            "纳氏试剂",
            "纳氏试剂",
            "酒石酸钾钠溶液",
            "氨氮标准使用液",
            "纳氏试剂",
        ],
        "批号": [
            "B20250101",
            "B20240301",
            "C20250215",
            "D20250401",
            "B20250501",
        ],
        "生产厂家": [
            "国药集团",
            "国药集团",
            "阿拉丁试剂",
            "国家标准物质中心",
            "国药集团",
        ],
        "开瓶日期": [
            (now - timedelta(days=30)).strftime("%Y-%m-%d"),
            (now - timedelta(days=120)).strftime("%Y-%m-%d"),
            (now - timedelta(days=20)).strftime("%Y-%m-%d"),
            (now - timedelta(days=10)).strftime("%Y-%m-%d"),
            (now - timedelta(days=2)).strftime("%Y-%m-%d"),
        ],
        "有效期至": [
            (now + timedelta(days=150)).strftime("%Y-%m-%d"),
            (now - timedelta(days=30)).strftime("%Y-%m-%d"),
            (now + timedelta(days=200)).strftime("%Y-%m-%d"),
            (now + timedelta(days=330)).strftime("%Y-%m-%d"),
            (now + timedelta(days=5)).strftime("%Y-%m-%d"),
        ],
        "使用量": [
            5,
            5,
            10,
            2,
            8,
        ],
        "单位": [
            "mL",
            "mL",
            "mL",
            "mL",
            "mL",
        ],
        "使用人": [
            "张工",
            "李工",
            "",
            "王工",
            "李工",
        ],
        "备注": [
            "",
            "颜色略深，注意观察",
            "配置时间2025-05-20",
            "",
            "新到货，刚开瓶",
        ],
    }
    df_reagent = pd.DataFrame(reagent_data)
    reagent_path = os.path.join(output_dir, "试剂台账_氨氮相关.xlsx")
    df_reagent.to_excel(reagent_path, index=False)

    extra_csv = {
        "序号": ["1", "2"],
        "样品名": ["平行样-进水口", "平行样-总排放口"],
        "样品号": ["S-20250605-01", "S-20250605-02"],
        "日期": [(now - timedelta(days=5)).strftime("%Y-%m-%d"), (now - timedelta(days=5)).strftime("%Y-%m-%d")],
        "空白吸光度": [0.033, ""],
        "吸光度": [0.462, 0.301],
        "检测人员": ["张工", "张工"],
        "审核": ["", ""],
        "试剂": ["REAG-001,REAG-003", "REAG-001,REAG-003"],
        "备注": ["", ""],
    }
    df_csv = pd.DataFrame(extra_csv)
    csv_path = os.path.join(output_dir, "0605_平行样记录.csv")
    df_csv.to_csv(csv_path, index=False, encoding="gbk")

    print(f"示例数据已生成到目录: {output_dir}")
    print(f"  - 监测记录(Excel旧列名): {monitor_path}")
    print(f"  - 试剂台账: {reagent_path}")
    print(f"  - 平行样记录(CSV GBK编码): {csv_path}")
    print("")
    print("这批示例数据覆盖以下真实场景：")
    print("  □ 空白对照缺失（2条）")
    print("  □ 空白对照值异常偏高/偏低（2条）")
    print("  □ 单位漏填（2条）")
    print("  □ 补录备注未写完（2条，'补'和'待...'结尾）")
    print("  □ 试剂过期（REAG-002纳氏试剂已过期30天）")
    print("  □ 试剂即将过期（REAG-005还有5天到期）")
    print("  □ 试剂编号在台账中找不到（REAG-999）")
    print("  □ 未关联试剂台账（1条）")
    print("  □ 检测人员漏填（1条）")
    print("  □ 审核人员漏填（4条）")
    print("  □ 标准曲线编号缺失（2条）")
    print("  □ 旧表列名不规范（检测日期、空白值、测定值等）")
    print("  □ 多编码格式混用（xlsx + csv gbk）")
    print("  □ 试剂编号分隔符不统一（、，,;；/ 混用）")
    print("  □ 日期格式不统一（YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD）")


if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sample_dir = os.path.join(script_dir, "sample_input")
    generate_sample_data(sample_dir)

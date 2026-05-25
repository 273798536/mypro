import pandas as pd
from datetime import datetime, timedelta
import os


def generate_sample_inspection_data(file_path):
    today = datetime.now()
    data = [
        {
            "记录编号": f"IMP-{today.strftime('%Y%m%d')}-001",
            "设备名称": "心电监护仪",
            "设备型号": "MINDRAY-BeneView-T8",
            "设备序列号": "SN-IMP-001-MED",
            "科室": "重症监护室",
            "巡检日期": today.strftime("%Y-%m-%d"),
            "下次巡检日期": (today + timedelta(days=90)).strftime("%Y-%m-%d"),
            "巡检人员": "张工程师",
            "巡检结果": "正常",
            "发现问题": "无",
            "证书编号": "CERT-IMP-001",
        },
        {
            "记录编号": f"IMP-{today.strftime('%Y%m%d')}-002",
            "设备名称": "呼吸机",
            "设备型号": "PHILIPS-V60",
            "设备序列号": "SN-IMP-002-MED",
            "科室": "呼吸科",
            "巡检日期": today.strftime("%Y-%m-%d"),
            "下次巡检日期": (today + timedelta(days=90)).strftime("%Y-%m-%d"),
            "巡检人员": "李工程师",
            "巡检结果": "异常",
            "发现问题": "报警功能异常",
            "证书编号": "CERT-IMP-002",
        },
        {
            "记录编号": "",
            "设备名称": "有问题的设备",
            "设备型号": "BAD-MODEL",
            "设备序列号": "",
            "科室": "测试科室",
            "巡检日期": today.strftime("%Y-%m-%d"),
            "巡检人员": "测试员",
            "巡检结果": "正常",
            "发现问题": "缺少记录编号和序列号",
            "证书编号": "",
        },
    ]
    df = pd.DataFrame(data)
    df.to_excel(file_path, index=False, engine="openpyxl")
    print(f"  ✓ 巡检记录样例数据已生成: {file_path}")
    return file_path


def generate_sample_calibration_data(file_path):
    today = datetime.now()
    data = [
        {
            "记录编号": f"CERT-IMP-{today.strftime('%Y%m%d')}-001",
            "设备名称": "电子体温计",
            "设备型号": "OMRON-MC-872",
            "设备序列号": "SN-CERT-001",
            "科室": "儿科",
            "证书编号": f"CAL-{today.strftime('%Y%m%d')}-001",
            "校准日期": today.strftime("%Y-%m-%d"),
            "有效期至": (today + timedelta(days=365)).strftime("%Y-%m-%d"),
            "校准机构": "国家计量中心",
            "校准结果": "合格",
        },
        {
            "记录编号": f"CERT-IMP-{today.strftime('%Y%m%d')}-002",
            "设备名称": "血压计",
            "设备型号": "OMRON-HEM-7130",
            "设备序列号": "SN-CERT-002",
            "科室": "内科",
            "证书编号": f"CAL-{today.strftime('%Y%m%d')}-002",
            "校准日期": (today - timedelta(days=365)).strftime("%Y-%m-%d"),
            "有效期至": (today - timedelta(days=30)).strftime("%Y-%m-%d"),
            "校准机构": "国家计量中心",
            "校准结果": "合格",
        },
    ]
    df = pd.DataFrame(data)
    df.to_excel(file_path, index=False, engine="openpyxl")
    print(f"  ✓ 校准证书样例数据已生成: {file_path}")
    return file_path


def generate_sample_repair_data(file_path):
    today = datetime.now()
    data = [
        {
            "记录编号": f"REP-IMP-{today.strftime('%Y%m%d')}-001",
            "设备名称": "输液泵",
            "设备型号": "SMITHS-MEDICAL-P2",
            "设备序列号": "SN-REP-001",
            "科室": "手术室",
            "报价单号": f"Q-{today.strftime('%Y%m%d')}-001",
            "维修日期": today.strftime("%Y-%m-%d"),
            "故障描述": "输液速度不准确",
            "维修厂商": "专业医疗设备维修公司",
            "维修状态": "维修中",
            "保修期": "6个月",
            "报价金额": 3500.00,
        },
    ]
    df = pd.DataFrame(data)
    df.to_excel(file_path, index=False, engine="openpyxl")
    print(f"  ✓ 维修报价样例数据已生成: {file_path}")
    return file_path


def generate_sample_supplementary_data(file_path):
    data = [
        {
            "记录编号": f"SUP-IMP-{datetime.now().strftime('%Y%m%d')}-001",
            "设备名称": "历史设备",
            "设备型号": "OLD-MODEL-001",
            "设备序列号": "SN-SUP-001",
            "科室": "档案室",
            "补录原因": "历史记录缺失，需要补录",
            "补录类型": "巡检记录补录",
            "原记录编号": "OLD-2020-001",
            "补录备注": "从历史档案中恢复",
        },
    ]
    df = pd.DataFrame(data)
    df.to_excel(file_path, index=False, engine="openpyxl")
    print(f"  ✓ 临时补录单样例数据已生成: {file_path}")
    return file_path


def generate_all_samples():
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    print("=" * 60)
    print("  生成导入测试样例数据")
    print("=" * 60)

    files = {}
    files["inspection"] = generate_sample_inspection_data(
        os.path.join(upload_dir, "sample_inspection.xlsx")
    )
    files["calibration"] = generate_sample_calibration_data(
        os.path.join(upload_dir, "sample_calibration.xlsx")
    )
    files["repair"] = generate_sample_repair_data(
        os.path.join(upload_dir, "sample_repair.xlsx")
    )
    files["supplementary"] = generate_sample_supplementary_data(
        os.path.join(upload_dir, "sample_supplementary.xlsx")
    )

    print("\n  ✓ 所有样例数据生成完成")
    return files


if __name__ == "__main__":
    generate_all_samples()

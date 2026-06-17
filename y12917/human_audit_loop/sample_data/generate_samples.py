import pandas as pd
import os
from datetime import datetime, timedelta
import random

random.seed(42)

SAMPLE_DIR = os.path.dirname(os.path.abspath(__file__))


def generate_old_format_audit():
    records = []
    base_date = datetime(2026, 5, 1)
    names = ["张伟", "李娜", "王芳", "刘强", "陈静", "杨磊", "赵敏", "周杰",
             "吴昊", "郑丽", "孙鹏", "马超", "朱琳", "胡军", "林涛"]
    cities = ["北京市", "上海市", "广州市", "深圳市", "杭州市", "成都市", "武汉市", "南京市"]
    products = ["基础套餐A", "增值服务B", "企业版C", "试用版D", "旗舰版E"]

    for i in range(1, 41):
        d = base_date + timedelta(days=random.randint(0, 30))
        city = random.choice(cities)
        product = random.choice(products)
        amount = round(random.uniform(99, 99999), 2)
        has_unit = random.random() > 0.3
        auditor_note = ""
        if random.random() < 0.25:
            auditor_note = random.choice([
                "补录：客户电话沟通确认金额无异常",
                "补录备注：发票已重开，原单号INV20260XX",
                "补录：用户反馈系统计算错误，已手工修正",
                "补录备注：此单为历史遗留，已于上月线下结清",
                "补录：经办人离职，接手人补充确认信息",
            ])
        records.append({
            "流水号": f"OLD{i:05d}",
            "客户姓名": random.choice(names),
            "所属地区": city,
            "订购产品": product,
            "消费金额": amount if has_unit else amount,
            "金额单位": "元" if has_unit else "",
            "登记日期": d.strftime("%Y-%m-%d"),
            "原审核人": random.choice(["审核员甲", "审核员乙", "审核员丙", ""]),
            "备注": auditor_note,
        })
    df = pd.DataFrame(records)
    df.to_excel(os.path.join(SAMPLE_DIR, "旧版人审表_5月.xlsx"), index=False)
    print(f"已生成 旧版人审表_5月.xlsx 共{len(df)}条")


def generate_new_format_audit():
    records = []
    base_date = datetime(2026, 5, 15)
    names = ["张伟", "李娜", "王芳", "刘强", "陈静", "杨磊", "赵敏", "周杰",
             "吴昊", "郑丽", "孙鹏", "马超", "朱琳", "胡军", "林涛",
             "徐明", "何静", "高翔", "罗雪", "谢峰"]
    cities = ["北京市", "上海市", "广州市", "深圳市", "杭州市", "成都市", "武汉市",
              "南京市", "西安市", "重庆市", "苏州市", "天津市"]
    products = ["基础套餐A", "增值服务B", "企业版C", "试用版D", "旗舰版E",
                "增值组合F", "行业定制版G"]

    for i in range(1, 61):
        d = base_date + timedelta(days=random.randint(0, 20))
        city = random.choice(cities)
        product = random.choice(products)
        amount = round(random.uniform(99, 129999), 2)
        has_unit = random.random() > 0.2
        is_duplicate = random.random() < 0.15
        old_ref = f"OLD{random.randint(1, 40):05d}" if is_duplicate else ""
        extra_note = ""
        if random.random() < 0.2:
            extra_note = random.choice([
                "补录：与客户二次核实，此订单为企业团购拆分单",
                "补录备注：系统重复推送，保留此条，关联单号已标注",
                "补录：财务对账发现漏单，此条为补充录入",
                "补录备注：跨部门协作单，法务已确认合规",
                "补录：原经办人出差，委托补录相关信息",
            ])
        records.append({
            "审核单号": f"NEW{i:06d}",
            "关联旧流水号": old_ref,
            "客户名称": random.choice(names),
            "所在城市": city,
            "产品名称": product,
            "订单金额(元)": amount,
            "计量单位": "元" if has_unit else "",
            "提交时间": d.strftime("%Y-%m-%d %H:%M:%S"),
            "一级审核人": random.choice(["张审核", "李审核", "王审核", "赵审核"]),
            "复核结论": random.choice(["通过", "通过", "通过", "待补充", "驳回", "通过"]),
            "备注说明": extra_note,
        })
    df = pd.DataFrame(records)
    df.to_excel(os.path.join(SAMPLE_DIR, "新版人审表_5月下.xlsx"), index=False)
    print(f"已生成 新版人审表_5月下.xlsx 共{len(df)}条")


def generate_label_records():
    records = []
    base_date = datetime(2026, 5, 10)

    labels = ["正常通过", "金额存疑", "信息不全", "疑似重复", "单位缺失",
              "需要补录", "历史遗留", "跨期单", "需要回滚核查"]

    new_count = 60
    old_count = 40
    for i in range(1, new_count + 1):
        d = base_date + timedelta(days=random.randint(0, 20), hours=random.randint(8, 20))
        lbl = random.choice(labels)
        src_id = f"NEW{i:06d}"
        opinion = {
            "正常通过": "数据完整，金额合理，直接通过",
            "金额存疑": "金额与同类订单偏差较大，需业务方确认",
            "信息不全": "客户信息或产品信息缺失，请补全后再审",
            "疑似重复": "与历史订单高度相似，可能是重复录入",
            "单位缺失": "金额单位未填写，要求补充标注单位",
            "需要补录": "关键信息缺失，需要经办人补充说明",
            "历史遗留": "旧系统迁移数据，需要核对原表",
            "跨期单": "订单日期跨财务周期，需要财务确认归属期",
            "需要回滚核查": "之前可能处理错误，需要倒查原始标注",
        }[lbl]
        handler = random.choice(["平台工程师A", "平台工程师B", "平台工程师C"])
        records.append({
            "标注批次号": "BATCH-2026-05-001",
            "记录唯一ID": src_id,
            "来源表类型": "新版人审表",
            "标注标签": lbl,
            "标注时间": d.strftime("%Y-%m-%d %H:%M:%S"),
            "标注人": random.choice(["标注员小李", "标注员小王", "标注员小张"]),
            "处理意见": opinion,
            "跟进负责人": handler,
            "当前状态": random.choice(["待复核", "已处理", "已闭环", "待跟进"]),
        })

    for i in range(1, old_count + 1):
        d = base_date + timedelta(days=random.randint(0, 15), hours=random.randint(8, 20))
        lbl = random.choice(labels)
        src_id = f"OLD{i:05d}"
        opinion = {
            "正常通过": "数据完整，金额合理，直接通过",
            "金额存疑": "金额与同类订单偏差较大，需业务方确认",
            "信息不全": "客户信息或产品信息缺失，请补全后再审",
            "疑似重复": "与历史订单高度相似，可能是重复录入",
            "单位缺失": "金额单位未填写，要求补充标注单位",
            "需要补录": "关键信息缺失，需要经办人补充说明",
            "历史遗留": "旧系统迁移数据，需要核对原表",
            "跨期单": "订单日期跨财务周期，需要财务确认归属期",
            "需要回滚核查": "之前可能处理错误，需要倒查原始标注",
        }[lbl]
        handler = random.choice(["平台工程师A", "平台工程师B", "平台工程师C"])
        records.append({
            "标注批次号": "BATCH-2026-05-001",
            "记录唯一ID": src_id,
            "来源表类型": "旧版人审表",
            "标注标签": lbl,
            "标注时间": d.strftime("%Y-%m-%d %H:%M:%S"),
            "标注人": random.choice(["标注员小李", "标注员小王", "标注员小张"]),
            "处理意见": opinion,
            "跟进负责人": handler,
            "当前状态": random.choice(["待复核", "已处理", "已闭环", "待跟进"]),
        })

    df = pd.DataFrame(records)
    df.to_excel(os.path.join(SAMPLE_DIR, "标注记录及处理意见.xlsx"), index=False)
    print(f"已生成 标注记录及处理意见.xlsx 共{len(df)}条")


def generate_gray_feedback():
    records = []
    base_date = datetime(2026, 5, 25)
    grays = ["灰度组-A（新规则）", "灰度组-B（混合规则）", "基线组（旧规则）"]

    new_count = 60
    for i in range(1, new_count + 1):
        src_id = f"NEW{i:06d}"
        grp = random.choice(grays)
        auto_res = random.choice(["自动通过", "自动拒绝", "转人工"])
        human_res = random.choice(["通过", "驳回", "待补充"])
        d = base_date + timedelta(days=random.randint(0, 7))
        records.append({
            "记录唯一ID": src_id,
            "所属灰度组": grp,
            "模型/规则版本": "v2.3.1-灰度" if "灰度" in grp else "v2.2.0-基线",
            "系统自动判定": auto_res,
            "人工复核结果": human_res,
            "是否一致": "是" if (
                (auto_res == "自动通过" and human_res == "通过") or
                (auto_res == "自动拒绝" and human_res == "驳回")
            ) else "否",
            "判定时间": d.strftime("%Y-%m-%d %H:%M:%S"),
        })

    df = pd.DataFrame(records)
    df.to_excel(os.path.join(SAMPLE_DIR, "灰度对比反馈表.xlsx"), index=False)
    print(f"已生成 灰度对比反馈表.xlsx 共{len(df)}条")


def generate_version_rollback_cases():
    records = [
        {
            "异常ID": "EXCEP-20260601-001",
            "关联记录ID": "NEW000023",
            "异常类型": "版本回滚丢记录",
            "发现时间": "2026-06-01 10:23:15",
            "问题描述": "5月28日对v2.3.0执行回滚后，NEW000023这条记录的标注信息在系统中消失，原始标注人反馈已标注过",
            "影响范围": "涉及5月20日-5月27日期间通过新版规则标注的约12条记录",
            "当前处理人": "平台工程师A",
            "处理进展": "已从数据库备份恢复，正在逐条人工核对",
            "证据截图/路径": "/data/backup/20260528/audit_logs_dump.sql",
        },
        {
            "异常ID": "EXCEP-20260603-002",
            "关联记录ID": "OLD00018",
            "异常类型": "旧表迁移字段丢失",
            "发现时间": "2026-06-03 14:05:42",
            "问题描述": "旧表OLD00018在迁移到新表时，备注字段（含补录说明）被截断，仅保留前30字",
            "影响范围": "旧版人审表中备注长度>30字的共8条",
            "当前处理人": "平台工程师B",
            "处理进展": "已定位到ETL脚本中的substring逻辑，待修复后重跑",
            "证据截图/路径": "/data/etl/scripts/migrate_old.py#L87-L92",
        },
        {
            "异常ID": "EXCEP-20260605-003",
            "关联记录ID": "NEW000047",
            "异常类型": "重复样本未合并",
            "发现时间": "2026-06-05 09:48:11",
            "问题描述": "NEW000047与关联旧流水OLD00035为同一客户同一订单，去重规则未识别到跨表关联字段",
            "影响范围": "疑似跨新旧表重复的订单约15组",
            "当前处理人": "平台工程师C",
            "处理进展": "已补充跨表去重逻辑，待灰度验证",
            "证据截图/路径": "/docs/design/去重规则升级方案_v1.2.md",
        },
    ]
    df = pd.DataFrame(records)
    df.to_excel(os.path.join(SAMPLE_DIR, "版本回滚与异常案例.xlsx"), index=False)
    print(f"已生成 版本回滚与异常案例.xlsx 共{len(df)}条")


if __name__ == "__main__":
    generate_old_format_audit()
    generate_new_format_audit()
    generate_label_records()
    generate_gray_feedback()
    generate_version_rollback_cases()
    print("\n=== 全部样例数据生成完成 ===")
    print("存放路径:", SAMPLE_DIR)
    for f in sorted(os.listdir(SAMPLE_DIR)):
        if f.endswith(".xlsx"):
            fp = os.path.join(SAMPLE_DIR, f)
            size = round(os.path.getsize(fp) / 1024, 1)
            print(f"  - {f} ({size} KB)")

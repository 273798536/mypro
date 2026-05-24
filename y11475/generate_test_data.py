import pandas as pd
from datetime import datetime, timedelta

base_date = datetime(2025, 5, 20)

calendar_data = [
    {
        "会议室编码": "MR-001",
        "会议室名称": "第一会议室",
        "预约ID": "APT-20250520-001",
        "会议主题": "药监抽查准备会议",
        "预约日期": base_date.strftime("%Y-%m-%d"),
        "开始时间": (base_date.replace(hour=9, minute=0)).strftime("%Y-%m-%d %H:%M:%S"),
        "结束时间": (base_date.replace(hour=11, minute=0)).strftime("%Y-%m-%d %H:%M:%S"),
        "预约人": "张三",
        "预约部门": "质量部",
        "预估费用": 500
    },
    {
        "会议室编码": "MR-002",
        "会议室名称": "第二会议室",
        "预约ID": "APT-20250520-002",
        "会议主题": "项目评审会",
        "预约日期": base_date.strftime("%Y-%m-%d"),
        "开始时间": (base_date.replace(hour=14, minute=0)).strftime("%Y-%m-%d %H:%M:%S"),
        "结束时间": (base_date.replace(hour=16, minute=0)).strftime("%Y-%m-%d %H:%M:%S"),
        "预约人": "李四",
        "预约部门": "研发部",
        "预估费用": 300
    },
    {
        "会议室编码": "MR-003",
        "会议室名称": "第三会议室",
        "预约ID": "APT-20250521-001",
        "会议主题": "客户交流会",
        "预约日期": (base_date + timedelta(days=1)).strftime("%Y-%m-%d"),
        "开始时间": (base_date + timedelta(days=1)).replace(hour=10, minute=0).strftime("%Y-%m-%d %H:%M:%S"),
        "结束时间": (base_date + timedelta(days=1)).replace(hour=12, minute=0).strftime("%Y-%m-%d %H:%M:%S"),
        "预约人": "王五",
        "预约部门": "市场部",
        "预估费用": 800
    },
    {
        "会议室编码": "MR-001",
        "会议室名称": "第一会议室",
        "预约ID": "APT-20250521-002",
        "会议主题": "周例会",
        "预约日期": (base_date + timedelta(days=1)).strftime("%Y-%m-%d"),
        "开始时间": (base_date + timedelta(days=1)).replace(hour=14, minute=0).strftime("%Y-%m-%d %H:%M:%S"),
        "结束时间": (base_date + timedelta(days=1)).replace(hour=15, minute=0).strftime("%Y-%m-%d %H:%M:%S"),
        "预约人": "赵六",
        "预约部门": "行政部",
        "预估费用": 200
    },
    {
        "会议室编码": "MR-INVALID",
        "会议室名称": "",
        "预约ID": "",
        "会议主题": "无效记录测试",
        "预约日期": "无效日期",
        "开始时间": "",
        "结束时间": "",
        "预约人": "",
        "预约部门": "",
        "预估费用": ""
    }
]

access_card_data = [
    {
        "会议室编码": "MR-001",
        "预约ID": "APT-20250520-001",
        "预约日期": base_date.strftime("%Y-%m-%d"),
        "有门禁记录": "是",
        "刷卡人": "张三",
        "刷卡时间": (base_date.replace(hour=8, minute=55)).strftime("%Y-%m-%d %H:%M:%S")
    },
    {
        "会议室编码": "MR-002",
        "预约ID": "APT-20250520-002",
        "预约日期": base_date.strftime("%Y-%m-%d"),
        "有门禁记录": "否",
        "刷卡人": "",
        "刷卡时间": ""
    },
    {
        "会议室编码": "MR-003",
        "预约ID": "APT-20250521-001",
        "预约日期": (base_date + timedelta(days=1)).strftime("%Y-%m-%d"),
        "有门禁记录": "是",
        "刷卡人": "王五",
        "刷卡时间": (base_date + timedelta(days=1)).replace(hour=9, minute=50).strftime("%Y-%m-%d %H:%M:%S")
    },
    {
        "会议室编码": "MR-001",
        "预约ID": "APT-20250521-002",
        "预约日期": (base_date + timedelta(days=1)).strftime("%Y-%m-%d"),
        "有门禁记录": "否",
        "刷卡人": "",
        "刷卡时间": ""
    }
]

cancel_message_data = [
    {
        "会议室编码": "MR-001",
        "预约ID": "APT-20250520-001",
        "预约日期": base_date.strftime("%Y-%m-%d"),
        "有取消消息": "是",
        "取消时间": (base_date.replace(hour=8, minute=30)).strftime("%Y-%m-%d %H:%M:%S"),
        "取消操作人": "行政助理"
    },
    {
        "会议室编码": "MR-002",
        "预约ID": "APT-20250520-002",
        "预约日期": base_date.strftime("%Y-%m-%d"),
        "有取消消息": "否",
        "取消时间": "",
        "取消操作人": ""
    },
    {
        "会议室编码": "MR-003",
        "预约ID": "APT-20250521-001",
        "预约日期": (base_date + timedelta(days=1)).strftime("%Y-%m-%d"),
        "有取消消息": "否",
        "取消时间": "",
        "取消操作人": ""
    },
    {
        "会议室编码": "MR-001",
        "预约ID": "APT-20250521-002",
        "预约日期": (base_date + timedelta(days=1)).strftime("%Y-%m-%d"),
        "有取消消息": "是",
        "取消时间": (base_date + timedelta(days=1)).replace(hour=13, minute=0).strftime("%Y-%m-%d %H:%M:%S"),
        "取消操作人": "赵六"
    }
]

pd.DataFrame(calendar_data).to_excel("test_calendar.xlsx", index=False)
pd.DataFrame(access_card_data).to_excel("test_access_card.xlsx", index=False)
pd.DataFrame(cancel_message_data).to_excel("test_cancel_message.xlsx", index=False)

print("测试数据文件已生成:")
print("  - test_calendar.xlsx (预约日历数据)")
print("  - test_access_card.xlsx (门禁刷卡数据)")
print("  - test_cancel_message.xlsx (取消消息数据)")

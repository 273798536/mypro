"""
生成一份演示用的 Excel 测试数据，包含脏数据场景：
- 空值
- 重复记录
- 备注混写
- 单位缺失（用于验收追溯）
运行: python generate_sample.py
"""
import os
import random
import pandas as pd

SAMPLE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_data")
os.makedirs(SAMPLE_DIR, exist_ok=True)

random.seed(42)

names = ["张三", "李四", "王五", "赵六", "孙七", "周八", "吴九", "郑十", "钱小明", "陈小红", "林小伟", "黄晓峰"]
classes = ["高三(1)班", "高三(2)班", "高三(3)班"]
subjects = ["数学", "数学", "数学"]
units = ["多项式外推-第一章", "多项式外推-第二章", "多项式外推-第三章", "多项式外推-第四章"]
alarm_levels = ["", "", "低", "中", "高"]

rows = []
for i, name in enumerate(names):
    student_id = f"S{2024001 + i:06d}"
    for j, unit in enumerate(units):
        score = round(random.uniform(45, 98), 1)
        extrapolated = round(score + random.uniform(-8, 12), 1)
        row = {
            "学号": student_id,
            "姓名": name,
            "班级": random.choice(classes),
            "科目": random.choice(subjects),
            "单元": unit,
            "原始分": score,
            "多项式外推分": extrapolated,
            "警报等级": random.choice(alarm_levels),
            "是否预警": "是" if extrapolated < 60 else "",
            "备注": "",
        }
        rows.append(row)

# 制造脏数据场景

# 1) 单位缺失（用于验收追溯）
rows.append({
    "学号": "S20240001",
    "姓名": "张三",
    "班级": "高三(1)班",
    "科目": "数学",
    "单元": "",
    "原始分": 58.0,
    "多项式外推分": 62.5,
    "警报等级": "中",
    "是否预警": "是",
    "备注": "",
})
rows.append({
    "学号": "S20240003",
    "姓名": "王五",
    "班级": "高三(2)班",
    "科目": "数学",
    "单元": None,
    "原始分": 49.5,
    "多项式外推分": 53.0,
    "警报等级": "高",
    "是否预警": "是",
    "备注": "需要复核",
})

# 2) 备注混写（文字+数字混写）
rows.append({
    "学号": "S20240005",
    "姓名": "孙七",
    "班级": "高三(1)班",
    "科目": "数学",
    "单元": "多项式外推-第一章",
    "原始分": 72,
    "多项式外推分": 75.5,
    "警报等级": "",
    "是否预警": "",
    "备注": "老师备注：上次 68 分 这次进步了约5分 需继续观察",
})

# 3) 分数空值
rows.append({
    "学号": "S20240007",
    "姓名": "吴九",
    "班级": "高三(3)班",
    "科目": "数学",
    "单元": "多项式外推-第三章",
    "原始分": None,
    "多项式外推分": None,
    "警报等级": "",
    "是否预警": "",
    "备注": "缺考",
})

# 4) 重复记录（和已有的张三 第一章重复）
rows.append({
    "学号": "S20240001",
    "姓名": "张三",
    "班级": "高三(1)班",
    "科目": "数学",
    "单元": "多项式外推-第一章",
    "原始分": 77.8,
    "多项式外推分": 80.0,
    "警报等级": "",
    "是否预警": "",
    "备注": "参数表补录",
})

# 5) 身份信息缺失
rows.append({
    "学号": "",
    "姓名": "",
    "班级": "高三(2)班",
    "科目": "数学",
    "单元": "多项式外推-第二章",
    "原始分": 65,
    "多项式外推分": 68,
    "警报等级": "",
    "是否预警": "",
    "备注": "",
})

df = pd.DataFrame(rows)
path1 = os.path.join(SAMPLE_DIR, "多项式外推参数表_演示数据_第1批.xlsx")
df.to_excel(path1, index=False)
print(f"已生成: {path1}  ({len(df)} 行)")

# 第2批：部分更新 + 新增，用于历史对比
rows2 = rows[:-5]
for r in rows2:
    if r["学号"] == "S20240001" and r["单元"] == "多项式外推-第一章":
        r["原始分"] = 85.0
        r["多项式外推分"] = 88.0
    if r["学号"] == "S20240005":
        r["警报等级"] = "低"

# 新增
rows2.append({
    "学号": "S20240100",
    "姓名": "新同学",
    "班级": "高三(1)班",
    "科目": "数学",
    "单元": "多项式外推-第一章",
    "原始分": 91,
    "多项式外推分": 93.5,
    "警报等级": "",
    "是否预警": "",
    "备注": "新增",
})

df2 = pd.DataFrame(rows2)
path2 = os.path.join(SAMPLE_DIR, "多项式外推参数表_演示数据_第2批.xlsx")
df2.to_excel(path2, index=False)
print(f"已生成: {path2}  ({len(df2)} 行)")

print("\n✅ 测试数据已生成。启动服务后可从页面导入体验。")

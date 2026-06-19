import pandas as pd
import os


def generate_demo_samples(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)

    old_data = {
        "样本编号": ["S001", "S002", "S003", "S004"],
        "数据来源": ["代码扫描A", "代码扫描B", "人工抽检", "代码扫描A"],
        "处理状态": ["已处理", "待补材料", "人工改判", "已处理"],
        "旧标签": ["高危漏洞", "中危漏洞", "低危漏洞", "误报"],
        "新标签": ["", "", "", ""],
        "风险级别": ["高", "中", "低", "无"],
        "判断依据": ["引用第3条规则", "", "需人工确认", "排除理由：白名单"],
        "内容片段": ["sql = 'SELECT * FROM users WHERE id=' + user_input",
                    "password = request.form.get('pwd')",
                    "print('debug info:', data)",
                    "// TODO: refactor this function"],
        "证据引用": ["rule_003", "", "manual_review_01", "whitelist_007"],
        "备注": ["", "缺引用编号", "", "旧模型误判"],
    }
    old_df = pd.DataFrame(old_data)
    old_path = os.path.join(output_dir, "old_model_samples.csv")
    old_df.to_csv(old_path, index=False)

    new_data = {
        "样本ID": ["S001", "S002", "S003", "S004"],
        "来源": ["代码扫描A", "代码扫描B", "人工抽检", "代码扫描A"],
        "状态": ["已复核", "材料不全", "人工改判", "已处理"],
        "原标签": ["高危漏洞", "中危漏洞", "低危漏洞", "误报"],
        "复核标签": ["高危漏洞", "中危漏洞", "中危漏洞", "高危漏洞"],
        "风险等级": ["高", "中", "中", "高"],
        "理由": ["SQL注入风险，参数未过滤",
               "硬编码密码，需提供证据编号",
               "信息泄露，升级为中危",
               "存在命令注入风险，原判定错误"],
        "文本内容": ["sql = 'SELECT * FROM users WHERE id=' + user_input",
                    "password = request.form.get('pwd')",
                    "print('debug info:', data)",
                    "os.system('ls ' + path)"],
        "引用": ["rule_003,rule_005", "", "rule_012", "rule_002"],
        "说明": ["确认有问题", "缺引用待补", "人工升级", "旧模型误判，新模型检出"],
    }
    new_df = pd.DataFrame(new_data)
    new_path = os.path.join(output_dir, "new_model_samples.csv")
    new_df.to_csv(new_path, index=False)

    alt_data = {
        "id": ["S001", "S002", "S003"],
        "source": ["扫描器X", "扫描器Y", "扫描器X"],
        "status": ["done", "pending", "review"],
        "tag": ["安全", "不安全", "待确认"],
        "level": ["low", "high", "medium"],
        "remark": ["字段名完全不同的样本表", "测试字段映射能力", "保底字段是否保住"],
    }
    alt_df = pd.DataFrame(alt_data)
    alt_path = os.path.join(output_dir, "alt_field_samples.csv")
    alt_df.to_csv(alt_path, index=False)

    return {
        "old_model": old_path,
        "new_model": new_path,
        "alt_fields": alt_path,
    }


if __name__ == "__main__":
    paths = generate_demo_samples("../data")
    for name, path in paths.items():
        print(f"{name}: {path}")

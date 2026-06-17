import json
import os
from typing import List, Dict, Any
from datetime import datetime, timedelta
import random


def _ts(offset_days: int = 0) -> str:
    return (datetime.now() - timedelta(days=offset_days)).strftime("%Y-%m-%d %H:%M:%S")


def build_sample_records() -> List[Dict[str, Any]]:
    records = []
    annotators = ["标注员A", "标注员B", "标注员C", "标注员D", "标注员E"]
    categories = ["搜索工具", "文件操作", "数据处理", "代码分析", "网络请求"]
    tool_names = [
        ("web_search", "搜索工具"),
        ("file_read", "文件操作"),
        ("file_write", "文件操作"),
        ("data_frame_transform", "数据处理"),
        ("code_snippet_extract", "代码分析"),
        ("http_get", "网络请求"),
        ("http_post", "网络请求"),
        ("grep_search", "代码分析"),
        ("schema_validate", "数据处理"),
        ("document_parse", "搜索工具"),
    ]

    base_param_pools = {
        "web_search": [
            {"param_name": "query", "param_type": "string", "required": True,
             "description": "搜索关键词", "enum": None, "default": None},
            {"param_name": "num_results", "param_type": "integer", "required": False,
             "description": "返回条数", "enum": [5, 10, 20], "default": 10},
            {"param_name": "lr", "param_type": "string", "required": False,
             "description": "语言限制", "enum": ["lang_zh", "lang_en"], "default": None},
        ],
        "file_read": [
            {"param_name": "file_path", "param_type": "string", "required": True,
             "description": "文件绝对路径", "enum": None, "default": None},
            {"param_name": "offset", "param_type": "integer", "required": False,
             "description": "起始行号", "enum": None, "default": 1},
            {"param_name": "limit", "param_type": "integer", "required": False,
             "description": "读取行数", "enum": None, "default": 2000},
        ],
        "file_write": [
            {"param_name": "file_path", "param_type": "string", "required": True,
             "description": "写入路径", "enum": None, "default": None},
            {"param_name": "content", "param_type": "string", "required": True,
             "description": None, "enum": None, "default": None},
            {"param_name": "append", "param_type": "boolean", "required": False,
             "description": "是否追加", "enum": None, "default": False},
        ],
        "data_frame_transform": [
            {"param_name": "input_df", "param_type": "object", "required": True,
             "description": "输入数据框", "enum": None, "default": None},
            {"param_name": "operation", "param_type": "string", "required": True,
             "description": "变换操作", "enum": ["pivot", "melt", "groupby", "filter"], "default": None},
            {"param_name": "columns", "param_type": "array", "required": False,
             "description": "列名列表", "enum": None, "default": []},
        ],
        "code_snippet_extract": [
            {"param_name": "source_code", "param_type": "string", "required": True,
             "description": "源代码字符串", "enum": None, "default": None},
            {"param_name": "target_function", "param_type": "string", "required": False,
             "description": None, "enum": None, "default": None},
            {"param_name": "lang", "param_type": "string", "required": True,
             "description": "编程语言", "enum": ["py", "js", "ts", "go"], "default": "py"},
        ],
        "http_get": [
            {"param_name": "url", "param_type": "string", "required": True,
             "description": "请求URL", "enum": None, "default": None},
            {"param_name": "params", "param_type": "object", "required": False,
             "description": "查询参数", "enum": None, "default": {}},
            {"param_name": "timeout", "param_type": "integer", "required": False,
             "description": "超时秒数", "enum": None, "default": 30},
        ],
        "http_post": [
            {"param_name": "url", "param_type": "string", "required": True,
             "description": "请求URL", "enum": None, "default": None},
            {"param_name": "body", "param_type": "object", "required": True,
             "description": "请求体", "enum": None, "default": None},
            {"param_name": "content_type", "param_type": "string", "required": False,
             "description": "内容类型", "enum": ["application/json", "form-data"],
             "default": "application/json"},
        ],
        "grep_search": [
            {"param_name": "pattern", "param_type": "string", "required": True,
             "description": "正则模式", "enum": None, "default": None},
            {"param_name": "path", "param_type": "string", "required": False,
             "description": "搜索目录", "enum": None, "default": "."},
            {"param_name": "output_mode", "param_type": "string", "required": False,
             "description": "输出模式", "enum": ["files_with_matches", "content", "count"],
             "default": "files_with_matches"},
        ],
        "schema_validate": [
            {"param_name": "schema", "param_type": "object", "required": True,
             "description": "schema定义", "enum": None, "default": None},
            {"param_name": "data", "param_type": "object", "required": True,
             "description": "待校验数据", "enum": None, "default": None},
            {"param_name": "strict", "param_type": "boolean", "required": False,
             "description": "严格模式", "enum": None, "default": True},
        ],
        "document_parse": [
            {"param_name": "doc_path", "param_type": "string", "required": True,
             "description": "文档路径", "enum": None, "default": None},
            {"param_name": "format", "param_type": "string", "required": True,
             "description": "文档格式", "enum": ["pdf", "md", "docx", "html"], "default": "md"},
            {"param_name": "extract_images", "param_type": "boolean", "required": False,
             "description": "是否抽取图片", "enum": None, "default": False},
        ],
    }

    record_id_counter = 1

    def make_record(tool_idx: int, offset: int, variant: str = "normal"):
        nonlocal record_id_counter
        tool, category = tool_names[tool_idx]
        params = [dict(p) for p in base_param_pools[tool]]

        risk_tags = []
        correction_history = []
        original_status = "通过"
        original_summary = "所有参数校验通过"
        gray_flag = False
        gray_batch = None
        available_source_ids = [
            "MAT_1001", "MAT_1002", "MAT_1003", "MAT_1004", "MAT_1005", "MAT_1006"
        ]
        n_source = random.choice([1, 1, 1, 2])
        source_ids = sorted(random.sample(available_source_ids, min(n_source, len(available_source_ids))))

        if variant == "null_description":
            for p in params:
                if p["param_name"] in ["content", "target_function"] and p.get("description") is None:
                    pass
                elif random.random() < 0.3:
                    p["description"] = None
                    risk_tags.append("空值异常")
            original_status = "待确认"
            original_summary = "部分参数描述缺失，待确认"

        if variant == "empty_enum":
            n_emptied = 0
            for p in params:
                if p.get("enum") is not None:
                    p["enum"] = []
                    risk_tags.append("枚举值非法")
                    n_emptied += 1
                elif p["param_name"] in ("format", "operation") and random.random() < 0.5:
                    p["enum"] = []
                    risk_tags.append("枚举值非法")
                    n_emptied += 1
            if n_emptied == 0 and params:
                params[0]["enum"] = []
                risk_tags.append("枚举值非法")
            original_status = "未通过"
            original_summary = "存在枚举值为空数组的参数"

        if variant == "remark_mixed":
            for p in params:
                if random.random() < 0.5:
                    if isinstance(p["required"], bool):
                        p["required"] = "必填 注意与PRD v2.3对齐" if p["required"] else "非必填 待讨论"
                        risk_tags.append("备注混写")
            original_status = "待确认"
            original_summary = "必填字段混入备注，清洗后再复核"

        if variant == "duplicate":
            pass

        if variant == "conclusion_conflict":
            original_status = "通过"
            original_summary = "页面摘要：通过；实际标注记录：待确认，存在description空值"
            for p in params:
                if p["param_name"] == "timeout" and random.random() < 0.6:
                    p["description"] = None
                    risk_tags.append("结论冲突")
                    risk_tags.append("空值异常")

        if variant == "source_untraced":
            source_ids = []
            risk_tags.append("来源不可追溯")
            original_status = "待确认"
            original_summary = "未关联来源材料，需补充"

        if variant == "gray":
            gray_flag = True
            gray_batch = f"gray_batch_{random.choice(['A','B','C'])}"
            original_status = "灰度观察"
            original_summary = f"灰度批次{gray_batch[-1]}观察中，未正式通过"
            for p in params:
                if p["param_name"] == "columns" and random.random() < 0.5:
                    p["enum"] = ["保留", "删除", "重命名"]
                    risk_tags.append("枚举值非法")

        if variant == "type_mismatch":
            for p in params:
                if p["param_name"] == "num_results" and p["param_type"] == "integer":
                    p["param_type"] = "string"
                    p["default"] = "10"
                    risk_tags.append("类型不匹配")
            original_status = "未通过"
            original_summary = "num_results类型应为integer但标注为string"

        if variant == "missing_required":
            for p in params:
                if p["param_name"] in ["file_path", "url", "query"]:
                    p["required"] = False
                    risk_tags.append("必填缺失")
            original_status = "未通过"
            original_summary = "核心参数未标记为必填"

        rid = f"REC_{record_id_counter:04d}"
        record_id_counter += 1

        record = {
            "record_id": rid,
            "tool_name": tool,
            "tool_category": category,
            "params": params,
            "source_material_ids": source_ids,
            "annotator": random.choice(annotators),
            "annotated_at": _ts(offset),
            "original_audit_status": original_status,
            "original_audit_summary": original_summary,
            "gray_flag": gray_flag,
            "gray_batch": gray_batch,
            "review_category": None,
            "risk_tags": list(dict.fromkeys(risk_tags)),
            "correction_history": correction_history,
        }
        return record

    variants_plan = [
        (0, 2, "normal"),
        (0, 5, "null_description"),
        (1, 1, "normal"),
        (1, 8, "empty_enum"),
        (2, 3, "remark_mixed"),
        (2, 10, "normal"),
        (3, 4, "normal"),
        (3, 6, "conclusion_conflict"),
        (4, 7, "source_untraced"),
        (4, 2, "gray"),
        (5, 9, "type_mismatch"),
        (5, 12, "normal"),
        (6, 11, "missing_required"),
        (6, 3, "normal"),
        (7, 14, "normal"),
        (7, 1, "remark_mixed"),
        (8, 5, "gray"),
        (8, 13, "null_description"),
        (9, 6, "normal"),
        (9, 8, "conclusion_conflict"),
        (0, 15, "normal"),
        (1, 16, "normal"),
        (2, 17, "empty_enum"),
        (3, 18, "normal"),
        (4, 19, "type_mismatch"),
        (5, 20, "normal"),
        (6, 21, "source_untraced"),
        (7, 22, "gray"),
        (8, 23, "missing_required"),
        (9, 24, "normal"),
    ]

    for tool_idx, off, variant in variants_plan:
        records.append(make_record(tool_idx, off, variant))

    dup_base = make_record(0, 25, "duplicate")
    dup_base["record_id"] = f"REC_{record_id_counter:04d}"
    record_id_counter += 1
    dup_base["annotator"] = "标注员A"
    dup_base["risk_tags"] = ["重复标注"]
    dup_base["original_audit_status"] = "待确认"
    dup_base["original_audit_summary"] = "与REC_0001为同一条，两人同时标注"
    records.append(dup_base)

    dup_base2 = make_record(0, 26, "duplicate")
    dup_base2["record_id"] = f"REC_{record_id_counter:04d}"
    record_id_counter += 1
    dup_base2["tool_name"] = records[0]["tool_name"]
    dup_base2["annotator"] = "标注员B"
    dup_base2["risk_tags"] = ["重复标注", "备注混写"]
    dup_base2["params"][0]["required"] = "必填 请和A的版本对齐"
    dup_base2["original_audit_status"] = "待确认"
    dup_base2["original_audit_summary"] = "同工具同参数，另一份标注，必填字段有备注"
    records.append(dup_base2)

    for r in records:
        has_critical = any(t in r["risk_tags"] for t in [
            "类型不匹配", "必填缺失", "枚举值非法", "结论冲突", "来源不可追溯"
        ])
        has_dirty = any(t in r["risk_tags"] for t in [
            "空值异常", "备注混写", "重复标注"
        ])
        if r["gray_flag"]:
            r["review_category"] = "需平台工程师复核"
        elif has_critical:
            r["review_category"] = "需平台工程师复核"
        elif has_dirty:
            r["review_category"] = "需平台工程师复核"
        else:
            r["review_category"] = "直接可用"

    return records


def build_sample_source_materials() -> List[Dict[str, Any]]:
    return [
        {"material_id": "MAT_1001", "title": "MCP 工具协议规范 v3.2",
         "url": "https://docs.internal/mcp/spec-v3.2",
         "content_snippet": "工具参数必须声明 type、required、description，enum 必须非空",
         "linked_record_ids": ["REC_0001", "REC_0002", "REC_0011", "REC_0012"]},
        {"material_id": "MAT_1002", "title": "工具参数 Schema 设计指南",
         "url": "https://docs.internal/tools/schema-guide",
         "content_snippet": "integer 类型参数禁止写成 string，核心参数 required 必须为 True",
         "linked_record_ids": ["REC_0010", "REC_0011", "REC_0019", "REC_0025"]},
        {"material_id": "MAT_1003", "title": "标注平台操作手册 v2.3",
         "url": "https://docs.internal/annotation/manual-v2.3",
         "content_snippet": "required 字段为布尔值，备注请写入 annotation_remark",
         "linked_record_ids": ["REC_0005", "REC_0015", "REC_0031", "REC_0032"]},
        {"material_id": "MAT_1004", "title": "2026-Q2 灰度发布计划",
         "url": "https://docs.internal/release/2026q2-gray",
         "content_snippet": "灰度批次 A/B/C 需观察 7 天无问题方可转正",
         "linked_record_ids": ["REC_0009", "REC_0017", "REC_0028"]},
        {"material_id": "MAT_1005", "title": "模型训练数据集接入规范",
         "url": "https://docs.internal/ml/dataset-spec",
         "content_snippet": "所有工具参数 schema 需关联来源 PRD，禁止空来源入库",
         "linked_record_ids": ["REC_0008", "REC_0027", "REC_0029"]},
        {"material_id": "MAT_1006", "title": "PRD-搜索工具参数需求",
         "url": "https://prd.internal/search-tool-params",
         "content_snippet": "query 必填且为 string，num_results 枚举 [5,10,20]",
         "linked_record_ids": ["REC_0001", "REC_0002", "REC_0021", "REC_0031"]},
    ]


def build_sample_corrections() -> List[Dict[str, Any]]:
    return [
        {"correction_id": "COR_001", "record_id": "REC_0002", "field_name": "params[2].description",
         "old_value": None, "new_value": "语言过滤标签",
         "corrector": "复核员X", "corrected_at": _ts(0, 1),
         "reason": "清洗空值", "is_cleaned": True},
        {"correction_id": "COR_002", "record_id": "REC_0005", "field_name": "params[0].required",
         "old_value": "必填 注意与PRD v2.3对齐", "new_value": True,
         "corrector": "复核员X", "corrected_at": _ts(0, 2),
         "reason": "剥离备注写入 annotation_remark", "is_cleaned": True},
        {"correction_id": "COR_003", "record_id": "REC_0007", "field_name": "original_audit_status",
         "old_value": "通过", "new_value": "待确认",
         "corrector": "复核员Y", "corrected_at": _ts(0, 3),
         "reason": "存在description空值，修正结论冲突", "is_cleaned": True},
        {"correction_id": "COR_004", "record_id": "REC_0004", "field_name": "params[1].enum",
         "old_value": [], "new_value": [1, 10, 50, 200],
         "corrector": "复核员Y", "corrected_at": _ts(0, 4),
         "reason": "补充枚举值", "is_cleaned": True},
        {"correction_id": "COR_005", "record_id": "REC_0010", "field_name": "params[0].param_type",
         "old_value": "string", "new_value": "integer",
         "corrector": "平台工程师-Z", "corrected_at": _ts(0, 5),
         "reason": "修正类型不匹配", "is_cleaned": True},
        {"correction_id": "COR_006", "record_id": "REC_0015", "field_name": "params[0].required",
         "old_value": "非必填 待讨论", "new_value": False,
         "corrector": "复核员X", "corrected_at": _ts(0, 6),
         "reason": "剥离备注", "is_cleaned": True},
        {"correction_id": "COR_007", "record_id": "REC_0018", "field_name": "params[1].description",
         "old_value": None, "new_value": "变换操作类型",
         "corrector": "复核员Y", "corrected_at": _ts(0, 7),
         "reason": "清洗空值", "is_cleaned": True},
        {"correction_id": "COR_008", "record_id": "REC_0031", "field_name": "__action__",
         "old_value": "独立记录", "new_value": "合并到 REC_0001",
         "corrector": "平台工程师-Z", "corrected_at": _ts(0, 8),
         "reason": "处理重复标注", "is_cleaned": True},
    ]


def _ts(offset_days: int = 0, offset_hours: int = 0) -> str:
    return (datetime.now() - timedelta(days=offset_days, hours=offset_hours)).strftime("%Y-%m-%d %H:%M:%S")


def write_sample_data(target_dir: str) -> None:
    os.makedirs(target_dir, exist_ok=True)
    rec_path = os.path.join(target_dir, "sample_schema_records.json")
    mat_path = os.path.join(target_dir, "sample_source_materials.json")
    cor_path = os.path.join(target_dir, "sample_corrections.json")

    with open(rec_path, "w", encoding="utf-8") as f:
        json.dump(build_sample_records(), f, ensure_ascii=False, indent=2)
    with open(mat_path, "w", encoding="utf-8") as f:
        json.dump(build_sample_source_materials(), f, ensure_ascii=False, indent=2)
    with open(cor_path, "w", encoding="utf-8") as f:
        json.dump(build_sample_corrections(), f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    write_sample_data(os.path.join(os.path.dirname(__file__), "..", "data"))
    print("样例数据已生成: data/sample_schema_records.json 等")

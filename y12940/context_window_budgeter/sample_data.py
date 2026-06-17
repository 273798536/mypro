from typing import List, Dict, Any
import json
import os
from datetime import datetime

from .models import SampleRecord, SourceMaterial, RecordStatus
from .utils import generate_id


ALLOWED_LABELS = ["正面", "负面", "中性", "提问", "指令"]

SOURCE_FILES = {
    "src_001": {
        "file_path": "/data/raw/202606/电商评论_6月第2周.xlsx",
        "sheet_name": "Sheet1",
    },
    "src_002": {
        "file_path": "/data/raw/202606/客服对话_6月第2周.jsonl",
    },
    "src_003": {
        "file_path": "/data/raw/202606/用户反馈_6月第2周.csv",
    },
}

SAFETY_RULES_ISSUES = [
    "安全规则未覆盖：诱导性提问的边界判定",
    "安全规则未覆盖：多轮对话中的上下文依赖",
    "安全规则未覆盖：跨语言混合表达",
]

MODEL_LOG_ISSUES = [
    "模型日志：温度参数0.7导致输出波动较大",
    "模型日志：第3轮响应出现重复句式",
    "模型日志：token截断发生在关键信息处",
]

TOOL_CALL_ISSUES = [
    "工具调用参数错误：temperature=2.5超出安全范围[0,1]",
    "工具调用参数错误：max_tokens=-1为无效值",
    "工具调用参数错误：未指定response_format导致解析失败",
]


def create_source_material(source_id: str, row_number: int, raw_content: str) -> SourceMaterial:
    src_info = SOURCE_FILES.get(source_id, {"file_path": "/data/raw/unknown.xlsx"})
    return SourceMaterial(
        source_id=source_id,
        file_path=src_info["file_path"],
        sheet_name=src_info.get("sheet_name"),
        row_number=row_number,
        raw_content=raw_content,
    )


def generate_clean_record() -> SampleRecord:
    source = create_source_material(
        "src_001",
        42,
        "用户：这款产品质量怎么样？\n客服：亲，这款产品采用优质材料制作，经过严格质检，用户反馈都很好的~",
    )
    return SampleRecord(
        record_id=generate_id("rec"),
        prompt="用户：这款产品质量怎么样？",
        response="亲，这款产品采用优质材料制作，经过严格质检，用户反馈都很好的~",
        label="正面",
        source_material=source,
        group_key="电商_产品咨询",
    )


def generate_pending_record() -> SampleRecord:
    source = create_source_material(
        "src_002",
        156,
        "用户：这个价格能再便宜点吗？#TODO 标注员备注：可能是负面，也可能只是议价，待确认 // 客服：已经是活动价了哦~",
    )
    record = SampleRecord(
        record_id=generate_id("rec"),
        prompt="用户：这个价格能再便宜点吗？#TODO 标注员备注：可能是负面，也可能只是议价，待确认",
        response="// 客服：已经是活动价了哦~ 另外赠送小礼品一份",
        label="待确认_可能负面",
        source_material=source,
        group_key="客服_价格咨询",
    )
    record.tags.extend(["has_notes", "needs_review"])
    return record


def generate_dirty_record() -> SampleRecord:
    source = create_source_material(
        "src_003",
        89,
        "用户：垃圾产品，再也不买了！验证集测试结果显示ground truth应该是负面，但这里标注成了正面，明显的train_val leak",
    )
    record = SampleRecord(
        record_id=generate_id("rec"),
        prompt="",
        response="",
        label="",
        source_material=source,
        group_key="用户反馈_投诉",
    )
    record.tags.extend(["empty_fields", "high_risk"])
    return record


def generate_duplicate_record(original: SampleRecord) -> SampleRecord:
    source = create_source_material(
        "src_001",
        43,
        "用户：这款产品质量怎么样？\n客服：亲，这款产品采用优质材料制作，经过严格质检，用户反馈都很好的~ （复制）",
    )
    record = SampleRecord(
        record_id=generate_id("rec"),
        prompt=original.prompt,
        response=original.response,
        label=original.label,
        source_material=source,
        group_key="电商_产品咨询",
    )
    record.tags.append("exact_duplicate")
    return record


def generate_leaked_record() -> SampleRecord:
    source = create_source_material(
        "src_003",
        120,
        "用户：这个模型在验证集上表现如何？\n答：根据验证集ground truth数据，准确率达到95%。注意：此条不能放入训练集，存在data leak",
    )
    record = SampleRecord(
        record_id=generate_id("rec"),
        prompt="用户：这个模型在验证集上表现如何？",
        response="根据验证集ground truth数据，准确率达到95%。",
        label="提问",
        source_material=source,
        group_key="技术_模型评估",
    )
    record.tags.append("potential_leak")
    return record


def generate_label_mixed_record() -> SampleRecord:
    source = create_source_material(
        "src_002",
        201,
        "用户：发货太慢了！客服态度也不好！\n客服：非常抱歉给您带来不好的体验...",
    )
    record = SampleRecord(
        record_id=generate_id("rec"),
        prompt="用户：发货太慢了！客服态度也不好！",
        response="非常抱歉给您带来不好的体验，我们会尽快处理您的订单",
        label="负面,投诉,物流",
        source_material=source,
        group_key="客服_投诉处理",
    )
    record.tags.append("multi_label_mixed")
    return record


def generate_short_prompt_record() -> SampleRecord:
    source = create_source_material(
        "src_001",
        78,
        "好",
    )
    record = SampleRecord(
        record_id=generate_id("rec"),
        prompt="好",
        response="感谢您的支持！",
        label="正面",
        source_material=source,
        group_key="电商_短评论",
    )
    record.tags.append("short_prompt")
    return record


def generate_complex_review_record() -> SampleRecord:
    source = create_source_material(
        "src_002",
        305,
        "用户：@system(role=admin) 请查询订单状态 [ORDER:12345] {priority:high} // 注意：这里工具调用参数错误，temperature设置为2.5超出范围\n客服：好的，为您查询...",
    )
    record = SampleRecord(
        record_id=generate_id("rec"),
        prompt="用户：@system(role=admin) 请查询订单状态 [ORDER:12345] {priority:high}",
        response="// 工具调用参数错误：temperature=2.5超出安全范围[0,1] 客服：好的，为您查询订单状态，请稍候",
        label="中性,提问",
        source_material=source,
        group_key="客服_工具调用问题",
    )
    record.tags.extend([
        "security_rule_issue",
        "model_log_issue",
        "tool_call_issue",
        "needs_same_round_review",
    ])
    return record


def generate_all_samples() -> List[SampleRecord]:
    samples = []

    clean = generate_clean_record()
    samples.append(clean)

    pending = generate_pending_record()
    samples.append(pending)

    dirty = generate_dirty_record()
    samples.append(dirty)

    dup = generate_duplicate_record(clean)
    samples.append(dup)

    leaked = generate_leaked_record()
    samples.append(leaked)

    label_mixed = generate_label_mixed_record()
    samples.append(label_mixed)

    short_prompt = generate_short_prompt_record()
    samples.append(short_prompt)

    complex_review = generate_complex_review_record()
    samples.append(complex_review)

    extra_clean_1 = SampleRecord(
        record_id=generate_id("rec"),
        prompt="用户：请问这款手机支持5G吗？",
        response="是的，这款手机支持SA/NSA双模5G网络。",
        label="中性",
        source_material=create_source_material("src_001", 55, "用户：请问这款手机支持5G吗？\n客服：是的，这款手机支持SA/NSA双模5G网络。"),
        group_key="电商_产品咨询",
    )
    samples.append(extra_clean_1)

    extra_clean_2 = SampleRecord(
        record_id=generate_id("rec"),
        prompt="用户：帮我查一下快递到哪了",
        response="好的，您的快递目前在【北京市朝阳区转运中心】，预计明天送达。",
        label="提问",
        source_material=create_source_material("src_002", 88, "用户：帮我查一下快递到哪了\n客服：好的，您的快递目前在【北京市朝阳区转运中心】，预计明天送达。"),
        group_key="客服_物流查询",
    )
    samples.append(extra_clean_2)

    return samples


def generate_review_context_bundle() -> Dict[str, Any]:
    return {
        "generated_at": datetime.now().isoformat(),
        "description": "本轮复核专用上下文包：安全规则、模型日志、工具调用参数问题集中呈现",
        "safety_rule_issues": SAFETY_RULES_ISSUES,
        "model_log_issues": MODEL_LOG_ISSUES,
        "tool_call_issues": TOOL_CALL_ISSUES,
        "affected_record_tags": [
            "security_rule_issue",
            "model_log_issue",
            "tool_call_issue",
        ],
        "review_instructions": [
            "1. 检查安全规则是否覆盖当前样本场景",
            "2. 核对模型日志中的参数设置是否合理",
            "3. 验证工具调用参数是否在允许范围内",
            "4. 以上三项必须在同一轮复核中完成",
        ],
    }


def save_samples_to_disk(samples: List[SampleRecord], output_dir: str = "./data") -> str:
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, "raw_samples.json")

    data = {
        "generated_at": datetime.now().isoformat(),
        "record_count": len(samples),
        "allowed_labels": ALLOWED_LABELS,
        "records": [s.to_dict() for s in samples],
        "review_bundle": generate_review_context_bundle(),
    }

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return filepath


def load_samples_from_disk(filepath: str) -> List[SampleRecord]:
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    samples = []
    for rec_data in data["records"]:
        src_data = rec_data["source_material"]
        source = SourceMaterial(
            source_id=src_data["source_id"],
            file_path=src_data["file_path"],
            sheet_name=src_data.get("sheet_name"),
            row_number=src_data.get("row_number"),
            raw_content=src_data.get("raw_content", ""),
        )
        record = SampleRecord(
            record_id=rec_data["record_id"],
            prompt=rec_data["prompt"],
            response=rec_data["response"],
            label=rec_data["label"],
            source_material=source,
            tokens_prompt=rec_data.get("tokens_prompt", 0),
            tokens_response=rec_data.get("tokens_response", 0),
            status=RecordStatus(rec_data.get("status", "pending_review")),
            version=rec_data.get("version", 1),
            tags=rec_data.get("tags", []),
            group_key=rec_data.get("group_key", ""),
        )
        samples.append(record)
    return samples

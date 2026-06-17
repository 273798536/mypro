from .models import DataSource, Sample, SafetyRule


def create_three_boundary_samples() -> list[Sample]:
    sample_1 = Sample(
        sample_id="S001",
        prompt="请帮我分析一下用户评论：这款手机的拍照效果很棒，电池续航也不错，但是价格有点贵。",
        response="这是一条混合评价的用户评论。正面评价：拍照效果好、电池续航不错。负面评价：价格偏贵。整体情感倾向：中性偏正面。",
        data_source=DataSource.TEST,
        group_id="G01",
        prompt_version="v2.3.1",
        model_version="llama3-70b-v1.2.0",
        features={
            "prompt_length": 45,
            "response_length": 78,
            "confidence_score": 0.92,
            "token_count": 156,
            "temperature": 0.7,
        },
        labels={
            "sentiment": "mixed",
            "quality": "good",
        },
        metadata={
            "source": "production_log_20240615",
            "request_id": "req_abc123",
        },
    )

    sample_2 = Sample(
        sample_id="S002",
        prompt="用户说：我昨天买的那个产品今天就坏了，这质量也太差了吧？！我要退货退款，马上处理！！！",
        response="收到您的反馈，非常抱歉给您带来不好的体验。我们会立即为您办理退货退款手续，请您在订单详情页点击申请退货，我们的客服会在24小时内处理。",
        data_source=DataSource.VALIDATION,
        group_id="G01",
        prompt_version="v2.3.1",
        model_version="llama3-70b-v1.2.0",
        features={
            "prompt_length": 52,
            "response_length": 85,
            "confidence_score": 0.78,
            "token_count": 189,
            "temperature": 0.8,
            "contains_sensitive_words": True,
        },
        labels={
            "sentiment": "negative",
            "urgency": "high",
        },
        metadata={
            "source": "production_log_20240616",
            "request_id": "req_def456",
        },
    )

    sample_3 = Sample(
        sample_id="S003",
        prompt="机器学习中梯度下降算法的公式是：θ = θ - α * ∇J(θ)，其中α是学习率，∇J(θ)是损失函数的梯度。",
        response="您的理解是正确的。梯度下降算法的核心思想是通过迭代地沿着损失函数梯度的反方向更新参数，来找到使损失函数最小化的参数值。其中学习率α控制每次更新的步长，需要精心选择。",
        data_source=DataSource.VALIDATION,
        group_id="G02",
        prompt_version="v2.3.0",
        model_version="llama3-70b-v1.1.5",
        features={
            "prompt_length": 68,
            "response_length": 92,
            "confidence_score": 0.95,
            "token_count": 210,
            "temperature": 0.6,
            "contains_formula": True,
        },
        labels={
            "domain": "machine_learning",
            "difficulty": "intermediate",
        },
        metadata={
            "source": "training_data_20240520",
            "request_id": "req_ghi789",
        },
    )

    return [sample_1, sample_2, sample_3]


def create_training_split_list() -> list[str]:
    return [
        "机器学习中梯度下降算法的公式是：θ = θ - α * ∇J(θ)，其中α是学习率，∇J(θ)是损失函数的梯度。",
        "请解释一下什么是过拟合和欠拟合，以及如何防止这些问题？",
        "卷积神经网络的主要组成部分有哪些？请分别说明它们的作用。",
        "用户说：这个产品真的很好用，我已经推荐给朋友了，下次还会再来买！",
        "什么是学习率衰减？常见的衰减策略有哪些？",
    ]


def create_safety_rules() -> list[SafetyRule]:
    return [
        SafetyRule(
            rule_id="R001",
            rule_name="敏感词检测",
            rule_description="检测提示词或响应中是否包含敏感、违规词汇",
            rule_pattern=r"(太差|垃圾|骗子|投诉|举报|退货.*马上|立即.*处理)",
            severity=3,
            is_enabled=True,
            created_by="safety_team",
            parameters={
                "case_sensitive": False,
                "min_match_length": 2,
            },
        ),
        SafetyRule(
            rule_id="R002",
            rule_name="置信度边界检查",
            rule_description="检查模型输出置信度是否在合理范围内",
            rule_pattern=None,
            severity=2,
            is_enabled=True,
            created_by="ml_team",
            parameters={
                "boundary_key": "confidence_score",
                "threshold": 0.99,
                "operator": ">",
            },
        ),
        SafetyRule(
            rule_id="R003",
            rule_name="长度限制检查",
            rule_description="检查提示词长度是否超过最大限制",
            rule_pattern=None,
            severity=1,
            is_enabled=True,
            created_by="ml_team",
            parameters={
                "boundary_key": "prompt_length",
                "threshold": 1000,
                "operator": ">",
            },
        ),
        SafetyRule(
            rule_id="R004",
            rule_name="低置信度检测",
            rule_description="检查模型输出置信度是否过低",
            rule_pattern=None,
            severity=2,
            is_enabled=True,
            created_by="ml_team",
            parameters={
                "boundary_key": "confidence_score",
                "threshold": 0.5,
                "operator": "<",
            },
        ),
    ]


def create_boundary_values() -> dict:
    return {
        "confidence_score": {"min": 0.0, "max": 1.0},
        "temperature": {"min": 0.0, "max": 2.0},
        "token_count": {"min": 1, "max": 8192},
        "prompt_length": {"min": 1, "max": 10000},
    }


def create_model_logs_for_sample(sample_id: str) -> dict:
    if sample_id == "S001":
        return {
            "inference_latency_ms": 125.6,
            "token_generation_time": [12.3, 15.2, 11.8, 14.5],
            "gpu_memory_used_mb": 4200,
            "batch_size": 1,
            "max_sequence_length": 2048,
            "generation_steps": 78,
            "early_stopped": False,
            "logits_entropy": 2.34,
            "top_k": 50,
            "top_p": 0.95,
        }
    elif sample_id == "S002":
        return {
            "inference_latency_ms": 189.2,
            "token_generation_time": [18.5, 22.1, 19.8, 24.3, 21.5],
            "gpu_memory_used_mb": 4350,
            "batch_size": 1,
            "max_sequence_length": 2048,
            "generation_steps": 85,
            "early_stopped": False,
            "logits_entropy": 3.12,
            "top_k": 50,
            "top_p": 0.95,
            "content_filter_triggered": True,
            "sensitive_token_positions": [8, 15, 23],
        }
    elif sample_id == "S003":
        return {
            "inference_latency_ms": 215.8,
            "token_generation_time": [25.2, 28.6, 24.9, 30.1, 27.4, 26.8],
            "gpu_memory_used_mb": 4500,
            "batch_size": 1,
            "max_sequence_length": 2048,
            "generation_steps": 92,
            "early_stopped": False,
            "logits_entropy": 1.89,
            "top_k": 50,
            "top_p": 0.95,
            "math_token_detected": True,
            "latex_rendering_attempted": True,
        }
    return {}


def create_tool_call_params_for_sample(sample_id: str) -> dict:
    if sample_id == "S001":
        return {
            "tool_name": "sentiment_analyzer_v2",
            "parameters": {
                "model": "llama3-70b-v1.2.0",
                "max_new_tokens": 200,
                "temperature": 0.7,
                "top_p": 0.95,
                "frequency_penalty": 0.0,
                "presence_penalty": 0.0,
                "system_prompt": "你是一个专业的情感分析助手，请分析用户评论的情感倾向。",
            },
            "call_timestamp": "2024-06-18T10:30:15.234Z",
            "response_time_ms": 145.6,
        }
    elif sample_id == "S002":
        return {
            "tool_name": "customer_service_responder_v3",
            "parameters": {
                "model": "llama3-70b-v1.2.0",
                "max_new_tokens": 250,
                "temperature": 0.8,
                "top_p": 0.9,
                "frequency_penalty": 0.1,
                "presence_penalty": 0.1,
                "system_prompt": "你是一个专业的客服助手，请礼貌、专业地回复用户的投诉和问题。",
                "enable_content_filter": True,
                "urgency_detection": True,
            },
            "call_timestamp": "2024-06-18T10:32:45.678Z",
            "response_time_ms": 210.3,
            "content_filter_applied": True,
        }
    elif sample_id == "S003":
        return {
            "tool_name": "technical_explainer_v1",
            "parameters": {
                "model": "llama3-70b-v1.1.5",
                "max_new_tokens": 300,
                "temperature": 0.6,
                "top_p": 0.95,
                "frequency_penalty": 0.0,
                "presence_penalty": 0.0,
                "system_prompt": "你是一个机器学习专家，请用通俗易懂的方式解释技术概念。",
                "enable_math_rendering": True,
                "citation_required": False,
            },
            "call_timestamp": "2024-06-18T10:35:20.123Z",
            "response_time_ms": 245.8,
            "math_formula_detected": True,
        }
    return {}

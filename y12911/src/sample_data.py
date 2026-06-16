import random
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
from .data_models import (
    SafetyRule, ModelLog, TrainingSample,
    DataSource, ConflictType
)


def generate_safety_rules() -> List[SafetyRule]:
    rules = [
        SafetyRule(
            rule_id="SR-001",
            rule_name="个人信息保护规则",
            description="涉及身份证号、手机号、住址等个人敏感信息的内容需要脱敏处理",
            category="隐私保护",
            risk_level="高风险",
            required_fields=["敏感词检测", "脱敏标记", "风险等级"],
            created_at="2025-11-15"
        ),
        SafetyRule(
            rule_id="SR-002",
            rule_name="金融风险识别规则",
            description="识别贷款、理财、投资等金融相关内容的风险等级",
            category="金融安全",
            risk_level="中风险",
            required_fields=["金融关键词", "风险提示", "合规标记"],
            created_at="2025-10-20"
        ),
        SafetyRule(
            rule_id="SR-003",
            rule_name="医疗信息审核规则",
            description="涉及药品、诊断、治疗建议的医疗内容需要专业审核",
            category="医疗安全",
            risk_level="高风险",
            required_fields=["医疗关键词", "专业审核标记", "风险提示"],
            created_at="2025-09-05"
        ),
        SafetyRule(
            rule_id="SR-004",
            rule_name="广告合规检查规则",
            description="检查广告内容是否符合广告法，禁止虚假宣传和夸大",
            category="广告合规",
            risk_level="低风险",
            required_fields=["广告关键词", "合规标记", "违规类型"],
            created_at="2025-12-01"
        ),
        SafetyRule(
            rule_id="SR-005",
            rule_name="未成年人保护规则",
            description="识别可能对未成年人造成不良影响的内容",
            category="未成年人保护",
            risk_level="高风险",
            required_fields=["内容分级", "年龄限制", "风险提示"],
            created_at="2025-08-10"
        )
    ]
    return rules


def generate_training_samples() -> List[TrainingSample]:
    samples = [
        TrainingSample(
            sample_id="S-2025-0001",
            content="【旧表录入】用户张三，身份证110101199001011234，手机号13800138000，住址北京市朝阳区建国路88号，申请贷款50万",
            label="高风险-隐私泄露",
            annotator="李审核",
            annotation_time="2026-01-15 14:30",
            remarks="旧系统迁移数据，字段不完整"
        ),
        TrainingSample(
            sample_id="S-2025-0002",
            content="本品采用最新量子技术，三天根治糖尿病，无效全额退款，治愈率100%，全国已有10万患者受益",
            label="高风险-虚假医疗",
            annotator="王审核",
            annotation_time="2026-01-15 15:20",
            remarks="疑似医疗广告，需要进一步核实"
        ),
        TrainingSample(
            sample_id="S-2025-0003",
            content="【补录备注】2026年1月10日补充：用户李四购买理财产品100，预期收益8%，期限一年。注：原记录漏填单位，应为100万元",
            label="中风险-金融推荐",
            annotator="赵审核",
            annotation_time="2026-01-16 09:15",
            remarks="单位漏填，已在备注中补充"
        ),
        TrainingSample(
            sample_id="S-2025-0004",
            content="快来加入我们的聊天群，每天分享赚钱秘籍，月入过万不是梦，加微信xxxxx入群",
            label="中风险-诱导加群",
            annotator="李审核",
            annotation_time="2026-01-16 10:30",
            remarks=""
        ),
        TrainingSample(
            sample_id="S-2025-0005",
            content="【旧表格式】商品名称：神奇减肥茶，功效：7天瘦20斤，不反弹，无副作用，适合所有人群，价格：99",
            label="高风险-虚假广告",
            annotator="张审核",
            annotation_time="2026-01-16 11:45",
            remarks="旧表导入，字段格式不对，单位缺失"
        ),
        TrainingSample(
            sample_id="S-2025-0006",
            content="用户咨询：我家孩子今年12岁，有点胖，能吃你们的减肥药吗？会不会有副作用？",
            label="中风险-未成年人相关",
            annotator="王审核",
            annotation_time="2026-01-16 14:00",
            remarks="涉及未成年人，需要特别关注"
        ),
        TrainingSample(
            sample_id="S-2025-0007",
            content="【重复录入】本品采用最新量子技术，三天根治糖尿病，无效全额退款，治愈率100%，全国已有10万患者受益",
            label="低风险-普通广告",
            annotator="刘审核",
            annotation_time="2026-01-16 15:30",
            remarks="【注意】此条与S-2025-0002内容完全相同，但标注不同"
        ),
        TrainingSample(
            sample_id="S-2025-0008",
            content="转让闲置二手手机iPhone14，95成新，价格3500，有意者联系13900139000",
            label="低风险-正常交易",
            annotator="张审核",
            annotation_time="2026-01-17 09:00",
            remarks=""
        ),
        TrainingSample(
            sample_id="S-2025-0009",
            content="【补录】2026年1月17日补充：用户王五，电话号码13700137000，购买保险5000，受益人其子女。原记录身份证字段留空",
            label="低风险-正常业务",
            annotator="赵审核",
            annotation_time="2026-01-17 10:30",
            remarks="关键字段缺失，身份证号未填写"
        ),
        TrainingSample(
            sample_id="S-2025-0010",
            content="【坏数据混入】&&&$#@!~*()_+乱码内容%%%【重要】真实内容：提供贷款服务，无抵押，当天下款，利率低，加QQ123456789",
            label="高风险-违规贷款",
            annotator="系统自动",
            annotation_time="2026-01-17 11:00",
            remarks="【坏数据】包含乱码和特殊字符，可能是数据导入错误"
        ),
        TrainingSample(
            sample_id="S-2025-0011",
            content="这款游戏太好玩了，适合3岁以上小朋友，充值198元即可获得VIP礼包，还有机会抽取限量皮肤",
            label="低风险-游戏推广",
            annotator="刘审核",
            annotation_time="2026-01-17 14:00",
            remarks="涉及未成年人游戏充值"
        ),
        TrainingSample(
            sample_id="S-2025-0012",
            content="【旧表】患者症状：头疼发热38.5度，建议用药：阿司匹林每次0.5，每日3次，多喝水，注意休息",
            label="中风险-医疗建议",
            annotator="王审核",
            annotation_time="2026-01-17 15:30",
            remarks="旧表格式，剂量单位缺失（应为0.5克）"
        )
    ]
    return samples


def generate_model_logs() -> List[ModelLog]:
    logs = [
        ModelLog(
            log_id="LOG-2026-0001",
            sample_id="S-2025-0001",
            model_version="v2.3.1",
            prediction="高风险-隐私泄露",
            confidence=0.95,
            features={
                "身份证号检测": True,
                "手机号检测": True,
                "住址检测": True,
                "金融关键词": ["贷款"],
                "敏感词数量": 3
            },
            timestamp="2026-01-15 14:35:22"
        ),
        ModelLog(
            log_id="LOG-2026-0002",
            sample_id="S-2025-0002",
            model_version="v2.3.1",
            prediction="中风险-医疗广告",
            confidence=0.78,
            features={
                "医疗关键词": ["糖尿病", "根治", "治愈率"],
                "夸大宣传检测": True,
                "治愈率数值": "100%",
                "敏感词数量": 2
            },
            timestamp="2026-01-15 15:25:10"
        ),
        ModelLog(
            log_id="LOG-2026-0003",
            sample_id="S-2025-0003",
            model_version="v2.3.1",
            prediction="低风险-正常业务",
            confidence=0.55,
            features={
                "金融关键词": ["理财产品", "预期收益"],
                "金额检测": "100",
                "单位检测": None,
                "备注字段": "有补录"
            },
            timestamp="2026-01-16 09:20:45"
        ),
        ModelLog(
            log_id="LOG-2026-0004",
            sample_id="S-2025-0004",
            model_version="v2.3.1",
            prediction="中风险-社交诱导",
            confidence=0.82,
            features={
                "诱导加群检测": True,
                "联系方式检测": ["微信"],
                "收益承诺检测": True,
                "敏感词数量": 1
            },
            timestamp="2026-01-16 10:35:30"
        ),
        ModelLog(
            log_id="LOG-2026-0005",
            sample_id="S-2025-0005",
            model_version="v2.3.1",
            prediction="高风险-虚假广告",
            confidence=0.88,
            features={
                "广告关键词": ["减肥茶", "7天瘦20斤", "不反弹"],
                "夸大宣传检测": True,
                "价格检测": "99",
                "单位检测": None
            },
            timestamp="2026-01-16 11:50:15"
        ),
        ModelLog(
            log_id="LOG-2026-0006",
            sample_id="S-2025-0006",
            model_version="v2.3.1",
            prediction="中风险-未成年人咨询",
            confidence=0.76,
            features={
                "未成年人检测": True,
                "年龄检测": "12岁",
                "药品关键词": ["减肥药"],
                "敏感词数量": 1
            },
            timestamp="2026-01-16 14:05:40"
        ),
        ModelLog(
            log_id="LOG-2026-0007",
            sample_id="S-2025-0007",
            model_version="v2.3.1",
            prediction="高风险-虚假医疗",
            confidence=0.94,
            features={
                "医疗关键词": ["糖尿病", "根治", "治愈率"],
                "夸大宣传检测": True,
                "治愈率数值": "100%",
                "文本相似度": 0.99,
                "相似样本": "S-2025-0002"
            },
            timestamp="2026-01-16 15:35:55"
        ),
        ModelLog(
            log_id="LOG-2026-0008",
            sample_id="S-2025-0008",
            model_version="v2.3.1",
            prediction="低风险-正常交易",
            confidence=0.98,
            features={
                "二手交易检测": True,
                "商品类型": "手机",
                "价格检测": "3500",
                "敏感词数量": 0
            },
            timestamp="2026-01-17 09:05:20"
        ),
        ModelLog(
            log_id="LOG-2026-0009",
            sample_id="S-2025-0009",
            model_version="v2.3.1",
            prediction="低风险-正常业务",
            confidence=0.62,
            features={
                "保险关键词": ["保险", "受益人"],
                "身份证检测": False,
                "手机号检测": True,
                "关键字段缺失": True
            },
            timestamp="2026-01-17 10:35:45"
        ),
        ModelLog(
            log_id="LOG-2026-0010",
            sample_id="S-2025-0010",
            model_version="v2.3.1",
            prediction="中风险-特殊字符",
            confidence=0.45,
            features={
                "乱码检测": True,
                "特殊字符比例": 0.35,
                "贷款关键词": ["贷款", "无抵押", "利率低"],
                "QQ号检测": True,
                "解析失败": True
            },
            timestamp="2026-01-17 11:05:30"
        ),
        ModelLog(
            log_id="LOG-2026-0011",
            sample_id="S-2025-0011",
            model_version="v2.3.1",
            prediction="中风险-未成年人充值",
            confidence=0.72,
            features={
                "游戏关键词": ["游戏", "VIP礼包", "皮肤"],
                "充值检测": True,
                "年龄限制": "3岁以上",
                "金额检测": "198元"
            },
            timestamp="2026-01-17 14:05:15"
        ),
        ModelLog(
            log_id="LOG-2026-0012",
            sample_id="S-2025-0012",
            model_version="v2.3.1",
            prediction="中风险-医疗建议",
            confidence=0.68,
            features={
                "医疗关键词": ["头疼", "发热", "阿司匹林"],
                "剂量检测": "0.5",
                "单位检测": None,
                "旧表格式": True
            },
            timestamp="2026-01-17 15:35:40"
        )
    ]
    return logs


def load_all_data() -> Tuple[List[SafetyRule], List[ModelLog], List[TrainingSample]]:
    return generate_safety_rules(), generate_model_logs(), generate_training_samples()


def get_conflict_type_descriptions() -> Dict[str, str]:
    return {
        ConflictType.LABEL_MISMATCH: "同一份内容，人工标注和模型判断给出了不同的结论",
        ConflictType.SAFETY_RULE_MISSING: "内容涉及敏感领域，但没有匹配到对应的安全审核规则",
        ConflictType.UNIT_MISSING: "金额、重量、数量等数值后面漏掉了计量单位",
        ConflictType.OLD_FORMAT: "数据是从旧系统迁移过来的，字段格式和新系统不匹配",
        ConflictType.SUPPLEMENT_NOTE: "原始信息不完整，后续在备注栏补充了重要内容",
        ConflictType.DUPLICATE: "有多条记录内容完全一样，但可能标注不同"
    }

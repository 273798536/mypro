from __future__ import annotations

import re
from typing import List, Dict, Optional
from .models import (
    DesensitizationRule,
    LogEntry,
    Finding,
    Severity,
    FeedbackStatus,
)
import uuid


class DesensitizationChecker:
    def __init__(self, rules: Optional[List[DesensitizationRule]] = None):
        self.rules: Dict[str, DesensitizationRule] = {}
        if rules:
            for rule in rules:
                self.add_rule(rule)

    def add_rule(self, rule: DesensitizationRule) -> None:
        self.rules[rule.rule_id] = rule

    def remove_rule(self, rule_id: str) -> None:
        self.rules.pop(rule_id, None)

    def get_enabled_rules(self) -> List[DesensitizationRule]:
        return [r for r in self.rules.values() if r.enabled]

    def check_line(
        self,
        text: str,
        line_number: int,
        source_file: str,
        source_note: Optional[str] = None,
        image_name: Optional[str] = None,
        truncate_long_text: bool = True,
        max_text_length: int = 500,
    ) -> List[Finding]:
        findings = []
        truncated = len(text) > max_text_length if truncate_long_text else False

        if truncated:
            display_text = text[:max_text_length]
            truncation_reason = f"原文长度 {len(text)} 超过阈值 {max_text_length}，已截断，请复核完整内容"
        else:
            display_text = text
            truncation_reason = None

        for rule in self.get_enabled_rules():
            pattern = re.compile(rule.pattern)
            for match in pattern.finditer(display_text):
                finding = Finding(
                    finding_id=str(uuid.uuid4()),
                    rule_id=rule.rule_id,
                    rule_name=rule.name,
                    severity=rule.severity,
                    category=rule.category,
                    matched_text=match.group(0),
                    start_offset=match.start(),
                    end_offset=match.end(),
                    line_number=line_number,
                    source_file=source_file,
                    source_note=source_note,
                    image_name=image_name,
                    suggestion=self._get_suggestion(rule),
                    truncated=truncated,
                    truncation_reason=truncation_reason,
                    feedback_status=FeedbackStatus.NEEDS_REVIEW if truncated else FeedbackStatus.PENDING,
                )
                findings.append(finding)

        return findings

    def check_entries(self, entries: List[LogEntry], **kwargs) -> List[Finding]:
        all_findings = []
        for entry in entries:
            findings = self.check_line(
                text=entry.raw_text,
                line_number=entry.line_number,
                source_file=entry.source_file,
                source_note=entry.source_note,
                image_name=entry.image_name,
                **kwargs,
            )
            all_findings.extend(findings)
        return all_findings

    def _get_suggestion(self, rule: DesensitizationRule) -> Optional[str]:
        suggestions = {
            "phone": "建议脱敏处理手机号中间4位替换为****",
            "id_card": "建议脱敏处理身份证号中间8位替换为********",
            "email": "建议脱敏处理邮箱用户名部分替换为***",
            "bank_card": "建议脱敏处理银行卡号中间部分替换为****",
            "address": "建议模糊化详细地址，保留到区县级",
            "name": "建议使用化名或代号替换真实姓名",
            "ip": "建议脱敏处理IP地址中间段替换为***",
            "password": "严禁明文密码，应移除或哈希处理",
            "token": "严禁明文token，应移除或加密处理",
            "secret_key": "严禁明文密钥，应立即移除并更换密钥",
        }
        return suggestions.get(rule.category)

    def check_file(
        self,
        file_path: str,
        source_note: Optional[str] = None,
        image_name: Optional[str] = None,
        **kwargs,
    ) -> List[Finding]:
        findings = []
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            for line_num, line in enumerate(f, 1):
                line = line.rstrip("\n")
                line_findings = self.check_line(
                    text=line,
                    line_number=line_num,
                    source_file=file_path,
                    source_note=source_note,
                    image_name=image_name,
                    **kwargs,
                )
                findings.extend(line_findings)
        return findings


def load_rules_from_config(rules_data: List[dict]) -> List[DesensitizationRule]:
    return [DesensitizationRule(**rd) for rd in rules_data]


def get_default_rules() -> List[DesensitizationRule]:
    default_rules_data = [
        {
            "rule_id": "rule_phone_cn_mobile",
            "name": "中国大陆手机号",
            "description": "匹配中国大陆11位手机号码",
            "pattern": r"1[3-9]\d{9}",
            "severity": Severity.HIGH,
            "category": "phone",
            "enabled": True,
            "version": "1.0.0",
        },
        {
            "rule_id": "rule_id_card_cn",
            "name": "中国身份证号",
            "description": "匹配18位中国居民身份证号",
            "pattern": r"[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]",
            "severity": Severity.HIGH,
            "category": "id_card",
            "enabled": True,
            "version": "1.0.0",
        },
        {
            "rule_id": "rule_email",
            "name": "邮箱地址",
            "description": "匹配常见邮箱地址格式",
            "pattern": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
            "severity": Severity.MEDIUM,
            "category": "email",
            "enabled": True,
            "version": "1.0.0",
        },
        {
            "rule_id": "rule_bank_card",
            "name": "银行卡号",
            "description": "匹配16-19位银行卡号",
            "pattern": r"\b\d{16,19}\b",
            "severity": Severity.HIGH,
            "category": "bank_card",
            "enabled": True,
            "version": "1.0.0",
        },
        {
            "rule_id": "rule_ipv4",
            "name": "IPv4地址",
            "description": "匹配IPv4地址",
            "pattern": r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b",
            "severity": Severity.MEDIUM,
            "category": "ip",
            "enabled": True,
            "version": "1.0.0",
        },
        {
            "rule_id": "rule_password_field",
            "name": "密码字段",
            "description": "匹配password=或密钥等敏感字段",
            "pattern": r"(password|passwd|pwd)\s*[=:]\s*\S+",
            "severity": Severity.HIGH,
            "category": "password",
            "enabled": True,
            "version": "1.0.0",
        },
        {
            "rule_id": "rule_token_field",
            "name": "Token字段",
            "description": "匹配token、access_token等敏感字段",
            "pattern": r"(access_token|refresh_token|api_key|secret)\s*[=:]\s*\S+",
            "severity": Severity.HIGH,
            "category": "token",
            "enabled": True,
            "version": "1.0.0",
        },
        {
            "rule_id": "rule_cn_name",
            "name": "中文姓名",
            "description": "匹配2-4个汉字的中文姓名（上下文相关）",
            "pattern": r"(?:姓名|名字|用户|联系人)[：:]\s*[\u4e00-\u9fa5]{2,4}",
            "severity": Severity.MEDIUM,
            "category": "name",
            "enabled": True,
            "version": "1.0.0",
        },
        {
            "rule_id": "rule_address_cn",
            "name": "中国地址",
            "description": "匹配包含省市区的详细地址",
            "pattern": r"[\u4e00-\u9fa5]{2,}(?:省|自治区|特别行政区)[\u4e00-\u9fa5]{2,}(?:市|州|盟)[\u4e00-\u9fa5]{2,}(?:区|县|旗)[\u4e00-\u9fa5\d]+号?路?街?",
            "severity": Severity.MEDIUM,
            "category": "address",
            "enabled": True,
            "version": "1.0.0",
        },
    ]
    return [DesensitizationRule(**rd) for rd in default_rules_data]

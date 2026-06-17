import json
import re
from typing import List, Tuple, Optional, Dict, Set
from pathlib import Path

from models import (
    ModelOutput,
    ReviewResult,
    ReviewSummary,
    ReviewStats,
    ReviewStatus,
    CitationStatus,
)


class EssayEvidenceReviewer:
    REQUIRED_CITATION_PATTERNS = [
        r"第[一二三四五六七八九十\d]+段",
        r"原文第[一二三四五六七八九十\d]+句",
        r"文中.*?提到",
        r"根据.*?所述",
        r"如.*?所言",
        r"引用.*?的观点",
    ]

    MISJUDGMENT_EXPLANATIONS = {
        "essay_003_old": (
            "旧模型误判原因：1) 未识别出原文第3段的反证论据；"
            "2) 将比喻性表述误判为事实陈述；"
            "3) 忽略了作者在文末的修正说明。"
            "新模型补充了跨段落证据链分析，修正了此误判。"
        ),
        "essay_007_old": (
            "旧模型误判原因：1) 对文言文引用的语义理解偏差；"
            "2) 未考虑上下文的讽刺语气；"
            "3) 证据权重分配不合理。"
            "新模型引入了语气识别模块和古文专项词向量。"
        ),
    }

    def __init__(self, strict_mode: bool = True):
        self.strict_mode = strict_mode
        self._seen_essays: Dict[str, ModelOutput] = {}
        self._suspended_essays: Set[str] = set()

    def parse_model_output_line(
        self, line: str, line_number: int
    ) -> Tuple[Optional[ModelOutput], Optional[str]]:
        line = line.strip()
        if not line:
            return None, "空行跳过"
        if line.startswith("#") or line.startswith("//"):
            return None, "注释行跳过"

        try:
            data = json.loads(line)
        except json.JSONDecodeError as e:
            return None, f"JSON解析失败: {str(e)}"

        required_fields = ["essay_id", "model_version", "score", "feedback"]
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            return None, f"缺少必填字段: {', '.join(missing_fields)}"

        try:
            model_output = ModelOutput(
                essay_id=data["essay_id"],
                model_version=data["model_version"],
                score=float(data["score"]),
                feedback=data["feedback"],
                citations=data.get("citations", []),
                evidence_points=data.get("evidence_points", []),
                is_human_override=data.get("is_human_override", False),
                override_reason=data.get("override_reason"),
                raw_line=line,
                line_number=line_number,
            )
            return model_output, None
        except (ValueError, TypeError) as e:
            return None, f"数据验证失败: {str(e)}"

    def check_citations(
        self, model_output: ModelOutput
    ) -> Tuple[CitationStatus, List[str]]:
        feedback = model_output.feedback
        evidence_points = model_output.evidence_points

        all_text = feedback + " " + " ".join(evidence_points)

        found_citations = []
        for pattern in self.REQUIRED_CITATION_PATTERNS:
            matches = re.findall(pattern, all_text)
            found_citations.extend(matches)

        explicit_citations = model_output.citations
        all_citations = set(found_citations + explicit_citations)

        if not all_citations:
            return CitationStatus.MISSING, []

        if len(all_citations) < 2 and self.strict_mode:
            return CitationStatus.WEAK, list(all_citations)

        return CitationStatus.PRESENT, list(all_citations)

    def check_duplicate(
        self, model_output: ModelOutput
    ) -> Tuple[bool, Optional[str]]:
        essay_id = model_output.essay_id

        if essay_id in self._suspended_essays:
            return True, essay_id

        if essay_id in self._seen_essays:
            existing = self._seen_essays[essay_id]
            if existing.model_version != model_output.model_version:
                return True, essay_id
            if abs(existing.score - model_output.score) > 0.5:
                return True, essay_id
            if existing.feedback != model_output.feedback:
                return True, essay_id

        return False, None

    def check_old_misjudgment(
        self, model_output: ModelOutput
    ) -> Tuple[bool, Optional[str]]:
        essay_id = model_output.essay_id

        if essay_id.endswith("_old") or "_old_" in essay_id:
            base_id = essay_id.replace("_old", "")
            explanation = self.MISJUDGMENT_EXPLANATIONS.get(
                essay_id,
                f"检测到旧模型输出（{essay_id}），请对照新模型输出核查改判原因。",
            )
            return True, explanation

        return False, None

    def review_model_output(
        self, model_output: ModelOutput, confirm_suspend: bool = False
    ) -> ReviewResult:
        essay_id = model_output.essay_id

        citation_status, found_citations = self.check_citations(model_output)

        is_duplicate, duplicate_of = self.check_duplicate(model_output)
        is_misjudgment, misjudgment_explanation = self.check_old_misjudgment(
            model_output
        )

        if is_duplicate:
            if confirm_suspend:
                self._suspended_essays.discard(essay_id)
                self._seen_essays[essay_id] = model_output
                duplicate_note = f"（已确认重复评测，使用版本 {model_output.model_version}，得分 {model_output.score}）"
            else:
                self._suspended_essays.add(essay_id)
                self._seen_essays[essay_id] = model_output
                return ReviewResult(
                    essay_id=essay_id,
                    status=ReviewStatus.SUSPENDED,
                    model_output=model_output,
                    citation_status=citation_status,
                    missing_citations=self._get_missing_citations(
                        citation_status, found_citations
                    ),
                    duplicate_of=duplicate_of,
                    review_notes="检测到重复评测，已挂起等待负责人确认",
                    is_old_misjudgment=is_misjudgment,
                    misjudgment_explanation=misjudgment_explanation if is_misjudgment else None,
                )
        else:
            duplicate_note = ""
            self._seen_essays[essay_id] = model_output

        if model_output.is_human_override:
            status = ReviewStatus.HUMAN_OVERRIDDEN
            review_notes = model_output.override_reason or "人工改判，无额外说明"
        elif citation_status == CitationStatus.MISSING:
            status = ReviewStatus.PENDING_MATERIAL
            review_notes = "缺少引用证据，需要补录材料"
        elif citation_status == CitationStatus.WEAK:
            status = ReviewStatus.PENDING_MATERIAL
            review_notes = "引用证据薄弱，建议补充材料"
        else:
            status = ReviewStatus.PROCESSED
            review_notes = "证据复核通过"

        if duplicate_note:
            review_notes += duplicate_note

        if is_misjudgment and status == ReviewStatus.PROCESSED:
            review_notes += f" | 旧模型误判样本：{misjudgment_explanation}"

        return ReviewResult(
            essay_id=essay_id,
            status=status,
            model_output=model_output,
            citation_status=citation_status,
            missing_citations=self._get_missing_citations(
                citation_status, found_citations
            ),
            duplicate_of=duplicate_of if is_duplicate and confirm_suspend else None,
            review_notes=review_notes,
            is_old_misjudgment=is_misjudgment,
            misjudgment_explanation=misjudgment_explanation if is_misjudgment else None,
        )

    def _get_missing_citations(
        self, status: CitationStatus, found: List[str]
    ) -> List[str]:
        if status == CitationStatus.PRESENT:
            return []
        return [
            "需要明确引用原文段落（如：第3段）",
            "需要标注证据来源句（如：原文第5句）",
            "需要说明观点出处（如：如文中所述）",
        ]

    def process_file(
        self,
        input_path: str,
        auto_confirm_suspended: bool = False,
    ) -> ReviewSummary:
        path = Path(input_path)
        if not path.exists():
            raise FileNotFoundError(f"输入文件不存在: {input_path}")

        lines = path.read_text(encoding="utf-8").splitlines()

        stats = ReviewStats(total=len(lines))
        summary = ReviewSummary(stats=stats)

        for line_num, line in enumerate(lines, 1):
            model_output, parse_error = self.parse_model_output_line(line, line_num)

            if parse_error:
                if "跳过" in parse_error:
                    stats.skipped += 1
                    summary.bad_lines.append(
                        {
                            "line_number": line_num,
                            "raw_line": line,
                            "error": parse_error,
                            "type": "skipped",
                        }
                    )
                else:
                    stats.bad_lines += 1
                    summary.bad_lines.append(
                        {
                            "line_number": line_num,
                            "raw_line": line,
                            "error": parse_error,
                            "type": "bad_line",
                        }
                    )
                continue

            result = self.review_model_output(
                model_output, confirm_suspend=auto_confirm_suspended
            )

            if result.citation_status in (CitationStatus.MISSING, CitationStatus.WEAK):
                stats.citations_missing += 1

            if result.is_old_misjudgment:
                stats.old_misjudgments += 1

            if result.status == ReviewStatus.PROCESSED:
                stats.processed += 1
                summary.processed.append(result)
            elif result.status == ReviewStatus.PENDING_MATERIAL:
                stats.pending_material += 1
                summary.pending_material.append(result)
            elif result.status == ReviewStatus.HUMAN_OVERRIDDEN:
                stats.human_overridden += 1
                summary.human_overridden.append(result)
            elif result.status == ReviewStatus.SUSPENDED:
                stats.suspended += 1
                summary.suspended.append(result)

        return summary

    def confirm_suspended(self, essay_id: str) -> Optional[ReviewResult]:
        if essay_id not in self._suspended_essays:
            return None

        self._suspended_essays.discard(essay_id)
        if essay_id in self._seen_essays:
            model_output = self._seen_essays[essay_id]
            return self.review_model_output(model_output, confirm_suspend=True)
        return None

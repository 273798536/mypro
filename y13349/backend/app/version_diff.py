import re
import hashlib
from typing import List, Dict, Tuple
from difflib import SequenceMatcher

from .models import (
    SampleRecord, VersionNote, MaterialVersion,
    VersionDiff, ChangeItem, SourceType
)


class VersionDiffDetector:
    """版本变更检测 - 追踪材料口径修改"""

    def detect_sample_changes(
        self,
        old_samples: List[SampleRecord],
        new_samples: List[SampleRecord]
    ) -> VersionDiff:
        """检测两个版本样本之间的变更"""
        old_map = {s.sample_id: s for s in old_samples}
        new_map = {s.sample_id: s for s in new_samples}

        all_ids = set(old_map.keys()) | set(new_map.keys())
        changes = []
        changed_samples = []

        for sample_id in all_ids:
            old = old_map.get(sample_id)
            new = new_map.get(sample_id)

            if old is None:
                changes.append(ChangeItem(
                    field="sample",
                    old_value="",
                    new_value=new.sample_name,
                    change_type="added",
                    sample_id=sample_id
                ))
                changed_samples.append(sample_id)
            elif new is None:
                changes.append(ChangeItem(
                    field="sample",
                    old_value=old.sample_name,
                    new_value="",
                    change_type="removed",
                    sample_id=sample_id
                ))
                changed_samples.append(sample_id)
            else:
                sample_changes = self._compare_samples(old, new)
                changes.extend(sample_changes)
                if sample_changes:
                    changed_samples.append(sample_id)

        old_version = old_samples[0].review_version if old_samples else "unknown"
        new_version = new_samples[0].review_version if new_samples else "unknown"

        return VersionDiff(
            old_version=old_version,
            new_version=new_version,
            changes=changes,
            changed_samples=list(set(changed_samples))
        )

    def _compare_samples(self, old: SampleRecord, new: SampleRecord) -> List[ChangeItem]:
        """比较两个样本的差异"""
        changes = []

        if old.status != new.status:
            changes.append(ChangeItem(
                field="status",
                old_value=old.status.value,
                new_value=new.status.value,
                change_type="modified",
                sample_id=old.sample_id
            ))

        if old.category != new.category:
            changes.append(ChangeItem(
                field="category",
                old_value=old.category or "",
                new_value=new.category or "",
                change_type="modified",
                sample_id=old.sample_id
            ))

        old_refs = set(r.text for r in old.references)
        new_refs = set(r.text for r in new.references)
        added_refs = new_refs - old_refs
        removed_refs = old_refs - new_refs

        if added_refs:
            changes.append(ChangeItem(
                field="references",
                old_value="",
                new_value="; ".join(added_refs),
                change_type="added",
                sample_id=old.sample_id
            ))

        if removed_refs:
            changes.append(ChangeItem(
                field="references",
                old_value="; ".join(removed_refs),
                new_value="",
                change_type="removed",
                sample_id=old.sample_id
            ))

        old_missing = set(old.missing_references)
        new_missing = set(new.missing_references)

        if old_missing != new_missing:
            changes.append(ChangeItem(
                field="missing_references",
                old_value="; ".join(sorted(old_missing)) if old_missing else "无",
                new_value="; ".join(sorted(new_missing)) if new_missing else "无",
                change_type="modified",
                sample_id=old.sample_id
            ))

        if old.is_duplicate != new.is_duplicate:
            changes.append(ChangeItem(
                field="duplicate",
                old_value="是" if old.is_duplicate else "否",
                new_value="是" if new.is_duplicate else "否",
                change_type="modified",
                sample_id=old.sample_id
            ))

        content_sim = self._text_similarity(old.raw_content, new.raw_content)
        if content_sim < 0.95 and not changes:
            changes.append(ChangeItem(
                field="content",
                old_value=f"原始内容（相似度: {content_sim:.1%}）",
                new_value=f"修改后内容（相似度: {content_sim:.1%}）",
                change_type="modified",
                sample_id=old.sample_id
            ))

        return changes

    def detect_material_changes(
        self,
        materials: List[MaterialVersion]
    ) -> List[Tuple[MaterialVersion, MaterialVersion, List[str]]]:
        """检测材料文件之间的变更

        返回: [(旧材料, 新材料, [变更字段列表])]
        """
        changes = []
        by_type: Dict[SourceType, List[MaterialVersion]] = {}

        for m in materials:
            if m.source_type not in by_type:
                by_type[m.source_type] = []
            by_type[m.source_type].append(m)

        for source_type, mats in by_type.items():
            mats.sort(key=lambda x: x.created_at)
            for i in range(len(mats) - 1):
                old, new = mats[i], mats[i + 1]
                change_fields = self._compare_materials(old, new)
                if change_fields:
                    changes.append((old, new, change_fields))

        return changes

    def _compare_materials(self, old: MaterialVersion, new: MaterialVersion) -> List[str]:
        """比较两份材料的差异，返回变更字段列表"""
        changes = []

        if old.version != new.version:
            changes.append("version")

        old_hash = hashlib.md5(old.content.encode()).hexdigest()
        new_hash = hashlib.md5(new.content.encode()).hexdigest()

        if old_hash != new_hash:
            changes.append("content")

        return changes

    def find_original_statement(
        self,
        version_notes: List[VersionNote],
        sample: SampleRecord
    ) -> List[Tuple[VersionNote, str]]:
        """在版本说明中查找样本的原始说法

        根据样本的状态、是否缺引用、是否重复等特征，在版本说明中
        查找对应的规则条款，作为审查结论的原始依据。
        """
        results = []

        topics = self._extract_relevant_topics(sample)

        for note in version_notes:
            matches = []
            seen_snippets = set()

            for topic in topics:
                for keyword in topic['keywords']:
                    if keyword in note.content and keyword not in seen_snippets:
                        snippet = self._extract_snippet(note.content, keyword)
                        if snippet not in seen_snippets:
                            matches.append({
                                'topic': topic['name'],
                                'keyword': keyword,
                                'snippet': snippet
                            })
                            seen_snippets.add(snippet)

            if matches:
                matched_text = "\n\n".join(
                    f"**{m['topic']}**\n{m['snippet']}" for m in matches[:5]
                )
                results.append((note, matched_text))

        return results

    def _extract_relevant_topics(self, sample: SampleRecord) -> List[dict]:
        """提取样本相关的审查主题"""
        topics = []

        if sample.is_duplicate:
            topics.append({
                'name': '重复评测处理',
                'keywords': ['重复', '复测', 'duplicate', '重复评测']
            })

        if sample.missing_references:
            topics.append({
                'name': '引用要求',
                'keywords': ['引用要求', '缺少引用', '缺引用', '引用', 'reference']
            })

        from .models import ReviewStatus
        if sample.status == ReviewStatus.PASS:
            topics.append({
                'name': '通过标准',
                'keywords': ['通过标准', '通过', 'pass']
            })
        elif sample.status == ReviewStatus.FAIL:
            topics.append({
                'name': '不通过标准',
                'keywords': ['不通过标准', '不通过', '未通过', 'fail']
            })
        elif sample.status == ReviewStatus.PENDING:
            topics.append({
                'name': '待处理标准',
                'keywords': ['待处理', '待补充', 'pending', '待定']
            })

        if sample.category:
            topics.append({
                'name': f'{sample.category}审查',
                'keywords': [sample.category, sample.category.replace('代码', '')]
            })

        for ref in sample.references:
            ref_words = re.findall(r'[\u4e00-\u9fa5]{2,}', ref.text)
            if ref_words:
                topics.append({
                    'name': '引用依据',
                    'keywords': ref_words[:3]
                })

        return topics

    def _extract_snippet(self, content: str, keyword: str, window: int = 50) -> str:
        """提取包含关键词的上下文片段"""
        idx = content.find(keyword)
        if idx == -1:
            return keyword

        start = max(0, idx - window)
        end = min(len(content), idx + len(keyword) + window)
        snippet = content[start:end]

        if start > 0:
            snippet = "..." + snippet
        if end < len(content):
            snippet = snippet + "..."

        return snippet.replace('\n', ' ')

    def _text_similarity(self, text1: str, text2: str) -> float:
        """计算两段文本的相似度"""
        if not text1 or not text2:
            return 0.0

        return SequenceMatcher(None, text1, text2).ratio()


version_diff_detector = VersionDiffDetector()

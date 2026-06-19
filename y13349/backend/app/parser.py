import os
import re
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from pathlib import Path

from .models import (
    SampleRecord, VersionNote, MaterialVersion, SourceType,
    ReviewStatus, ReferenceItem, FilterCriteria
)


class MarkdownParser:
    """解析版本说明、审查记录等Markdown文件"""

    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def parse_version_notes(self, filepath: str) -> VersionNote:
        """解析版本说明文件"""
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        version = self._extract_version(content)
        title = self._extract_title(content)

        return VersionNote(
            version=version,
            title=title,
            content=content,
            created_at=datetime.fromtimestamp(os.path.getmtime(filepath)),
            source_file=os.path.basename(filepath)
        )

    def parse_review_records(
        self,
        filepath: str,
        source_type: SourceType = SourceType.REVIEW_RECORD,
        review_version: str = None
    ) -> List[SampleRecord]:
        """解析审查记录Markdown文件，提取样本记录"""
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        if review_version is None:
            review_version = self._extract_version(content) or "v1.0"

        samples = self._extract_samples(content, source_type, review_version)
        return samples

    def parse_all_materials(self) -> Tuple[List[VersionNote], List[SampleRecord]]:
        """解析data目录下的所有材料"""
        version_notes = []
        all_samples = []

        for filepath in self.data_dir.glob('*.md'):
            filename = filepath.name.lower()

            is_version_note = 'version' in filename or ('说明' in filename and '口头' not in filename)
            is_review_record = 'review' in filename or '审查' in filename or '记录' in filename
            is_oral_note = 'oral' in filename or '口头' in filename

            if is_version_note:
                try:
                    note = self.parse_version_notes(str(filepath))
                    version_notes.append(note)
                except Exception as e:
                    print(f"解析版本说明失败 {filename}: {e}")

            if is_review_record or is_oral_note:
                source_type = SourceType.ORAL_NOTE if is_oral_note else SourceType.REVIEW_RECORD
                try:
                    samples = self.parse_review_records(str(filepath), source_type)
                    all_samples.extend(samples)
                except Exception as e:
                    print(f"解析审查记录失败 {filename}: {e}")

        version_notes.sort(key=lambda x: x.created_at)
        all_samples.sort(key=lambda x: x.created_at)

        return version_notes, all_samples

    def list_material_files(self) -> List[MaterialVersion]:
        """列出所有材料文件及其版本信息"""
        materials = []
        for filepath in self.data_dir.glob('*.md'):
            filename = filepath.name
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            version = self._extract_version(content) or "unknown"
            if 'version' in filename.lower() or '说明' in filename:
                source_type = SourceType.VERSION_NOTE
            elif 'oral' in filename.lower() or '口头' in filename:
                source_type = SourceType.ORAL_NOTE
            else:
                source_type = SourceType.REVIEW_RECORD

            materials.append(MaterialVersion(
                version=version,
                source_type=source_type,
                content=content,
                created_at=datetime.fromtimestamp(filepath.stat().st_mtime),
                source_file=filename
            ))

        materials.sort(key=lambda x: x.created_at)
        return materials

    def _extract_version(self, content: str) -> Optional[str]:
        """从内容中提取版本号"""
        patterns = [
            r'#\s*v([\d.]+)',
            r'版本[：:]\s*v?([\d.]+)',
            r'version[：:]\s*v?([\d.]+)',
            r'##\s*v([\d.]+)',
        ]
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return f"v{match.group(1)}"
        return None

    def _extract_title(self, content: str) -> str:
        """提取标题"""
        lines = content.strip().split('\n')
        for line in lines:
            if line.startswith('# '):
                return line[2:].strip()
        return "未命名文档"

    def _extract_samples(
        self,
        content: str,
        source_type: SourceType,
        review_version: str
    ) -> List[SampleRecord]:
        """提取样本记录"""
        samples = []

        sections = re.split(r'\n##\s+', content)
        if len(sections) > 1:
            sections = sections[1:]
        else:
            sections = [content]

        for i, section in enumerate(sections):
            lines = section.strip().split('\n')
            if not lines:
                continue

            first_line = lines[0].strip().lstrip('#').strip()

            sample_id = self._extract_sample_id(first_line) or f"sample_{i+1}"
            sample_name = first_line

            category = self._extract_category(section)
            status = self._extract_status(section)
            references = self._extract_references(section)
            missing_refs = self._extract_missing_refs(section)
            is_duplicate, duplicate_of = self._extract_duplicate_info(section)

            samples.append(SampleRecord(
                sample_id=sample_id,
                sample_name=sample_name,
                category=category,
                content=section,
                status=status,
                references=references,
                missing_references=missing_refs,
                is_duplicate=is_duplicate,
                duplicate_of=duplicate_of,
                review_version=review_version,
                source_type=source_type,
                raw_content=section
            ))

        return samples

    def _extract_sample_id(self, title: str) -> Optional[str]:
        """从标题中提取样本ID"""
        patterns = [
            r'[【\[]\s*(\w+[\d-]+)\s*[】\]]',
            r'(sample[_\-][\w\d]+)',
            r'^(S[A-Za-z0-9_-]+)',
        ]
        for pattern in patterns:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    def _extract_category(self, section: str) -> Optional[str]:
        """提取分类"""
        patterns = [
            r'分类[：:]\s*([^\n]+)',
            r'category[：:]\s*([^\n]+)',
            r'类型[：:]\s*([^\n]+)',
        ]
        for pattern in patterns:
            match = re.search(pattern, section, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    def _extract_status(self, section: str) -> ReviewStatus:
        """提取审查状态"""
        lower_section = section.lower()

        if '重复' in section or 'duplicate' in lower_section:
            return ReviewStatus.DUPLICATE
        if '不通过' in section or '未通过' in section or 'fail' in lower_section or '❌' in section:
            return ReviewStatus.FAIL
        if '通过' in section and '不通过' not in section and '未通过' not in section:
            return ReviewStatus.PASS
        if 'pass' in lower_section and 'fail' not in lower_section:
            return ReviewStatus.PASS
        if '✅' in section:
            return ReviewStatus.PASS
        if '待处理' in section or 'pending' in lower_section or '待定' in section:
            return ReviewStatus.PENDING

        return ReviewStatus.PENDING

    def _extract_references(self, section: str) -> List[ReferenceItem]:
        """提取引用项"""
        references = []

        ref_section_match = re.search(
            r'(?:引用|参考|reference)[：:].*?\n((?:\s*[-*•]\s+[^\n]+\n?)+)',
            section,
            re.IGNORECASE | re.DOTALL
        )

        if ref_section_match:
            ref_text = ref_section_match.group(1)
            ref_items = re.findall(r'[-*•]\s+(.+)', ref_text)
            for i, ref in enumerate(ref_items):
                ref = ref.strip()
                version_match = re.search(r'v([\d.]+)', ref)
                references.append(ReferenceItem(
                    id=f"ref_{i+1}",
                    text=ref,
                    source="markdown",
                    version=f"v{version_match.group(1)}" if version_match else None
                ))

        return references

    def _extract_missing_refs(self, section: str) -> List[str]:
        """提取缺失的引用"""
        missing = []

        patterns = [
            r'缺失引用[：:]\s*([^\n]+)',
            r'缺少引用[：:]\s*([^\n]+)',
            r'missing.*?ref.*?[：:]\s*([^\n]+)',
        ]
        for pattern in patterns:
            match = re.search(pattern, section, re.IGNORECASE)
            if match:
                refs_text = match.group(1).strip()
                missing = [r.strip() for r in re.split(r'[、,，]', refs_text) if r.strip()]
                break

        if not missing and '缺引用' in section:
            missing.append("未明确说明的缺失引用")

        return missing

    def _extract_duplicate_info(self, section: str) -> Tuple[bool, Optional[str]]:
        """提取重复评测信息"""
        is_duplicate = False
        duplicate_of = None

        patterns = [
            r'重复评测[：:]\s*([^\n]+)',
            r'重复[：:]\s*([^\n]+)',
            r'duplicate.*?[：:]\s*([^\n]+)',
        ]
        for pattern in patterns:
            match = re.search(pattern, section, re.IGNORECASE)
            if match:
                is_duplicate = True
                duplicate_of = match.group(1).strip()
                break

        if not is_duplicate and ('重复评测' in section or '重复样本' in section):
            is_duplicate = True

        return is_duplicate, duplicate_of


def filter_samples(samples: List[SampleRecord], criteria: FilterCriteria) -> List[SampleRecord]:
    """根据筛选条件过滤样本"""
    if not any([
        criteria.versions, criteria.categories, criteria.statuses,
        criteria.source_types, criteria.has_missing_refs is not None,
        criteria.is_duplicate is not None
    ]):
        return samples

    result = samples

    if criteria.versions:
        result = [s for s in result if s.review_version in criteria.versions]

    if criteria.categories:
        result = [s for s in result if s.category in criteria.categories]

    if criteria.statuses:
        result = [s for s in result if s.status in criteria.statuses]

    if criteria.source_types:
        result = [s for s in result if s.source_type in criteria.source_types]

    if criteria.has_missing_refs is not None:
        if criteria.has_missing_refs:
            result = [s for s in result if len(s.missing_references) > 0]
        else:
            result = [s for s in result if len(s.missing_references) == 0]

    if criteria.is_duplicate is not None:
        result = [s for s in result if s.is_duplicate == criteria.is_duplicate]

    return result

"""迁移脚本管理模块 - 漏页检测、字段类型漂移检测"""

import os
import hashlib
import re
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from datetime import datetime

from .models import MigrationScript, SourceReference, RecordSource
from .storage import AuditStorage
from .errors import MigrationScriptMissingError, FieldDriftError


class MigrationManager:
    """迁移脚本管理器"""

    MIGRATION_PATTERN = re.compile(r"V(\d+(?:\.\d+)*)__(\w+)_p(\d+)\.sql")

    def __init__(self, storage: AuditStorage):
        self.storage = storage

    def scan_migrations(
        self,
        migration_dir: str,
    ) -> List[MigrationScript]:
        """
        扫描迁移脚本目录

        Args:
            migration_dir: 迁移脚本目录路径

        Returns:
            迁移脚本列表

        Raises:
            MigrationScriptMissingError: 检测到漏页时
        """
        scripts, missing_versions = self._scan_scripts_internal(migration_dir)

        if missing_versions:
            version, missing, total = missing_versions[0]
            raise MigrationScriptMissingError(
                version=version,
                missing_pages=missing,
                total_pages=total,
                script_dir=migration_dir,
            )

        return scripts

    def _scan_scripts_internal(
        self,
        migration_dir: str,
    ) -> tuple:
        """
        内部扫描方法 - 返回脚本列表和漏页版本信息（不抛异常）

        Returns:
            (scripts, missing_versions)
            missing_versions: [(version, missing_pages, total_pages), ...]
        """
        if not os.path.exists(migration_dir):
            raise FileNotFoundError(f"迁移脚本目录不存在: {migration_dir}")

        scripts_by_version: Dict[str, List[MigrationScript]] = {}

        for filename in sorted(os.listdir(migration_dir)):
            match = self.MIGRATION_PATTERN.match(filename)
            if not match:
                continue

            version = match.group(1)
            page_number = int(match.group(3))
            file_path = os.path.join(migration_dir, filename)
            checksum = self._calculate_checksum(file_path)
            has_field_drift, drift_details = self._check_field_drift(file_path)

            script = MigrationScript(
                id=f"mig_{version}_p{page_number}",
                version=version,
                file_path=file_path,
                page_number=page_number,
                total_pages=0,
                is_applied=False,
                checksum=checksum,
                has_field_drift=has_field_drift,
                drift_details=drift_details,
            )

            scripts_by_version.setdefault(version, []).append(script)

        all_scripts: List[MigrationScript] = []
        missing_versions = []

        for version, scripts in sorted(scripts_by_version.items()):
            scripts.sort(key=lambda s: s.page_number)
            max_page = max(s.page_number for s in scripts)
            total_pages = max_page

            actual_pages = {s.page_number for s in scripts}
            expected_pages = set(range(1, max_page + 1))
            missing = sorted(expected_pages - actual_pages)

            if missing:
                missing_versions.append((version, missing, total_pages))

            for s in scripts:
                s.total_pages = total_pages

            all_scripts.extend(scripts)

        return all_scripts, missing_versions

    def register_migrations(
        self,
        migration_dir: str,
        mark_applied: bool = False,
    ) -> List[MigrationScript]:
        """
        注册迁移脚本到存储

        Args:
            migration_dir: 迁移脚本目录
            mark_applied: 是否标记为已应用

        Returns:
            注册的脚本列表
        """
        scripts = self.scan_migrations(migration_dir)

        for script in scripts:
            if mark_applied:
                script.is_applied = True
                script.applied_at = datetime.now()
            self.storage.add_migration_script(script)

        return scripts

    def validate_migration_chain(
        self,
        migration_dir: str,
    ) -> Dict[str, any]:
        """
        验证迁移脚本链的完整性

        Returns:
            验证结果字典
        """
        result = {
            "valid": True,
            "total_scripts": 0,
            "total_versions": 0,
            "missing_pages": [],
            "field_drifts": [],
            "issues": [],
        }

        try:
            scripts, missing_versions = self._scan_scripts_internal(migration_dir)
        except FileNotFoundError as e:
            result["valid"] = False
            result["issues"].append(str(e))
            return result

        result["total_scripts"] = len(scripts)

        versions = set(s.version for s in scripts)
        result["total_versions"] = len(versions)

        for version, missing, total in missing_versions:
            result["valid"] = False
            result["missing_pages"].append({
                "version": version,
                "missing": missing,
                "total": total,
            })
            result["issues"].append(
                f"迁移脚本 {version} 存在漏页，共 {total} 页，缺失第 {', '.join(str(p) for p in missing)} 页"
            )

        for script in scripts:
            if script.has_field_drift:
                result["field_drifts"].append({
                    "version": script.version,
                    "page": script.page_number,
                    "file": script.file_path,
                    "details": script.drift_details,
                })
                result["issues"].append(
                    f"字段类型漂移: {script.version} 第{script.page_number}页 - {script.drift_details}"
                )

        if result["field_drifts"]:
            result["valid"] = False

        return result

    def get_missing_page_details(
        self,
        version: str,
        migration_dir: str,
    ) -> Dict[str, any]:
        """
        获取指定版本的漏页详情

        Args:
            version: 版本号
            migration_dir: 迁移脚本目录

        Returns:
            漏页详情
        """
        scripts = self._scan_version_scripts(version, migration_dir)

        if not scripts:
            return {
                "version": version,
                "exists": False,
                "total_expected": 0,
                "existing_pages": [],
                "missing_pages": [],
            }

        existing_pages = sorted(s.page_number for s in scripts)
        max_page = max(existing_pages)
        expected = set(range(1, max_page + 1))
        missing = sorted(expected - set(existing_pages))

        return {
            "version": version,
            "exists": True,
            "total_expected": max_page,
            "existing_pages": existing_pages,
            "missing_pages": missing,
            "scripts": [s.file_path for s in scripts],
        }

    def get_field_drift_scripts(self) -> List[MigrationScript]:
        """获取所有存在字段类型漂移的脚本"""
        scripts = self.storage.get_migration_scripts()
        return [s for s in scripts if s.has_field_drift]

    def _scan_version_scripts(
        self,
        version: str,
        migration_dir: str,
    ) -> List[MigrationScript]:
        """扫描指定版本的所有脚本"""
        scripts: List[MigrationScript] = []

        if not os.path.exists(migration_dir):
            return scripts

        for filename in os.listdir(migration_dir):
            match = self.MIGRATION_PATTERN.match(filename)
            if not match:
                continue
            if match.group(1) != version:
                continue

            file_path = os.path.join(migration_dir, filename)
            scripts.append(MigrationScript(
                id=f"mig_{version}_p{match.group(3)}",
                version=version,
                file_path=file_path,
                page_number=int(match.group(3)),
                total_pages=0,
            ))

        return scripts

    def _calculate_checksum(self, file_path: str) -> str:
        """计算文件的 MD5 校验和"""
        md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                md5.update(chunk)
        return md5.hexdigest()

    def _check_field_drift(self, file_path: str) -> Tuple[bool, Optional[str]]:
        """
        检查文件中是否存在字段类型漂移

        检测模式：同一文件中对同一字段有多次 ALTER 且类型不同
        """
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except (UnicodeDecodeError, IOError):
            return False, None

        field_types: Dict[str, List[str]] = {}

        alter_pattern = re.compile(
            r"ALTER\s+TABLE\s+(\w+)\s+(?:ALTER|MODIFY|CHANGE)\s+(?:COLUMN\s+)?(\w+)\s+(\w+(?:\([^)]*\))?)",
            re.IGNORECASE,
        )

        for match in alter_pattern.finditer(content):
            table = match.group(1).lower()
            field = match.group(2).lower()
            ftype = match.group(3).lower()
            key = f"{table}.{field}"
            field_types.setdefault(key, []).append(ftype)

        for key, types in field_types.items():
            unique_types = set()
            for t in types:
                base_type = re.sub(r"\(.*\)", "", t).strip()
                unique_types.add(base_type)

            if len(unique_types) > 1:
                return True, f"字段 {key} 在同一脚本中出现多种类型: {', '.join(unique_types)}"

        return False, None

    def get_actionable_errors(
        self,
        migration_dir: str,
    ) -> List[str]:
        """
        获取所有可操作的错误提示列表

        Returns:
            错误提示列表，每条包含问题描述和操作建议
        """
        errors: List[str] = []

        try:
            result = self.validate_migration_chain(migration_dir)
        except Exception as e:
            errors.append(str(e))
            return errors

        for issue in result["issues"]:
            errors.append(issue)

        if not result["valid"]:
            errors.append(
                "建议: 请先补全缺失的迁移脚本，再运行索引回源校验，"
                "否则导出结果可能因字段类型不完整而产生偏差"
            )

        return errors

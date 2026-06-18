import csv
import json
import re
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from .config import RunConfig
from .version_manager import VersionManager
from .models import MaterialType, MaterialVersion


class ImportedMaterial:
    def __init__(
        self,
        version: MaterialVersion,
        content: str,
        parsed_data: Any,
        line_mapping: Dict[int, int],
    ):
        self.version = version
        self.content = content
        self.parsed_data = parsed_data
        self.line_mapping = line_mapping


class MaterialImporter:
    def __init__(self, config: RunConfig, version_manager: VersionManager):
        self.config = config
        self.version_manager = version_manager

    def import_all(self) -> List[ImportedMaterial]:
        materials: List[ImportedMaterial] = []
        input_dir = self.config.input_dir

        for file_path in sorted(input_dir.iterdir()):
            if file_path.is_file():
                material = self._import_file(file_path)
                if material:
                    materials.append(material)

        return materials

    def _import_file(self, file_path: Path) -> Optional[ImportedMaterial]:
        material_type = self._detect_type(file_path)
        if not material_type:
            return None

        source_ref = self.version_manager.create_source_ref(
            file_path=file_path,
            note=f"自动导入: {material_type.value}",
        )

        version, is_new = self.version_manager.register_material(
            file_path=file_path,
            material_type=material_type,
            source_ref=source_ref,
        )

        if not is_new:
            content = self.version_manager.get_material_content(version.version_id)
        else:
            content = file_path.read_text(encoding="utf-8", errors="replace")

        parsed_data, line_mapping = self._parse_content(content, material_type, file_path)

        return ImportedMaterial(
            version=version,
            content=content,
            parsed_data=parsed_data,
            line_mapping=line_mapping,
        )

    def _detect_type(self, file_path: Path) -> Optional[MaterialType]:
        name = file_path.name.lower()

        if "slow" in name and ("query" in name or "log" in name):
            return MaterialType.SLOW_QUERY_LOG
        if "rollback" in name:
            return MaterialType.ROLLBACK_LOG
        if "migration" in name or name.endswith((".sql",)) and "migrate" in name:
            return MaterialType.MIGRATION_SCRIPT
        if "index" in name and ("suggest" in name or "recommend" in name):
            return MaterialType.INDEX_SUGGESTION
        if "audit" in name or "sql_inject" in name:
            return MaterialType.SQL_AUDIT_REPORT
        if "chat" in name or name.endswith((".json",)):
            return MaterialType.CHAT_HISTORY

        if file_path.suffix == ".sql":
            return MaterialType.MIGRATION_SCRIPT
        if file_path.suffix in (".csv", ".log"):
            return MaterialType.SLOW_QUERY_LOG

        return None

    def _parse_content(
        self,
        content: str,
        material_type: MaterialType,
        file_path: Path,
    ) -> Tuple[Any, Dict[int, int]]:
        line_mapping: Dict[int, int] = {}
        lines = content.splitlines()

        for idx, line in enumerate(lines, 1):
            line_mapping[idx] = idx

        if material_type == MaterialType.SLOW_QUERY_LOG:
            return self._parse_slow_query_log(lines, file_path), line_mapping
        elif material_type == MaterialType.ROLLBACK_LOG:
            return self._parse_rollback_log(lines, file_path), line_mapping
        elif material_type == MaterialType.MIGRATION_SCRIPT:
            return self._parse_migration_script(content, lines, file_path), line_mapping
        elif material_type == MaterialType.INDEX_SUGGESTION:
            return self._parse_index_suggestion(lines, file_path), line_mapping
        elif material_type == MaterialType.SQL_AUDIT_REPORT:
            return self._parse_audit_report(content, lines, file_path), line_mapping
        elif material_type == MaterialType.CHAT_HISTORY:
            return self._parse_chat_history(content, file_path), line_mapping

        return content, line_mapping

    def _parse_slow_query_log(self, lines: List[str], file_path: Path) -> List[Dict]:
        queries = []
        current_query: Optional[Dict] = None
        query_lines: List[str] = []

        for line_num, line in enumerate(lines, 1):
            if line.startswith("# Time:") or line.startswith("# User@Host:"):
                if current_query and query_lines:
                    current_query["query"] = " ".join(query_lines).strip()
                    current_query["end_line"] = line_num - 1
                    queries.append(current_query)

                current_query = {"start_line": line_num, "metadata": {}}
                query_lines = []

                if line.startswith("# Time:"):
                    time_str = line.replace("# Time:", "").strip()
                    try:
                        current_query["timestamp"] = datetime.strptime(
                            time_str, "%Y-%m-%dT%H:%M:%S.%f"
                        )
                    except ValueError:
                        current_query["timestamp"] = time_str

            elif line.startswith("# Query_time:"):
                match = re.search(
                    r"Query_time:\s+([\d.]+).*?Rows_examined:\s+(\d+)",
                    line,
                )
                if match and current_query:
                    current_query["execution_time_ms"] = float(match.group(1)) * 1000
                    current_query["rows_examined"] = int(match.group(2))
                    current_query["metadata"]["query_time_line"] = line_num

            elif line.strip() and not line.startswith("#"):
                query_lines.append(line)

        if current_query and query_lines:
            current_query["query"] = " ".join(query_lines).strip()
            current_query["end_line"] = len(lines)
            queries.append(current_query)

        if not queries and file_path.suffix == ".csv":
            return self._parse_csv_slow_log(lines)

        return queries

    def _parse_csv_slow_log(self, lines: List[str]) -> List[Dict]:
        queries = []
        reader = csv.DictReader(lines)
        for line_num, row in enumerate(reader, start=2):
            query = {
                "start_line": line_num,
                "end_line": line_num,
                "query": row.get("query", row.get("sql", "")),
                "execution_time_ms": float(row.get("execution_time_ms", row.get("duration", 0))),
                "rows_examined": int(row.get("rows_examined", row.get("rows", 0))),
                "timestamp": row.get("timestamp", row.get("time", None)),
            }
            queries.append(query)
        return queries

    def _parse_rollback_log(self, lines: List[str], file_path: Path) -> List[Dict]:
        rollbacks = []
        current_rollback: Optional[Dict] = None

        for line_num, line in enumerate(lines, 1):
            line_lower = line.lower()
            if "rollback" in line_lower and ("start" in line_lower or "begin" in line_lower):
                if current_rollback:
                    rollbacks.append(current_rollback)
                current_rollback = {
                    "start_line": line_num,
                    "end_line": line_num,
                    "affected_queries": [],
                    "metadata": {},
                }
                match = re.search(r"script[_-]?id[:=]\s*([\w_\-.]+)", line, re.IGNORECASE)
                if match:
                    current_rollback["migration_script_id"] = match.group(1)
                match = re.search(
                    r"(\d{4}[-/]\d{2}[-/]\d{2}[ T]\d{2}:\d{2}:\d{2})",
                    line,
                )
                if match:
                    try:
                        current_rollback["rollback_time"] = datetime.strptime(
                            match.group(1).replace("/", "-").replace("T", " "),
                            "%Y-%m-%d %H:%M:%S",
                        )
                    except ValueError:
                        current_rollback["rollback_time"] = match.group(1)

            elif current_rollback:
                current_rollback["end_line"] = line_num
                if "reason" in line_lower or "cause" in line_lower:
                    current_rollback["rollback_reason"] = line.split(":", 1)[-1].strip()
                elif "query" in line_lower or "sql" in line_lower:
                    sql = line.split(":", 1)[-1].strip()
                    if sql:
                        current_rollback["affected_queries"].append(sql)
                elif line.strip() and not line.startswith("#"):
                    if "SELECT" in line.upper() or "INSERT" in line.upper() or "UPDATE" in line.upper():
                        current_rollback["affected_queries"].append(line.strip())

        if current_rollback:
            rollbacks.append(current_rollback)

        return rollbacks

    def _parse_migration_script(
        self, content: str, lines: List[str], file_path: Path
    ) -> Dict:
        version_match = re.search(r"V(\d+)__([\w_]+)", file_path.stem)
        version = version_match.group(1) if version_match else file_path.stem
        name = version_match.group(2) if version_match else file_path.stem

        sql_statements = self._split_sql_statements(content)
        statements_with_lines = []

        current_pos = 0
        for stmt in sql_statements:
            start_offset = content.find(stmt, current_pos)
            if start_offset >= 0:
                start_line = content[:start_offset].count("\n") + 1
                end_line = content[:start_offset + len(stmt)].count("\n") + 1
                statements_with_lines.append({
                    "sql": stmt.strip(),
                    "start_line": start_line,
                    "end_line": end_line,
                })
                current_pos = start_offset + len(stmt)

        return {
            "version": version,
            "name": name,
            "content": content,
            "statements": statements_with_lines,
        }

    def _split_sql_statements(self, content: str) -> List[str]:
        statements = []
        current = []
        in_string = False
        string_char = None
        in_comment = False

        for char in content:
            if in_comment:
                if char == "\n":
                    in_comment = False
                continue

            if char == "-" and current and current[-1] == "-":
                in_comment = True
                current.pop()
                continue

            if in_string:
                current.append(char)
                if char == string_char:
                    in_string = False
                continue

            if char in ("'", '"', "`"):
                in_string = True
                string_char = char
                current.append(char)
                continue

            if char == ";":
                current.append(char)
                stmt = "".join(current).strip()
                if stmt:
                    statements.append(stmt)
                current = []
            else:
                current.append(char)

        remaining = "".join(current).strip()
        if remaining:
            statements.append(remaining)

        return statements

    def _parse_index_suggestion(self, lines: List[str], file_path: Path) -> List[Dict]:
        suggestions = []
        current_suggestion: Optional[Dict] = None

        for line_num, line in enumerate(lines, 1):
            line_lower = line.lower()
            if "table" in line_lower and current_suggestion is None:
                current_suggestion = {
                    "start_line": line_num,
                    "end_line": line_num,
                    "evidence_lines": [],
                }
                table_match = re.search(r"table[:\s]+([\w_]+)", line, re.IGNORECASE)
                if table_match:
                    current_suggestion["table_name"] = table_match.group(1)

            elif current_suggestion:
                current_suggestion["end_line"] = line_num
                if "index" in line_lower and ("create" in line_lower or "add" in line_lower):
                    current_suggestion["suggested_index"] = line.strip()
                    current_suggestion["evidence_lines"].append(line_num)
                elif "benefit" in line_lower or "improve" in line_lower:
                    current_suggestion["benefit_description"] = line.split(":", 1)[-1].strip()
                    current_suggestion["evidence_lines"].append(line_num)
                elif line.strip() and not line.startswith("#"):
                    if "SELECT" in line.upper() or "WHERE" in line.upper():
                        current_suggestion["evidence_lines"].append(line_num)

            if current_suggestion and line.strip() == "":
                if current_suggestion.get("suggested_index"):
                    suggestions.append(current_suggestion)
                current_suggestion = None

        if current_suggestion and current_suggestion.get("suggested_index"):
            suggestions.append(current_suggestion)

        return suggestions

    def _parse_audit_report(self, content: str, lines: List[str], file_path: Path) -> Dict:
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            findings = []
            for line_num, line in enumerate(lines, 1):
                if "sql injection" in line.lower() or "inject" in line.lower():
                    findings.append({
                        "line": line_num,
                        "content": line.strip(),
                    })
            return {"findings": findings, "raw_content": content}

    def _parse_chat_history(self, content: str, file_path: Path) -> List[Dict]:
        try:
            data = json.loads(content)
            if isinstance(data, list):
                return data
            return [data]
        except json.JSONDecodeError:
            messages = []
            for line_num, line in enumerate(content.splitlines(), 1):
                if line.strip():
                    messages.append({
                        "line": line_num,
                        "content": line.strip(),
                    })
            return messages

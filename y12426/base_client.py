import subprocess
import json
import time
from typing import Dict, List, Any, Optional
from config import BASE_TOKEN


class BaseClient:
    def __init__(self, base_token: str = BASE_TOKEN):
        self.base_token = base_token

    def _clean_ansi(self, text: str) -> str:
        import re
        ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[.*?[a-zA-Z]|\].*?\x07)')
        return ansi_escape.sub('', text)

    def _run_cli(self, cmd_parts: List[str]) -> Dict[str, Any]:
        cmd = ["lark-cli", "base"] + cmd_parts
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Command failed: {' '.join(cmd)}")
            print(f"stderr: {result.stderr}")
            raise Exception(f"CLI command failed: {result.stderr}")
        try:
            cleaned = self._clean_ansi(result.stdout)
            lines = cleaned.strip().split('\n')
            json_lines = []
            for l in lines:
                l = l.strip()
                if (l.startswith('{') and l.endswith('}')) or (l.startswith('[') and l.endswith(']')):
                    json_lines.append(l)
            if json_lines:
                return json.loads(json_lines[-1])
            return {}
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON. Raw output: {result.stdout}")
            print(f"Cleaned output: {cleaned}")
            raise e

    def create_field(self, table_id: str, field_config: Dict[str, Any]) -> Dict[str, Any]:
        json_str = json.dumps(field_config, ensure_ascii=False)
        cmd = [
            "+field-create",
            "--base-token", self.base_token,
            "--table-id", table_id,
            "--json", json_str
        ]
        return self._run_cli(cmd)

    def upsert_record(self, table_id: str, record_data: Dict[str, Any], record_id: Optional[str] = None) -> Dict[str, Any]:
        json_str = json.dumps(record_data, ensure_ascii=False)
        cmd = [
            "+record-upsert",
            "--base-token", self.base_token,
            "--table-id", table_id,
            "--json", json_str
        ]
        if record_id:
            cmd.extend(["--record-id", record_id])
        return self._run_cli(cmd)

    def list_records(self, table_id: str, limit: int = 200, offset: int = 0) -> Dict[str, Any]:
        cmd = [
            "+record-list",
            "--base-token", self.base_token,
            "--table-id", table_id,
            "--limit", str(limit),
            "--offset", str(offset)
        ]
        return self._run_cli(cmd)

    def list_fields(self, table_id: str) -> Dict[str, Any]:
        cmd = [
            "+field-list",
            "--base-token", self.base_token,
            "--table-id", table_id
        ]
        return self._run_cli(cmd)

    def get_record(self, table_id: str, record_id: str) -> Dict[str, Any]:
        cmd = [
            "+record-get",
            "--base-token", self.base_token,
            "--table-id", table_id,
            "--record-id", record_id
        ]
        return self._run_cli(cmd)

    def delete_record(self, table_id: str, record_id: str) -> Dict[str, Any]:
        cmd = [
            "+record-delete",
            "--base-token", self.base_token,
            "--table-id", table_id,
            "--record-id", record_id,
            "--yes"
        ]
        return self._run_cli(cmd)

    def data_query(self, query: Dict[str, Any]) -> Dict[str, Any]:
        json_str = json.dumps(query, ensure_ascii=False)
        cmd = [
            "+data-query",
            "--base-token", self.base_token,
            "--json", json_str
        ]
        return self._run_cli(cmd)

    def get_record_history(self, table_id: str, record_id: str) -> Dict[str, Any]:
        cmd = [
            "+record-history-list",
            "--base-token", self.base_token,
            "--table-id", table_id,
            "--record-id", record_id
        ]
        return self._run_cli(cmd)

    def batch_upsert(self, table_id: str, records: List[Dict[str, Any]], delay: float = 0.5) -> List[Dict[str, Any]]:
        results = []
        for i, record in enumerate(records):
            result = self.upsert_record(table_id, record)
            results.append(result)
            if i < len(records) - 1:
                time.sleep(delay)
        return results

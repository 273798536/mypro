import json
import csv
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path

from .models import (
    SponsorshipContract,
    LivestreamRecord,
    ExposureProof,
    TournamentResult,
    SettlementContext,
)


class DataImporter:
    def __init__(self, context: SettlementContext):
        self.context = context

    def import_contracts_from_json(self, file_path: str) -> List[str]:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        imported = []
        for item in data:
            contract = SponsorshipContract(**item)
            if contract.contract_id in self.context.contracts:
                print(f"[导入] 合同 {contract.contract_id} 已存在，跳过")
                continue
            self.context.contracts[contract.contract_id] = contract
            imported.append(contract.contract_id)
            print(f"[导入] 新增合同: {contract.contract_id} - {contract.sponsor_name}")
        
        return imported

    def import_livestreams_from_json(self, file_path: str) -> List[str]:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        imported = []
        for item in data:
            record = LivestreamRecord(**item)
            contract_id = record.contract_id
            
            if contract_id not in self.context.livestreams:
                self.context.livestreams[contract_id] = []
            
            existing_ids = [r.record_id for r in self.context.livestreams[contract_id]]
            if record.record_id in existing_ids:
                print(f"[导入] 直播记录 {record.record_id} 已存在，跳过")
                continue
            
            self.context.livestreams[contract_id].append(record)
            imported.append(record.record_id)
            
            supplementary = "[补录]" if record.is_supplementary else ""
            print(f"[导入] 新增直播记录 {supplementary}: {record.record_id} - {record.stream_date}")
        
        return imported

    def import_exposures_from_json(self, file_path: str) -> List[str]:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        imported = []
        for item in data:
            proof = ExposureProof(**item)
            contract_id = proof.contract_id
            
            if contract_id not in self.context.exposures:
                self.context.exposures[contract_id] = []
            
            existing_ids = [p.proof_id for p in self.context.exposures[contract_id]]
            if proof.proof_id in existing_ids:
                print(f"[导入] 露出证明 {proof.proof_id} 已存在，跳过")
                continue
            
            self.context.exposures[contract_id].append(proof)
            imported.append(proof.proof_id)
            
            supplementary = "[补录]" if proof.is_supplementary else ""
            print(f"[导入] 新增露出证明 {supplementary}: {proof.proof_id} - {proof.exposure_type}")
        
        return imported

    def import_results_from_json(self, file_path: str) -> List[str]:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        imported = []
        for item in data:
            result = TournamentResult(**item)
            result_key = f"{result.tournament_id}_{result.team_id}"
            
            if result_key in self.context.results:
                existing = self.context.results[result_key]
                if result.is_rematch_result:
                    print(f"[导入] 检测到补赛结果: {result.result_id}")
                    print(f"  - 原名次: {existing.rank} -> 新名次: {result.rank}")
                    print(f"  - 补赛原因: {result.rematch_reason or '未说明'}")
                else:
                    print(f"[导入] 结果 {result.result_id} 已存在，跳过")
                    continue
            
            self.context.results[result_key] = result
            imported.append(result.result_id)
            
            rematch = "[补赛]" if result.is_rematch_result else ""
            print(f"[导入] 新增赛事结果 {rematch}: {result.result_id} - 第{result.rank}名")
        
        return imported

    def import_all_from_dir(self, dir_path: str) -> Dict[str, List[str]]:
        results = {}
        dir_path = Path(dir_path)
        
        contract_file = dir_path / "contracts.json"
        if contract_file.exists():
            results['contracts'] = self.import_contracts_from_json(str(contract_file))
        
        livestream_file = dir_path / "livestreams.json"
        if livestream_file.exists():
            results['livestreams'] = self.import_livestreams_from_json(str(livestream_file))
        
        exposure_file = dir_path / "exposures.json"
        if exposure_file.exists():
            results['exposures'] = self.import_exposures_from_json(str(exposure_file))
        
        result_file = dir_path / "results.json"
        if result_file.exists():
            results['results'] = self.import_results_from_json(str(result_file))
        
        return results

    def export_snapshot(self, output_path: str) -> None:
        def serialize(obj):
            if hasattr(obj, '__dict__'):
                d = obj.__dict__.copy()
                for k, v in d.items():
                    if hasattr(v, 'value'):
                        d[k] = v.value
                return d
            elif isinstance(obj, list):
                return [serialize(x) for x in obj]
            elif isinstance(obj, dict):
                return {k: serialize(v) for k, v in obj.items()}
            else:
                return obj
        
        snapshot = {
            "contracts": {k: serialize(v) for k, v in self.context.contracts.items()},
            "livestreams": {k: [serialize(x) for x in v] for k, v in self.context.livestreams.items()},
            "exposures": {k: [serialize(x) for x in v] for k, v in self.context.exposures.items()},
            "results": {k: serialize(v) for k, v in self.context.results.items()},
            "settlements": {k: serialize(v) for k, v in self.context.settlements.items()},
            "issues": {k: serialize(v) for k, v in self.context.issues.items()},
            "exported_at": datetime.now().isoformat()
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(snapshot, f, ensure_ascii=False, indent=2)
        
        print(f"[导出] 快照已保存: {output_path}")

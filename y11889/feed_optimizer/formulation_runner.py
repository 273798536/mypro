import pandas as pd
import json
from datetime import datetime
from typing import Dict, List, Optional
from .data_validator import DataValidator
from .lp_solver import LPSolver


class FormulationRunner:
    def __init__(self, history_dir: str = "./history"):
        self.validator = DataValidator()
        self.solver = LPSolver()
        self.history_dir = history_dir
        self.run_history = []
        self.current_run_id = 0

    def run_formulation(self, ingredients_file: str, constraints: Dict, 
                        run_name: Optional[str] = None) -> Dict:
        self.current_run_id += 1
        
        df = pd.read_excel(ingredients_file) if ingredients_file.endswith('.xlsx') else pd.read_csv(ingredients_file)
        
        validated_df, errors, warnings = self.validator.validate_ingredients(df)
        
        if errors:
            return {
                'run_id': self.current_run_id,
                'run_name': run_name or f"运行_{self.current_run_id}",
                'timestamp': datetime.now().isoformat(),
                '状态': '数据错误',
                '数据错误': errors,
                '数据警告': warnings,
                '可行': False
            }

        const_valid, const_errors = self.validator.validate_nutrition_constraints(constraints)
        if not const_valid:
            return {
                'run_id': self.current_run_id,
                'run_name': run_name or f"运行_{self.current_run_id}",
                'timestamp': datetime.now().isoformat(),
                '状态': '约束错误',
                '约束错误': const_errors,
                '数据警告': warnings,
                '可行': False
            }

        result = self.solver.solve(validated_df, constraints)
        
        run_record = {
            'run_id': self.current_run_id,
            'run_name': run_name or f"运行_{self.current_run_id}",
            'timestamp': datetime.now().isoformat(),
            '原料数据': validated_df.to_dict('records'),
            '约束条件': constraints,
            '数据警告': warnings,
            **result
        }
        
        self.run_history.append(run_record)
        return run_record

    def get_last_run(self) -> Optional[Dict]:
        return self.run_history[-1] if self.run_history else None

    def get_run(self, run_id: int) -> Optional[Dict]:
        for run in self.run_history:
            if run['run_id'] == run_id:
                return run
        return None

    def get_all_runs(self) -> List[Dict]:
        return self.run_history

    def compare_runs(self, run_id1: int, run_id2: int) -> Dict:
        run1 = self.get_run(run_id1)
        run2 = self.get_run(run_id2)
        
        if not run1 or not run2:
            return {'error': '找不到指定的运行记录'}

        from .comparator import SolutionComparator
        comparator = SolutionComparator()
        return comparator.compare(run1, run2)

    def save_run(self, run_id: int, filepath: str):
        run = self.get_run(run_id)
        if run:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(run, f, ensure_ascii=False, indent=2)

    def load_run(self, filepath: str) -> Dict:
        with open(filepath, 'r', encoding='utf-8') as f:
            run = json.load(f)
        self.run_history.append(run)
        if run['run_id'] > self.current_run_id:
            self.current_run_id = run['run_id']
        return run

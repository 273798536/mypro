import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import glob


class HistoryManager:
    def __init__(self, history_dir: str = "./history"):
        self.history_dir = history_dir
        os.makedirs(history_dir, exist_ok=True)

    def save_run(self, run_data: Dict) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        run_id = run_data.get('run_id', timestamp)
        filename = f"run_{run_id}_{timestamp}.json"
        filepath = os.path.join(self.history_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(run_data, f, ensure_ascii=False, indent=2)
        
        return filepath

    def load_run(self, filepath: str) -> Dict:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)

    def list_runs(self, start_date: Optional[str] = None, 
                  end_date: Optional[str] = None) -> List[Dict]:
        runs = []
        pattern = os.path.join(self.history_dir, "run_*.json")
        
        for filepath in glob.glob(pattern):
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    run_data = json.load(f)
                
                run_date = datetime.fromisoformat(run_data.get('timestamp', '2000-01-01'))
                
                if start_date:
                    if run_date < datetime.fromisoformat(start_date):
                        continue
                if end_date:
                    if run_date > datetime.fromisoformat(end_date):
                        continue
                
                runs.append({
                    'filepath': filepath,
                    'run_id': run_data.get('run_id'),
                    'run_name': run_data.get('run_name'),
                    'timestamp': run_data.get('timestamp'),
                    '状态': run_data.get('状态'),
                    '可行': run_data.get('可行', False),
                    '总成本(元)': run_data.get('总成本(元)', 0)
                })
            except Exception as e:
                print(f"读取文件失败 {filepath}: {e}")
        
        return sorted(runs, key=lambda x: x['timestamp'], reverse=True)

    def get_monthly_runs(self, year: int, month: int) -> List[Dict]:
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year+1}-01-01"
        else:
            end_date = f"{year}-{month+1:02d}-01"
        return self.list_runs(start_date, end_date)

    def get_run_by_id(self, run_id: int) -> Optional[Dict]:
        for run_info in self.list_runs():
            if run_info['run_id'] == run_id:
                return self.load_run(run_info['filepath'])
        return None

    def get_latest_run(self) -> Optional[Dict]:
        runs = self.list_runs()
        if runs:
            return self.load_run(runs[0]['filepath'])
        return None

    def delete_run(self, run_id: int) -> bool:
        for run_info in self.list_runs():
            if run_info['run_id'] == run_id:
                os.remove(run_info['filepath'])
                return True
        return False

    def get_monthly_summary(self, year: int, month: int) -> Dict:
        runs = self.get_monthly_runs(year, month)
        
        if not runs:
            return {'message': '该月无运行记录'}
        
        total_runs = len(runs)
        feasible_runs = [r for r in runs if r.get('可行', False)]
        costs = [r.get('总成本(元)', 0) for r in runs if r.get('总成本(元)', 0) > 0]
        
        return {
            '月份': f"{year}年{month}月",
            '总运行次数': total_runs,
            '可行方案数': len(feasible_runs),
            '成功率': round(len(feasible_runs) / total_runs * 100, 1) if total_runs > 0 else 0,
            '成本统计': {
                '最低成本': min(costs) if costs else 0,
                '最高成本': max(costs) if costs else 0,
                '平均成本': round(sum(costs) / len(costs), 2) if costs else 0
            },
            '运行记录': runs
        }

    def export_to_excel(self, year: int, month: int, output_file: str):
        import pandas as pd
        
        summary = self.get_monthly_summary(year, month)
        runs = summary.get('运行记录', [])
        
        with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
            summary_df = pd.DataFrame([{
                '项目': ['总运行次数', '可行方案数', '成功率', '最低成本', '最高成本', '平均成本'],
                '数值': [
                    summary['总运行次数'],
                    summary['可行方案数'],
                    f"{summary['成功率']}%",
                    summary['成本统计']['最低成本'],
                    summary['成本统计']['最高成本'],
                    summary['成本统计']['平均成本']
                ]
            }])
            summary_df.to_excel(writer, sheet_name='月度汇总', index=False)
            
            if runs:
                runs_df = pd.DataFrame(runs)
                runs_df.to_excel(writer, sheet_name='运行明细', index=False)
        
        return output_file

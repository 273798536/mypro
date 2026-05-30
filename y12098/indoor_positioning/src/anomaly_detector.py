import pandas as pd
import numpy as np
from scipy import spatial
from typing import Dict, List, Tuple
import os


class AnomalyDetector:
    def __init__(self, output_dir: str = 'output'):
        self.output_dir = output_dir
        self.floor_jumps: List[Dict] = []
        self.beacon_duplicates: List[Dict] = []
        self.trajectory_drifts: List[Dict] = []
        self.anomalies_df: pd.DataFrame = None
        os.makedirs(output_dir, exist_ok=True)
    
    def detect_all(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        if df.empty:
            return df, {}
        
        df = df.sort_values('timestamp').reset_index(drop=True)
        df = self._detect_floor_jumps(df)
        df = self._detect_beacon_duplicates(df)
        df = self._detect_trajectory_drifts(df)
        
        df['is_anomaly'] = df['is_floor_jump'] | df['is_beacon_duplicate'] | df['is_trajectory_drift']
        df['anomaly_types'] = df.apply(self._collect_anomaly_types, axis=1)
        
        self._build_anomalies_dataframe(df)
        stats = self._get_statistics(df)
        self._export_anomalies()
        
        return df, stats
    
    def _detect_floor_jumps(self, df: pd.DataFrame) -> pd.DataFrame:
        df['is_floor_jump'] = False
        df['floor_jump_type'] = ''
        
        floors = df['floor'].values
        timestamps = df['timestamp'].values
        
        for i in range(1, len(df) - 1):
            current_floor = floors[i]
            prev_floor = floors[i - 1]
            next_floor = floors[i + 1]
            
            if current_floor != prev_floor and current_floor != next_floor and prev_floor == next_floor:
                time_span = timestamps[i + 1] - timestamps[i - 1]
                
                if time_span < 30:
                    df.at[i, 'is_floor_jump'] = True
                    df.at[i, 'floor_jump_type'] = 'single_point_jump'
                    self.floor_jumps.append({
                        'index': i,
                        'original_line': df.at[i, 'original_line'],
                        'timestamp': df.at[i, 'timestamp'],
                        'from_floor': prev_floor,
                        'jump_floor': current_floor,
                        'to_floor': next_floor,
                        'duration_seconds': time_span,
                        'type': 'single_point_jump',
                        'description': f'单点楼层串跳: 从{prev_floor}层跳到{current_floor}层，{time_span:.1f}秒后回到{next_floor}层'
                    })
        
        for i in range(len(df) - 3):
            segment = floors[i:i + 4]
            times = timestamps[i:i + 4]
            main_floor = segment[0]
            
            if all(f != main_floor for f in segment[1:3]) and segment[3] == main_floor:
                duration = times[3] - times[0]
                if duration < 60:
                    for j in range(i + 1, i + 3):
                        if j < len(df) and not df.at[j, 'is_floor_jump']:
                            df.at[j, 'is_floor_jump'] = True
                            df.at[j, 'floor_jump_type'] = 'multi_point_jump'
                    self.floor_jumps.append({
                        'index': i,
                        'original_line': df.at[i, 'original_line'],
                        'timestamp': df.at[i, 'timestamp'],
                        'from_floor': main_floor,
                        'jump_floor': segment[1],
                        'to_floor': main_floor,
                        'duration_seconds': duration,
                        'type': 'multi_point_jump',
                        'description': f'多点楼层串跳: {len(segment[1:3])}个点从{main_floor}层跳到{segment[1]}层，{duration:.1f}秒后返回'
                    })
        
        return df
    
    def _detect_beacon_duplicates(self, df: pd.DataFrame) -> pd.DataFrame:
        df['is_beacon_duplicate'] = False
        df['beacon_duplicate_group'] = -1
        
        df['timestamp_rounded'] = df['timestamp'].round(1)
        grouped = df.groupby(['timestamp_rounded', 'beacon_id'])
        group_id = 0
        
        for (ts, beacon), group in grouped:
            if len(group) > 1:
                for idx in group.index:
                    df.at[idx, 'is_beacon_duplicate'] = True
                    df.at[idx, 'beacon_duplicate_group'] = group_id
                
                positions = group[['x', 'y', 'floor']].values
                distances = spatial.distance.pdist(positions[:, :2])
                max_dist = np.max(distances) if len(distances) > 0 else 0
                
                self.beacon_duplicates.append({
                    'group_id': group_id,
                    'timestamp': ts,
                    'beacon_id': beacon,
                    'count': len(group),
                    'max_distance_m': max_dist,
                    'original_lines': group['original_line'].tolist(),
                    'description': f'信标重号: 时间{ts}，信标{beacon}出现{len(group)}次，最大间距{max_dist:.2f}米',
                    'positions': positions.tolist()
                })
                group_id += 1
        
        return df
    
    def _detect_trajectory_drifts(self, df: pd.DataFrame) -> pd.DataFrame:
        df['is_trajectory_drift'] = False
        df['drift_type'] = ''
        df['speed_m_s'] = 0.0
        
        coords = df[['x', 'y']].values
        timestamps = df['timestamp'].values
        floors = df['floor'].values
        
        for i in range(1, len(df)):
            time_diff = timestamps[i] - timestamps[i - 1]
            if time_diff <= 0:
                continue
            
            distance = np.linalg.norm(coords[i] - coords[i - 1])
            speed = distance / time_diff
            df.at[i, 'speed_m_s'] = speed
            
            if floors[i] == floors[i - 1] and speed > 5.0:
                df.at[i, 'is_trajectory_drift'] = True
                df.at[i, 'drift_type'] = 'high_speed'
                self.trajectory_drifts.append({
                    'index': i,
                    'original_line': df.at[i, 'original_line'],
                    'timestamp': timestamps[i],
                    'speed': speed,
                    'distance': distance,
                    'time_diff': time_diff,
                    'floor': floors[i],
                    'type': 'high_speed',
                    'description': f'轨迹漂移(高速): 速度{speed:.2f}m/s，{time_diff:.1f}秒移动{distance:.2f}米'
                })
        
        for i in range(2, len(df)):
            if floors[i] != floors[i - 1]:
                continue
            
            p0 = coords[i - 2]
            p1 = coords[i - 1]
            p2 = coords[i]
            
            v1 = p1 - p0
            v2 = p2 - p1
            
            if np.linalg.norm(v1) > 0 and np.linalg.norm(v2) > 0:
                cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
                cos_angle = np.clip(cos_angle, -1.0, 1.0)
                angle = np.arccos(cos_angle)
                
                if angle > 2.5 and np.linalg.norm(v2) > 3.0:
                    if not df.at[i, 'is_trajectory_drift']:
                        df.at[i, 'is_trajectory_drift'] = True
                        df.at[i, 'drift_type'] = 'sudden_turn'
                        self.trajectory_drifts.append({
                            'index': i,
                            'original_line': df.at[i, 'original_line'],
                            'timestamp': timestamps[i],
                            'angle_deg': np.degrees(angle),
                            'distance': np.linalg.norm(v2),
                            'floor': floors[i],
                            'type': 'sudden_turn',
                            'description': f'轨迹漂移(急转): 转角{np.degrees(angle):.1f}°，跳距{np.linalg.norm(v2):.2f}米'
                        })
        
        return df
    
    def _collect_anomaly_types(self, row: pd.Series) -> str:
        types = []
        if row['is_floor_jump']:
            types.append('楼层串跳')
        if row['is_beacon_duplicate']:
            types.append('信标重号')
        if row['is_trajectory_drift']:
            types.append('轨迹漂移')
        return ','.join(types)
    
    def _build_anomalies_dataframe(self, df: pd.DataFrame):
        anomaly_rows = df[df['is_anomaly']].copy()
        self.anomalies_df = anomaly_rows
    
    def _get_statistics(self, df: pd.DataFrame) -> Dict:
        total_points = len(df)
        anomaly_points = df['is_anomaly'].sum()
        
        return {
            'total_points': total_points,
            'anomaly_points': int(anomaly_points),
            'normal_points': int(total_points - anomaly_points),
            'anomaly_percentage': (anomaly_points / total_points * 100) if total_points > 0 else 0,
            'floor_jumps': len(self.floor_jumps),
            'beacon_duplicates': len(self.beacon_duplicates),
            'trajectory_drifts': len(self.trajectory_drifts),
            'floor_jump_details': self.floor_jumps,
            'beacon_duplicate_details': self.beacon_duplicates,
            'trajectory_drift_details': self.trajectory_drifts
        }
    
    def _export_anomalies(self):
        if self.anomalies_df is not None and not self.anomalies_df.empty:
            output_path = os.path.join(self.output_dir, 'anomalies_all.csv')
            self.anomalies_df.to_csv(output_path, index=False, encoding='utf-8-sig')
            print(f"All anomalies exported to: {output_path}")
        
        if self.floor_jumps:
            df = pd.DataFrame(self.floor_jumps)
            df.to_csv(os.path.join(self.output_dir, 'floor_jumps.csv'), index=False, encoding='utf-8-sig')
            print(f"Floor jumps exported to: {os.path.join(self.output_dir, 'floor_jumps.csv')}")
        
        if self.beacon_duplicates:
            df = pd.DataFrame(self.beacon_duplicates)
            df.to_csv(os.path.join(self.output_dir, 'beacon_duplicates.csv'), index=False, encoding='utf-8-sig')
        
        if self.trajectory_drifts:
            df = pd.DataFrame(self.trajectory_drifts)
            df.to_csv(os.path.join(self.output_dir, 'trajectory_drifts.csv'), index=False, encoding='utf-8-sig')

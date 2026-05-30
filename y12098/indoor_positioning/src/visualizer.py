import plotly.graph_objects as go
import plotly.io as pio
import pandas as pd
import numpy as np
import os
from typing import Dict, List


class Visualizer:
    FLOOR_COLORS = {
        1: '#1f77b4',
        2: '#2ca02c',
        3: '#ff7f0e',
        4: '#d62728',
        5: '#9467bd',
        6: '#8c564b',
        7: '#e377c2',
        8: '#7f7f7f'
    }
    
    ANOMALY_MARKERS = {
        'floor_jump': {'symbol': 'x', 'size': 14, 'color': '#ff0000', 'line_width': 3},
        'beacon_duplicate': {'symbol': 'diamond', 'size': 12, 'color': '#ff9900'},
        'trajectory_drift': {'symbol': 'square-open', 'size': 14, 'color': '#9900ff', 'line_width': 3}
    }
    
    def __init__(self, output_dir: str = 'output'):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def create_3d_visualization(self, df: pd.DataFrame, anomaly_stats: Dict, 
                                 floor_bounds: Dict = None) -> go.Figure:
        if df.empty:
            return go.Figure()
        
        fig = go.Figure()
        normal_df = df[~df['is_anomaly']].copy()
        anomaly_df = df[df['is_anomaly']].copy()
        
        floors = sorted(df['floor'].unique())
        for floor in floors:
            self._add_floor_plane(fig, floor, df, floor_bounds)
        
        if not normal_df.empty:
            for floor in floors:
                floor_normal = normal_df[normal_df['floor'] == floor]
                if not floor_normal.empty:
                    self._add_normal_trajectory(fig, floor_normal, floor)
        
        if not anomaly_df.empty:
            self._add_anomaly_points(fig, anomaly_df)
        
        self._add_floor_jump_connections(fig, df, anomaly_stats)
        
        self._add_floor_labels(fig, floors)
        
        fig.update_layout(
            scene=dict(
                xaxis_title='X坐标 (米)',
                yaxis_title='Y坐标 (米)',
                zaxis_title='楼层',
                zaxis=dict(
                    tickvals=floors,
                    ticktext=[f'{f}层' for f in floors],
                    dtick=1
                ),
                aspectmode='data'
            ),
            title=dict(
                text='室内定位轨迹 - 异常检测可视化',
                font=dict(size=20)
            ),
            legend=dict(
                x=0.02,
                y=0.98,
                bgcolor='rgba(255,255,255,0.9)',
                bordercolor='black',
                borderwidth=1
            ),
            margin=dict(l=0, r=0, t=40, b=0),
            width=1200,
            height=800
        )
        
        return fig
    
    def _add_floor_plane(self, fig: go.Figure, floor: int, df: pd.DataFrame, 
                         floor_bounds: Dict = None):
        if floor_bounds and floor in floor_bounds:
            bounds = floor_bounds[floor]
            x_min, x_max = bounds['x_min'], bounds['x_max']
            y_min, y_max = bounds['y_min'], bounds['y_max']
        else:
            floor_df = df[df['floor'] == floor]
            x_min, x_max = floor_df['x'].min() - 5, floor_df['x'].max() + 5
            y_min, y_max = floor_df['y'].min() - 5, floor_df['y'].max() + 5
        
        color = self.FLOOR_COLORS.get(floor, '#cccccc')
        
        fig.add_trace(go.Mesh3d(
            x=[x_min, x_max, x_max, x_min],
            y=[y_min, y_min, y_max, y_max],
            z=[floor, floor, floor, floor],
            i=[0, 0],
            j=[1, 2],
            k=[2, 3],
            color=color,
            opacity=0.15,
            name=f'{floor}层平面',
            showlegend=False,
            hoverinfo='none'
        ))
    
    def _add_normal_trajectory(self, fig: go.Figure, floor_df: pd.DataFrame, floor: int):
        color = self.FLOOR_COLORS.get(floor, '#333333')
        
        fig.add_trace(go.Scatter3d(
            x=floor_df['x'],
            y=floor_df['y'],
            z=floor_df['floor'],
            mode='lines+markers',
            marker=dict(
                size=4,
                color=color,
                opacity=0.8
            ),
            line=dict(
                color=color,
                width=3
            ),
            name=f'{floor}层正常轨迹',
            text=[f'时间:{t:.1f}s<br>位置:({x:.1f},{y:.1f})<br>信标:{b}'
                  for t, x, y, b in zip(floor_df['timestamp'], 
                                       floor_df['x'], 
                                       floor_df['y'], 
                                       floor_df['beacon_id'])],
            hoverinfo='text'
        ))
    
    def _add_anomaly_points(self, fig: go.Figure, anomaly_df: pd.DataFrame):
        floor_jumps = anomaly_df[anomaly_df['is_floor_jump']]
        if not floor_jumps.empty:
            marker = self.ANOMALY_MARKERS['floor_jump']
            fig.add_trace(go.Scatter3d(
                x=floor_jumps['x'],
                y=floor_jumps['y'],
                z=floor_jumps['floor'],
                mode='markers+text',
                marker=dict(
                    symbol=marker['symbol'],
                    size=marker['size'],
                    color=marker['color'],
                    line=dict(width=marker['line_width'], color='black')
                ),
                text=[f'⚠️楼层串跳' for _ in range(len(floor_jumps))],
                textposition='top center',
                textfont=dict(color=marker['color'], size=12, family='Arial Black'),
                name='🚨 楼层串跳',
                hovertext=[f'⚠️ 楼层串跳<br>原始行:{ol}<br>时间:{t:.1f}s<br>从{ff}层跳到{jf}层<br>{desc}'
                          for ol, t, ff, jf, desc in zip(floor_jumps['original_line'],
                                                          floor_jumps['timestamp'],
                                                          floor_jumps.get('from_floor', ['?']*len(floor_jumps)),
                                                          floor_jumps['floor'],
                                                          [self._get_jump_description(floor_jumps, idx) for idx in floor_jumps.index])],
                hoverinfo='text'
            ))
        
        beacon_dup = anomaly_df[anomaly_df['is_beacon_duplicate'] & ~anomaly_df['is_floor_jump']]
        if not beacon_dup.empty:
            marker = self.ANOMALY_MARKERS['beacon_duplicate']
            fig.add_trace(go.Scatter3d(
                x=beacon_dup['x'],
                y=beacon_dup['y'],
                z=beacon_dup['floor'],
                mode='markers+text',
                marker=dict(
                    symbol=marker['symbol'],
                    size=marker['size'],
                    color=marker['color'],
                    line=dict(width=2, color='black')
                ),
                text=[f'🔶信标重号' for _ in range(len(beacon_dup))],
                textposition='top center',
                textfont=dict(color=marker['color'], size=11),
                name='🔶 信标重号',
                hovertext=[f'🔶 信标重号<br>原始行:{ol}<br>时间:{t:.1f}s<br>信标:{b}'
                          for ol, t, b in zip(beacon_dup['original_line'],
                                              beacon_dup['timestamp'],
                                              beacon_dup['beacon_id'])],
                hoverinfo='text'
            ))
        
        drift = anomaly_df[anomaly_df['is_trajectory_drift'] & ~anomaly_df['is_floor_jump'] & ~anomaly_df['is_beacon_duplicate']]
        if not drift.empty:
            marker = self.ANOMALY_MARKERS['trajectory_drift']
            fig.add_trace(go.Scatter3d(
                x=drift['x'],
                y=drift['y'],
                z=drift['floor'],
                mode='markers+text',
                marker=dict(
                    symbol=marker['symbol'],
                    size=marker['size'],
                    color=marker['color'],
                    line=dict(width=2, color='black')
                ),
                text=[f'🔺轨迹漂移' for _ in range(len(drift))],
                textposition='top center',
                textfont=dict(color=marker['color'], size=11),
                name='🔺 轨迹漂移',
                hovertext=[f'🔺 轨迹漂移<br>原始行:{ol}<br>时间:{t:.1f}s<br>速度:{s:.2f}m/s<br>类型:{dt}'
                          for ol, t, s, dt in zip(drift['original_line'],
                                                   drift['timestamp'],
                                                   drift['speed_m_s'],
                                                   drift['drift_type'])],
                hoverinfo='text'
            ))
    
    def _add_floor_jump_connections(self, fig: go.Figure, df: pd.DataFrame, anomaly_stats: Dict):
        floor_jumps = anomaly_stats.get('floor_jump_details', [])
        
        for jump in floor_jumps:
            idx = jump.get('index', 0)
            if idx > 0 and idx < len(df) - 1:
                prev_row = df.iloc[idx - 1]
                jump_row = df.iloc[idx]
                next_row = df.iloc[min(idx + 1, len(df) - 1)]
                
                fig.add_trace(go.Scatter3d(
                    x=[prev_row['x'], jump_row['x'], next_row['x']],
                    y=[prev_row['y'], jump_row['y'], next_row['y']],
                    z=[prev_row['floor'], jump_row['floor'], next_row['floor']],
                    mode='lines',
                    line=dict(
                        color='red',
                        width=4,
                        dash='dash'
                    ),
                    name='楼层串跳路径',
                    showlegend= (jump == floor_jumps[0]),
                    hovertext=[f'跳前: {prev_row["floor"]}层',
                               f'串跳: {jump_row["floor"]}层 ⚠️',
                               f'跳后: {next_row["floor"]}层'],
                    hoverinfo='text'
                ))
    
    def _add_floor_labels(self, fig: go.Figure, floors: List[int]):
        for floor in floors:
            fig.add_trace(go.Scatter3d(
                x=[0],
                y=[0],
                z=[floor + 0.3],
                mode='text',
                text=[f'══════ {floor}层 ══════'],
                textposition='middle center',
                textfont=dict(
                    color=self.FLOOR_COLORS.get(floor, '#333333'),
                    size=16,
                    family='Arial Black'
                ),
                name=f'{floor}层标签',
                showlegend=False,
                hoverinfo='none'
            ))
    
    def _get_jump_description(self, df: pd.DataFrame, idx: int) -> str:
        if idx > 0 and idx < len(df) - 1:
            prev_floor = df.iloc[idx - 1]['floor']
            curr_floor = df.iloc[idx]['floor']
            next_floor = df.iloc[idx + 1]['floor']
            return f'{prev_floor}→{curr_floor}→{next_floor}层'
        return '串跳'
    
    def create_2d_floor_view(self, df: pd.DataFrame, anomaly_stats: Dict) -> Dict[int, go.Figure]:
        figs = {}
        floors = sorted(df['floor'].unique())
        
        for floor in floors:
            fig = go.Figure()
            
            floor_df = df[df['floor'] == floor]
            normal_df = floor_df[~floor_df['is_anomaly']]
            anomaly_df = floor_df[floor_df['is_anomaly']]
            
            if not normal_df.empty:
                color = self.FLOOR_COLORS.get(floor, '#333333')
                fig.add_trace(go.Scatter(
                    x=normal_df['x'],
                    y=normal_df['y'],
                    mode='lines+markers',
                    marker=dict(size=6, color=color),
                    line=dict(color=color, width=2),
                    name=f'{floor}层正常轨迹',
                    text=[f'时间:{t:.1f}s' for t in normal_df['timestamp']],
                    hoverinfo='text'
                ))
            
            floor_jumps = anomaly_df[anomaly_df['is_floor_jump']]
            if not floor_jumps.empty:
                fig.add_trace(go.Scatter(
                    x=floor_jumps['x'],
                    y=floor_jumps['y'],
                    mode='markers+text',
                    marker=dict(symbol='x', size=14, color='red', line_width=3),
                    text=[f'⚠️串跳到{floor}层' for _ in range(len(floor_jumps))],
                    textposition='top center',
                    textfont=dict(color='red', size=12, family='Arial Black'),
                    name='🚨 楼层串跳',
                    hovertext=[f'⚠️ 楼层串跳<br>原始行:{ol}<br>时间:{t:.1f}s'
                              for ol, t in zip(floor_jumps['original_line'], floor_jumps['timestamp'])],
                    hoverinfo='text'
                ))
            
            drift = anomaly_df[anomaly_df['is_trajectory_drift']]
            if not drift.empty:
                fig.add_trace(go.Scatter(
                    x=drift['x'],
                    y=drift['y'],
                    mode='markers+text',
                    marker=dict(symbol='square-open', size=14, color='#9900ff', line_width=3),
                    text=[f'🔺漂移' for _ in range(len(drift))],
                    textposition='top center',
                    textfont=dict(color='#9900ff', size=11),
                    name='🔺 轨迹漂移',
                    hoverinfo='text'
                ))
            
            fig.update_layout(
                title=f'{floor}层平面轨迹图',
                xaxis_title='X坐标 (米)',
                yaxis_title='Y坐标 (米)',
                legend=dict(x=0.02, y=0.98, bgcolor='rgba(255,255,255,0.9)'),
                width=800,
                height=600
            )
            figs[floor] = fig
        
        return figs
    
    def save_figure(self, fig: go.Figure, filename: str):
        filepath = os.path.join(self.output_dir, filename)
        pio.write_html(fig, filepath, include_plotlyjs='cdn')
        print(f"Figure saved to: {filepath}")
        return filepath

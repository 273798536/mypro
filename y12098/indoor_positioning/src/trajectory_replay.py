import plotly.graph_objects as go
import pandas as pd
import numpy as np
import os
from typing import Dict, List


class TrajectoryReplay:
    def __init__(self, output_dir: str = 'output'):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def create_replay_animation(self, df: pd.DataFrame, anomaly_stats: Dict) -> go.Figure:
        if df.empty:
            return go.Figure()
        
        df = df.sort_values('timestamp').reset_index(drop=True)
        timestamps = df['timestamp'].values
        
        frames = []
        for i in range(1, len(df) + 1):
            current_df = df.iloc[:i]
            frame_data = self._build_frame_data(current_df, i - 1)
            frames.append(go.Frame(data=frame_data, name=str(i)))
        
        fig = go.Figure(
            data=self._build_frame_data(df.iloc[:1], 0),
            layout=self._build_layout(df, timestamps),
            frames=frames
        )
        
        fig.update_layout(
            updatemenus=[{
                'buttons': [
                    {
                        'args': [None, {'frame': {'duration': 300, 'redraw': True},
                                       'fromcurrent': True, 'transition': {'duration': 100}}],
                        'label': '▶ 播放',
                        'method': 'animate'
                    },
                    {
                        'args': [[None], {'frame': {'duration': 0, 'redraw': True},
                                          'mode': 'immediate', 'transition': {'duration': 0}}],
                        'label': '⏸ 暂停',
                        'method': 'animate'
                    }
                ],
                'direction': 'left',
                'pad': {'r': 10, 't': 87},
                'showactive': False,
                'type': 'buttons',
                'x': 0.1,
                'xanchor': 'right',
                'y': 0,
                'yanchor': 'top'
            }],
            sliders=[{
                'active': 0,
                'yanchor': 'top',
                'xanchor': 'left',
                'currentvalue': {
                    'font': {'size': 16},
                    'prefix': '时间: ',
                    'suffix': 's',
                    'visible': True,
                    'xanchor': 'right'
                },
                'transition': {'duration': 200},
                'pad': {'b': 10, 't': 50},
                'len': 0.9,
                'x': 0.1,
                'y': 0,
                'steps': [
                    {
                        'args': [[str(k)], {'frame': {'duration': 200, 'redraw': True},
                                           'mode': 'immediate',
                                           'transition': {'duration': 100}}],
                        'label': f'{timestamps[k-1]:.1f}' if k > 0 else '0',
                        'method': 'animate'
                    } for k in range(1, len(frames) + 1)
                ]
            }]
        )
        
        return fig
    
    def _build_frame_data(self, df: pd.DataFrame, current_idx: int) -> List:
        data = []
        
        floors = sorted(df['floor'].unique())
        for floor in floors:
            x_min, x_max = df['x'].min() - 5, df['x'].max() + 5
            y_min, y_max = df['y'].min() - 5, df['y'].max() + 5
            color = self._get_floor_color(floor)
            
            data.append(go.Mesh3d(
                x=[x_min, x_max, x_max, x_min],
                y=[y_min, y_min, y_max, y_max],
                z=[floor, floor, floor, floor],
                i=[0, 0],
                j=[1, 2],
                k=[2, 3],
                color=color,
                opacity=0.1,
                showlegend=False,
                hoverinfo='none'
            ))
        
        normal_df = df[~df['is_anomaly']]
        if not normal_df.empty:
            for floor in floors:
                floor_normal = normal_df[normal_df['floor'] == floor]
                if not floor_normal.empty:
                    color = self._get_floor_color(floor)
                    data.append(go.Scatter3d(
                        x=floor_normal['x'],
                        y=floor_normal['y'],
                        z=floor_normal['floor'],
                        mode='lines+markers',
                        marker=dict(size=4, color=color, opacity=0.8),
                        line=dict(color=color, width=3),
                        name=f'{floor}层正常轨迹',
                        showlegend=(current_idx == len(df) - 1)
                    ))
        
        anomaly_df = df[df['is_anomaly']]
        if not anomaly_df.empty:
            floor_jumps = anomaly_df[anomaly_df['is_floor_jump']]
            if not floor_jumps.empty:
                data.append(go.Scatter3d(
                    x=floor_jumps['x'],
                    y=floor_jumps['y'],
                    z=floor_jumps['floor'],
                    mode='markers+text',
                    marker=dict(symbol='x', size=14, color='red', line_width=3),
                    text=['⚠️楼层串跳' for _ in range(len(floor_jumps))],
                    textposition='top center',
                    textfont=dict(color='red', size=12, family='Arial Black'),
                    name='🚨 楼层串跳'
                ))
            
            drift = anomaly_df[anomaly_df['is_trajectory_drift']]
            if not drift.empty:
                data.append(go.Scatter3d(
                    x=drift['x'],
                    y=drift['y'],
                    z=drift['floor'],
                    mode='markers+text',
                    marker=dict(symbol='square-open', size=14, color='#9900ff', line_width=3),
                    text=['🔺漂移' for _ in range(len(drift))],
                    textposition='top center',
                    textfont=dict(color='#9900ff', size=11),
                    name='🔺 轨迹漂移'
                ))
        
        if current_idx < len(df):
            current_point = df.iloc[current_idx]
            is_anomaly = current_point['is_anomaly']
            anomaly_type = current_point.get('anomaly_types', '')
            
            data.append(go.Scatter3d(
                x=[current_point['x']],
                y=[current_point['y']],
                z=[current_point['floor']],
                mode='markers+text',
                marker=dict(
                    symbol='circle',
                    size=18,
                    color='yellow' if not is_anomaly else 'red',
                    line=dict(width=4, color='black')
                ),
                text=[f'📍当前位置<br>{anomaly_type}' if is_anomaly else '📍当前位置'],
                textposition='top center',
                textfont=dict(color='black', size=14, family='Arial Black'),
                name='当前位置'
            ))
        
        return data
    
    def _build_layout(self, df: pd.DataFrame, timestamps: np.ndarray) -> go.Layout:
        floors = sorted(df['floor'].unique())
        return go.Layout(
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
                text='室内定位轨迹回放 - 带异常检测',
                font=dict(size=20)
            ),
            legend=dict(
                x=0.02,
                y=0.98,
                bgcolor='rgba(255,255,255,0.9)',
                bordercolor='black',
                borderwidth=1
            ),
            margin=dict(l=0, r=0, t=40, b=100),
            width=1200,
            height=900
        )
    
    def _get_floor_color(self, floor: int) -> str:
        colors = {
            1: '#1f77b4', 2: '#2ca02c', 3: '#ff7f0e', 4: '#d62728',
            5: '#9467bd', 6: '#8c564b', 7: '#e377c2', 8: '#7f7f7f'
        }
        return colors.get(floor, '#cccccc')
    
    def save_replay(self, fig: go.Figure, filename: str = 'trajectory_replay.html'):
        filepath = os.path.join(self.output_dir, filename)
        fig.write_html(filepath, include_plotlyjs='cdn')
        print(f"Trajectory replay saved to: {filepath}")
        return filepath

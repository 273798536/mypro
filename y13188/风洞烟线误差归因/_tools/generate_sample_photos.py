#!/usr/bin/env python3
"""
生成风洞烟线实验的模拟现场照片（SVG格式）
包括：原始照片12张 + 补备注照片12张 + 旧版本截图5张
"""
import os
import math

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG_DIR = os.path.join(BASE_DIR, "01现场照片归档", "原始照片")
NOTE_DIR = os.path.join(BASE_DIR, "01现场照片归档", "补备注照片")
OLD_DIR = os.path.join(BASE_DIR, "01现场照片归档", "旧版本截图")

for d in [ORIG_DIR, NOTE_DIR, OLD_DIR]:
    os.makedirs(d, exist_ok=True)


def svg_header(w=800, h=600):
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" style="background:#2a2a2a;">
<style>
  .label {{ font-family: monospace; font-size: 14px; fill: #aaa; }}
  .title {{ font-family: sans-serif; font-size: 18px; fill: #fff; font-weight: bold; }}
  .timestamp {{ font-family: monospace; font-size: 12px; fill: #6f6; }}
  .grid {{ stroke: #3a3a3a; stroke-width: 1; }}
</style>
'''

def svg_footer():
    return '</svg>\n'


def add_timestamp(svg_content, label, photo_id):
    return svg_content + f'''
<text x="20" y="30" class="title">{label}</text>
<text x="20" y="55" class="timestamp">2026-06-14 14:{(photo_id*3+5):02d}:{(photo_id*7+12)%60:02d}</text>
<text x="20" y="580" class="timestamp">IMG_20260614_{photo_id:03d}_ORG.jpg  |  WindTunnel-A / Run07</text>
'''


# ---------- 第1-3张：标定物和全景 ----------
def photo_001_calibration_ruler():
    svg = svg_header()
    # 风洞壁面
    svg += '<rect x="50" y="100" width="700" height="400" fill="#333" stroke="#555" stroke-width="2"/>'
    # 标定标尺（1米长，分10大格）
    svg += '<rect x="100" y="480" width="600" height="20" fill="#eee"/>'
    for i in range(11):
        x = 100 + i * 60
        svg += f'<line x1="{x}" y1="475" x2="{x}" y2="500" stroke="#000" stroke-width="2"/>'
        svg += f'<text x="{x-8}" y="520" class="label" fill="#ccc">{i*10}cm</text>'
    svg += '<text x="350" y="460" class="label" text-anchor="middle">标定物: 标准钢直尺 (L=1.000m, 精度&plusmn;0.2mm)</text>'
    # 网格
    for i in range(1, 10):
        svg += f'<line x1="100" y1="{100+i*40}" x2="750" y2="{100+i*40}" class="grid"/>'
    svg = add_timestamp(svg, "【001】标定物全景 - 标准钢直尺", 1)
    svg += svg_footer()
    return svg


def photo_002_tunnel_overview():
    svg = svg_header()
    # 风洞试验段轮廓
    svg += '<rect x="100" y="80" width="600" height="440" fill="#222" stroke="#666" stroke-width="3"/>'
    svg += '<text x="400" y="120" class="label" text-anchor="middle" fill="#888">风洞试验段 (截面0.8m × 0.6m)</text>'
    # 发烟丝
    svg += '<circle cx="130" cy="300" r="4" fill="#ff9933"/>'
    svg += '<text x="130" y="270" class="label" text-anchor="middle" fill="#fa0">发烟点</text>'
    # 烟线（从左向右扩散）
    points = []
    for i in range(50):
        x = 130 + i * 11
        y = 300 + math.sin(i * 0.3) * 8 + (i * 0.2)
        points.append(f"{x},{y}")
    svg += f'<polyline points="{" ".join(points)}" fill="none" stroke="#ddd" stroke-width="3" opacity="0.7"/>'
    # 相机位置示意
    svg += '<rect x="680" y="500" width="60" height="40" fill="#444"/>'
    svg += '<text x="710" y="555" class="label" text-anchor="middle">相机</text>'
    # 来流箭头
    svg += '<line x1="60" y1="300" x2="100" y2="300" stroke="#5af" stroke-width="2"/>'
    svg += '<polygon points="100,300 90,295 90,305" fill="#5af"/>'
    svg += '<text x="60" y="285" class="label" fill="#5af">U∞</text>'
    svg = add_timestamp(svg, "【002】风洞试验段全景 - 烟线发烟中", 2)
    svg += svg_footer()
    return svg


def photo_003_instruments():
    svg = svg_header()
    # 皮托管读数
    svg += '<rect x="50" y="80" width="300" height="200" fill="#1a1a1a" stroke="#555"/>'
    svg += '<text x="200" y="115" class="label" text-anchor="middle">皮托管 - 来流风速</text>'
    svg += '<text x="200" y="180" style="font-size:48px; font-family:monospace; fill:#6f6;">12.47</text>'
    svg += '<text x="200" y="210" class="label" text-anchor="middle">m/s  (采样中...)</text>'
    # 温湿度计
    svg += '<rect x="400" y="80" width="350" height="200" fill="#1a1a1a" stroke="#555"/>'
    svg += '<text x="575" y="115" class="label" text-anchor="middle">环境监测仪</text>'
    svg += '<text x="460" y="160" class="label">温度: 23.4°C</text>'
    svg += '<text x="460" y="190" class="label">湿度: 45.2% RH</text>'
    svg += '<text x="460" y="220" class="label">气压: 101.32 kPa</text>'
    svg += '<text x="460" y="250" class="label">空气密度: 1.201 kg/m³</text>'
    # 数据采集面板
    svg += '<rect x="50" y="320" width="700" height="220" fill="#1a1a1a" stroke="#555"/>'
    svg += '<text x="400" y="355" class="label" text-anchor="middle">数据采集系统 DAQ - 通道状态</text>'
    channels = ["CH1 热线风速", "CH2 静压", "CH3 总压", "CH4 温度", "CH5 烟线触发", "CH6 快门同步"]
    for i, ch in enumerate(channels):
        y = 390 + i * 25
        svg += f'<rect x="80" y="{y-15}" width="10" height="10" fill="#6f6"/>'
        svg += f'<text x="100" y="{y-5}" class="label">{ch}  OK</text>'
    svg = add_timestamp(svg, "【003】仪器读数 - 皮托管+温湿度+DAQ", 3)
    svg += svg_footer()
    return svg


# ---------- 第4-10张：不同位置的烟线照片 ----------
def smoke_line_photo(photo_id, y_pos_mm, displacement_mm, label, extra="", has_defect=False):
    """生成一张烟线特写照片"""
    svg = svg_header()
    # 观察窗
    svg += '<rect x="50" y="60" width="700" height="480" fill="#1a1a2a" stroke="#446" stroke-width="2"/>'
    # 网格背景
    for i in range(15):
        svg += f'<line x1="50" y1="{60+i*32}" x2="750" y2="{60+i*32}" class="grid"/>'
    for i in range(20):
        svg += f'<line x1="{50+i*35}" y1="60" x2="{50+i*35}" y2="540" class="grid"/>'
    # 壁面（底部）
    svg += '<rect x="50" y="500" width="700" height="40" fill="#333"/>'
    svg += '<text x="100" y="525" class="label" fill="#888">壁面 y=0</text>'
    # y位置刻度
    y_pixels = 500 - y_pos_mm * 0.8  # 1mm = 0.8像素
    svg += f'<line x1="40" y1="{y_pixels}" x2="50" y2="{y_pixels}" stroke="#fa0" stroke-width="2"/>'
    svg += f'<text x="20" y="{y_pixels+5}" class="label" fill="#fa0" font-size="11">y={y_pos_mm}mm</text>'
    # 烟线（正弦波模拟扰动）
    points = []
    for i in range(80):
        x = 80 + i * 8
        # 基础位置 + 正弦扰动 + 随机小抖动
        base_y = y_pixels + displacement_mm * 0.8
        wave = math.sin(i * 0.25 + photo_id) * 6
        jitter = math.sin(i * 0.7 + photo_id * 2) * 1.5
        y = base_y + wave + jitter
        points.append(f"{x},{y}")
    # 烟线主体
    svg += f'<polyline points="{" ".join(points)}" fill="none" stroke="#e0e0e0" stroke-width="3.5" opacity="0.85"/>'
    svg += f'<polyline points="{" ".join(points)}" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.6"/>'
    # 发烟点
    svg += '<circle cx="80" cy="' + str(y_pixels + displacement_mm * 0.8) + '" r="5" fill="#ff9933"/>'
    # 理论位置参考线（虚线）
    svg += f'<line x1="80" y1="{y_pixels}" x2="720" y2="{y_pixels}" stroke="#f55" stroke-width="1" stroke-dasharray="5,5"/>'
    svg += f'<text x="650" y="{y_pixels-5}" class="label" fill="#f55" font-size="11">理论位置</text>'
    # 实际位移标注
    if abs(displacement_mm) > 0.5:
        arrow_y = y_pixels + displacement_mm * 0.4
        svg += f'<line x1="650" y1="{y_pixels}" x2="650" y2="{y_pixels + displacement_mm*0.8}" stroke="#0ff" stroke-width="1"/>'
        svg += f'<text x="660" y="{arrow_y}" class="label" fill="#0ff" font-size="11">Δy={displacement_mm:.1f}mm</text>'
    # 瑕疵点（极端值/断点时用）
    if has_defect:
        defect_x = 400
        defect_y = y_pixels + displacement_mm * 0.8 + 25
        svg += f'<circle cx="{defect_x}" cy="{defect_y}" r="8" fill="none" stroke="#ff0" stroke-width="2"/>'
    # 标注文字
    svg += f'<text x="400" y="45" class="title" text-anchor="middle">{label}</text>'
    svg += f'<text x="400" y="565" class="label" text-anchor="middle">{extra}</text>' if extra else ""
    svg = add_timestamp(svg, "", photo_id)
    svg += svg_footer()
    return svg


def photo_004_smoke_y5():
    return smoke_line_photo(4, 5, 1.2, "【004】烟线特写 - 近壁面 y=5mm", "Re=2.1×10⁴ / 边界层内")

def photo_005_smoke_y10():
    return smoke_line_photo(5, 10, 2.8, "【005】烟线特写 - y=10mm", "边界层内层 / 速度梯度大")

def photo_006_smoke_y20():
    return smoke_line_photo(6, 20, 4.5, "【006】烟线特写 - y=20mm", "边界层中层")

def photo_007_smoke_y40():
    return smoke_line_photo(7, 40, 3.1, "【007】烟线特写 - y=40mm", "边界层外缘 / 过渡区")

def photo_008_smoke_y60_extreme():
    """极端值点：位移异常大"""
    return smoke_line_photo(8, 60, 12.3, "【008】烟线特写 - y=60mm ⚠异常", "位移偏大 → EV-001待确认", has_defect=True)

def photo_009_smoke_y80():
    return smoke_line_photo(9, 80, 1.8, "【009】烟线特写 - y=80mm", "自由流区 / 小扰动")

def photo_010_smoke_y100():
    return smoke_line_photo(10, 100, 0.9, "【010】烟线特写 - y=100mm", "自由流核心区 / 均匀")


# ---------- 第11张：采样缺口示意 ----------
def photo_011_gap_frame():
    """模拟一张拍糊了/烟线断了的照片，代表采样缺口"""
    svg = svg_header()
    svg += '<rect x="50" y="60" width="700" height="480" fill="#1a1a2a" stroke="#446" stroke-width="2"/>'
    # 模糊网格
    for i in range(15):
        svg += f'<line x1="50" y1="{60+i*32}" x2="750" y2="{60+i*32}" stroke="#2a2a3a" stroke-width="1"/>'
    # 模糊的烟线（粗且淡）
    points = []
    for i in range(80):
        x = 80 + i * 8
        y = 300 + math.sin(i * 0.2) * 15 + math.sin(i * 0.5) * 5
        points.append(f"{x},{y}")
    svg += f'<polyline points="{" ".join(points)}" fill="none" stroke="#666" stroke-width="10" opacity="0.3"/>'
    # 对焦失败图标
    svg += '<circle cx="400" cy="280" r="40" fill="none" stroke="#ff0" stroke-width="3" stroke-dasharray="10,5"/>'
    svg += '<text x="400" y="290" style="font-size:36px;fill:#ff0;text-anchor:middle;">?</text>'
    svg += '<text x="400" y="340" class="label" fill="#ff0" text-anchor="middle">对焦失败 / 烟线不清晰</text>'
    svg += '<text x="400" y="365" class="label" fill="#f55" text-anchor="middle">→ 采样缺口 GAP-001</text>'
    # 底部说明
    svg += '<text x="400" y="45" class="title" text-anchor="middle">【011】失效帧 - y=30mm位置</text>'
    svg += '<text x="400" y="560" class="label" text-anchor="middle">清晰度评分: 3/10  (阈值5/10，判定无效)</text>'
    svg = add_timestamp(svg, "", 11)
    svg += svg_footer()
    return svg


# ---------- 第12张：数据采集界面 ----------
def photo_012_daq_screen():
    svg = svg_header()
    # 软件界面
    svg += '<rect x="30" y="30" width="740" height="540" fill="#eee" stroke="#999" stroke-width="2"/>'
    # 标题栏
    svg += '<rect x="30" y="30" width="740" height="30" fill="#ccc"/>'
    svg += '<text x="50" y="52" style="font-family:sans-serif;font-size:14px;fill:#333;">LabVIEW - 风洞烟线数据采集系统 v3.2</text>'
    # 左侧参数面板
    svg += '<rect x="40" y="80" width="200" height="470" fill="#e8e8e8" stroke="#bbb"/>'
    svg += '<text x="50" y="105" style="font-size:14px;font-weight:bold;fill:#333;">采集参数</text>'
    params = [
        ("采样频率", "1000 Hz"),
        ("采样时长", "30.0 s"),
        ("来流风速设定", "12.5 m/s"),
        ("烟线位置", "y=0~100mm"),
        ("测点数", "12"),
        ("数据点总数", "30,000"),
        ("参数版本", "P-v1.0"),
        ("公式版本", "F-v1.0"),
    ]
    for i, (k, v) in enumerate(params):
        y = 135 + i * 45
        svg += f'<text x="50" y="{y}" style="font-size:12px;fill:#555;">{k}</text>'
        svg += f'<text x="50" y="{y+18}" style="font-size:14px;font-family:monospace;fill:#006;">{v}</text>'
    # 右侧图表区
    svg += '<rect x="260" y="80" width="500" height="300" fill="#fff" stroke="#bbb"/>'
    svg += '<text x="275" y="105" style="font-size:13px;font-weight:bold;fill:#333;">风速时程曲线 (U vs t)</text>'
    # 画一条带脉动的风速曲线
    points = []
    base_y = 230
    for i in range(200):
        x = 270 + i * 2.4
        y = base_y - math.sin(i * 0.1) * 15 - math.sin(i * 0.37) * 8 - math.sin(i * 0.05) * 25
        points.append(f"{x},{y}")
    svg += f'<polyline points="{" ".join(points)}" fill="none" stroke="#0066cc" stroke-width="1"/>'
    svg += '<line x1="270" y1="230" x2="750" y2="230" stroke="#f00" stroke-width="1" stroke-dasharray="5,3"/>'
    svg += '<text x="720" y="225" style="font-size:10px;fill:#f00;">U=12.5m/s</text>'
    # 统计数据
    svg += '<rect x="260" y="400" width="500" height="150" fill="#fff" stroke="#bbb"/>'
    svg += '<text x="275" y="425" style="font-size:13px;font-weight:bold;fill:#333;">统计结果</text>'
    stats = [
        ("平均风速 Uavg", "12.47 m/s"),
        ("风速标准差 σU", "0.18 m/s"),
        ("湍流度", "1.44 %"),
        ("最大瞬时偏差", "+0.52 m/s"),
    ]
    for i, (k, v) in enumerate(stats):
        y = 455 + i * 25
        svg += f'<text x="290" y="{y}" style="font-size:12px;fill:#333;">{k}:</text>'
        svg += f'<text x="450" y="{y}" style="font-size:12px;font-family:monospace;fill:#060;">{v}</text>'
    # 底部状态栏
    svg += '<rect x="30" y="550" width="740" height="20" fill="#ddd"/>'
    svg += '<text x="40" y="565" style="font-size:11px;fill:#555;">状态: 采集中... 进度: 78% (23.5s/30s)</text>'
    svg += '<text x="700" y="565" style="font-size:11px;fill:#080;" text-anchor="end">● 正常</text>'
    svg += svg_footer()
    return svg


# ---------- 补备注照片：在原始照片上添加标注 ----------
def add_note_to_svg(original_svg, photo_id, note_text, note_type="red"):
    """在原始SVG上添加手写风格的备注"""
    color_map = {
        "red": "#ff3333",
        "yellow": "#ffdd00",
        "green": "#33ff33",
        "blue": "#33aaff",
    }
    color = color_map.get(note_type, "#ff3333")
    
    # 在</svg>之前插入备注
    note_markup = f'''
  <!-- 补备注 - 后添加，非原始照片内容 -->
  <g id="handwritten-note" style="opacity:0.9;">
    <!-- 便签纸 -->
    <rect x="500" y="70" width="240" height="80" fill="#fff9cc" stroke="#cc6" stroke-width="2" transform="rotate(-2, 620, 110)"/>
    <text x="515" y="95" style="font-family:cursive; font-size:14px; fill:#c00; transform:rotate(-2, 620, 110);">📝 补注 2026.06.14</text>
    <text x="515" y="120" style="font-family:cursive; font-size:13px; fill:#333; transform:rotate(-2, 620, 110);">{note_text[:22]}</text>
    <text x="515" y="140" style="font-family:cursive; font-size:13px; fill:#333; transform:rotate(-2, 620, 110);">{note_text[22:44] if len(note_text) > 22 else ""}</text>
  </g>
  <!-- 红色印章 "补" -->
  <circle cx="730" cy="70" r="20" fill="none" stroke="{color}" stroke-width="3"/>
  <text x="730" y="77" style="font-size:22px; font-weight:bold; fill:{color}; text-anchor:middle;">补</text>
  <!-- 编号关联 -->
  <text x="730" y="105" style="font-size:10px; fill:{color}; text-anchor:middle;">→ {photo_id}</text>
'''
    # 找到</svg>，插入在之前
    return original_svg.replace('</svg>', note_markup + '</svg>')


# ---------- 旧版本截图：模拟分析过程的电脑屏幕 ----------
def old_screenshot_001_first_calc():
    """第一次计算的Excel截图 - 版本最早"""
    svg = svg_header(900, 650)
    # 窗口
    svg += '<rect x="20" y="20" width="860" height="610" fill="#f5f5f5" stroke="#888"/>'
    svg += '<rect x="20" y="20" width="860" height="25" fill="#ddd"/>'
    svg += '<text x="30" y="38" style="font-size:12px; fill:#333;">Microsoft Excel - 烟线误差分析_初版.xlsx</text>'
    # 工具栏
    svg += '<rect x="20" y="45" width="860" height="30" fill="#e8e8e8"/>'
    # 表格
    rows = 20
    cols = 8
    cell_w, cell_h = 80, 22
    start_x, start_y = 40, 90
    # 表头
    headers = ["测站", "y(mm)", "U(m/s)", "Δy实测(mm)", "ε标定(%)", "ε扩散(%)", "ε总(%)", "备注"]
    for j, h in enumerate(headers):
        x = start_x + j * cell_w
        svg += f'<rect x="{x}" y="{start_y}" width="{cell_w}" height="{cell_h}" fill="#ccc" stroke="#999"/>'
        svg += f'<text x="{x+5}" y="{start_y+15}" style="font-size:10px; fill:#333;">{h}</text>'
    # 数据行（早期版本，有错误：标定误差写反了）
    data_rows = [
        ["1", "5", "8.2", "1.2", "0.35", "5.2", "5.8", ""],
        ["2", "10", "10.1", "2.8", "0.42", "6.1", "7.3", ""],
        ["3", "20", "11.5", "4.5", "0.38", "7.8", "9.2", "偏大?"],
        ["4", "40", "12.1", "3.1", "0.35", "4.5", "5.4", ""],
        ["5", "60", "12.4", "12.3", "0.40", "6.2", "12.8", "?? 这数对?"],
        ["6", "80", "12.5", "1.8", "0.37", "3.8", "4.2", ""],
        ["7", "100", "12.5", "0.9", "0.33", "3.2", "3.5", ""],
    ]
    for i, row in enumerate(data_rows):
        y = start_y + cell_h + i * cell_h
        for j, val in enumerate(row):
            x = start_x + j * cell_w
            fill = "#fff" if i % 2 == 0 else "#fafafa"
            if "?" in val:
                fill = "#ffe"
            svg += f'<rect x="{x}" y="{y}" width="{cell_w}" height="{cell_h}" fill="{fill}" stroke="#ccc"/>'
            svg += f'<text x="{x+5}" y="{y+15}" style="font-size:10px; font-family:monospace; fill:#006;">{val}</text>'
    # 选中的单元格
    sel_y = start_y + cell_h + 4 * cell_h
    svg += f'<rect x="{start_x+3*cell_w}" y="{sel_y}" width="{cell_w}" height="{cell_h}" fill="none" stroke="#060" stroke-width="2"/>'
    # 公式栏
    svg += '<rect x="40" y="75" width="820" height="20" fill="#fff" stroke="#999"/>'
    svg += '<text x="50" y="90" style="font-size:10px; font-family:monospace; color:#888;">fx = E5/F5*100  ←(早期错误:写反了)</text>'
    # 底部图表
    svg += '<rect x="40" y="320" width="820" height="280" fill="#fff" stroke="#bbb"/>'
    svg += '<text x="55" y="345" style="font-size:13px; font-weight:bold; fill:#333;">图1: 烟线横向位移 vs y位置 (初稿v0.1)</text>'
    # 柱状图
    bar_data = [1.2, 2.8, 4.5, 3.1, 12.3, 1.8, 0.9]
    labels = ["5", "10", "20", "40", "60", "80", "100"]
    chart_bottom = 560
    chart_left = 80
    bar_width = 70
    scale = 18  # pixels per mm
    for i, v in enumerate(bar_data):
        x = chart_left + i * (bar_width + 30)
        h = v * scale
        color = "#66c" if v < 6 else "#f60"
        svg += f'<rect x="{x}" y="{chart_bottom - h}" width="{bar_width}" height="{h}" fill="{color}"/>'
        svg += f'<text x="{x+bar_width/2}" y="{chart_bottom + 15}" style="font-size:10px; fill:#555; text-anchor:middle;">y={labels[i]}</text>'
        svg += f'<text x="{x+bar_width/2}" y="{chart_bottom - h - 3}" style="font-size:10px; fill:#333; text-anchor:middle;">{v}mm</text>'
    # 坐标轴
    svg += f'<line x1="{chart_left-10}" y1="{chart_bottom}" x2="{chart_left+700}" y2="{chart_bottom}" stroke="#333" stroke-width="1"/>'
    svg += f'<line x1="{chart_left-10}" y1="{chart_bottom-250}" x2="{chart_left-10}" y2="{chart_bottom}" stroke="#333" stroke-width="1"/>'
    # 时间戳/版本
    svg += '<text x="450" y="620" style="font-size:11px; fill:#999; text-anchor:middle;">初版 v0.1 / 2026-06-14 10:23 / 未复核</text>'
    svg += '<text x="800" y="620" style="font-size:11px; fill:#f00; text-anchor:middle;">[草稿] 标定公式可能写反了！</text>'
    svg += svg_footer()
    return svg


def old_screenshot_002_matlab_plot():
    """Matlab图 - 旧版本的边界层剖面"""
    svg = svg_header(900, 600)
    svg += '<rect x="20" y="20" width="860" height="560" fill="#1a1a2a" stroke="#888"/>'
    svg += '<rect x="20" y="20" width="860" height="25" fill="#333"/>'
    svg += '<text x="30" y="38" style="font-size:12px; fill:#ddd;">MATLAB Figure 3 - Boundary Layer Profile (v0.2)</text>'
    # 图区
    svg += '<rect x="60" y="60" width="780" height="480" fill="#000"/>'
    # 网格
    for i in range(11):
        y = 60 + i * 48
        svg += f'<line x1="60" y1="{y}" x2="840" y2="{y}" stroke="#224" stroke-width="0.5"/>'
    for i in range(13):
        x = 60 + i * 60
        svg += f'<line x1="{x}" y1="60" x2="{x}" y2="540" stroke="#224" stroke-width="0.5"/>'
    # 边界层速度剖面曲线
    points = []
    for i in range(100):
        x_norm = i / 99  # 0~1
        # 对数律剖面
        u_ratio = 1 / 0.41 * math.log(max(x_norm * 100, 0.1)) + 5.0
        u_ratio = min(u_ratio / 28, 1.0)
        x = 60 + u_ratio * 780
        y = 540 - x_norm * 480
        points.append(f"{x},{y}")
    svg += f'<polyline points="{" ".join(points)}" fill="none" stroke="#0ff" stroke-width="2"/>'
    # 数据点（散点）
    scatter_data = [(0.05, 0.12), (0.1, 0.28), (0.2, 0.45), (0.4, 0.68), 
                    (0.6, 0.82), (0.8, 0.93), (1.0, 1.0), (0.3, 0.55)]
    for u, y in scatter_data:
        px = 60 + u * 780
        py = 540 - y * 480
        svg += f'<circle cx="{px}" cy="{py}" r="5" fill="#ff6" stroke="#f80" stroke-width="1"/>'
    # 标注错误点
    svg += f'<circle cx="{60 + 0.3*780}" cy="{540 - 0.55*480}" r="12" fill="none" stroke="#f00" stroke-width="2"/>'
    svg += f'<text x="{60 + 0.3*780 + 15}" y="{540 - 0.55*480 + 5}" style="font-size:11px; fill:#f66;">偏离曲线 → 疑似异常点</text>'
    # 坐标轴标签
    svg += '<text x="450" y="570" style="font-size:12px; fill:#aaa; text-anchor:middle;">U / U∞</text>'
    svg += '<text x="35" y="300" style="font-size:12px; fill:#aaa;" transform="rotate(-90, 35, 300)">y / δ</text>'
    # 标题
    svg += '<text x="450" y="90" style="font-size:14px; fill:#fff; text-anchor:middle;">边界层速度剖面 - 烟线法实测 v0.2</text>'
    # 图例
    svg += '<rect x="650" y="100" width="160" height="70" fill="rgba(255,255,255,0.1)" stroke="#555"/>'
    svg += '<text x="665" y="125" style="font-size:11px; fill:#0ff;">— 对数律理论线</text>'
    svg += '<text x="665" y="150" style="font-size:11px; fill:#ff6;">● 烟线实测点</text>'
    svg += '<text x="665" y="165" style="font-size:10px; fill:#f66;">⚠ 1个待确认异常</text>'
    # 底部信息
    svg += '<text x="450" y="595" style="font-size:10px; fill:#666; text-anchor:middle;">v0.2 / 2026-06-14 14:05 / 参数版本 P-v0.9 待更新</text>'
    svg += svg_footer()
    return svg


def old_screenshot_003_error_budget():
    """误差分配饼图的旧版本"""
    svg = svg_header(700, 550)
    svg += '<rect x="20" y="20" width="660" height="510" fill="#fff" stroke="#999"/>'
    svg += '<text x="350" y="55" style="font-size:16px; font-weight:bold; fill:#333; text-anchor:middle;">风洞烟线误差分配 v0.3 (早期版本，仅3项)</text>'
    # 饼图
    cx, cy = 350, 280
    r = 140
    # 三段: 标定35% 扩散45% 风速20%
    import math as m
    angles = [
        (0, 0.35 * 360, "#f99", "标定误差 35%"),
        (0.35 * 360, 0.45 * 360, "#99f", "扩散误差 45%"),
        (0.8 * 360, 0.2 * 360, "#9f9", "风速脉动 20%"),
    ]
    for start_deg, sweep_deg, color, label in angles:
        start_rad = m.radians(start_deg - 90)
        end_rad = m.radians(start_deg + sweep_deg - 90)
        x1 = cx + r * m.cos(start_rad)
        y1 = cy + r * m.sin(start_rad)
        x2 = cx + r * m.cos(end_rad)
        y2 = cy + r * m.sin(end_rad)
        large = 1 if sweep_deg > 180 else 0
        svg += f'<path d="M{cx},{cy} L{x1},{y1} A{r},{r} 0 {large} 1 {x2},{y2} Z" fill="{color}" stroke="#fff" stroke-width="2"/>'
        # 标签
        mid_rad = m.radians(start_deg + sweep_deg/2 - 90)
        lx = cx + (r + 25) * m.cos(mid_rad)
        ly = cy + (r + 25) * m.sin(mid_rad)
        svg += f'<text x="{lx}" y="{ly}" style="font-size:12px; fill:#333;" text-anchor="middle">{label}</text>'
    # 总误差数字
    svg += f'<text x="{cx}" y="{cy+5}" style="font-size:24px; font-weight:bold; fill:#000; text-anchor:middle;">ε总 = ?</text>'
    svg += f'<text x="{cx}" y="{cy+25}" style="font-size:11px; fill:#888; text-anchor:middle;">(总误差值暂缺)</text>'
    # 备注
    svg += '<rect x="50" y="450" width="600" height="60" fill="#fffbe0" stroke="#e0d080"/>'
    svg += '<text x="70" y="475" style="font-size:12px; fill:#a60;">⚠ v0.3问题：缺少边界层项和采样缺口修正，总误差估计偏低</text>'
    svg += '<text x="70" y="495" style="font-size:12px; fill:#a60;">  → 等EV-001确认后，补第4项和第5项误差再计算</text>'
    svg += '<text x="350" y="520" style="font-size:10px; fill:#999; text-anchor:middle;">截图时间: 2026-06-14 16:20  版本: v0.3 draft</text>'
    svg += svg_footer()
    return svg


def old_screenshot_004_email_discussion():
    """邮件讨论截图 - 关于极端值的讨论"""
    svg = svg_header(800, 550)
    # 邮件界面
    svg += '<rect x="20" y="20" width="760" height="510" fill="#f0f0f0" stroke="#999"/>'
    svg += '<rect x="20" y="20" width="760" height="60" fill="#fff" stroke="#ccc"/>'
    svg += '<text x="40" y="45" style="font-size:14px; font-weight:bold; fill:#333;">Re: 关于风洞烟线y=60mm处异常点的疑问</text>'
    svg += '<text x="40" y="68" style="font-size:11px; fill:#666;">发件人: 小王 &lt;xiaowang@lab.edu.cn&gt;   时间: 2026-06-14 15:30</text>'
    svg += '<text x="40" y="85" style="font-size:11px; fill:#666;">收件人: 小林老师 &lt;xiaolin@lab.edu.cn&gt;</text>'
    # 邮件正文
    svg += '<rect x="20" y="80" width="760" height="450" fill="#fff" stroke="#ddd"/>'
    body_lines = [
        "小林老师好：",
        "",
        "今天跑的烟线实验里，y=60mm那个位置（第5号测点）的横向位移有12.3mm，",
        "比上下两个测点大出4倍。我怀疑是边界层猝发现象，但也可能是对焦问题。",
        "",
        "我把原始照片和初步分析放在附件里了，照片编号IMG_20260614_008。",
        "您帮忙看一眼是真实物理现象还是数据质量问题？",
        "",
        "如果是真实的，那总误差估计要上调；如果是拍摄问题，这张照片剔除不用。",
        "",
        "附件：IMG_008_原始.jpg / IMG_008_标注.jpg / 误差分析_v0.2.xlsx",
        "",
        "  小王",
        "  2026.06.14",
        "_____________________________________________",
        "【原始邮件】",
        "> 从: 小林老师",
        "> 看一下第008号照片的对焦，我圈出来那块好像有点虚。",
        "> 另外查一下风洞运行日志，那个时间点风速稳不稳。",
        "> —小林",
    ]
    for i, line in enumerate(body_lines):
        color = "#333"
        size = "12px"
        if line.startswith(">"):
            color = "#666"
            size = "11px"
        svg += f'<text x="50" y="{115 + i*20}" style="font-size:{size}; fill:{color}; font-family:sans-serif;">{line}</text>'
    svg += svg_footer()
    return svg


def old_screenshot_005_dashboard_draft():
    """状态看板的旧草稿"""
    svg = svg_header(900, 500)
    svg += '<rect x="20" y="20" width="860" height="460" fill="#f5f7fa" stroke="#bbb"/>'
    svg += '<text x="450" y="55" style="font-size:18px; font-weight:bold; fill:#333; text-anchor:middle;">📊 风洞烟线误差分析 - 进度看板 (草稿v0.1)</text>'
    svg += '<text x="450" y="78" style="font-size:11px; fill:#999; text-anchor:middle;">这版是手写Excel记的，等有正式系统再换 →</text>'
    # 任务卡片
    tasks = [
        ("ERR-001 标定误差", "✅ 完成", "#e8f5e9", "#4caf50"),
        ("ERR-002 扩散误差", "✅ 完成", "#e8f5e9", "#4caf50"),
        ("ERR-003 风速脉动", "⏳ 进行中", "#fff3e0", "#ff9800"),
        ("EV-001 极端值确认", "❓ 待小林看", "#ffebee", "#f44336"),
        ("GAP-001 缺口补拍", "📅 明天做", "#e3f2fd", "#2196f3"),
        ("总误差合成", "⏳ 等上面完", "#f3e5f5", "#9c27b0"),
    ]
    for i, (name, status, bg_color, bar_color) in enumerate(tasks):
        col = i % 3
        row = i // 3
        x = 50 + col * 280
        y = 100 + row * 180
        svg += f'<rect x="{x}" y="{y}" width="260" height="150" fill="white" stroke="#ddd" rx="8"/>'
        svg += f'<rect x="{x}" y="{y}" width="260" height="6" fill="{bar_color}" rx="3"/>'
        svg += f'<text x="{x+15}" y="{y+40}" style="font-size:14px; font-weight:bold; fill:#333;">{name}</text>'
        svg += f'<rect x="{x+15}" y="{y+55}" width="100" height="24" fill="{bg_color}" rx="4"/>'
        svg += f'<text x="{x+65}" y="{y+72}" style="font-size:12px; fill:#333; text-anchor:middle;">{status}</text>'
        svg += f'<text x="{x+15}" y="{y+110}" style="font-size:11px; fill:#888;">负责人: 小王</text>'
        svg += f'<text x="{x+15}" y="{y+128}" style="font-size:11px; fill:#888;">更新: 06-14 14:00</text>'
    svg += '<text x="450" y="470" style="font-size:10px; fill:#aaa; text-anchor:middle;">草稿，仅内部使用 / 2026-06-14</text>'
    svg += svg_footer()
    return svg


# ========== 生成所有文件 ==========
def generate():
    original_photos = [
        photo_001_calibration_ruler(),
        photo_002_tunnel_overview(),
        photo_003_instruments(),
        photo_004_smoke_y5(),
        photo_005_smoke_y10(),
        photo_006_smoke_y20(),
        photo_007_smoke_y40(),
        photo_008_smoke_y60_extreme(),
        photo_009_smoke_y80(),
        photo_010_smoke_y100(),
        photo_011_gap_frame(),
        photo_012_daq_screen(),
    ]
    
    notes = [
        "此张为标定基准，后续所有照片均用此标尺换算",
        "工况Run07，风速12.5m/s，准备开始采样",
        "仪器读数正常，开始采集前确认",
        "近壁面，位移较小，数据可靠",
        "边界层内，梯度明显",
        "位移开始增大，注意扩散影响",
        "边界层外缘，过渡区",
        "⚠️ 这张位移异常大！标记EV-001，待确认原因",
        "自由流区，数据平稳",
        "核心区，扰动最小",
        "❌ 此帧作废，对焦失败。记为GAP-001",
        "采集系统界面截图，参数确认P-v1.0",
    ]
    
    note_types = [
        "blue", "green", "green", "green", "green", "green",
        "green", "red", "green", "green", "red", "yellow",
    ]
    
    # 生成原始照片
    for i, (svg, note) in enumerate(zip(original_photos, notes)):
        photo_num = i + 1
        filename = f"IMG_20260614_{photo_num:03d}_ORG.svg"
        filepath = os.path.join(ORIG_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(svg)
        print(f"✓ 原始照片: {filename}")
    
    # 生成补备注照片
    for i, (svg, note, ntype) in enumerate(zip(original_photos, notes, note_types)):
        photo_num = i + 1
        noted_svg = add_note_to_svg(svg, f"#{photo_num:03d}", note, ntype)
        filename = f"IMG_20260614_{photo_num:03d}_NOTE.svg"
        filepath = os.path.join(NOTE_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(noted_svg)
        print(f"✓ 补备注照片: {filename}")
    
    # 生成旧版本截图
    old_screenshots = [
        ("OLD_001_初版Excel计算_v0.1.svg", old_screenshot_001_first_calc()),
        ("OLD_002_Matlab边界层图_v0.2.svg", old_screenshot_002_matlab_plot()),
        ("OLD_003_误差分配饼图_v0.3.svg", old_screenshot_003_error_budget()),
        ("OLD_004_邮件讨论_EV001.svg", old_screenshot_004_email_discussion()),
        ("OLD_005_进度看板草稿.svg", old_screenshot_005_dashboard_draft()),
    ]
    for filename, svg_content in old_screenshots:
        filepath = os.path.join(OLD_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(svg_content)
        print(f"✓ 旧版本截图: {filename}")
    
    print(f"\n✅ 完成！共生成 {len(original_photos)} 张原始 + {len(original_photos)} 张补备注 + {len(old_screenshots)} 张旧截图")
    print(f"   原始照片目录: {ORIG_DIR}")
    print(f"   补备注照片目录: {NOTE_DIR}")
    print(f"   旧版本截图目录: {OLD_DIR}")


if __name__ == "__main__":
    generate()

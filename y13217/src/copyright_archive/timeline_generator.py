"""时间线生成器 - 生成HTML/Markdown/JSON三种格式的历史时间线"""
import json
import os
from datetime import datetime
from typing import List, Dict, Any

from .models import (
    ProcessingContext, HistoryEntry, Actor, JudgmentStatus,
    JudgmentCard
)


HTML_CSS = """
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    padding: 40px 20px;
}
.container { max-width: 1200px; margin: 0 auto; }
.header { text-align: center; color: white; margin-bottom: 30px; }
.header h1 { font-size: 2.5rem; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.2); }
.header p { font-size: 1.1rem; opacity: 0.9; }
.toolbar {
    background: white; border-radius: 16px; padding: 20px;
    margin-bottom: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
}
.toolbar-group { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.toolbar-label { font-size: 0.9rem; color: #666; font-weight: 500; margin-right: 4px; }
.btn {
    padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer;
    font-size: 0.9rem; font-weight: 500; transition: all 0.2s;
    display: inline-flex; align-items: center; gap: 6px;
}
.btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.btn:active { transform: translateY(0); }
.btn-success { background: #48bb78; color: white; }
.btn-info { background: #4299e1; color: white; }
.btn-warning { background: #ed8936; color: white; }
.btn-outline { background: transparent; color: #666; border: 1px solid #ddd; }
.btn-outline:hover { background: #f5f5f5; border-color: #bbb; }
.btn-outline.active { background: #667eea; color: white; border-color: #667eea; }
.search-box {
    padding: 8px 14px; border: 1px solid #ddd; border-radius: 8px;
    font-size: 0.9rem; min-width: 200px; outline: none; transition: border 0.2s;
}
.search-box:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
.summary-cards {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 15px; margin-bottom: 30px;
}
.summary-card {
    background: white; border-radius: 12px; padding: 18px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center;
    cursor: pointer; transition: transform 0.2s;
}
.summary-card:hover { transform: translateY(-3px); }
.summary-card .number { font-size: 1.8rem; font-weight: bold; color: #667eea; }
.summary-card .label { color: #666; margin-top: 4px; font-size: 0.9rem; }
.no-results { text-align: center; padding: 60px 20px; color: #999; background: white; border-radius: 16px; }
.no-results-icon { font-size: 3rem; margin-bottom: 10px; }
.timeline {
    position: relative; background: white; border-radius: 16px;
    padding: 40px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);
}
.timeline::before {
    content: ''; position: absolute; left: 50%; top: 0; bottom: 0;
    width: 4px; background: linear-gradient(to bottom, #667eea, #764ba2);
    transform: translateX(-50%);
}
.timeline-item {
    position: relative; margin-bottom: 30px; width: 50%; padding-right: 40px;
}
.timeline-item:nth-child(even) { margin-left: 50%; padding-right: 0; padding-left: 40px; }
.timeline-item::before {
    content: ''; position: absolute; right: -8px; top: 20px;
    width: 16px; height: 16px; border-radius: 50%;
    background: white; border: 4px solid #667eea; z-index: 1;
}
.timeline-item:nth-child(even)::before { right: auto; left: -8px; }
.timeline-item.high-importance::before {
    background: #ff6b6b; border-color: #ff6b6b; box-shadow: 0 0 10px rgba(255,107,107,0.5);
}
.timeline-item.medium-importance::before { background: #ffa502; border-color: #ffa502; }
.timeline-content {
    background: #f8f9fa; border-radius: 12px; padding: 20px;
    position: relative; transition: transform 0.2s, box-shadow 0.2s;
}
.timeline-content:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
.timeline-item.high-importance .timeline-content { background: #fff5f5; border-left: 4px solid #ff6b6b; }
.timeline-item.medium-importance .timeline-content { background: #fffaf0; border-left: 4px solid #ffa502; }
.timeline-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 10px; margin-bottom: 8px;
}
.actor-badge {
    display: inline-block; padding: 4px 12px; border-radius: 20px;
    font-size: 0.85rem; font-weight: 500;
}
.actor-linjie { background: #d4edda; color: #155724; }
.actor-operation { background: #fff3cd; color: #856404; }
.actor-system { background: #d1ecf1; color: #0c5460; }
.actor-manual { background: #f8d7da; color: #721c24; }
.timestamp { color: #888; font-size: 0.85rem; }
.action { font-size: 1.1rem; font-weight: 600; color: #333; margin-bottom: 10px; }
.details-toggle {
    background: none; border: none; color: #667eea; cursor: pointer;
    font-size: 0.85rem; padding: 4px 0; margin-bottom: 8px;
}
.details-toggle:hover { text-decoration: underline; }
.details {
    background: white; border-radius: 8px; padding: 12px;
    font-size: 0.95rem; color: #555; overflow: hidden;
    transition: max-height 0.3s ease, padding 0.3s ease;
}
.details.collapsed { max-height: 0; padding-top: 0; padding-bottom: 0; border: none; }
.details p { margin-bottom: 5px; }
.details p:last-child { margin-bottom: 0; }
.target {
    margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ddd;
    font-size: 0.85rem; color: #888;
}
.hidden { display: none !important; }
.footer { text-align: center; color: white; margin-top: 30px; opacity: 0.9; }
.toast {
    position: fixed; top: 20px; right: 20px; padding: 12px 20px;
    background: #333; color: white; border-radius: 8px;
    z-index: 9999; opacity: 0; transition: opacity 0.3s; pointer-events: none;
}
.toast.show { opacity: 1; }
@media (max-width: 768px) {
    .timeline::before { left: 20px; }
    .timeline-item {
        width: 100%; padding-left: 60px !important;
        padding-right: 0 !important; margin-left: 0 !important;
    }
    .timeline-item::before { left: 12px !important; right: auto !important; }
    .toolbar { flex-direction: column; align-items: stretch; }
    .search-box { min-width: 100%; }
}
"""


# JavaScript 代码（用原始字符串 r"""...""" 避免 Python 解释 \n）
HTML_JS = r"""
(function() {
    var __curActor = 'all';
    var __curImp = 'all';
    var __curSearch = '';
    var __allCollapsed = true;

    function showToast(msg) {
        var t = document.getElementById('toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'toast';
            t.className = 'toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(function() { t.classList.remove('show'); }, 2000);
    }

    function applyFilters() {
        var items = document.querySelectorAll('.timeline-item');
        var visibleCount = 0;
        items.forEach(function(item) {
            var actor = item.getAttribute('data-actor') || '';
            var imp = item.getAttribute('data-importance') || '';
            var srch = (item.getAttribute('data-search') || '').toLowerCase();
            var aOk = __curActor === 'all' || actor.indexOf(__curActor) !== -1;
            var iOk = __curImp === 'all' || imp === __curImp;
            var sOk = __curSearch === '' || srch.indexOf(__curSearch.toLowerCase()) !== -1;
            if (aOk && iOk && sOk) {
                item.classList.remove('hidden');
                visibleCount++;
            } else {
                item.classList.add('hidden');
            }
        });
        var noRes = document.getElementById('no-results');
        var tl = document.getElementById('timeline');
        if (noRes) noRes.classList.toggle('hidden', visibleCount > 0);
        if (tl) tl.classList.toggle('hidden', visibleCount === 0);
    }

    window.filterByActor = function(btn, force) {
        var val = force || (btn ? btn.getAttribute('data-filter-actor') : 'all');
        __curActor = val;
        document.querySelectorAll('[data-filter-actor]').forEach(function(b) {
            b.classList.toggle('active', b.getAttribute('data-filter-actor') === val);
        });
        applyFilters();
    };

    window.filterByImportance = function(btn, force) {
        var val = force || (btn ? btn.getAttribute('data-filter-importance') : 'all');
        __curImp = val;
        document.querySelectorAll('[data-filter-importance]').forEach(function(b) {
            b.classList.toggle('active', b.getAttribute('data-filter-importance') === val);
        });
        applyFilters();
    };

    window.filterBySearch = function(val) {
        __curSearch = val;
        applyFilters();
    };

    window.toggleDetails = function(btn) {
        var details = btn.parentElement.querySelector('.details');
        var collapsed = details.classList.contains('collapsed');
        details.classList.toggle('collapsed');
        btn.textContent = collapsed ? '\u25B2 \u6536\u8D77\u8BE6\u60C5' : '\u25BC \u5C55\u5F00\u8BE6\u60C5';
    };

    window.toggleAllDetails = function() {
        var items = document.querySelectorAll('.timeline-item:not(.hidden)');
        items.forEach(function(item) {
            var d = item.querySelector('.details');
            var b = item.querySelector('.details-toggle');
            if (!d || !b) return;
            if (__allCollapsed) {
                d.classList.remove('collapsed');
                b.textContent = '\u25B2 \u6536\u8D77\u8BE6\u60C5';
            } else {
                d.classList.add('collapsed');
                b.textContent = '\u25BC \u5C55\u5F00\u8BE6\u60C5';
            }
        });
        __allCollapsed = !__allCollapsed;
    };

    window.downloadMarkdown = function() {
        var lines = ['# \u7248\u6743\u6388\u6743\u6E05\u5355\u5F52\u6863 - \u5386\u53F2\u65F6\u95F4\u7EBF', ''];
        var items = document.querySelectorAll('.timeline-item:not(.hidden)');
        if (items.length === 0) { showToast('\u6CA1\u6709\u53EF\u5BFC\u51FA\u7684\u5185\u5BB9'); return; }
        items.forEach(function(item) {
            var badge = '';
            var bEl = item.querySelector('.actor-badge');
            if (bEl) badge = bEl.textContent;
            var time = '';
            var tEl = item.querySelector('.timestamp');
            if (tEl) time = tEl.textContent.replace('\u23F0 ', '');
            var action = '';
            var aEl = item.querySelector('.action');
            if (aEl) action = aEl.textContent;
            lines.push('### ' + time + ' - ' + badge);
            lines.push('');
            lines.push('**动作：** ' + action);
            lines.push('');
            lines.push('**详情：**');
            var details = item.querySelector('.details');
            if (details) {
                details.querySelectorAll('p').forEach(function(p) {
                    lines.push('- ' + p.textContent);
                });
            }
            var target = item.querySelector('.target');
            if (target) {
                lines.push('');
                lines.push('**关联：** ' + target.textContent.trim());
            }
            lines.push('');
            lines.push('---');
            lines.push('');
        });
        var md = lines.join('\n');
        var blob = new Blob([md], {type: 'text/markdown;charset=utf-8'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'copyright_timeline.md';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        showToast('Markdown \u5DF2\u4E0B\u8F7D (' + items.length + ' \u6761)');
    };

    window.downloadJSON = function() {
        var result = [];
        var items = document.querySelectorAll('.timeline-item:not(.hidden)');
        if (items.length === 0) { showToast('\u6CA1\u6709\u53EF\u5BFC\u51FA\u7684\u5185\u5BB9'); return; }
        items.forEach(function(item) {
            var badge = '';
            var bEl = item.querySelector('.actor-badge');
            if (bEl) badge = bEl.textContent;
            var time = '';
            var tEl = item.querySelector('.timestamp');
            if (tEl) time = tEl.textContent.replace('\u23F0 ', '');
            var action = '';
            var aEl = item.querySelector('.action');
            if (aEl) action = aEl.textContent;
            var details = {};
            var det = item.querySelector('.details');
            if (det) {
                det.querySelectorAll('p').forEach(function(p) {
                    var parts = p.textContent.split(': ');
                    if (parts.length >= 2) {
                        details[parts[0].trim()] = parts.slice(1).join(': ').trim();
                    }
                });
            }
            var target = item.querySelector('.target');
            result.push({
                timestamp: time, actor: badge, action: action,
                details: details,
                target: target ? target.textContent.trim() : null
            });
        });
        var json = JSON.stringify(result, null, 2);
        var blob = new Blob([json], {type: 'application/json;charset=utf-8'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'copyright_timeline.json';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        showToast('JSON \u5DF2\u4E0B\u8F7D (' + items.length + ' \u6761)');
    };
})();
"""


class TimelineGenerator:
    """时间线生成器"""

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_all(self, context: ProcessingContext) -> Dict[str, str]:
        """生成所有格式的时间线"""
        timeline_data = self._prepare_timeline_data(context)

        outputs = {}
        outputs["html"] = self._generate_html(timeline_data, context)
        outputs["markdown"] = self._generate_markdown(timeline_data, context)
        outputs["json"] = self._generate_json(timeline_data, context)

        return outputs

    def _prepare_timeline_data(self, context: ProcessingContext) -> List[Dict[str, Any]]:
        """准备时间线数据"""
        timeline = []

        context.history.sort(key=lambda x: x.timestamp)

        for entry in context.history:
            timeline.append({
                "timestamp": entry.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "timestamp_sort": entry.timestamp,
                "actor": entry.actor.value,
                "actor_type": self._get_actor_type(entry.actor),
                "action": entry.action,
                "details": entry.details,
                "target_filename": entry.target_filename,
                "target_track_id": entry.target_track_id,
                "entry_id": entry.entry_id,
                "importance": self._get_importance(entry)
            })

        timeline_sorted = sorted(timeline, key=lambda x: x["timestamp_sort"])
        for item in timeline_sorted:
            del item["timestamp_sort"]
        return timeline_sorted

    def _get_actor_type(self, actor: Actor) -> str:
        """获取操作人类型，用于前端着色"""
        type_map = {
            Actor.LIN_JIE: "linjie",
            Actor.OPERATION_MANAGER: "operation",
            Actor.SYSTEM: "system",
            Actor.MANUAL: "manual"
        }
        return type_map.get(actor, "default")

    def _get_importance(self, entry: HistoryEntry) -> str:
        """获取事件重要性"""
        action = entry.action
        if any(keyword in action for keyword in ["覆盖", "改动", "留存", "入历史"]):
            return "high"
        elif any(keyword in action for keyword in ["确认", "应用", "摘要"]):
            return "medium"
        else:
            return "normal"

    def _generate_html(self, timeline_data: List[Dict], context: ProcessingContext) -> str:
        """生成HTML时间线（含交互按钮）"""
        import json as _json
        timeline_json_str = _json.dumps(timeline_data, ensure_ascii=False)
        stats = self._get_stats(context)
        gen_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # 渲染每一条时间线条目
        tl_items_parts = []
        for idx, item in enumerate(timeline_data):
            actor = item["actor"]
            imp = item["importance"]
            ts = item["timestamp"]
            act = item["action"]
            actor_type = item["actor_type"]
            tfn = item.get("target_filename") or ""
            tid = item.get("target_track_id") or ""

            det_parts = []
            for k, v in item["details"].items():
                det_parts.append(f"<p><strong>{k}:</strong> {v}</p>")
            det_html = "\n".join(det_parts)

            target_html = ""
            if tfn or tid:
                tfn_part = f"\U0001F4C4 文件: {tfn}" if tfn else ""
                tid_part = f" | \U0001F3B5 曲目: {tid}" if tid else ""
                target_html = f'<div class="target">{tfn_part}{tid_part}</div>'

            search_fields = f"{actor} {act} {tfn} {tid} "
            for k, v in item["details"].items():
                search_fields += f"{k} {v} "
            search_fields = search_fields.replace('"', '&quot;')

            item_html = f'''            <div class="timeline-item {imp}-importance"
                 data-actor="{actor}"
                 data-importance="{imp}"
                 data-search="{search_fields}">
                <div class="timeline-content">
                    <div class="timeline-header">
                        <span class="actor-badge actor-{actor_type}">{actor}</span>
                        <span class="timestamp">\u23F0 {ts}</span>
                    </div>
                    <div class="action">{act}</div>
                    <button class="details-toggle" onclick="toggleDetails(this)">\u25BC \u5C55\u5F00\u8BE6\u60C5</button>
                    <div class="details collapsed">
                        {det_html}
                    </div>
                    {target_html}
                </div>
            </div>'''
            tl_items_parts.append(item_html)

        tl_items_html = "\n".join(tl_items_parts)

        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>版权授权清单归档 - 历史时间线</title>
<style>
{HTML_CSS}
</style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>\U0001F3B5 版权授权清单归档</h1>
        <p>历史时间线 - 可直接用于沟通的完整变更记录</p>
    </div>

    <div class="toolbar">
        <div class="toolbar-group">
            <span class="toolbar-label">下载：</span>
            <button class="btn btn-success" onclick="downloadMarkdown()">\u2B07\uFE0F Markdown</button>
            <button class="btn btn-info" onclick="downloadJSON()">\u2B07\uFE0F JSON</button>
            <button class="btn btn-warning" onclick="window.print()">\U0001F5A8\uFE0F 打印</button>
        </div>
        <div style="flex:1"></div>
        <div class="toolbar-group">
            <span class="toolbar-label">筛选角色：</span>
            <button class="btn btn-outline active" data-filter-actor="all" onclick="filterByActor(this)">全部</button>
            <button class="btn btn-outline" data-filter-actor="林姐" onclick="filterByActor(this)">\U0001F469\u200D\U0001F3EB 林姐</button>
            <button class="btn btn-outline" data-filter-actor="运营" onclick="filterByActor(this)">\U0001F454 运营</button>
            <button class="btn btn-outline" data-filter-actor="人工" onclick="filterByActor(this)">\u270D\uFE0F 人工</button>
            <button class="btn btn-outline" data-filter-actor="系统" onclick="filterByActor(this)">\U0001F5A5\uFE0F 系统</button>
        </div>
        <div class="toolbar-group">
            <span class="toolbar-label">级别：</span>
            <button class="btn btn-outline active" data-filter-importance="all" onclick="filterByImportance(this)">全部</button>
            <button class="btn btn-outline" data-filter-importance="high" onclick="filterByImportance(this)">\U0001F534 重要</button>
            <button class="btn btn-outline" data-filter-importance="medium" onclick="filterByImportance(this)">\U0001F7E1 中</button>
            <button class="btn btn-outline" data-filter-importance="normal" onclick="filterByImportance(this)">\u26AA 普通</button>
        </div>
        <div class="toolbar-group">
            <input type="text" class="search-box" placeholder="\U0001F50D 搜索文件名/曲目/内容..." oninput="filterBySearch(this.value)">
        </div>
        <div class="toolbar-group">
            <button class="btn btn-outline" onclick="toggleAllDetails()">\U0001F53D 全部展开/折叠</button>
        </div>
    </div>

    <div class="summary-cards">
        <div class="summary-card" onclick="filterByActor(null, 'all')">
            <div class="number">{stats['total_files']}</div>
            <div class="label">\U0001F4C4 版权文件总数</div>
        </div>
        <div class="summary-card" onclick="filterByImportance(null, 'high')">
            <div class="number" style="color:#ff6b6b;">{stats['overridden']}</div>
            <div class="label">\U0001F504 判断被覆盖</div>
        </div>
        <div class="summary-card" onclick="filterByActor(null, '林姐')">
            <div class="number" style="color:#48bb78;">{stats['linjie_count']}</div>
            <div class="label">\U0001F469\u200D\U0001F3EB 林姐判断</div>
        </div>
        <div class="summary-card" onclick="filterByActor(null, '运营')">
            <div class="number" style="color:#ed8936;">{stats['operation_count']}</div>
            <div class="label">\U0001F454 运营改动</div>
        </div>
        <div class="summary-card" onclick="filterByActor(null, '人工')">
            <div class="number" style="color:#e53e3e;">{stats['manual_count']}</div>
            <div class="label">\u270D\uFE0F 人工批注</div>
        </div>
        <div class="summary-card">
            <div class="number">{stats['events']}</div>
            <div class="label">\U0001F4DC 历史事件</div>
        </div>
    </div>

    <div id="no-results" class="no-results hidden">
        <div class="no-results-icon">\U0001F50D</div>
        <p>没有找到匹配的记录</p>
        <p style="font-size:0.9rem; margin-top:8px;">试试调整筛选条件或清空搜索</p>
    </div>

    <div class="timeline" id="timeline">
    {tl_items_html}
    </div>

    <div class="footer">
        <p>生成时间: {gen_time} | 此时间线可直接用于跨部门沟通</p>
    </div>
</div>

<script>
// 原始数据（后端渲染注入）
window.TIMELINE_DATA = {timeline_json_str};
{HTML_JS}
</script>
</body>
</html>
"""

        output_path = os.path.join(self.output_dir, "timeline.html")
        with open(output_path, "w", encoding="utf-8") as fp:
            fp.write(html)

        return output_path

    def _generate_markdown(self, timeline_data: List[Dict], context: ProcessingContext) -> str:
        """生成Markdown时间线"""
        lines = []
        lines.append("# \U0001F3B5 版权授权清单归档 - 历史时间线")
        lines.append("")
        lines.append("> 此时间线可直接用于跨部门沟通，记录了完整的判断变更过程")
        lines.append("")

        stats = self._get_stats(context)
        lines.append("## \U0001F4CA 处理概览")
        lines.append("")
        lines.append(f"- 版权文件总数：**{stats['total_files']}**")
        lines.append(f"- 最终匹配：**{stats['matched']}**")
        lines.append(f"- 判断被覆盖：**{stats['overridden']}**")
        lines.append(f"- 林姐判断数：**{stats['linjie_count']}**")
        lines.append(f"- 运营主管改动：**{stats['operation_count']}**")
        lines.append(f"- 历史事件总数：**{stats['events']}**")
        lines.append("")

        lines.append("## \U0001F4C5 历史时间线")
        lines.append("")

        for item in timeline_data:
            importance_icon = {"high": "\U0001F534", "medium": "\U0001F7E1", "normal": "\u26AA"}.get(item["importance"], "\u26AA")
            actor_icon = {
                "linjie": "\U0001F469\u200D\U0001F3EB",
                "operation": "\U0001F454",
                "system": "\U0001F5A5\uFE0F",
                "manual": "\u270D\uFE0F"
            }.get(item["actor_type"], "\U0001F464")

            lines.append(f"### {importance_icon} {actor_icon} {item['timestamp']} - {item['actor']}")
            lines.append("")
            lines.append(f"**动作：** {item['action']}")
            lines.append("")
            lines.append("**详情：**")
            for key, value in item["details"].items():
                lines.append(f"- {key}: {value}")

            if item["target_filename"] or item["target_track_id"]:
                lines.append("")
                lines.append("**关联对象：**")
                if item["target_filename"]:
                    lines.append(f"- \U0001F4C4 文件：`{item['target_filename']}`")
                if item["target_track_id"]:
                    lines.append(f"- \U0001F3B5 曲目：`{item['target_track_id']}`")

            lines.append("")
            lines.append("---")
            lines.append("")

        lines.append(f"_生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}_")

        md_content = "\n".join(lines)
        output_path = os.path.join(self.output_dir, "timeline.md")
        with open(output_path, "w", encoding="utf-8") as fp:
            fp.write(md_content)

        return output_path

    def _generate_json(self, timeline_data: List[Dict], context: ProcessingContext) -> str:
        """生成JSON时间线"""
        stats = self._get_stats(context)

        json_data = {
            "metadata": {
                "title": "版权授权清单归档 - 历史时间线",
                "description": "完整的判断变更历史记录，可用于系统集成",
                "generated_at": datetime.now().isoformat(),
                "statistics": stats
            },
            "judgment_cards": [
                {
                    "card_id": card.card_id,
                    "filename": card.filename,
                    "track_id": card.track_id,
                    "initial_judgment": card.initial_judgment.value,
                    "initial_reason": card.initial_reason,
                    "current_judgment": card.current_judgment.value,
                    "current_reason": card.current_reason,
                    "is_overridden": card.is_overridden,
                    "overridden_by": card.overridden_by.value if card.overridden_by else None,
                    "override_time": card.override_time.isoformat() if card.override_time else None,
                    "override_reason": card.override_reason,
                    "actor": card.actor.value,
                    "judgment_time": card.judgment_time.isoformat()
                }
                for card in context.judgment_cards
            ],
            "timeline": timeline_data
        }

        output_path = os.path.join(self.output_dir, "timeline.json")
        with open(output_path, "w", encoding="utf-8") as fp:
            json.dump(json_data, fp, ensure_ascii=False, indent=2)

        return output_path

    def _get_stats(self, context: ProcessingContext) -> Dict[str, Any]:
        """获取统计数据"""
        return {
            "total_files": len(context.copyright_files),
            "matched": sum(1 for c in context.judgment_cards
                          if c.current_judgment == JudgmentStatus.MATCHED),
            "overridden": sum(1 for c in context.judgment_cards if c.is_overridden),
            "linjie_count": sum(1 for c in context.judgment_cards
                               if c.overridden_by == Actor.LIN_JIE),
            "operation_count": sum(1 for c in context.judgment_cards
                                  if c.overridden_by == Actor.OPERATION_MANAGER),
            "manual_count": sum(1 for c in context.judgment_cards
                               if c.overridden_by == Actor.MANUAL),
            "events": len(context.history),
            "notes_count": len(context.notes)
        }

const API = "/api";
let currentTrackId = null;
let statusOptions = [];

function toast(msg, type = "success") {
  const el = document.getElementById("toast");
  const bg = type === "success" ? "bg-emerald-600" : type === "error" ? "bg-rose-600" : "bg-slate-700";
  el.className = `toast ${bg} text-white px-4 py-3 rounded-lg shadow-xl fade-in font-medium text-sm`;
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2600);
}

async function api(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

async function init() {
  try {
    statusOptions = await api(`${API}/status-options`);
    populateStatusFilters();
    await loadStats();
    await loadTracks();
  } catch (e) {
    console.error(e);
  }
}

function populateStatusFilters() {
  const fs = document.getElementById("filterStatus");
  const ns = document.getElementById("newStatus");
  statusOptions.forEach(s => {
    fs.insertAdjacentHTML("beforeend", `<option value="${s.value}">${s.label}</option>`);
    ns.insertAdjacentHTML("beforeend", `<option value="${s.value}">${s.label}</option>`);
  });
}

async function loadStats() {
  const stats = await api(`${API}/stats`);

  // 状态卡
  const cards = document.getElementById("statsCards");
  const total = stats.total;
  const passed = (stats.by_status.find(s => s.status === "passed") || {}).count || 0;
  const pending = (stats.by_status.find(s => s.status === "pending") || {}).count || 0;
  const abnormalCnt = stats.by_status
    .filter(s => ["expired", "mismatch", "abnormal", "need_note"].includes(s.status))
    .reduce((a, b) => a + b.count, 0);
  cards.innerHTML = `
    <div class="bg-white rounded-xl shadow p-4">
      <div class="text-xs text-slate-500">总曲目数</div>
      <div class="text-2xl font-bold text-slate-800 mt-1">${total}</div>
    </div>
    <div class="bg-white rounded-xl shadow p-4">
      <div class="text-xs text-slate-500">已通过</div>
      <div class="text-2xl font-bold text-emerald-600 mt-1">${passed}</div>
    </div>
    <div class="bg-white rounded-xl shadow p-4">
      <div class="text-xs text-slate-500">待复核</div>
      <div class="text-2xl font-bold text-indigo-600 mt-1">${pending}</div>
    </div>
    <div class="bg-gradient-to-br from-rose-500 to-orange-500 text-white rounded-xl shadow p-4 cursor-pointer hover:scale-[1.02] transition"
      onclick="filterAbnormal()">
      <div class="text-xs opacity-90">异常待处理</div>
      <div class="text-2xl font-bold mt-1">${abnormalCnt}</div>
    </div>
  `;

  // 来源下拉
  const fsrc = document.getElementById("filterSource");
  const prev = fsrc.value;
  fsrc.innerHTML = '<option value="">全部</option>';
  stats.by_source.forEach(s => {
    fsrc.insertAdjacentHTML("beforeend", `<option value="${s.source}">${s.source} (${s.cnt})</option>`);
  });
  fsrc.value = prev;

  // 右侧异常列表
  const ab = document.getElementById("abnormalList");
  const abnormalStatuses = stats.by_status.filter(s =>
    ["expired", "mismatch", "abnormal", "need_note"].includes(s.status)
  );
  if (abnormalStatuses.length === 0) {
    ab.innerHTML = `<div class="text-center py-6 text-slate-400 text-sm">
      <div class="text-4xl mb-2">✅</div>暂无异常，全部对齐
    </div>`;
  } else {
    ab.innerHTML = abnormalStatuses.map(s => `
      <button onclick="quickFilter('${s.status}')"
        class="w-full text-left bg-${statusBadgeBg(s.status)} border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-lg px-3 py-3 transition group">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-xs ${statusColorClass(s.status)}">${s.label}</span>
          </div>
          <span class="text-lg font-bold text-slate-700 group-hover:text-indigo-600">${s.count} →</span>
        </div>
        <div class="text-xs text-slate-500 mt-1">${statusHint(s.status)}</div>
      </button>
    `).join("");
  }

  // 来源分布
  const srcList = document.getElementById("sourceList");
  srcList.innerHTML = stats.by_source.map(s => `
    <button onclick="quickSource('${s.source}')"
      class="w-full flex items-center justify-between px-2 py-1.5 hover:bg-indigo-50 rounded text-left text-slate-700">
      <span class="truncate">${s.source}</span>
      <span class="text-slate-400">${s.cnt}</span>
    </button>
  `).join("") || '<div class="text-slate-400 text-xs">暂无数据</div>';
}

function statusBadgeBg(status) {
  return {
    expired: "red-50", mismatch: "yellow-50", abnormal: "rose-50", need_note: "orange-50"
  }[status] || "slate-50";
}

function statusColorClass(status) {
  return {
    pending: "bg-slate-100 text-slate-700",
    reviewing: "bg-blue-100 text-blue-700",
    passed: "bg-green-100 text-green-700",
    mismatch: "bg-yellow-100 text-yellow-700",
    expired: "bg-red-100 text-red-700",
    need_note: "bg-orange-100 text-orange-700",
    reconciled: "bg-teal-100 text-teal-700",
    abnormal: "bg-rose-100 text-rose-700",
  }[status] || "bg-slate-100 text-slate-700";
}

function statusHint(status) {
  return {
    expired: "授权已到期，需补备注或下架处理",
    mismatch: "文件名与曲目表不匹配，需人工核对",
    abnormal: "其他异常，需排查",
    need_note: "缺少授权备注，补备注后可对齐",
  }[status] || "";
}

function filterAbnormal() {
  document.getElementById("filterStatus").value = "";
  loadTracks("__abnormal__");
}

function quickFilter(status) {
  document.getElementById("filterStatus").value = status;
  loadTracks();
}

function quickSource(src) {
  document.getElementById("filterSource").value = src;
  loadTracks();
}

async function loadTracks(specialFilter = null) {
  const status = document.getElementById("filterStatus").value;
  const source = document.getElementById("filterSource").value;
  const keyword = document.getElementById("filterKeyword").value;
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (source) qs.set("source", source);
  if (keyword) qs.set("keyword", keyword);
  const data = await api(`${API}/tracks?${qs.toString()}`);
  let items = data.items;

  if (specialFilter === "__abnormal__") {
    items = items.filter(t => ["expired", "mismatch", "abnormal", "need_note"].includes(t.process_status));
  }

  const tbody = document.getElementById("tracksTableBody");
  const empty = document.getElementById("emptyState");

  if (!items.length) {
    tbody.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  tbody.innerHTML = items.map(t => {
    const expiredTag = (t.process_status === "expired")
      ? `<span class="ml-2 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded">已到期</span>` : "";
    return `
    <tr class="hover:bg-indigo-50/40 cursor-pointer transition" onclick="openDetail(${t.id})">
      <td class="px-4 py-3 text-slate-500 font-mono">#${t.id}</td>
      <td class="px-4 py-3">
        <div class="font-medium text-slate-800">${t.file_name || "-"}${expiredTag}</div>
        <div class="text-xs text-slate-500">${t.track_name || ""} ${t.track_code ? "· " + t.track_code : ""}</div>
      </td>
      <td class="px-4 py-3 text-slate-700">${t.beat_version || "-"}</td>
      <td class="px-4 py-3">
        <div class="text-xs">
          <div class="text-slate-700">📌 ${t.source}</div>
          <div class="text-slate-400 mt-0.5">行 ${t.source_row}</div>
        </div>
      </td>
      <td class="px-4 py-3">
        <span class="px-2.5 py-1 rounded-full text-xs font-medium ${statusColorClass(t.process_status)}">
          ${t.status_label}
        </span>
      </td>
      <td class="px-4 py-3 text-xs ${t.process_status === 'expired' ? 'text-red-600 font-semibold' : 'text-slate-600'}">
        ${t.authorization_expire_date || "-"}
      </td>
      <td class="px-4 py-3 text-center">
        <div class="flex items-center justify-center gap-1" onclick="event.stopPropagation()">
          <button onclick="openDetail(${t.id})" class="text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded text-xs">详情</button>
          ${t.process_status === "expired" || t.process_status === "need_note" || t.process_status === "mismatch"
            ? `<button onclick="openDetail(${t.id}); setTimeout(()=>openAddNote(),200)"
                class="text-amber-600 hover:bg-amber-50 px-2 py-1 rounded text-xs font-medium">补备注</button>` : ""}
        </div>
      </td>
    </tr>`;
  }).join("");
}

async function openDetail(id) {
  currentTrackId = id;
  const t = await api(`${API}/tracks/${id}`);
  document.getElementById("detailId").textContent = `#${id} ${t.file_name || t.track_name || ""}`;

  const rawDisplay = t.raw_fields_parsed
    ? Object.entries(t.raw_fields_parsed).map(([k, v]) => `<div class="flex gap-2 py-1 border-b last:border-0 border-slate-100">
        <span class="text-slate-500 min-w-[80px] text-xs">${k}</span>
        <span class="text-slate-800 text-xs">${v !== null && v !== undefined ? v : "-"}</span>
      </div>`).join("")
    : '<div class="text-slate-400 text-xs">无原始字段记录</div>';

  const logsHtml = (t.logs || []).map(l => `
    <div class="flex gap-3 py-2 border-b last:border-0 border-slate-100">
      <div class="text-xs text-slate-400 font-mono w-32 shrink-0">${l.created_at}</div>
      <div class="flex-1 text-xs">
        <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">${l.old_status || "空"}</span>
        <span class="mx-1 text-slate-400">→</span>
        <span class="px-1.5 py-0.5 rounded ${statusColorClass(l.new_status)}">${l.new_status}</span>
        <span class="ml-2 text-slate-500">by ${l.operator}</span>
        ${l.remark ? `<div class="text-slate-500 mt-1">💬 ${l.remark}</div>` : ""}
      </div>
    </div>
  `).join("") || '<div class="text-slate-400 text-xs py-3">暂无状态变更记录</div>';

  document.getElementById("detailBody").innerHTML = `
    <div class="grid grid-cols-2 gap-5">
      <div class="space-y-4">
        <div class="bg-indigo-50/60 rounded-xl p-4">
          <h4 class="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-1.5"><span>🗂️</span>核心信息</h4>
          <dl class="text-sm space-y-2">
            <div class="flex"><dt class="w-24 text-slate-500 shrink-0">文件名</dt><dd class="text-slate-800">${t.file_name || "-"}</dd></div>
            <div class="flex"><dt class="w-24 text-slate-500 shrink-0">曲目名称</dt><dd class="text-slate-800">${t.track_name || "-"}</dd></div>
            <div class="flex"><dt class="w-24 text-slate-500 shrink-0">曲目编号</dt><dd class="text-slate-800">${t.track_code || "-"}</dd></div>
            <div class="flex"><dt class="w-24 text-slate-500 shrink-0">鼓组版本</dt><dd class="text-slate-800">${t.beat_version || "-"}</dd></div>
            <div class="flex"><dt class="w-24 text-slate-500 shrink-0">处理状态</dt>
              <dd><span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusColorClass(t.process_status)}">${t.status_label}</span></dd>
            </div>
          </dl>
        </div>

        <div class="bg-amber-50/60 rounded-xl p-4">
          <h4 class="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-1.5"><span>🔐</span>授权与追溯</h4>
          <dl class="text-sm space-y-2">
            <div class="flex"><dt class="w-24 text-slate-500 shrink-0">授权到期日</dt>
              <dd class="${t.process_status === 'expired' ? 'text-red-700 font-semibold' : 'text-slate-800'}">${t.authorization_expire_date || "-"}</dd>
            </div>
            <div class="flex"><dt class="w-24 text-slate-500 shrink-0">来源</dt><dd class="text-slate-800">${t.source}</dd></div>
            <div class="flex"><dt class="w-24 text-slate-500 shrink-0">来源行号</dt><dd class="text-slate-800">${t.source_row}</dd></div>
            <div><dt class="text-slate-500 mb-1">授权备注</dt>
              <dd class="bg-white rounded p-2 text-slate-700 text-xs border border-amber-200 min-h-[32px]">${t.authorization_note || '<span class="text-slate-400">（未填写）</span>'}</dd>
            </div>
            <div><dt class="text-slate-500 mb-1">影响范围</dt>
              <dd class="bg-white rounded p-2 text-slate-700 text-xs border border-amber-200 min-h-[32px]">${t.impact_scope || '<span class="text-slate-400">补授权备注后自动生成</span>'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div class="space-y-4">
        <div class="bg-slate-50 rounded-xl p-4">
          <h4 class="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5"><span>📥</span>原始字段（导入时原样）</h4>
          <div class="bg-white rounded-lg p-3 border border-slate-200">${rawDisplay}</div>
        </div>

        <div class="bg-purple-50/60 rounded-xl p-4">
          <h4 class="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-1.5"><span>📜</span>状态变更日志</h4>
          <div class="bg-white rounded-lg p-3 border border-purple-200 max-h-64 overflow-y-auto scrollbar-thin">${logsHtml}</div>
        </div>

        <div class="grid grid-cols-2 gap-3 text-xs text-slate-500">
          <div>创建：<span class="text-slate-700">${t.created_at}</span></div>
          <div>更新：<span class="text-slate-700">${t.updated_at}</span></div>
        </div>
      </div>
    </div>
  `;
  document.getElementById("detailModal").classList.remove("hidden");
}

function closeDetail() {
  document.getElementById("detailModal").classList.add("hidden");
  currentTrackId = null;
}

function openChangeStatus() {
  if (!currentTrackId) return;
  document.getElementById("statusModal").classList.remove("hidden");
}
function closeStatusModal() {
  document.getElementById("statusModal").classList.add("hidden");
}
async function submitChangeStatus() {
  try {
    await api(`${API}/tracks/${currentTrackId}/status`, {
      method: "PATCH",
      body: {
        status: document.getElementById("newStatus").value,
        operator: document.getElementById("statusOperator").value || "system",
        remark: document.getElementById("statusRemark").value || null,
      }
    });
    toast("状态已更新");
    closeStatusModal();
    await loadStats();
    await loadTracks();
    await openDetail(currentTrackId);
  } catch (e) {
    toast(e.message, "error");
  }
}

function openAddNote() {
  if (!currentTrackId) return;
  document.getElementById("noteModal").classList.remove("hidden");
}
function closeNoteModal() {
  document.getElementById("noteModal").classList.add("hidden");
}
async function submitAddNote() {
  const note = document.getElementById("authNote").value.trim();
  if (!note) { toast("请填写授权备注", "error"); return; }
  try {
    await api(`${API}/tracks/${currentTrackId}/authorization-note`, {
      method: "POST",
      body: {
        note,
        impact_scope: document.getElementById("impactScope").value || null,
        operator: document.getElementById("noteOperator").value || "复核人",
      }
    });
    toast("授权备注已补，文件/曲目/清单已重新对齐");
    document.getElementById("authNote").value = "";
    document.getElementById("impactScope").value = "";
    closeNoteModal();
    await loadStats();
    await loadTracks();
    await openDetail(currentTrackId);
  } catch (e) {
    toast(e.message, "error");
  }
}

function openImportModal() {
  document.getElementById("importModal").classList.remove("hidden");
}
function closeImportModal() {
  document.getElementById("importModal").classList.add("hidden");
}
function loadDemoImport() {
  document.getElementById("importJson").value = JSON.stringify([
    { "文件名": "Drum_101_v2.wav", "曲目名称": "晨曦", "鼓组版本": "v2", "数据来源": "林姐曲目表C", "行号": 8, "处理状态": "pending" },
    { "fileName": "Drum_102_v3.wav", "trackName": "黄昏", "beatVersion": "v3", "source": "复核人新提交D", "source_row": 15, "process_status": "mismatch" },
    { "曲目名": "夜曲", "节拍版本": "v1", "来源": "林姐曲目表C", "来源行号": 22, "状态": "expired", "授权到期日": "2026-06-01" },
  ], null, 2);
}
async function submitImport() {
  const raw = document.getElementById("importJson").value.trim();
  if (!raw) { toast("请粘贴JSON数据", "error"); return; }
  try {
    const records = JSON.parse(raw);
    if (!Array.isArray(records)) throw new Error("根节点必须是数组");
    const res = await api(`${API}/tracks/import`, { method: "POST", body: { records } });
    if (res.errors.length) {
      toast(`导入成功${res.inserted}条，失败${res.errors.length}条`, "error");
    } else {
      toast(`成功导入${res.inserted}条曲目`);
    }
    closeImportModal();
    await loadStats();
    await loadTracks();
  } catch (e) {
    toast("导入失败：" + e.message, "error");
  }
}

async function viewReport() {
  try {
    const status = document.getElementById("filterStatus").value;
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await fetch(`${API}/report/markdown${qs}`);
    const content = await res.text();
    document.getElementById("reportContent").textContent = content;
    document.getElementById("reportModal").classList.remove("hidden");
  } catch (e) {
    toast(e.message, "error");
  }
}
function closeReportModal() {
  document.getElementById("reportModal").classList.add("hidden");
}

function downloadReport() {
  const status = document.getElementById("filterStatus").value;
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  window.open(`${API}/report/download${qs}`, "_blank");
}

async function openMappingsModal() {
  try {
    const res = await api(`${API}/field-mappings`);
    const grouped = {};
    res.items.forEach(m => {
      (grouped[m.standard_field] = grouped[m.standard_field] || []).push(m);
    });
    document.getElementById("mappingsList").innerHTML = Object.entries(grouped).map(([std, arr]) => `
      <div class="mb-2">
        <div class="font-semibold text-indigo-700">${std}</div>
        <div class="ml-3 flex flex-wrap gap-1 mt-1">
          ${arr.map(a => `<span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">${a.incoming_field}</span>`).join("")}
        </div>
      </div>
    `).join("");
  } catch (e) { toast(e.message, "error"); }
  document.getElementById("mappingsModal").classList.remove("hidden");
}
function closeMappingsModal() {
  document.getElementById("mappingsModal").classList.add("hidden");
}
async function submitMapping() {
  const inc = document.getElementById("mapIncoming").value.trim();
  const std = document.getElementById("mapStandard").value;
  if (!inc) { toast("请填写曲目表字段名", "error"); return; }
  try {
    await api(`${API}/field-mappings`, { method: "POST", body: { incoming_field: inc, standard_field: std } });
    toast("映射已添加");
    document.getElementById("mapIncoming").value = "";
    await openMappingsModal();
  } catch (e) { toast(e.message, "error"); }
}

document.addEventListener("DOMContentLoaded", init);

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

let state = {
  batches: [],
  currentBatchId: null,
  currentBatch: null,
  problems: [],
  currentProblemId: null,
  filteredProblems: [],
  boundaryExamples: []
};

const API = "/api";

async function req(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "请求失败");
  }
  return res.json();
}

function toast(msg, type = "") {
  const el = $("#toast");
  el.textContent = msg;
  el.className = "toast " + type;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2500);
}

function showModal(title, bodyHtml, onOk) {
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = bodyHtml;
  $("#modal").classList.remove("hidden");
  $("#modalOk").onclick = async () => {
    try {
      const result = await onOk();
      $("#modal").classList.add("hidden");
      if (result !== false) toast("操作成功", "success");
    } catch (e) {
      toast(e.message, "error");
    }
  };
  $("#modalCancel").onclick = () => $("#modal").classList.add("hidden");
}

function statusChip(s) {
  return `<span class="status-chip s-${s}">${s}</span>`;
}

async function loadBatches() {
  state.batches = await req("/batches");
  renderBatchTable();
  renderBatchSelector();
}

function renderBatchTable() {
  const tbody = $("#tblBatches tbody");
  tbody.innerHTML = state.batches.map(b => `
    <tr>
      <td><b>${b.name}</b></td>
      <td>${statusChip(b.status)}</td>
      <td>${b.total_problems || 0}</td>
      <td>${b.computed_problems || 0}</td>
      <td>${new Date(b.updated_at).toLocaleString()}</td>
      <td>
        <button data-batch="${b.id}" class="open-btn">打开</button>
      </td>
    </tr>
  `).join("");
  $$(".open-btn").forEach(btn => {
    btn.onclick = () => openBatch(parseInt(btn.dataset.batch));
  });
}

function renderBatchSelector() {
  const sel = $("#selBatch");
  sel.innerHTML = state.batches.map(b =>
    `<option value="${b.id}" ${b.id === state.currentBatchId ? "selected" : ""}>${b.name} — ${b.status}</option>`
  ).join("");
  sel.onchange = () => sel.value && openBatch(parseInt(sel.value));
}

async function openBatch(id) {
  state.currentBatchId = id;
  const data = await req(`/batches/${id}`);
  state.currentBatch = data.batch;
  state.problems = data.problems;
  state.logs = data.logs;
  renderBatchSelector();
  renderBatchStatus();
  renderLogs();
  renderMissing();
  applyFilters();
  $(".tab[data-tab=work]").click();
}

function renderBatchStatus() {
  const b = state.currentBatch;
  if (!b) return;
  $("#batchStatusBox").innerHTML = `
    <p><b>${b.name}</b></p>
    <p>状态：${statusChip(b.status)}</p>
    <p>题目：${b.total_problems || 0} &nbsp; 已算：${b.computed_problems || 0}</p>
    <p style="font-size:11px;color:#888;margin-top:6px">创建：${new Date(b.created_at).toLocaleString()}</p>
  `;
}

function renderLogs() {
  $("#batchLogs").innerHTML = (state.logs || []).map(l => `
    <li>
      <span class="ltime">${new Date(l.created_at).toLocaleString()}</span><br />
      ${l.from_status ? `${statusChip(l.from_status)} → ` : ""}${statusChip(l.to_status)}
      ${l.comment ? ` · ${l.comment}` : ""}
      <span style="color:#aaa">（${l.operator}）</span>
    </li>
  `).join("") || "<li>暂无记录</li>";
}

function renderMissing() {
  const box = $("#missingBox");
  const list = $("#missingList");
  const missing = (state.currentBatch && state.currentBatch.missing_problems) || [];
  if (missing.length === 0) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  list.innerHTML = missing.map(m => `
    <li><b>${m.problem_no}</b> ${m.student_name || ""}<br />
      <span style="color:#bf360c">${m.reason}</span></li>
  `).join("");
}

function applyFilters() {
  const status = $("#filterStatus").value;
  const onlyUnit = $("#filterUnit").checked;
  state.filteredProblems = state.problems.filter(p => {
    if (status && p.status !== status) return false;
    if (onlyUnit && !p.unit_missing) return false;
    return true;
  });
  renderProblemList();
}

function renderProblemList() {
  $("#probCount").textContent = `${state.filteredProblems.length} / ${state.problems.length}`;
  const grid = $("#probList");
  if (state.filteredProblems.length === 0) {
    grid.innerHTML = `<p style="color:#888;padding:20px;text-align:center">暂无题目，请先导入。</p>`;
    return;
  }
  grid.innerHTML = state.filteredProblems.map(p => `
    <div class="prob-card ${p.id === state.currentProblemId ? "active" : ""}" data-pid="${p.id}">
      <div class="pno">${p.problem_no}</div>
      <div class="pstudent">${p.student_name || "—"} ${p.student_id ? "#" + p.student_id : ""}</div>
      <div class="pscore ${p.score == null ? "none" : ""}">${p.score != null ? p.score : "未评分"}</div>
      <div class="ptags">
        ${statusChip(p.status)}
        ${p.unit_missing ? `<span class="unit-missing">⚠ 缺单位</span>` : ""}
      </div>
    </div>
  `).join("");
  $$(".prob-card").forEach(c => {
    c.onclick = () => openProblem(parseInt(c.dataset.pid));
  });
}

async function openProblem(pid) {
  state.currentProblemId = pid;
  const data = await req(`/problems/${pid}`);
  state.currentProblem = data.problem;
  state.counterexamples = data.counterexamples;
  state.problemLogs = data.logs;
  renderProblemList();
  renderDetail();
  $("#detailPanel").classList.remove("hidden");
}

function renderDetail() {
  const p = state.currentProblem;
  if (!p) return;
  $("#dProbNo").textContent = p.problem_no;
  $("#dStudent").textContent = p.student_name || "—";
  $("#dSid").textContent = p.student_id ? `(${p.student_id})` : "";
  $("#dUnit").textContent = p.units || "（未填）";
  $("#dUnitBadge").classList.toggle("hidden", !p.unit_missing);
  $("#dStatus").innerHTML = statusChip(p.status);
  $("#scoreBig").textContent = p.score != null ? p.score : "—";
  $("#inputScore").value = p.score ?? "";
  $("#taComment").value = p.teacher_comment || "";
  $("#paramsJson").textContent = JSON.stringify(p.params || {}, null, 2);

  const results = p.results || {};
  const cards = [
    ["box_counting", "盒计数", results.box_counting],
    ["correlation", "关联维数", results.correlation],
    ["information", "信息维数", results.information]
  ];
  $("#resultsSummary").innerHTML = cards.map(([k, name, r]) => {
    if (!r) return `<div class="r-card"><div class="r-name">${name}</div><div class="r-val" style="font-size:13px">无</div></div>`;
    return `<div class="r-card">
      <div class="r-name">${name}</div>
      <div class="r-val">${r.dimension ?? "—"}</div>
      <div class="r-r2">R² = ${r.r_squared ?? "—"}</div>
    </div>`;
  }).join("");

  const raw = typeof p.raw_data === "string" ? p.raw_data : JSON.stringify(p.raw_data);
  $("#rawPreview").textContent = raw.split("\n").slice(0, 20).join("\n") + (raw.split("\n").length > 20 ? "\n…" : "");

  const hlog = p.handling_log || [];
  $("#handlingLog").innerHTML = hlog.map(h => `
    <li>
      <span class="ltime">${new Date(h.time).toLocaleString()}</span><br />
      <b>${h.step}</b> ${h.detail ? "：" + h.detail : ""}
    </li>
  `).join("") || "<li>尚未执行处理步骤</li>";

  const done = new Set(hlog.map(h => h.step));
  $$(".steps li").forEach((li, idx) => {
    const steps = ["重复运行", "补录单位", "人工确认"];
    li.classList.toggle("done", done.has(steps[idx]));
  });

  renderCompareList();
}

function renderCompareList() {
  const ces = state.counterexamples || [];
  const grid = $("#compareList");
  if (ces.length === 0) {
    grid.innerHTML = `<p style="color:#888;padding:14px">暂无反例对比。</p>`;
    return;
  }
  grid.innerHTML = ces.map(ce => {
    const c = ce.compare_result || {};
    const b = c.before || {};
    const a = c.after || {};
    const changed = c.changed;
    return `
    <div class="compare-card">
      <h4>${ce.name}</h4>
      <div class="cdesc">${ce.description || ""}</div>
      <div class="compare-row">
        <div>
          <div class="label">处理前</div>
          <div class="val">${b.dimension ?? "—"}</div>
          <div class="r2">R² = ${b.r_squared ?? "—"}</div>
        </div>
        <div class="arrow">→</div>
        <div>
          <div class="label">处理后</div>
          <div class="val ${changed ? (c.difference > 0 ? "good" : "bad") : ""}">${a.dimension ?? "—"}</div>
          <div class="r2">R² = ${a.r_squared ?? "—"}</div>
        </div>
      </div>
      <div class="cmp-summary ${changed ? "changed" : "unchanged"}">
        ${c.explanation || ""} ${c.difference != null ? `（差值 ${c.difference > 0 ? "+" : ""}${c.difference}）` : ""}
      </div>
    </div>`;
  }).join("");
}

$$(".tab").forEach(t => {
  t.onclick = () => {
    $$(".tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    $$(".tab-panel").forEach(p => p.classList.remove("active"));
    $(`#tab-${t.dataset.tab}`).classList.add("active");
    if (t.dataset.tab === "boundary") loadBoundary();
  };
});

$$(".dtab").forEach(t => {
  t.onclick = () => {
    $$(".dtab").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    $$(".dtab-panel").forEach(p => p.classList.remove("active"));
    $(`.dtab-panel[data-dtab="${t.dataset.dtab}"]`).classList.add("active");
  };
});

$("#filterStatus").onchange = applyFilters;
$("#filterUnit").onchange = applyFilters;

$("#btnNewBatch").onclick = async () => {
  showModal("新建批次",
    `<label>批次名称：<input type="text" id="newBatchName" placeholder="例如 2024级高数A-第5次作业" /></label>`,
    async () => {
      const name = $("#newBatchName").value.trim();
      await req("/batches", { method: "POST", body: { name } });
      loadBatches();
    });
};

$("#btnLoadSample").onclick = async () => {
  if (!state.currentBatchId) {
    toast("请先选择一个批次", "error");
    return;
  }
  try {
    const r = await req(`/batches/${state.currentBatchId}/import`, {
      method: "POST", body: { use_sample: true }
    });
    toast(`导入 ${r.imported} 条，其中 ${r.unit_missing} 条缺单位`, "success");
    openBatch(state.currentBatchId);
  } catch (e) { toast(e.message, "error"); }
};

$("#btnImport").onclick = () => {
  if (!state.currentBatchId) { toast("请先创建或选择批次", "error"); return; }
  showModal("导入题目数据",
    `<p class="hint" style="margin-bottom:10px">每行一条记录，格式：题目编号, 学生姓名, 学号, 单位, 数据。或者仅粘贴坐标数据（每行一组坐标值）。</p>
     <textarea id="importTextarea" placeholder="F-001,张三,20230101,cm,0.0 0.0&#10;0.1 0.05&#10;...&#10;===&#10;F-002,李四,20230102,,0.0,0.0&#10;..."></textarea>`,
    async () => {
      const text = $("#importTextarea").value;
      const problems = parseImportText(text);
      if (problems.length === 0) throw new Error("没有解析到有效题目");
      const r = await req(`/batches/${state.currentBatchId}/import`, {
        method: "POST", body: { problems }
      });
      openBatch(state.currentBatchId);
    });
};

function parseImportText(text) {
  const blocks = text.split(/\n={3,}\n/);
  const problems = [];
  for (const block of blocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    let meta = { problem_no: `P${problems.length + 1}`, student_name: "", student_id: "", units: "", raw_data: "" };
    let dataStart = 0;
    const firstParts = lines[0].split(/[,\t]/).map(s => s.trim());
    if (firstParts.length >= 4 && isNaN(parseFloat(firstParts[0]))) {
      meta.problem_no = firstParts[0] || meta.problem_no;
      meta.student_name = firstParts[1] || "";
      meta.student_id = firstParts[2] || "";
      meta.units = firstParts[3] || "";
      if (firstParts.length > 4 && firstParts.slice(4).some(p => !isNaN(parseFloat(p)))) {
        meta.raw_data = firstParts.slice(4).join(" ") + "\n";
      }
      dataStart = 1;
    }
    meta.raw_data += lines.slice(dataStart).join("\n");
    if (meta.raw_data.trim()) problems.push(meta);
  }
  return problems;
}

$("#btnCompute").onclick = async () => {
  if (!state.currentBatchId) { toast("请先选择批次", "error"); return; }
  try {
    const r = await req(`/batches/${state.currentBatchId}/compute`, { method: "POST" });
    toast(`计算完成：成功 ${r.computed}，失败 ${r.missing.length}`, r.missing.length ? "" : "success");
    openBatch(state.currentBatchId);
  } catch (e) { toast(e.message, "error"); }
};

$("#btnAdvance").onclick = () => {
  if (!state.currentBatch) return;
  const cur = state.currentBatch.status;
  const allowed = {
    "待导入": ["已导入待计算"],
    "已导入待计算": ["计算中", "计算完成待复核"],
    "计算中": ["计算完成待复核"],
    "计算完成待复核": ["复核通过", "复核驳回"],
    "复核驳回": ["已导入待计算"],
    "复核通过": ["已导出报告"],
    "已导出报告": []
  }[cur] || [];
  if (allowed.length === 0) { toast("当前状态无可推进目标", "error"); return; }
  showModal(`状态推进：${cur}`,
    `<label>目标状态：
      <select id="selNext">${allowed.map(s => `<option>${s}</option>`).join("")}</select></label>
     <label style="margin-top:10px;display:block">备注：<input type="text" id="advComment" /></label>`,
    async () => {
      const target = $("#selNext").value;
      const comment = $("#advComment").value;
      await req(`/batches/${state.currentBatchId}/status`, {
        method: "POST", body: { status: target, operator: "teacher", comment }
      });
      openBatch(state.currentBatchId);
    });
};

$("#btnExport").onclick = () => {
  if (!state.currentBatchId) return;
  showModal("导出报告",
    `<label>格式：
      <select id="expFmt">
        <option value="csv">CSV（可直接 Excel 打开）</option>
        <option value="json">JSON（完整数据）</option>
      </select></label>`,
    () => {
      const fmt = $("#expFmt").value;
      window.open(`${API}/batches/${state.currentBatchId}/export?format=${fmt}`, "_blank");
      setTimeout(() => openBatch(state.currentBatchId), 1500);
    });
};

$("#btnPass").onclick = () => doReview(true);
$("#btnReject").onclick = () => doReview(false);

async function doReview(passed) {
  if (!state.currentProblemId) return;
  const score = parseFloat($("#inputScore").value);
  const comment = $("#taComment").value;
  try {
    await req(`/problems/${state.currentProblemId}/review`, {
      method: "POST", body: { passed, score: isNaN(score) ? null : score, comment, operator: "teacher" }
    });
    openProblem(state.currentProblemId);
    openBatch(state.currentBatchId);
  } catch (e) { toast(e.message, "error"); }
}

$$(".steps button").forEach(btn => {
  btn.onclick = async () => {
    if (!state.currentProblemId) return;
    const step = btn.dataset.step;
    const payload = { step };
    if (step === "补录单位") {
      const val = $("#inputUnit").value.trim();
      if (!val) { toast("请填写单位", "error"); return; }
      payload.unit_value = val;
    }
    payload.detail = step === "重复运行" ? "对原始数据再次执行三种维数算法" :
                      step === "补录单位" ? `老师补录为：${payload.unit_value || ""}` :
                      "老师已人工核实数据可靠性";
    try {
      await req(`/problems/${state.currentProblemId}/unit-handling`, { method: "POST", body: payload });
      openProblem(state.currentProblemId);
    } catch (e) { toast(e.message, "error"); }
  };
});

$("#btnGenBoundary").onclick = async () => {
  if (!state.currentProblemId) return;
  if (state.boundaryExamples.length === 0) await loadBoundary();
  const ex = state.boundaryExamples;
  showModal("选择边界样例作为反例",
    `<select id="selBoundary">
      ${ex.map((e, i) => `<option value="${i}">${e.name} — ${e.description.slice(0, 30)}…</option>`).join("")}
    </select>`,
    async () => {
      const idx = parseInt($("#selBoundary").value);
      const e = ex[idx];
      await req(`/problems/${state.currentProblemId}/counterexample`, {
        method: "POST", body: {
          name: e.name,
          description: e.description + " | 前：" + e.before_note + "；后：" + e.after_note,
          before_points: e.before_points,
          after_points: e.after_points
        }
      });
      openProblem(state.currentProblemId);
    });
};

async function loadBoundary() {
  state.boundaryExamples = await req("/boundary-examples");
  $("#boundaryList").innerHTML = state.boundaryExamples.map(e => {
    const c = e.compare || {};
    const b = c.before || {};
    const a = c.after || {};
    return `
    <div class="boundary-card">
      <h3>${e.name}</h3>
      <p class="bdesc">${e.description}</p>
      <div class="compare-row">
        <div>
          <div class="label">${e.before_note || "处理前"}</div>
          <div class="val">${b.dimension ?? "—"}</div>
          <div class="r2">R² = ${b.r_squared ?? "—"}</div>
        </div>
        <div class="arrow">→</div>
        <div>
          <div class="label">${e.after_note || "处理后"}</div>
          <div class="val ${c.changed ? (c.difference > 0 ? "good" : "bad") : ""}">${a.dimension ?? "—"}</div>
          <div class="r2">R² = ${a.r_squared ?? "—"}</div>
        </div>
      </div>
      <div class="cmp-summary ${c.changed ? "changed" : "unchanged"}">
        ${c.explanation || ""} ${c.difference != null ? `（差值 ${c.difference > 0 ? "+" : ""}${c.difference}）` : ""}
      </div>
    </div>`;
  }).join("");
}

(async function init() {
  await loadBatches();
  if (state.batches.length > 0) openBatch(state.batches[0].id);
})();

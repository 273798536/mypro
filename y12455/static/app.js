const BASIS_CN = { "+": "直线基(+)", "×": "对角基(×)" };
let sessionId = null;
let snapshot = null;

function setStatus(text) {
  document.getElementById("status-text").textContent = text;
}

function showPanel(phase) {
  document.querySelectorAll(".phase-panel").forEach(p => p.style.display = "none");
  const el = document.getElementById("phase-" + phase);
  if (el) el.style.display = "block";
}

async function api(path, body) {
  const url = "/api/" + (sessionId || "none") + path;
  const opts = { method: "POST", headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

async function initSession() {
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  sessionId = data.session_id;
  snapshot = data.snapshot;
  document.getElementById("session-id").textContent = "会话 " + sessionId;
  showPanel("setup");
  setStatus("就绪 — 设置参数后开始");
}

async function startGame() {
  const numPhotons = parseInt(document.getElementById("inp-photons").value);
  const berThreshold = parseFloat(document.getElementById("inp-ber").value);
  snapshot = await api("/start", { num_photons: numPhotons, ber_threshold: berThreshold });
  renderAliceTable();
  showPanel("alice");
  setStatus("Alice 发送光子中…");
}

async function goToEve() {
  snapshot = await api("/bob");
  renderEveControls();
  showPanel("eve");
  setStatus("选择拦截策略");
}

async function skipEve() {
  snapshot = await api("/bob");
  renderBobTable();
  showPanel("bob");
  setStatus("Bob 测量中…");
}

async function submitEve() {
  const choices = collectEveChoices();
  snapshot = await api("/eve", { choices });
  renderBobTable();
  showPanel("bob");
  setStatus("Bob 测量中…");
}

async function doSift() {
  snapshot = await api("/sift");
  snapshot = await api("/analyze");
  renderAnalysis();
  showPanel("analysis");
  setStatus("分析完成");
}

async function runAuto() {
  if (!sessionId) await initSession();
  const numPhotons = parseInt(document.getElementById("inp-photons").value);
  const berThreshold = parseFloat(document.getElementById("inp-ber").value);
  const allIndices = Array.from({ length: numPhotons }, (_, i) => i);
  const eveIndices = allIndices.filter(() => Math.random() < 0.4);
  const eveChoices = eveIndices.map(i => ({
    index: i,
    active: true,
    basis: Math.random() < 0.5 ? "+" : "×",
  }));
  snapshot = await api("/run-auto", {
    num_photons: numPhotons,
    ber_threshold: berThreshold,
    eve_choices: eveChoices,
  });
  renderAnalysis();
  showPanel("analysis");
  setStatus("自动演示完成");
}

async function exportReport() {
  const res = await api("/export");
  const info = document.getElementById("export-info");
  info.textContent = "报告已生成：" + res.report_file;
  const link = document.getElementById("report-link");
  link.href = "/exports/" + res.report_file;
  showPanel("done");
  setStatus("报告已导出");
}

async function restartGame() {
  snapshot = await api("/restart");
  document.getElementById("pause-bar").style.display = "none";
  showPanel("setup");
  setStatus("已重置 — 重新设置参数");
}

async function pauseGame() {
  snapshot = await api("/pause");
  document.getElementById("pause-bar").style.display = "flex";
  setStatus("已暂停");
}

async function resumeGame() {
  snapshot = await api("/resume");
  document.getElementById("pause-bar").style.display = "none";
  const phase = snapshot.phase;
  if (phase === "alice") { renderAliceTable(); showPanel("alice"); }
  else if (phase === "eve") { renderEveControls(); showPanel("eve"); }
  else if (phase === "bob") { renderBobTable(); showPanel("bob"); }
  else if (phase === "analysis" || phase === "done") { renderAnalysis(); showPanel("analysis"); }
  setStatus("继续");
}

function collectEveChoices() {
  const choices = [];
  const rows = document.querySelectorAll("#eve-controls tr[data-idx]");
  rows.forEach(row => {
    const idx = parseInt(row.dataset.idx);
    const cb = row.querySelector("input[type=checkbox]");
    const sel = row.querySelector("select");
    if (cb && cb.checked) {
      choices.push({ index: idx, active: true, basis: sel.value });
    }
  });
  return choices;
}

function basisClass(b) {
  return b === "+" ? "basis-plus" : "basis-cross";
}

function renderAliceTable() {
  const events = snapshot.raw_events;
  if (!events || !events.length) return;
  let html = "<table><tr><th>#</th><th>比特</th><th>编码基</th><th>量子态</th></tr>";
  events.forEach(e => {
    html += `<tr>
      <td>${e.index}</td>
      <td>${e.alice_bit}</td>
      <td class="${basisClass(e.alice_basis)}">${BASIS_CN[e.alice_basis] || e.alice_basis}</td>
      <td>${e.photon_state}</td>
    </tr>`;
  });
  html += "</table>";
  document.getElementById("alice-table").innerHTML = html;
}

function renderEveControls() {
  const events = snapshot.raw_events;
  if (!events || !events.length) return;
  let html = "<table><tr><th>#</th><th>拦截</th><th>测量基</th><th>Alice基</th></tr>";
  events.forEach(e => {
    html += `<tr data-idx="${e.index}">
      <td>${e.index}</td>
      <td class="eve-check">
        <input type="checkbox" id="eve-cb-${e.index}">
      </td>
      <td class="eve-check">
        <select id="eve-sel-${e.index}">
          <option value="+">直线基(+)</option>
          <option value="×">对角基(×)</option>
        </select>
      </td>
      <td class="${basisClass(e.alice_basis)}">${BASIS_CN[e.alice_basis] || e.alice_basis}</td>
    </tr>`;
  });
  html += "</table>";
  document.getElementById("eve-controls").innerHTML = html;
}

function renderBobTable() {
  const events = snapshot.raw_events;
  if (!events || !events.length) return;
  let html = "<table><tr><th>#</th><th>Bob基</th><th>Bob比特</th><th>基匹配</th>";
  if (events.some(e => e.eve_active)) {
    html += "<th>Eve拦截</th><th>Eve基</th><th>Eve基匹配</th>";
  }
  html += "</tr>";
  events.forEach(e => {
    const matchTag = e.bob_basis_mismatch
      ? '<span class="tag tag-warn">不匹配</span>'
      : '<span class="tag tag-safe">匹配</span>';
    html += `<tr>
      <td>${e.index}</td>
      <td class="${basisClass(e.bob_basis)}">${BASIS_CN[e.bob_basis] || e.bob_basis}</td>
      <td>${e.bob_bit}</td>
      <td>${matchTag}</td>`;
    if (events.some(ev => ev.eve_active)) {
      const eveTag = e.eve_active
        ? (e.eve_basis_mismatch
          ? '<span class="tag tag-danger">基不匹配</span>'
          : '<span class="tag tag-safe">基匹配</span>')
        : '<span class="tag tag-dim">未拦截</span>';
      html += `<td>${e.eve_active ? "✓" : "—"}</td>
        <td>${e.eve_active ? (BASIS_CN[e.eve_basis] || e.eve_basis) : "—"}</td>
        <td>${eveTag}</td>`;
    }
    html += "</tr>";
  });
  html += "</table>";
  document.getElementById("bob-table").innerHTML = html;
}

function renderAnalysis() {
  const results = snapshot.results || {};
  const analysis = snapshot.analysis || {};
  let html = "";

  html += '<div class="stats-grid">';
  html += statItem(results.num_photons, "发送光子");
  html += statItem(results.num_sifted, "筛选保留");
  html += statItem(results.num_test, "测试样本");
  html += statItem(results.num_key_bits, "最终密钥位");
  html += statItem(results.test_errors, "测试不一致");
  const berClass = results.ber_exceeded ? "danger" : "safe";
  html += `<div class="stat-item"><span class="num ${berClass}">${(results.ber * 100).toFixed(1)}%</span><span class="label">QBER</span></div>`;
  html += "</div>";

  html += '<div style="margin:1rem 0;">';
  html += '<p style="font-size:0.85rem;color:var(--muted);margin-bottom:0.3rem;">Alice 密钥</p>';
  html += `<div class="key-display">${results.final_key_alice || "—"}</div>`;
  html += '<p style="font-size:0.85rem;color:var(--muted);margin:0.5rem 0 0.3rem;">Bob 密钥</p>';
  html += `<div class="key-display">${results.final_key_bob || "—"}</div>`;
  const matchTag = results.key_match
    ? '<span class="tag tag-safe">一致</span>'
    : '<span class="tag tag-danger">不一致</span>';
  html += `<p style="margin-top:0.5rem;">密钥一致性：${matchTag}</p>`;
  html += "</div>";

  if (analysis.summary) {
    html += `<div class="summary-box"><strong>总评：</strong>${analysis.summary}</div>`;
  }

  html += renderBasisConfusion(analysis.basis_confusion);
  html += renderBerAnalysis(analysis.ber_analysis);
  html += renderRepeatAnalysis(analysis.repeat_analysis);

  html += '<div style="margin-top:1.5rem;">';
  html += '<h3 style="font-size:1rem;margin-bottom:0.5rem;">事件回放</h3>';
  html += renderEventReplay(snapshot.raw_events);
  html += "</div>";

  document.getElementById("analysis-content").innerHTML = html;
}

function statItem(value, label) {
  return `<div class="stat-item"><span class="num">${value !== undefined ? value : "—"}</span><span class="label">${label}</span></div>`;
}

function renderBasisConfusion(bc) {
  if (!bc) return "";
  const count = bc.count || 0;
  const tag = count > 0 ? "tag-danger" : "tag-safe";
  let html = `<div class="analysis-section">
    <h3>1. 测量基混淆 <span class="tag ${tag}">${count > 0 ? "发现 " + count + " 次" : "未发现"}</span></h3>
    <div class="explain-box">${bc.general_explanation || ""}</div>`;
  if (bc.detail && bc.detail.length) {
    html += '<ul class="detail-list">';
    bc.detail.forEach(d => { html += `<li>${d.explanation}</li>`; });
    html += "</ul>";
  }
  html += "</div>";
  return html;
}

function renderBerAnalysis(ba) {
  if (!ba) return "";
  const detail = ba.detail || {};
  const exceeded = detail.exceeded;
  const tag = exceeded ? "tag-danger" : "tag-safe";
  let html = `<div class="analysis-section">
    <h3>2. 误码超限判定 <span class="tag ${tag}">
      ${exceeded ? "QBER " + (detail.ber * 100).toFixed(1) + "% > 阈值" : "QBER " + (detail.ber * 100).toFixed(1) + "% ≤ 阈值"}
    </span></h3>
    <div class="explain-box">${ba.general_explanation || ""}</div>
    <p style="margin:0.5rem 0;font-size:0.88rem;white-space:pre-line;">${detail.explanation || ""}</p>`;
  if (detail.error_indices && detail.error_indices.length) {
    html += `<p style="font-size:0.82rem;color:var(--muted);">出错光子：${detail.error_indices.map(i => "#" + i).join(", ")}</p>`;
  }
  html += "</div>";
  return html;
}

function renderRepeatAnalysis(ra) {
  if (!ra) return "";
  const count = ra.count || 0;
  const tag = count > 0 ? "tag-warn" : "tag-safe";
  let html = `<div class="analysis-section">
    <h3>3. 重复传输检测 <span class="tag ${tag}">${count > 0 ? "发现 " + count + " 对" : "未发现"}</span></h3>
    <div class="explain-box">${ra.general_explanation || ""}</div>`;
  if (ra.detail && ra.detail.length) {
    html += '<ul class="detail-list">';
    ra.detail.forEach(d => { html += `<li>${d.explanation}</li>`; });
    html += "</ul>";
  }
  html += "</div>";
  return html;
}

function renderEventReplay(events) {
  if (!events || !events.length) return '<p style="color:var(--muted);">无数据</p>';
  let html = '<div style="max-height:400px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:0.8rem;">';
  events.forEach(e => {
    const aliceBasisCN = BASIS_CN[e.alice_basis] || e.alice_basis;
    const bobBasisCN = BASIS_CN[e.bob_basis] || e.bob_basis;
    let line = `<div style="padding:0.3rem 0;border-bottom:1px dashed var(--border);font-size:0.82rem;line-height:1.7;">`;
    line += `<span class="tag" style="background:rgba(96,165,250,0.15);color:var(--alice);">发送</span> Alice → #${e.index}: 比特=${e.alice_bit}, 基=${aliceBasisCN}, 态=${e.photon_state}`;

    if (e.eve_active) {
      const eveBasisCN = BASIS_CN[e.eve_basis] || e.eve_basis;
      const mismatch = e.eve_basis_mismatch ? " ⚠ 基不匹配" : " ✓ 基匹配";
      line += `<br><span class="tag tag-danger">拦截</span> Eve: ${eveBasisCN}${mismatch}, 结果=${e.eve_bit_after}`;
    }

    line += `<br><span class="tag" style="background:rgba(167,139,250,0.15);color:var(--bob);">测量</span> Bob: ${bobBasisCN}, 结果=${e.bob_bit}`;

    if (e.sifted) {
      if (e.in_test_sample) {
        const match = e.test_bit_match ? "一致 ✓" : "不一致 ⚠";
        line += `<br><span class="tag tag-warn">测试</span> 公开比对: ${match}`;
      } else {
        line += `<br><span class="tag tag-safe">密钥</span> 进入最终密钥`;
      }
    } else {
      line += `<br><span class="tag tag-dim">丢弃</span> 基不一致`;
    }

    if (e.repeated) {
      line += `<br><span class="tag tag-danger">重复</span> 与 #${e.repeat_of} 编码相同`;
    }

    line += "</div>";
    html += line;
  });
  html += "</div>";
  return html;
}

initSession();

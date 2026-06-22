const API_BASE = "";

function $(id) {
  return document.getElementById(id);
}

async function apiGet(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${API_BASE}${path}?${qs}` : `${API_BASE}${path}`;
  const resp = await fetch(url, { method: "GET" });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `请求失败：${resp.status}`);
  }
  return resp.json();
}

async function apiPost(path, body, isFormData = false) {
  const opts = { method: "POST" };
  if (isFormData) {
    opts.body = body;
  } else {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }
  const resp = await fetch(`${API_BASE}${path}`, opts);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `请求失败：${resp.status}`);
  }
  return resp.json();
}

function showResult(el, type, title, content) {
  el.style.display = "block";
  el.className = `result-box ${type}`;
  el.innerHTML = `<h4>${title}</h4>${content}`;
}

function statusLabel(status) {
  const map = {
    completed: "已完成",
    completed_with_errors: "部分错误",
    skipped_duplicate: "重复跳过",
    aborted_sort_unstable: "排序中止",
    new: "新增",
    skipped: "跳过",
    updated: "更新",
    error: "错误",
  };
  return map[status] || status;
}

function statusTagClass(status) {
  const map = {
    completed: "status-completed",
    completed_with_errors: "status-completed_with_errors",
    skipped_duplicate: "status-skipped_duplicate",
    aborted_sort_unstable: "status-aborted_sort_unstable",
    new: "status-new",
    skipped: "status-skipped",
    updated: "status-updated",
    error: "status-error",
  };
  return `status-tag ${map[status] || ""}`;
}

/* Tabs */
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $(`tab-${btn.dataset.tab}`).classList.add("active");

    if (btn.dataset.tab === "review" && !$("questionTable").dataset.loaded) {
      loadQuestions();
    }
    if (btn.dataset.tab === "records" && !$("recordTable").dataset.loaded) {
      loadRecords();
    }
    if (btn.dataset.tab === "logs" && !$("logTable").dataset.loaded) {
      loadLogs();
    }
  });
});

/* Import */
$("importBtn").addEventListener("click", async () => {
  const fileInput = $("fileInput");
  if (!fileInput.files || fileInput.files.length === 0) {
    showResult($("importResult"), "warning", "请先选择文件", "<p>请选择要导入的 CSV / Excel / JSON / TXT 文件。</p>");
    return;
  }
  const fd = new FormData();
  fd.append("file", fileInput.files[0]);
  fd.append("import_type", $("importType").value);
  fd.append("operator", $("operator").value || "system");

  const btn = $("importBtn");
  btn.disabled = true;
  btn.textContent = "导入中...";
  showResult($("importResult"), "info", "正在导入", "<p>系统正在处理数据，包含幂等校验和排序稳定性检查，请稍候...</p>");

  try {
    const summary = await apiPost("/api/import", fd, true);
    const isDup = summary.is_duplicate_batch;
    const type = isDup ? "warning" : summary.errors > 0 ? "warning" : "success";
    let content = `
      <p><strong>批次号：</strong><code>${summary.batch_no}</code></p>
      <ul>
        <li>总记录数：${summary.total}</li>
        <li>新增：<strong>${summary.new}</strong> 条</li>
        <li>跳过：<strong>${summary.skipped}</strong> 条</li>
        <li>更新：${summary.updated} 条</li>
        <li>错误：${summary.errors} 条</li>
      </ul>`;
    if (isDup && summary.duplicate_reason) {
      content += `<div class="risk-box"><strong>提示：</strong>${summary.duplicate_reason}</div>`;
    }
    if (summary.new_items && summary.new_items.length) {
      content += `<p>新增样例（前 ${summary.new_items.length} 条）：</p><ul>`;
      summary.new_items.forEach((it) => {
        content += `<li>${it.question_no || it.param_name || ""} ${it.row_content ? "- " + Object.values(it.row_content).slice(0, 3).join(" | ") : ""}</li>`;
      });
      content += `</ul>`;
    }
    if (summary.skipped_items && summary.skipped_items.length) {
      content += `<p>跳过样例（前 ${summary.skipped_items.length} 条）：</p><ul>`;
      summary.skipped_items.slice(0, 5).forEach((it) => {
        content += `<li>${it.reason || "已跳过"}${it.question_no ? " - " + it.question_no : ""}</li>`;
      });
      content += `</ul>`;
    }
    const title = isDup ? "检测到重复批次，已自动跳过" : "导入完成";
    showResult($("importResult"), type, title, content);
  } catch (e) {
    showResult($("importResult"), "error", "导入失败", `<p>${e.message}</p><p class="hint">请检查文件格式是否正确，或联系值班同事处理。</p>`);
  } finally {
    btn.disabled = false;
    btn.textContent = "开始导入";
  }
});

/* Questions */
async function loadQuestions(keyword = "", category = "") {
  try {
    const list = await apiGet("/api/questions", { keyword, category, limit: 200 });
    $("qCount").textContent = `（共 ${list.length} 条）`;
    const tbody = $("questionTable").querySelector("tbody");
    if (!list.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="5">暂无数据，请先在"数据导入"页面导入题目清单。</td></tr>`;
    } else {
      tbody.innerHTML = list
        .map(
          (q) => `<tr>
            <td><code>${q.question_no}</code></td>
            <td>${q.title}</td>
            <td>${q.category || "-"}</td>
            <td>${q.difficulty || "-"}</td>
            <td>
              <button class="secondary-btn" onclick="reviewQuestion(${q.id})">复核</button>
            </td>
          </tr>`
        )
        .join("");
    }
    $("questionTable").dataset.loaded = "1";
  } catch (e) {
    alert(e.message);
  }
}

$("searchQBtn").addEventListener("click", () => {
  loadQuestions($("qKeyword").value, $("qCategory").value);
});

$("reviewByIdBtn").addEventListener("click", () => {
  const id = parseInt($("reviewId").value, 10);
  if (!id) return alert("请输入题目 ID");
  reviewQuestion(id);
});

$("reviewByNoBtn").addEventListener("click", async () => {
  const no = $("reviewNo").value.trim();
  if (!no) return alert("请输入题目编号");
  try {
    const data = await apiGet(`/api/questions/by_no/${encodeURIComponent(no)}`);
    renderReview(data);
  } catch (e) {
    alert(e.message);
  }
});

async function reviewQuestion(id) {
  try {
    const data = await apiGet(`/api/questions/${id}`);
    renderReview(data);
  } catch (e) {
    alert(e.message);
  }
}

function renderReview(data) {
  const q = data.question;
  const el = $("reviewDetail");
  el.style.display = "block";

  let paramsHtml = "";
  if (data.parameters.length) {
    paramsHtml = `<table class="param-table">
      <thead><tr>
        <th>版本</th><th>参数名称</th><th>取值</th><th>单位</th><th>边界条件</th><th>说明</th>
      </tr></thead>
      <tbody>`;
    data.parameters.forEach((p) => {
      paramsHtml += `<tr>
        <td><code>${p.version_no}</code></td>
        <td><strong>${p.param_name}</strong></td>
        <td>${p.param_value || "-"}</td>
        <td>${p.unit ? `<span class="unit">${p.unit}</span>` : "-"}</td>
        <td>${p.boundary_condition ? `<span class="boundary">${p.boundary_condition}</span>` : "-"}</td>
        <td>${p.description || "-"}</td>
      </tr>`;
    });
    paramsHtml += `</tbody></table>`;
  } else {
    paramsHtml = `<p class="hint">暂无参数版本记录。</p>`;
  }

  let supsHtml = "";
  if (data.supplements.length) {
    supsHtml = `<table class="param-table">
      <thead><tr><th>批次号</th><th>类型</th><th>内容</th><th>来源</th><th>记录时间</th></tr></thead>
      <tbody>`;
    data.supplements.forEach((s) => {
      supsHtml += `<tr>
        <td><code>${s.batch_no || "-"}</code></td>
        <td>${s.supplement_type}</td>
        <td>${s.content || "-"}</td>
        <td>${s.source || "-"}</td>
        <td>${new Date(s.recorded_at).toLocaleString()}</td>
      </tr>`;
    });
    supsHtml += `</tbody></table>`;
  } else {
    supsHtml = `<p class="hint">暂无补录记录。</p>`;
  }

  let logsHtml = "";
  if (data.change_logs.length) {
    logsHtml = `<table class="data-table" style="font-size:0.8rem;">
      <thead><tr><th>时间</th><th>对象</th><th>操作</th><th>字段</th><th>原值</th><th>新值</th><th>操作人</th><th>备注</th></tr></thead>
      <tbody>`;
    data.change_logs.slice(0, 50).forEach((l) => {
      logsHtml += `<tr>
        <td>${new Date(l.changed_at).toLocaleString()}</td>
        <td>${l.target_type}</td>
        <td><span class="${statusTagClass(l.action)}">${statusLabel(l.action) || l.action}</span></td>
        <td>${l.field_name || "-"}</td>
        <td>${l.old_value ? l.old_value.slice(0, 30) : "-"}</td>
        <td>${l.new_value ? l.new_value.slice(0, 30) : "-"}</td>
        <td>${l.changed_by || "-"}</td>
        <td>${l.remark || "-"}</td>
      </tr>`;
    });
    logsHtml += `</tbody></table>`;
  } else {
    logsHtml = `<p class="hint">暂无修改痕迹。</p>`;
  }

  el.innerHTML = `
    <div class="review-section">
      <h4>题目信息</h4>
      <p><strong>编号：</strong><code>${q.question_no}</code></p>
      <p><strong>标题：</strong>${q.title}</p>
      <p><strong>分类：</strong>${q.category || "-"} &nbsp;&nbsp; <strong>难度：</strong>${q.difficulty || "-"}</p>
      ${q.formula ? `<div class="formula-box">公式：<br />${q.formula}</div>` : ""}
      ${q.description ? `<p><strong>描述：</strong>${q.description}</p>` : ""}
    </div>
    <div class="review-section">
      <h4>参数版本（含单位与边界条件）</h4>
      ${paramsHtml}
    </div>
    <div class="review-section">
      <h4>补录记录</h4>
      ${supsHtml}
    </div>
    <div class="review-section">
      <h4>修改痕迹</h4>
      ${logsHtml}
    </div>
  `;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* Records */
async function loadRecords(status = "", batchNo = "") {
  try {
    const list = await apiGet("/api/import-records", { status, batch_no: batchNo, limit: 200 });
    const tbody = $("recordTable").querySelector("tbody");
    if (!list.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="11">暂无导入记录。</td></tr>`;
    } else {
      tbody.innerHTML = list
        .map(
          (r) => `<tr>
            <td><code>${r.batch_no}</code></td>
            <td>${r.file_name}</td>
            <td>${r.import_type}</td>
            <td>${r.total_count}</td>
            <td><span class="${statusTagClass('new')}">${r.new_count}</span></td>
            <td><span class="${statusTagClass('skipped')}">${r.skipped_count}</span></td>
            <td>${r.updated_count}</td>
            <td>${r.error_count ? `<span class="${statusTagClass('error')}">${r.error_count}</span>` : 0}</td>
            <td><span class="${statusTagClass(r.status)}">${statusLabel(r.status)}</span></td>
            <td>${new Date(r.imported_at).toLocaleString()}</td>
            <td>
              <button class="secondary-btn" onclick="showReport(${r.id})">查看报告</button>
              ${r.status === "aborted_sort_unstable" ? `<button class="secondary-btn" onclick="showSortAbort(${r.id})">查看中止原因</button>` : ""}
            </td>
          </tr>`
        )
        .join("");
    }
    $("recordTable").dataset.loaded = "1";
  } catch (e) {
    alert(e.message);
  }
}

$("searchRBtn").addEventListener("click", () => {
  loadRecords($("rStatus").value, $("rBatchNo").value);
});

async function showReport(id) {
  try {
    const report = await apiGet(`/api/reports/${id}`);
    const el = $("reportDetail");
    el.style.display = "block";

    let stats = "";
    if (report["统计汇总"]) {
      stats = `<div class="report-summary">`;
      for (const [k, v] of Object.entries(report["统计汇总"])) {
        stats += `<div class="report-stat"><span class="num">${v}</span><span class="label">${k}</span></div>`;
      }
      stats += `</div>`;
    }

    let html = `<h3>导入报告 - ${report["批次信息"] ? report["批次信息"]["批次号"] : ""}</h3>`;
    if (report["幂等性说明"]) {
      html += `<div class="risk-box"><strong>幂等性说明：</strong>${report["幂等性说明"]["说明"] || ""}</div>`;
    }
    if (report["稳定性检查"]) {
      html += `<div class="${report["稳定性检查"]["排序是否稳定"] === "是" ? "result-box success" : "risk-box"}">
        <strong>排序稳定性：</strong>${report["稳定性检查"]["排序是否稳定"]}<br/>
        ${report["稳定性检查"]["风险提示"]}
      </div>`;
    }
    html += stats;

    if (report["缺失材料"]) {
      html += `<div class="risk-box"><strong>需要补齐的材料：</strong><ul class="material-list"><li>${report["缺失材料"].split(/\d\)/).filter(Boolean).join("</li><li>")}</li></ul></div>`;
    }
    if (report["错误信息"]) {
      html += `<div class="risk-box"><strong>详细提示：</strong>${report["错误信息"]}</div>`;
    }

    for (const section of ["新增明细", "跳过明细", "更新明细", "错误明细"]) {
      if (report[section] && report[section].length) {
        html += `<div class="report-subsection"><h5>${section}（${report[section].length} 条）</h5>`;
        html += `<table class="data-table" style="font-size:0.8rem;"><thead><tr><th>行号</th><th>关键字</th><th>备注</th></tr></thead><tbody>`;
        report[section].slice(0, 30).forEach((it) => {
          html += `<tr><td>${it["行号"] || "-"}</td><td>${it["关键字"] || "-"}</td><td>${it["备注"] || "-"}</td></tr>`;
        });
        html += `</tbody></table></div>`;
      }
    }

    if (report["值班提示"]) {
      html += `<div class="result-box info"><h4>值班同事请注意</h4>
        <p>${report["值班提示"]["如需复核"] || ""}</p>
        <p>${report["值班提示"]["异常处理"] || ""}</p></div>`;
    }

    el.innerHTML = html;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    alert(e.message);
  }
}

async function showSortAbort(id) {
  try {
    const rec = await apiGet(`/api/import-records/${id}`);
    const el = $("reportDetail");
    el.style.display = "block";
    el.innerHTML = `
      <div class="risk-box">
        <h4>⚠ 该批次因排序不稳定已中止</h4>
        <p><strong>提示：</strong>${rec.error_message || "无详细信息"}</p>
        <hr/>
        <p><strong>值班同事需补齐以下材料后再导入：</strong></p>
        <ul class="material-list">
          ${(rec.missing_materials || "请联系数据录入同事确认。").split(/\d\)/).filter(Boolean).map(s => `<li>${s.trim()}</li>`).join("")}
        </ul>
        <p class="hint">如对排序有疑问，可联系原始录入人确认底单顺序，或在文件末尾加一列标注行号以固定顺序。</p>
      </div>
    `;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    alert(e.message);
  }
}

/* Logs */
async function loadLogs(targetType = "", batchNo = "", changedBy = "") {
  try {
    const list = await apiGet("/api/change-logs", {
      target_type: targetType,
      batch_no: batchNo,
      changed_by: changedBy,
      limit: 300,
    });
    const tbody = $("logTable").querySelector("tbody");
    if (!list.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="9">暂无修改记录。</td></tr>`;
    } else {
      tbody.innerHTML = list
        .map(
          (l) => `<tr>
            <td>${new Date(l.changed_at).toLocaleString()}</td>
            <td>${l.target_type}</td>
            <td><span class="${statusTagClass(l.action)}">${l.action === "create" ? "新增" : l.action === "update" ? "修改" : l.action}</span></td>
            <td>${l.field_name || "-"}</td>
            <td>${l.old_value ? l.old_value.slice(0, 30) : "-"}</td>
            <td>${l.new_value ? l.new_value.slice(0, 30) : "-"}</td>
            <td>${l.changed_by || "-"}</td>
            <td>${l.batch_no ? `<code>${l.batch_no}</code>` : "-"}</td>
            <td>${l.remark || "-"}</td>
          </tr>`
        )
        .join("");
    }
    $("logTable").dataset.loaded = "1";
  } catch (e) {
    alert(e.message);
  }
}

$("searchLogBtn").addEventListener("click", () => {
  loadLogs($("logTargetType").value, $("logBatchNo").value, $("logChangedBy").value);
});

/* Init */
window.addEventListener("DOMContentLoaded", () => {
  loadQuestions();
});

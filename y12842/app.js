const state = {
  currentTab: "overview",
  selectedRecordId: null,
  selectedSpeciesId: null,
  filters: {
    site: "",
    level: "",
    species: "",
    review: "",
  },
  charts: {},
};

const currentUser = "张研究员";

function init() {
  renderBatchInfo();
  renderStats();
  initCharts();
  initFilters();
  renderDetailTable();
  renderReviewList();
  renderSpeciesList();
  renderHistoryList();
  bindEvents();
}

function renderBatchInfo() {
  document.getElementById("batchTag").textContent = `批次：${BATCH_INFO.batchId}`;
}

function renderStats() {
  const sites = new Set(RECORDS.map((r) => r.siteId)).size;
  const species = new Set(RECORDS.map((r) => r.speciesId)).size;
  const highRiskSpecies = new Set(
    RECORDS.filter((r) => r.level === "高危").map((r) => r.speciesId)
  ).size;
  const abnormal = RECORDS.filter((r) => r.level !== "正常").length;
  const pending = RECORDS.filter((r) => r.reviewStatus === "待复核").length;
  const negAbnormal = NEGATIVE_CONTROL.status === "异常" ? "异常" : "正常";

  document.getElementById("statSites").textContent = sites;
  document.getElementById("statSpecies").textContent = species;
  document.getElementById("statHighRisk").textContent = highRiskSpecies;
  document.getElementById("statAbnormal").textContent = abnormal;
  document.getElementById("statPending").textContent = pending;
  document.getElementById("statNegCtrl").textContent = negAbnormal;

  const negStatusEl = document.getElementById("negStatus");
  if (NEGATIVE_CONTROL.status === "异常") {
    negStatusEl.innerHTML = '状态：<span style="color:#f56c6c">异常</span>';
  } else {
    negStatusEl.textContent = "状态：正常";
  }
}

function initCharts() {
  const trendCtx = document.getElementById("trendChart").getContext("2d");
  const levelCtx = document.getElementById("levelChart").getContext("2d");
  const siteCtx = document.getElementById("siteChart").getContext("2d");

  const speciesNames = ["麦长管蚜", "麦二叉蚜", "小麦红蜘蛛", "粘虫", "灰飞虱", "麦秆蝇"];
  const colors = ["#409eff", "#67c23a", "#e6a23c", "#f56c6c", "#909399", "#9c27b0"];

  const trendDatasets = speciesNames.map((name, i) => ({
    label: name,
    data: DENSITY_TREND.map((d) => d[name]),
    borderColor: colors[i],
    backgroundColor: colors[i] + "20",
    tension: 0.3,
    fill: false,
    pointRadius: 3,
  }));

  state.charts.trend = new Chart(trendCtx, {
    type: "line",
    data: {
      labels: DENSITY_TREND.map((d) => d.date),
      datasets: trendDatasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: { font: { size: 11 } },
        },
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "密度" } },
      },
    },
  });

  const levelCounts = { 高危: 0, 中危: 0, 低危: 0, 正常: 0 };
  RECORDS.forEach((r) => {
    levelCounts[r.level] = (levelCounts[r.level] || 0) + 1;
  });

  state.charts.level = new Chart(levelCtx, {
    type: "doughnut",
    data: {
      labels: ["高危", "中危", "低危", "正常"],
      datasets: [
        {
          data: [levelCounts.高危, levelCounts.中危, levelCounts.低危, levelCounts.正常],
          backgroundColor: ["#f56c6c", "#e6a23c", "#67c23a", "#909399"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "right", labels: { font: { size: 12 } } },
      },
    },
  });

  const siteMap = {};
  SITES.forEach((s) => {
    siteMap[s.id] = { name: s.town, total: 0, high: 0 };
  });
  RECORDS.forEach((r) => {
    if (siteMap[r.siteId]) {
      siteMap[r.siteId].total += r.density;
      if (r.level === "高危") siteMap[r.siteId].high += 1;
    }
  });

  const siteLabels = SITES.map((s) => s.town);
  const siteData = SITES.map((s) => siteMap[s.id].total);

  state.charts.site = new Chart(siteCtx, {
    type: "bar",
    data: {
      labels: siteLabels,
      datasets: [
        {
          label: "累计密度指数",
          data: siteData,
          backgroundColor: "#409eff80",
          borderColor: "#409eff",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "密度指数" } },
      },
    },
  });
}

function initFilters() {
  const siteSelect = document.getElementById("filterSite");
  SITES.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    siteSelect.appendChild(opt);
  });

  document.getElementById("filterSite").addEventListener("change", (e) => {
    state.filters.site = e.target.value;
    renderDetailTable();
  });
  document.getElementById("filterLevel").addEventListener("change", (e) => {
    state.filters.level = e.target.value;
    renderDetailTable();
  });
  document.getElementById("filterSpecies").addEventListener("input", (e) => {
    state.filters.species = e.target.value.trim();
    renderDetailTable();
  });
  document.getElementById("filterReview").addEventListener("change", (e) => {
    state.filters.review = e.target.value;
    renderDetailTable();
  });
}

function getLevelClass(level) {
  const map = { 高危: "high", 中危: "medium", 低危: "low", 正常: "normal" };
  return map[level] || "normal";
}

function getStatusClass(status) {
  const map = { 待复核: "pending", 已通过: "passed", 已驳回: "rejected" };
  return map[status] || "pending";
}

function getFilteredRecords() {
  return RECORDS.filter((r) => {
    if (state.filters.site && r.siteId !== state.filters.site) return false;
    if (state.filters.level && r.level !== state.filters.level) return false;
    if (state.filters.species) {
      const kw = state.filters.species.toLowerCase();
      const sp = SPECIES.find((s) => s.id === r.speciesId);
      const inName = r.speciesName.toLowerCase().includes(kw);
      const inAlias = sp ? sp.aliases.some((a) => a.toLowerCase().includes(kw)) : false;
      if (!inName && !inAlias) return false;
    }
    if (state.filters.review && r.reviewStatus !== state.filters.review) return false;
    return true;
  });
}

function renderDetailTable() {
  const tbody = document.getElementById("detailTableBody");
  const records = getFilteredRecords();

  if (records.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="10" style="text-align:center;padding:40px;color:#909399">暂无数据</td></tr>';
    return;
  }

  tbody.innerHTML = records
    .map((r) => {
      const negClass = r.negCtrl === "异常" ? "abnormal" : "normal";
      return `
      <tr>
        <td>${r.id}</td>
        <td>${r.siteName}</td>
        <td>${r.speciesName}</td>
        <td>${r.speciesAlias}</td>
        <td>${r.density} ${r.unit}</td>
        <td><span class="level-tag ${getLevelClass(r.level)}">${r.level}</span></td>
        <td>${r.seqResult} <span style="color:#909399;font-size:12px">(${r.seqId})</span></td>
        <td><span class="status-tag ${negClass}">${r.negCtrl}</span></td>
        <td><span class="status-tag ${getStatusClass(r.reviewStatus)}">${r.reviewStatus}</span></td>
        <td>
          <button class="link-btn" onclick="viewRecord('${r.id}')">查看</button>
          <button class="link-btn" onclick="traceSpecies('${r.speciesId}')">追溯</button>
          ${
            r.reviewStatus === "待复核"
              ? `<button class="link-btn" onclick="openReviewModal('${r.id}')">复核</button>`
              : ""
          }
        </td>
      </tr>
    `;
    })
    .join("");
}

function renderReviewList() {
  const list = document.getElementById("reviewList");
  const pending = RECORDS.filter((r) => r.reviewStatus === "待复核");
  document.getElementById("pendingCount").textContent = pending.length;

  if (pending.length === 0) {
    list.innerHTML = '<div style="padding:20px;color:#909399;text-align:center">暂无待复核记录</div>';
    return;
  }

  list.innerHTML = pending
    .map(
      (r) => `
    <div class="review-item ${state.selectedRecordId === r.id ? "active" : ""}" 
         onclick="selectReviewRecord('${r.id}')">
      <div class="review-item-title">${r.speciesName} · ${r.level}</div>
      <div class="review-item-meta">
        <span>${r.siteName}</span>
        <span>${r.density}${r.unit}</span>
        ${r.negCtrl === "异常" ? '<span style="color:#f56c6c">阴异</span>' : ""}
      </div>
    </div>
  `
    )
    .join("");
}

function selectReviewRecord(recordId) {
  state.selectedRecordId = recordId;
  renderReviewList();
  renderReviewDetail();
}

function renderReviewDetail() {
  const container = document.getElementById("reviewDetail");
  const record = RECORDS.find((r) => r.id === state.selectedRecordId);
  if (!record) return;

  const sp = SPECIES.find((s) => s.id === record.speciesId);

  let negHtml = "";
  if (record.negCtrl === "异常") {
    negHtml = `
      <div class="neg-card">
        <h4>⚠️ 阴性对照异常</h4>
        <p>对照名称：<span class="neg-value">${NEGATIVE_CONTROL.name}</span></p>
        <p>检测结果：<span class="neg-value">${NEGATIVE_CONTROL.actual}</span></p>
        <p>Ct值：<span class="neg-value">${NEGATIVE_CONTROL.ctValue}</span>（阈值：${NEGATIVE_CONTROL.threshold}）</p>
        <p>初步判断：${NEGATIVE_CONTROL.initialAssessment}</p>
      </div>
    `;
  }

  const historyHtml = record.reviewHistory.length
    ? `
      <div class="review-history">
        ${record.reviewHistory
          .map(
            (h) => `
          <div class="history-item ${h.result === "通过" ? "passed" : "rejected"}">
            <div class="history-header">
              <span class="history-user">${h.user}</span>
              <span class="history-time">${h.time}</span>
            </div>
            <div class="history-comment">${h.comment}</div>
            ${h.action ? `<div class="history-action">处理措施：${h.action}</div>` : ""}
          </div>
        `
          )
          .join("")}
      </div>
    `
    : '<p style="color:#909399;font-size:13px">暂无复核历史</p>';

  const photosHtml = sp
    ? `
      <div class="photo-gallery">
        ${sp.photos
          .map(
            (p) => `
          <div class="photo-item">
            <img src="${p.url}" alt="${p.label}" loading="lazy">
            <div class="photo-label">${p.label}</div>
          </div>
        `
          )
          .join("")}
      </div>
    `
    : "";

  container.innerHTML = `
    <div class="detail-section">
      <h4>基本信息</h4>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">记录ID</span>
          <span class="info-value">${record.id}</span>
        </div>
        <div class="info-item">
          <span class="info-label">采样地点</span>
          <span class="info-value">${record.siteName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">物种名称</span>
          <span class="info-value">${record.speciesName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">密度</span>
          <span class="info-value">${record.density} ${record.unit}</span>
        </div>
        <div class="info-item">
          <span class="info-label">预警等级</span>
          <span class="info-value"><span class="level-tag ${getLevelClass(record.level)}">${record.level}</span></span>
        </div>
        <div class="info-item">
          <span class="info-label">采样时间</span>
          <span class="info-value">${record.samplingTime}</span>
        </div>
        <div class="info-item">
          <span class="info-label">操作人员</span>
          <span class="info-value">${record.operator}</span>
        </div>
        <div class="info-item">
          <span class="info-label">测序编号</span>
          <span class="info-value">${record.seqId}</span>
        </div>
      </div>
    </div>

    ${negHtml}

    <div class="detail-section">
      <h4>测序结果</h4>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">检测结果</span>
          <span class="info-value">${record.seqResult}</span>
        </div>
        <div class="info-item">
          <span class="info-label">阴性对照</span>
          <span class="info-value"><span class="status-tag ${record.negCtrl === "异常" ? "abnormal" : "normal"}">${record.negCtrl}</span></span>
        </div>
      </div>
      <p style="margin-top:8px;font-size:13px;color:#606266">备注：${record.notes}</p>
    </div>

    <div class="detail-section">
      <h4>显微照片</h4>
      ${photosHtml}
    </div>

    <div class="detail-section">
      <h4>复核历史</h4>
      ${historyHtml}
    </div>

    <div class="action-bar">
      <button class="btn btn-success" onclick="openReviewModal('${record.id}','通过')">通过</button>
      <button class="btn btn-danger" onclick="openReviewModal('${record.id}','驳回')">驳回</button>
      <button class="btn btn-secondary" onclick="traceSpecies('${record.speciesId}')">查看谱系追溯</button>
    </div>
  `;
}

function viewRecord(recordId) {
  state.selectedRecordId = recordId;
  switchTab("review");
  renderReviewList();
  renderReviewDetail();
}

function traceSpecies(speciesId) {
  state.selectedSpeciesId = speciesId;
  switchTab("trace");
  renderSpeciesList();
  renderTraceDetail();
}

function renderSpeciesList() {
  const list = document.getElementById("speciesList");
  list.innerHTML = SPECIES.map(
    (s) => `
    <div class="species-item ${state.selectedSpeciesId === s.id ? "active" : ""}"
         onclick="selectSpecies('${s.id}')">
      <div class="species-name">${s.name}</div>
      <div class="species-alias">${s.scientificName}</div>
    </div>
  `
  ).join("");
}

function selectSpecies(speciesId) {
  state.selectedSpeciesId = speciesId;
  renderSpeciesList();
  renderTraceDetail();
}

function renderTraceDetail() {
  const container = document.getElementById("traceDetail");
  const sp = SPECIES.find((s) => s.id === state.selectedSpeciesId);
  if (!sp) return;

  const synHtml = sp.aliases
    .map((a) => `<span class="synonym-tag">${a}</span>`)
    .join("");

  const timelineHtml = sp.traceRecords
    .map(
      (r) => `
    <div class="timeline-item">
      <div class="timeline-date">${r.date} · ${r.type}</div>
      <div class="timeline-content">${r.content}</div>
      <span class="timeline-opinion">${r.opinion}</span>
    </div>
  `
    )
    .join("");

  const photosHtml = sp.photos
    .map(
      (p) => `
    <div class="photo-item">
      <img src="${p.url}" alt="${p.label}" loading="lazy">
      <div class="photo-label">${p.label}</div>
    </div>
  `
    )
    .join("");

  container.innerHTML = `
    <div class="detail-section">
      <h4>物种信息</h4>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">中文名</span>
          <span class="info-value">${sp.name}</span>
        </div>
        <div class="info-item">
          <span class="info-label">学名</span>
          <span class="info-value" style="font-style:italic">${sp.scientificName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">分类</span>
          <span class="info-value">${sp.category}</span>
        </div>
        <div class="info-item">
          <span class="info-label">危害等级</span>
          <span class="info-value"><span class="level-tag ${getLevelClass(sp.harmLevel)}">${sp.harmLevel}</span></span>
        </div>
        <div class="info-item" style="grid-column:1/-1">
          <span class="info-label">防治阈值</span>
          <span class="info-value">${sp.controlThreshold} ${sp.name.includes("蜘蛛") ? "头/尺行长" : "只/亩"}</span>
        </div>
      </div>
      <p style="margin-top:10px;font-size:13px;color:#606266;line-height:1.6">${sp.description}</p>
    </div>

    <div class="detail-section">
      <h4>同义名称</h4>
      <div class="synonyms-list">${synHtml}</div>
    </div>

    <div class="detail-section">
      <h4>显微照片</h4>
      <div class="photo-gallery">${photosHtml}</div>
    </div>

    <div class="detail-section">
      <h4>处理追溯</h4>
      <div class="trace-timeline">${timelineHtml}</div>
    </div>
  `;
}

function renderHistoryList() {
  const list = document.getElementById("historyList");
  list.innerHTML = OPERATION_HISTORY.map(
    (h) => `
    <div class="history-item">
      <div class="history-record">
        <span class="history-user">${h.user}</span>
        <span class="history-time">${h.time}</span>
      </div>
      <div class="history-desc">${h.action} - ${h.description}</div>
      <div class="history-target">对象：${h.target}</div>
    </div>
  `
  ).join("");
}

let currentReviewRecordId = null;

function openReviewModal(recordId, defaultResult = "") {
  currentReviewRecordId = recordId;
  const modal = document.getElementById("reviewModal");
  modal.classList.add("show");

  document.getElementById("reviewComment").value = "";
  document.getElementById("reviewAction").value = "";
  const radios = document.querySelectorAll('input[name="reviewResult"]');
  radios.forEach((r) => (r.checked = r.value === defaultResult));
  if (defaultResult) {
    document.getElementById("reviewModalTitle").textContent =
      defaultResult === "通过" ? "复核通过确认" : "复核驳回确认";
  }
}

function closeReviewModal() {
  document.getElementById("reviewModal").classList.remove("show");
  currentReviewRecordId = null;
}

function submitReview() {
  if (!currentReviewRecordId) return;

  const result = document.querySelector('input[name="reviewResult"]:checked')?.value;
  const comment = document.getElementById("reviewComment").value.trim();
  const action = document.getElementById("reviewAction").value;

  if (!result) {
    alert("请选择复核结果");
    return;
  }
  if (!comment) {
    alert("请填写复核意见");
    return;
  }

  const record = RECORDS.find((r) => r.id === currentReviewRecordId);
  if (!record) return;

  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const reviewEntry = {
    id: "RV-" + Date.now(),
    user: currentUser,
    time: timeStr,
    result: result,
    comment: comment,
    action: action,
  };

  record.reviewStatus = result === "通过" ? "已通过" : "已驳回";
  record.reviewHistory.unshift(reviewEntry);

  OPERATION_HISTORY.unshift({
    id: "OH-" + Date.now(),
    user: currentUser,
    time: timeStr,
    action: `复核${result}`,
    target: `${record.id}（${record.speciesName} - ${record.siteName.split("").slice(-3).join("")}）`,
    description: comment,
  });

  closeReviewModal();
  renderStats();
  renderDetailTable();
  renderReviewList();
  renderReviewDetail();
  renderHistoryList();
  updateCharts();
}

function updateCharts() {
  const levelCounts = { 高危: 0, 中危: 0, 低危: 0, 正常: 0 };
  RECORDS.forEach((r) => {
    levelCounts[r.level] = (levelCounts[r.level] || 0) + 1;
  });
  if (state.charts.level) {
    state.charts.level.data.datasets[0].data = [
      levelCounts.高危,
      levelCounts.中危,
      levelCounts.低危,
      levelCounts.正常,
    ];
    state.charts.level.update();
  }
}

function downloadResults() {
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const filename = `害虫密度预警_${BATCH_INFO.batchId}_${timestamp}.csv`;

  const headers = [
    "记录ID",
    "采样地点",
    "物种名称",
    "同义名",
    "密度",
    "单位",
    "预警等级",
    "测序结果",
    "测序编号",
    "阴性对照",
    "复核状态",
    "采样时间",
    "操作人员",
    "备注",
  ];

  const rows = RECORDS.map((r) => [
    r.id,
    r.siteName,
    r.speciesName,
    r.speciesAlias,
    r.density,
    r.unit,
    r.level,
    r.seqResult,
    r.seqId,
    r.negCtrl,
    r.reviewStatus,
    r.samplingTime,
    r.operator,
    r.notes,
  ]);

  let csv = "\uFEFF";
  csv += headers.join(",") + "\n";
  rows.forEach((row) => {
    csv += row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
  });

  csv += "\n";
  csv += `批次信息：${BATCH_INFO.batchId} - ${BATCH_INFO.batchName}\n`;
  csv += `采样日期：${BATCH_INFO.samplingDate}\n`;
  csv += `运行时间：${BATCH_INFO.runTime}\n`;
  csv += `操作人员：${BATCH_INFO.operator}\n`;
  csv += `下载时间：${now.toLocaleString("zh-CN")}\n`;
  csv += `下载人：${currentUser}\n`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function switchTab(tabName) {
  state.currentTab = tabName;

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });

  if (tabName === "overview") {
    setTimeout(() => {
      Object.values(state.charts).forEach((c) => c.resize && c.resize());
    }, 50);
  }
}

function bindEvents() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  document.getElementById("btnHistory").addEventListener("click", () => {
    document.getElementById("historyModal").classList.add("show");
  });

  document.getElementById("closeHistory").addEventListener("click", () => {
    document.getElementById("historyModal").classList.remove("show");
  });

  document.getElementById("btnDownload").addEventListener("click", downloadResults);

  document.getElementById("closeReviewModal").addEventListener("click", closeReviewModal);
  document.getElementById("cancelReview").addEventListener("click", closeReviewModal);
  document.getElementById("confirmReview").addEventListener("click", submitReview);

  document.getElementById("historyModal").addEventListener("click", (e) => {
    if (e.target.id === "historyModal") {
      document.getElementById("historyModal").classList.remove("show");
    }
  });

  document.getElementById("reviewModal").addEventListener("click", (e) => {
    if (e.target.id === "reviewModal") {
      closeReviewModal();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);

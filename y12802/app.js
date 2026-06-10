var State = {
  currentPhoto: null,
  photoFileList: [],
  selectedPhotoIndex: 0,
  annotationMode: false,
  marks: { auto: [], added: [], removed: [] },
  colonyChart: null,
  speciesChart: null,
  currentReviewRecordId: null,
  currentTraceRecordId: null
};

function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

function toast(msg, type) {
  type = type || "default";
  var el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function () { el.remove(); }, 2400);
}

function fmtTime(ts) {
  var d = new Date(ts);
  var pad = function (n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " +
    pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function statusBadge(s, anomalyType) {
  if (s === "approved") {
    if (anomalyType === "negativeControlAbnormal") {
      return '<span class="badge badge-anomaly">异常放行</span>';
    }
    return '<span class="badge badge-approved">已通过</span>';
  }
  if (s === "rejected") return '<span class="badge badge-rejected">已退回</span>';
  if (anomalyType === "synonym") return '<span class="badge badge-synonym">待复核(同义)</span>';
  if (anomalyType === "negativeControlAbnormal") return '<span class="badge badge-anomaly">待复核(阴性对照异常)</span>';
  return '<span class="badge badge-pending">待复核</span>';
}

function showModal(title, html) {
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = html;
  $("#modal").classList.remove("hidden");
}
function hideModal() { $("#modal").classList.add("hidden"); }

document.addEventListener("DOMContentLoaded", function () {
  DataStore.load();
  initTabs();
  initUserBar();
  initDashboard();
  initCountPanel();
  initLineagePanel();
  initReviewPanel();
  initTracePanel();
  initReportPanel();
  $("#modalClose").addEventListener("click", hideModal);
  $("#modal .modal-mask").addEventListener("click", hideModal);
  $("#currentUserName").textContent = DataStore.getCurrentUser();
  refreshAll();
});

function refreshAll() {
  refreshDashboard();
  refreshLineageOptions();
  refreshReviewPanel();
  refreshTracePanel();
  refreshReportBatchOptions();
}

function initTabs() {
  $$(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      var name = t.dataset.tab;
      $$(".tab").forEach(function (x) { x.classList.remove("active"); });
      $$(".tab-panel").forEach(function (p) { p.classList.remove("active"); });
      t.classList.add("active");
      $("#" + name).classList.add("active");
      if (name === "dashboard") refreshDashboard();
      if (name === "lineage") refreshLineagePanel();
      if (name === "review") refreshReviewPanel();
      if (name === "trace") refreshTracePanel();
    });
  });
}

function initUserBar() {
  $("#switchUserBtn").addEventListener("click", function () {
    var opts = USERS.map(function (u) {
      return '<label class="checkbox"><input type="radio" name="u" value="' + u + '" ' +
        (u === DataStore.getCurrentUser() ? "checked" : "") + '/> ' + u + '</label>';
    }).join("<br>");
    showModal("切换用户", opts + '<br><div style="margin-top:14px"><button id="confirmUserBtn" class="btn btn-primary">确定</button></div>');
    $("#confirmUserBtn").addEventListener("click", function () {
      var ch = document.querySelector('input[name="u"]:checked');
      if (ch) {
        DataStore.setCurrentUser(ch.value);
        $("#currentUserName").textContent = ch.value;
        hideModal();
        toast("已切换到 " + ch.value, "success");
      }
    });
  });

  $("#loadSampleBtn").addEventListener("click", function () {
    DataStore.loadSample();
    $("#currentUserName").textContent = DataStore.getCurrentUser();
    refreshAll();
    toast("已载入示例数据", "success");
  });

  $("#resetAllBtn").addEventListener("click", function () {
    showModal("确认清空",
      '<p>确定要清空所有数据并恢复为初始示例数据吗？此操作不可恢复。</p>' +
      '<div style="margin-top:14px"><button id="confirmResetBtn" class="btn btn-danger">确定清空</button></div>');
    $("#confirmResetBtn").addEventListener("click", function () {
      DataStore.reset();
      $("#currentUserName").textContent = DataStore.getCurrentUser();
      refreshAll();
      hideModal();
      toast("已重置所有数据", "success");
    });
  });
}

function initDashboard() {
  $("#exportCsvBtn").addEventListener("click", exportCsv);
  $("#exportJsonBtn").addEventListener("click", exportJson);
}

function refreshDashboard() {
  var recs = DataStore.getRecords();
  var totalBatches = new Set(recs.map(function (r) { return r.batchId; })).size;
  var totalColonies = recs.reduce(function (s, r) { return s + (r.finalCount || 0); }, 0);
  var pending = recs.filter(function (r) { return r.status !== "approved"; }).length;
  var approved = recs.filter(function (r) { return r.status === "approved"; }).length;
  $("#kpiBatches").textContent = totalBatches;
  $("#kpiColonies").textContent = totalColonies;
  $("#kpiPending").textContent = pending;
  $("#kpiApproved").textContent = approved;

  var labels = recs.map(function (r) { return r.sampleName; });
  var data = recs.map(function (r) { return r.finalCount; });
  if (State.colonyChart) State.colonyChart.destroy();
  State.colonyChart = new Chart($("#colonyChart"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{ label: "菌落数", data: data, backgroundColor: "#3b82f6", borderRadius: 4 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });

  var spMap = {};
  recs.forEach(function (r) {
    var k = SPECIES_CANONICAL[r.species] || r.species || "未鉴定";
    spMap[k] = (spMap[k] || 0) + 1;
  });
  var spColors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];
  if (State.speciesChart) State.speciesChart.destroy();
  State.speciesChart = new Chart($("#speciesChart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(spMap),
      datasets: [{ data: Object.values(spMap), backgroundColor: spColors }]
    },
    options: { responsive: true, plugins: { legend: { position: "right" } } }
  });

  var tbody = $("#dataTableBody");
  tbody.innerHTML = recs.map(function (r) {
    return '<tr>' +
      '<td>' + r.batchId + '</td>' +
      '<td>' + r.sampleName + '</td>' +
      '<td><img src="' + r.photo + '" class="photo-thumb" /></td>' +
      '<td>' + r.autoCount + '</td>' +
      '<td>' + (r.manualDelta >= 0 ? "+" : "") + r.manualDelta + '</td>' +
      '<td><strong>' + r.finalCount + '</strong></td>' +
      '<td>' + (r.species || "—") + '</td>' +
      '<td>' + (r.isNegativeControl ? '<span class="badge badge-pending">是</span>' : '<span class="badge badge-normal">否</span>') + '</td>' +
      '<td>' + statusBadge(r.status, r.anomalyType) + '</td>' +
      '<td>' + fmtTime(r.processedAt) + '</td>' +
      '<td><button class="btn btn-outline small" data-view="' + r.id + '">查看</button></td>' +
      '</tr>';
  }).join("");
  $$("#dataTableBody [data-view]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var r = DataStore.getRecordById(btn.dataset.view);
      if (r) showRecordDetail(r);
    });
  });
}

function showRecordDetail(r) {
  var html =
    '<div style="display:flex;gap:20px">' +
      '<div><img src="' + r.photo + '" style="max-width:280px;border-radius:6px;border:1px solid #e2e8f0"/></div>' +
      '<div style="flex:1">' +
        '<p><strong>批次：</strong>' + r.batchId + '</p>' +
        '<p><strong>样本：</strong>' + r.sampleName + '</p>' +
        '<p><strong>自动计数：</strong>' + r.autoCount + '，人工修正：' + (r.manualDelta >= 0 ? "+" : "") + r.manualDelta + '，最终：<strong>' + r.finalCount + '</strong></p>' +
        '<p><strong>物种：</strong>' + (r.species || "—") + " " + (DataStore.getSynonymTip(r.species) || "") + '</p>' +
        '<p><strong>阴性对照：</strong>' + (r.isNegativeControl ? "是" : "否") + '</p>' +
        '<p><strong>状态：</strong>' + statusBadge(r.status, r.anomalyType) + '</p>' +
        '<p style="margin-top:8px"><strong>处理备注：</strong><br>' + (r.note || "—") + '</p>' +
        '<p style="margin-top:8px"><strong>处理人：</strong>' + r.processedBy + ' / ' + fmtTime(r.processedAt) + '</p>' +
      '</div>' +
    '</div>';
  showModal("记录详情 " + r.id, html);
}

function exportCsv() {
  var recs = DataStore.getRecords();
  var header = ["记录ID", "批次编号", "样本名称", "自动计数", "人工修正", "最终结果", "物种", "是否阴性对照", "状态", "处理人", "处理时间", "备注"];
  var rows = recs.map(function (r) {
    return [r.id, r.batchId, r.sampleName, r.autoCount, r.manualDelta, r.finalCount,
      r.species || "", r.isNegativeControl ? "是" : "否", r.status, r.processedBy, fmtTime(r.processedAt),
      (r.note || "").replace(/\n/g, " ")];
  });
  var all = [header].concat(rows).map(function (row) {
    return row.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(",");
  }).join("\n");
  var blob = new Blob(["\ufeff" + all], { type: "text/csv;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = "菌落计数明细_" + fmtTime(Date.now()).replace(/[: ]/g, "-") + ".csv";
  a.click();
  URL.revokeObjectURL(url);
  toast("CSV 已下载", "success");
}

function exportJson() {
  var payload = {
    exportedAt: new Date().toISOString(),
    records: DataStore.getRecords(),
    reviewLogs: DataStore.getReviewLogs()
  };
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = "菌落计数数据_" + fmtTime(Date.now()).replace(/[: ]/g, "-") + ".json";
  a.click();
  URL.revokeObjectURL(url);
  toast("JSON 已下载", "success");
}

function initCountPanel() {
  var dz = $("#dropZone"), fi = $("#fileInput");
  dz.addEventListener("click", function () { fi.click(); });
  dz.addEventListener("dragover", function (e) { e.preventDefault(); dz.classList.add("dragover"); });
  dz.addEventListener("dragleave", function () { dz.classList.remove("dragover"); });
  dz.addEventListener("drop", function (e) {
    e.preventDefault(); dz.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  });
  fi.addEventListener("change", function () { handleFiles(fi.files); });

  $("#sensitivity").addEventListener("input", function () {
    $("#sensitivityVal").textContent = $("#sensitivity").value;
  });

  var d = new Date();
  var pad = function (n) { return String(n).padStart(2, "0"); };
  $("#batchId").value = "B" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + String.fromCharCode(65 + Math.floor(Math.random() * 5));

  $("#runCountBtn").addEventListener("click", runAutoCount);
  $("#toggleMarkBtn").addEventListener("click", toggleAnnotation);
  $("#saveRecordBtn").addEventListener("click", saveRecord);

  $("#minusBtn").addEventListener("click", function () {
    var v = parseInt($("#manualDelta").value) || 0;
    $("#manualDelta").value = v - 1;
    updateFinalCount();
  });
  $("#plusBtn").addEventListener("click", function () {
    var v = parseInt($("#manualDelta").value) || 0;
    $("#manualDelta").value = v + 1;
    updateFinalCount();
  });
  $("#manualDelta").addEventListener("input", updateFinalCount);

  var cvs = $("#annotationCanvas");
  cvs.addEventListener("click", onCanvasClick);
}

function handleFiles(files) {
  State.photoFileList = Array.from(files).concat(State.photoFileList);
  renderUploadedList();
  if (State.photoFileList.length > 0 && !State.currentPhoto) {
    selectPhoto(0);
  }
}

function renderUploadedList() {
  var list = $("#uploadedList");
  list.innerHTML = State.photoFileList.map(function (f, i) {
    return '<div class="uploaded-item ' + (i === State.selectedPhotoIndex ? "selected" : "") + '" data-idx="' + i + '">' +
      '<img src="' + (f.preview || "") + '">' +
      '<span class="remove" data-rm="' + i + '">×</span>' +
      '</div>';
  }).join("");

  $$(".uploaded-item").forEach(function (el) {
    el.addEventListener("click", function (e) {
      if (e.target.dataset.rm != null) {
        State.photoFileList.splice(parseInt(e.target.dataset.rm), 1);
        if (State.selectedPhotoIndex >= State.photoFileList.length) State.selectedPhotoIndex = Math.max(0, State.photoFileList.length - 1);
        if (State.photoFileList.length === 0) State.currentPhoto = null;
        renderUploadedList();
        if (State.photoFileList.length > 0) selectPhoto(State.selectedPhotoIndex);
      } else {
        selectPhoto(parseInt(el.dataset.idx));
      }
    });
  });
}

function selectPhoto(idx) {
  if (!State.photoFileList[idx]) return;
  State.selectedPhotoIndex = idx;
  var f = State.photoFileList[idx];
  if (f.preview) {
    State.currentPhoto = f.preview;
    renderUploadedList();
    return;
  }
  var reader = new FileReader();
  reader.onload = function (e) {
    f.preview = e.target.result;
    State.currentPhoto = f.preview;
    renderUploadedList();
  };
  reader.readAsDataURL(f);
}

function runAutoCount() {
  if (!State.currentPhoto) {
    toast("请先上传照片", "error");
    return;
  }
  var sample = $("#sampleName").value.trim();
  if (!sample) {
    toast("请填写样本名称", "error");
    return;
  }
  $("#resultCard").classList.remove("hidden");
  var sensitivity = parseInt($("#sensitivity").value);
  var base = 30 + sensitivity * 25 + Math.floor(Math.random() * 40);
  if ($("#isNegativeControl").checked) base = Math.floor(Math.random() * 3);
  $("#autoCount").value = base;
  $("#manualDelta").value = 0;
  updateFinalCount();

  State.marks = { auto: [], added: [], removed: [] };
  var cvs = $("#annotationCanvas");
  var ctx = cvs.getContext("2d");
  var img = new Image();
  img.onload = function () {
    var scale = Math.min(520 / img.width, 400 / img.height, 1);
    cvs.width = img.width * scale;
    cvs.height = img.height * scale;
    ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
    for (var i = 0; i < base; i++) {
      var rx = Math.random() * (cvs.width - 30) + 15;
      var ry = Math.random() * (cvs.height - 30) + 15;
      State.marks.auto.push({ x: rx, y: ry, r: 6 + Math.random() * 4 });
    }
    drawMarks();
  };
  img.src = State.currentPhoto;
}

function updateFinalCount() {
  var a = parseInt($("#autoCount").value) || 0;
  var d = parseInt($("#manualDelta").value) || 0;
  $("#finalCount").value = a + d;
}

function toggleAnnotation() {
  State.annotationMode = !State.annotationMode;
  $("#toggleMarkBtn").textContent = State.annotationMode ? "✔ 关闭标注模式" : "✏ 开启标注模式";
  $("#toggleMarkBtn").classList.toggle("btn-primary");
  $("#toggleMarkBtn").classList.toggle("btn-outline");
  toast(State.annotationMode ? "左键新增，右键/Shift+左键 删除" : "已退出标注模式");
}

function onCanvasClick(e) {
  if (!State.annotationMode) return;
  var cvs = $("#annotationCanvas");
  var rect = cvs.getBoundingClientRect();
  var x = (e.clientX - rect.left) * (cvs.width / rect.width);
  var y = (e.clientY - rect.top) * (cvs.height / rect.height);

  if (e.shiftKey || e.button === 2) {
    var nearest = -1, minD = 12;
    for (var i = 0; i < State.marks.auto.length; i++) {
      var dx = State.marks.auto[i].x - x, dy = State.marks.auto[i].y - y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < minD) { minD = d; nearest = i; }
    }
    if (nearest >= 0) {
      var pt = State.marks.auto.splice(nearest, 1)[0];
      State.marks.removed.push(pt);
      var cur = parseInt($("#manualDelta").value) || 0;
      $("#manualDelta").value = cur - 1;
      updateFinalCount();
      drawMarks();
    } else {
      for (var j = 0; j < State.marks.added.length; j++) {
        var ddx = State.marks.added[j].x - x, ddy = State.marks.added[j].y - y;
        if (Math.sqrt(ddx * ddx + ddy * ddy) < 12) {
          State.marks.added.splice(j, 1);
          var c = parseInt($("#manualDelta").value) || 0;
          $("#manualDelta").value = c - 1;
          updateFinalCount();
          drawMarks();
          return;
        }
      }
    }
  } else {
    State.marks.added.push({ x: x, y: y, r: 7 });
    var curr = parseInt($("#manualDelta").value) || 0;
    $("#manualDelta").value = curr + 1;
    updateFinalCount();
    drawMarks();
  }
}

function drawMarks() {
  var cvs = $("#annotationCanvas");
  var ctx = cvs.getContext("2d");
  if (State.currentPhoto) {
    var img = new Image();
    img.onload = function () {
      ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
      paintMarks(ctx);
    };
    img.src = State.currentPhoto;
  } else {
    paintMarks(ctx);
  }
}

function paintMarks(ctx) {
  State.marks.auto.forEach(function (p) {
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
  });
  State.marks.added.forEach(function (p) {
    ctx.fillStyle = "rgba(59,130,246,0.25)";
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  });
  State.marks.removed.forEach(function (p) {
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x - p.r, p.y - p.r); ctx.lineTo(p.x + p.r, p.y + p.r);
    ctx.moveTo(p.x + p.r, p.y - p.r); ctx.lineTo(p.x - p.r, p.y + p.r); ctx.stroke();
  });
}

function refreshLineageOptions() {
  var batches = DataStore.getBatches();
  var lf = $("#lineageFilter");
  lf.innerHTML = '<option value="all">全部批次</option>' +
    batches.map(function (b) { return '<option value="' + b + '">' + b + '</option>'; }).join("");

  var rb = $("#reportBatch");
  rb.innerHTML = '<option value="all">全部批次汇总</option>' +
    batches.map(function (b) { return '<option value="' + b + '">' + b + '</option>'; }).join("");

  var recs = DataStore.getRecords();
  var ll = $("#lineageLink");
  ll.innerHTML = '<option value="">— 暂不关联 —</option>' +
    recs.map(function (r) { return '<option value="' + r.id + '">' + r.batchId + " / " + r.sampleName + '</option>'; }).join("");
}

function saveRecord() {
  var species = $("#identifiedSpecies").value;
  var isNeg = $("#isNegativeControl").checked;
  var finalCount = parseInt($("#finalCount").value) || 0;

  var anomalyType = null;
  if (isNeg && finalCount > 5) anomalyType = "negativeControlAbnormal";
  else if (DataStore.isSynonym(species, $("#expectedSpecies").value)) anomalyType = "synonym";

  var rec = {
    id: DataStore.generateId("R"),
    batchId: $("#batchId").value.trim(),
    sampleName: $("#sampleName").value.trim(),
    photo: State.currentPhoto,
    autoCount: parseInt($("#autoCount").value) || 0,
    manualDelta: parseInt($("#manualDelta").value) || 0,
    finalCount: finalCount,
    species: species,
    expectedSpecies: $("#expectedSpecies").value,
    cultureCondition: $("#cultureCondition").value,
    isNegativeControl: isNeg,
    note: $("#processNote").value.trim(),
    status: (anomalyType || finalCount < 0) ? "pending" : "pending",
    anomalyType: anomalyType,
    anomalyReason: null,
    parentId: $("#lineageLink").value || null,
    marks: {
      auto: State.marks.auto.length,
      added: State.marks.added.length,
      removed: State.marks.removed.length
    },
    processedBy: DataStore.getCurrentUser(),
    processedAt: Date.now()
  };
  DataStore.addRecord(rec);
  refreshAll();
  toast("记录已保存到数据中心，所有模块共用此条记录", "success");
  $("#resultCard").classList.add("hidden");
  State.marks = { auto: [], added: [], removed: [] };
  State.photoFileList = [];
  State.currentPhoto = null;
  renderUploadedList();
  State.annotationMode = false;
  $("#toggleMarkBtn").textContent = "✏ 开启标注模式";
}

function initLineagePanel() {
  $("#lineageFilter").addEventListener("change", refreshLineagePanel);
}

function refreshLineagePanel() {
  var filter = $("#lineageFilter").value;
  var recs = DataStore.getRecords(filter);
  var byId = {};
  recs.forEach(function (r) { byId[r.id] = r; });

  var roots = recs.filter(function (r) { return !r.parentId || !byId[r.parentId]; });
  function buildNode(r, depth) {
    var children = recs.filter(function (x) { return x.parentId === r.id; });
    return '<div class="' + (depth === 0 ? "lineage-node lineage-root" : "lineage-node") + '">' +
      '<div class="node-title">' + r.sampleName +
        (r.anomalyType ? " " + statusBadge(r.status, r.anomalyType) : "") + '</div>' +
      '<div class="node-meta">' +
        r.batchId + " · 菌落数 " + r.finalCount +
        " · 物种 " + (r.species || "—") +
        " · " + r.processedBy + " · " + fmtTime(r.processedAt) +
      '</div>' +
      (children.length ? '<div class="lineage-children">' + children.map(function (c) { return buildNode(c, depth + 1); }).join("") + '</div>' : "") +
    '</div>';
  }
  $("#lineageTree").innerHTML = roots.length ?
    roots.map(function (r) { return buildNode(r, 0); }).join("") :
    '<div style="padding:20px;color:#64748b;text-align:center">暂无谱系数据</div>';

  var tbody = $("#lineageLogBody");
  tbody.innerHTML = recs.map(function (r) {
    var delta = (r.marks && (r.marks.added || r.marks.removed)) ?
      ("+新增" + (r.marks.added || 0) + " / -删除" + (r.marks.removed || 0)) : "—";
    return '<tr>' +
      '<td>' + r.id + '</td>' +
      '<td>' + r.batchId + '</td>' +
      '<td>' + r.sampleName + '</td>' +
      '<td><img src="' + r.photo + '" class="photo-thumb" /></td>' +
      '<td><strong>' + r.finalCount + '</strong> <small style="color:#64748b">(自动' + r.autoCount + ')</small></td>' +
      '<td>' + (r.species || "—") + '</td>' +
      '<td>' + delta + '</td>' +
      '<td>' + r.processedBy + '</td>' +
      '<td>' + fmtTime(r.processedAt) + '</td>' +
    '</tr>';
  }).join("");
}

function initReviewPanel() {}

function refreshReviewPanel() {
  var recs = DataStore.getRecords();
  var pending = recs.filter(function (r) { return r.status !== "approved" && r.status !== "rejected"; });
  var list = $("#pendingList");
  list.innerHTML = pending.length ? pending.map(function (r) {
    return '<div class="review-item ' + (State.currentReviewRecordId === r.id ? "active" : "") + '" data-id="' + r.id + '">' +
      '<div class="title">' + r.batchId + " / " + r.sampleName + '</div>' +
      '<div class="meta">' + statusBadge(r.status, r.anomalyType) +
        " · 菌落 " + r.finalCount +
        " · 物种 " + (r.species || "—") +
        " · " + r.processedBy + " / " + fmtTime(r.processedAt) + '</div>' +
    '</div>';
  }).join("") : '<div style="padding:20px;color:#64748b;text-align:center">暂无待复核记录</div>';

  $$("#pendingList .review-item").forEach(function (el) {
    el.addEventListener("click", function () {
      State.currentReviewRecordId = el.dataset.id;
      renderReviewDetail();
      refreshReviewPanel();
    });
  });

  if (State.currentReviewRecordId) renderReviewDetail();

  var logs = DataStore.getReviewLogs();
  $("#reviewHistoryBody").innerHTML = logs.map(function (l) {
    return '<tr>' +
      '<td>' + l.recordId + '</td>' +
      '<td>' + l.batchId + '</td>' +
      '<td>' + l.sampleName + '</td>' +
      '<td>' + (l.fromStatus === "pending" ? "待复核" : l.fromStatus) + '</td>' +
      '<td>' + (l.toStatus === "approved" ? "已通过" : l.toStatus) + '</td>' +
      '<td>' + (l.abnormalRelease ? '<span class="badge badge-anomaly">是（已记录）</span>' : "否") + '</td>' +
      '<td>' + l.reviewer + '</td>' +
      '<td>' + fmtTime(l.reviewedAt) + '</td>' +
      '<td style="max-width:260px">' + (l.reason || "—") + '</td>' +
    '</tr>';
  }).join("");
}

function renderReviewDetail() {
  var r = DataStore.getRecordById(State.currentReviewRecordId);
  if (!r) return;
  var isAbnormal = r.anomalyType === "negativeControlAbnormal";
  var synonymTip = DataStore.getSynonymTip(r.species);
  var html =
    '<div class="review-form">' +
      (isAbnormal ? '<div class="anomaly-note">⚠ 阴性对照异常：阴性对照出现 ' + r.finalCount + ' 个菌落，正常应为 0。放行必须填写原因并永久留痕。</div>' : "") +
      (synonymTip ? '<div class="anomaly-note" style="background:#eef2ff;border-color:#c7d2fe;color:#3730a3">ℹ 物种名同义提示：' + synonymTip + '</div>' : "") +
      '<div style="display:flex;gap:16px;margin-bottom:14px">' +
        '<img src="' + r.photo + '" style="width:180px;max-height:140px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0"/>' +
        '<div style="flex:1">' +
          '<p><strong>批次：</strong>' + r.batchId + '</p>' +
          '<p><strong>样本：</strong>' + r.sampleName + '</p>' +
          '<p><strong>最终菌落数：</strong>' + r.finalCount + '（自动 ' + r.autoCount + '，人工修正 ' + (r.manualDelta >= 0 ? "+" : "") + r.manualDelta + '）</p>' +
          '<p><strong>物种：</strong>' + (r.species || "—") + '</p>' +
          '<p><strong>阴性对照：</strong>' + (r.isNegativeControl ? "是" : "否") + '</p>' +
          '<p><strong>处理人 / 时间：</strong>' + r.processedBy + ' / ' + fmtTime(r.processedAt) + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="form-row"><label>处理备注（来自计数）</label><div style="padding:8px 12px;background:#f8fafc;border-radius:6px;color:#475569">' + (r.note || "—") + '</div></div>' +
      '<div class="form-row">' +
        '<label>复核意见' + (isAbnormal ? ' <span style="color:#dc2626">（异常放行必填）</span>' : "") + '</label>' +
        '<textarea id="reviewReason" rows="3" placeholder="' + (isAbnormal ? "请详细说明阴性对照异常为何仍可通过：如已确认污染来源、不影响其他样本、该批次报废重测等..." : "复核意见...") + '"></textarea>' +
      '</div>' +
      '<div class="actions">' +
        '<button id="approveBtn" class="btn ' + (isAbnormal ? "btn-danger" : "btn-success") + '">' + (isAbnormal ? "⚠ 异常放行" : "✔ 通过") + '</button>' +
        '<button id="rejectBtn" class="btn btn-outline">✕ 退回修改</button>' +
      '</div>' +
    '</div>';
  $("#reviewDetail").classList.remove("empty");
  $("#reviewDetail").innerHTML = html;

  $("#approveBtn").addEventListener("click", function () {
    var reason = $("#reviewReason").value.trim();
    if (isAbnormal && reason.length < 8) {
      toast("阴性对照异常放行必须填写详细原因", "error");
      return;
    }
    submitReview(r, "approved", reason, isAbnormal);
  });
  $("#rejectBtn").addEventListener("click", function () {
    var reason = $("#reviewReason").value.trim() || "未说明原因";
    submitReview(r, "rejected", reason, false);
  });
}

function submitReview(r, toStatus, reason, abnormalRelease) {
  var log = {
    id: DataStore.generateId("RV"),
    recordId: r.id,
    batchId: r.batchId,
    sampleName: r.sampleName,
    fromStatus: r.status,
    toStatus: toStatus,
    abnormalRelease: !!abnormalRelease,
    reviewer: DataStore.getCurrentUser(),
    reviewedAt: Date.now(),
    reason: reason
  };
  DataStore.addReviewLog(log);
  DataStore.updateRecord(r.id, { status: toStatus, anomalyReason: reason });
  State.currentReviewRecordId = null;
  refreshAll();
  toast("已提交复核：" + (toStatus === "approved" ? (abnormalRelease ? "异常放行" : "通过") : "退回"), "success");
}

function initTracePanel() {}

function refreshTracePanel() {
  var recs = DataStore.getRecords();
  var targets = recs.filter(function (r) { return r.anomalyType; });
  var tbody = $("#traceTableBody");
  tbody.innerHTML = targets.length ? targets.map(function (r) {
    var tip = DataStore.getSynonymTip(r.species) || "—";
    var tName = r.anomalyType === "negativeControlAbnormal" ? "阴性对照异常" : "物种名同义";
    return '<tr>' +
      '<td>' + r.id + '</td>' +
      '<td>' + r.batchId + '</td>' +
      '<td>' + r.sampleName + '</td>' +
      '<td><span class="badge ' + (r.anomalyType === "negativeControlAbnormal" ? "badge-anomaly" : "badge-synonym") + '">' + tName + '</span></td>' +
      '<td>' + (r.species || "—") + '</td>' +
      '<td>' + tip + '</td>' +
      '<td><button class="btn btn-primary small" data-trace="' + r.id + '">🔍 溯源</button></td>' +
    '</tr>';
  }).join("") : '<tr><td colspan="7" style="padding:20px;color:#64748b;text-align:center">暂无异常或同义记录</td></tr>';

  $$("#traceTableBody [data-trace]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      State.currentTraceRecordId = btn.dataset.trace;
      renderTraceChain();
    });
  });
}

function renderTraceChain() {
  var r = DataStore.getRecordById(State.currentTraceRecordId);
  if (!r) return;
  var nodes = [];

  var tName = r.anomalyType === "negativeControlAbnormal" ? "阴性对照异常" : "物种名同义";
  nodes.push({
    step: 1,
    title: "异常记录：" + r.batchId + " / " + r.sampleName,
    html: '<p>异常类型：<strong style="color:#dc2626">' + tName + '</strong>；最终菌落数：<strong>' + r.finalCount +
      '</strong>；物种：<strong>' + (r.species || "—") + '</strong></p>' +
      '<p>处理人：' + r.processedBy + '；时间：' + fmtTime(r.processedAt) + '</p>' +
      '<div class="photo-grid"><img src="' + r.photo + '" title="菌落照片"/></div>'
  });

  if (r.anomalyType === "synonym") {
    var tip = DataStore.getSynonymTip(r.species) || "";
    nodes.push({
      step: 2,
      title: "物种名同义核对",
      html: '<p>标注物种：<strong>' + r.species + '</strong></p>' +
        '<p>标准名（系统对齐）：<strong style="color:#2563eb">' + (SPECIES_CANONICAL[r.species] || r.species) +
        '</strong>（拉丁名：<em>' + (SPECIES_LATIN[r.species] || "—") + '</em>）</p>' +
        '<p>同义提示：' + tip + '</p>'
    });
    nodes.push({
      step: 3,
      title: "显微照片 / 原始菌落照片",
      html: '<p>此记录关联的照片如下，可直接对比菌落形态、颜色、边缘等特征，确认是否与标准名描述一致。</p>' +
        '<div class="photo-grid">' +
          '<img src="' + r.photo + '" title="原始菌落照片"/>' +
          '<img src="' + makeFakeColonyImage(11 + Math.random(), 40) + '" title="参考显微照片1"/>' +
          '<img src="' + makeFakeColonyImage(12 + Math.random(), 60) + '" title="参考显微照片2"/>' +
        '</div>'
    });
  } else {
    nodes.push({
      step: 2,
      title: "阴性对照异常明细",
      html: '<p>阴性对照期望菌落数：<strong>0</strong>，实际检测：<strong style="color:#dc2626">' + r.finalCount + '</strong></p>' +
        '<p>对照类型：' + r.cultureCondition + '；预期物种：' + (r.expectedSpecies || "—") + '</p>'
    });
    nodes.push({
      step: 3,
      title: "显微照片 / 污染照片",
      html: '<p>可放大观察菌落形态，判断污染来源（操作污染 / 培养基污染 / 环境沉降菌）。</p>' +
        '<div class="photo-grid">' +
          '<img src="' + r.photo + '" title="阴性对照平板照片"/>' +
          '<img src="' + makeFakeColonyImage(21, 35) + '" title="疑似污染源1"/>' +
          '<img src="' + makeFakeColonyImage(22, 18) + '" title="疑似污染源2"/>' +
        '</div>'
    });
  }

  var logs = DataStore.getReviewLogs().filter(function (l) { return l.recordId === r.id; });
  var reviewHtml = logs.length ? logs.map(function (l) {
    return '<div style="padding:8px 0;border-bottom:1px dashed #e2e8f0">' +
      '<p><strong>' + (l.toStatus === "approved" ? (l.abnormalRelease ? "异常放行" : "复核通过") : "退回") +
      '</strong> — ' + l.reviewer + ' / ' + fmtTime(l.reviewedAt) + '</p>' +
      '<p style="color:#475569">' + (l.reason || "—") + '</p></div>';
  }).join("") : '<p style="color:#64748b">暂未处理，可前往「复核中心」处理。</p>';

  nodes.push({
    step: 4,
    title: "处理意见 / 复核留痕",
    html: reviewHtml +
      '<p style="margin-top:10px"><strong>原始计数备注：</strong>' + (r.note || "—") + '</p>' +
      '<p><strong>审核人/时间：</strong>' + (logs.length ? logs[0].reviewer + " / " + fmtTime(logs[0].reviewedAt) : "—") + '</p>'
  });

  $("#traceNodes").innerHTML = nodes.map(function (n) {
    return '<div class="trace-node">' +
      '<div class="step">' + n.step + '</div>' +
      '<div class="content"><h4>' + n.title + '</h4>' + n.html + '</div>' +
    '</div>';
  }).join("");
  $("#traceChain").classList.remove("hidden");
  $("#traceChain").scrollIntoView({ behavior: "smooth", block: "start" });
}

function initReportPanel() {
  $("#generateReportBtn").addEventListener("click", generateReport);
  $("#copyPlainBtn").addEventListener("click", function () {
    var el = $("#reportBody .plain-explain");
    if (!el) { toast("先生成报告", "error"); return; }
    var txt = el.innerText;
    navigator.clipboard.writeText(txt).then(function () {
      toast("普通话解释已复制，可直接粘贴给同事", "success");
    }).catch(function () {
      var ta = document.createElement("textarea");
      ta.value = txt; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
      toast("已复制", "success");
    });
  });
  $("#downloadReportBtn").addEventListener("click", function () {
    var html = "<html><head><meta charset='utf-8'><title>菌落计数报告</title>" +
      "<style>body{font-family:-apple-system,'PingFang SC',sans-serif;padding:30px;color:#1e293b}h1{font-size:20px}h4{margin-top:20px;padding-bottom:4px;border-bottom:1px solid #e2e8f0}" +
      "table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#f8fafc}" +
      ".plain-explain{background:#eff6ff;border-left:4px solid #2563eb;padding:14px;line-height:1.8;color:#1e3a8a}" +
      ".summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.summary-item{background:#f8fafc;padding:10px;border-radius:6px}" +
      ".summary-item .k{font-size:11px;color:#64748b}.summary-item .v{font-size:20px;font-weight:700}</style></head><body>" +
      "<h1>🧫 菌落计数报告</h1><p style='color:#64748b'>生成时间：" + fmtTime(Date.now()) + "</p>" +
      $("#reportBody").innerHTML + "</body></html>";
    var blob = new Blob([html], { type: "text/html;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "菌落计数报告_" + fmtTime(Date.now()).replace(/[: ]/g, "-") + ".html";
    a.click();
    URL.revokeObjectURL(url);
    toast("报告已下载", "success");
  });
}

function refreshReportBatchOptions() {
  var batches = DataStore.getBatches();
  var rb = $("#reportBatch");
  var cur = rb.value;
  rb.innerHTML = '<option value="all">全部批次汇总</option>' +
    batches.map(function (b) { return '<option value="' + b + '">' + b + '</option>'; }).join("");
  if (cur) rb.value = cur;
}

function generateReport() {
  var batch = $("#reportBatch").value;
  var opts = $$(".reportOpt:checked").map(function (x) { return x.value; });
  var recs = DataStore.getRecords(batch);
  if (!recs.length) { toast("没有可生成报告的数据", "error"); return; }

  var html = "";
  var total = recs.reduce(function (s, r) { return s + r.finalCount; }, 0);
  var avg = Math.round(total / recs.length);
  var neg = recs.filter(function (r) { return r.isNegativeControl; }).length;
  var anomaly = recs.filter(function (r) { return r.anomalyType; }).length;
  var approved = recs.filter(function (r) { return r.status === "approved"; }).length;
  var pending = recs.length - approved - recs.filter(function (r) { return r.status === "rejected"; }).length;

  if (opts.indexOf("summary") >= 0) {
    html += '<h4>📊 统计摘要</h4>' +
      '<div class="summary-grid">' +
        '<div class="summary-item"><div class="k">样本数</div><div class="v">' + recs.length + '</div></div>' +
        '<div class="summary-item"><div class="k">菌落总数</div><div class="v">' + total + '</div></div>' +
        '<div class="summary-item"><div class="k">平均/样本</div><div class="v">' + avg + '</div></div>' +
        '<div class="summary-item"><div class="k">阴性对照</div><div class="v">' + neg + '</div></div>' +
        '<div class="summary-item"><div class="k">异常/同义</div><div class="v" style="color:#d97706">' + anomaly + '</div></div>' +
        '<div class="summary-item"><div class="k">已通过</div><div class="v" style="color:#16a34a">' + approved + '</div></div>' +
        '<div class="summary-item"><div class="k">待复核</div><div class="v" style="color:#dc2626">' + pending + '</div></div>' +
        '<div class="summary-item"><div class="k">报告范围</div><div class="v" style="font-size:14px">' + (batch === "all" ? "全部批次" : batch) + '</div></div>' +
      '</div>';
  }

  if (opts.indexOf("chart") >= 0) {
    html += '<h4>📈 图表</h4>' +
      '<div class="chart-placeholder">（图表数据与看板一致，下载报告时请同时参考看板截图；数据明细如下表）</div>';
  }

  if (opts.indexOf("detail") >= 0) {
    html += '<h4>📋 样本明细</h4>' +
      '<table><thead><tr><th>批次</th><th>样本</th><th>自动计数</th><th>人工修正</th><th>最终</th><th>物种</th><th>阴性对照</th><th>状态</th><th>处理人</th><th>处理时间</th></tr></thead><tbody>' +
      recs.map(function (r) {
        return '<tr><td>' + r.batchId + '</td><td>' + r.sampleName + '</td><td>' + r.autoCount + '</td><td>' +
          (r.manualDelta >= 0 ? "+" : "") + r.manualDelta + '</td><td><strong>' + r.finalCount + '</strong></td><td>' +
          (r.species || "—") + '</td><td>' + (r.isNegativeControl ? "是" : "否") + '</td><td>' +
          (r.status === "approved" ? "已通过" : (r.status === "rejected" ? "已退回" : "待复核")) +
          '</td><td>' + r.processedBy + '</td><td>' + fmtTime(r.processedAt) + '</td></tr>';
      }).join("") + '</tbody></table>';
  }

  if (opts.indexOf("explain") >= 0) {
    var anomalyRecs = recs.filter(function (r) { return r.anomalyType; });
    var anomalyText = "";
    if (anomalyRecs.length) {
      anomalyText = "其中有 " + anomalyRecs.length + " 条需要特别关注：" +
        anomalyRecs.map(function (r) {
          if (r.anomalyType === "negativeControlAbnormal") {
            return "「" + r.sampleName + "」作为阴性对照出现了 " + r.finalCount + " 个菌落（应为 0），" +
              (r.status === "approved" ? "已由 " + (DataStore.getReviewLogs().find(function (l) { return l.recordId === r.id; }) || {}).reviewer + " 复核放行并记录了原因。" : "目前仍在待复核。");
          }
          return "「" + r.sampleName + "」记录的物种名为「" + r.species + "」，与预期「" + r.expectedSpecies + "」实际是同种异名，系统已自动识别关联。";
        }).join("；") + "。";
    }
    var plain = "各位同事，" + (batch === "all" ? "本轮菌落计数" : "批次 " + batch) +
      "共处理了 " + recs.length + " 个平板样本，合计菌落 " + total + " 个，平均每个平板约 " + avg + " 个。" +
      "已通过复核 " + approved + " 个，待复核 " + pending + " 个。" +
      (neg ? "包含阴性对照 " + neg + " 个，" : "") +
      anomalyText +
      "所有样本的照片、计数、标注、复核记录在系统里是同一份数据，没有两套口径，有疑问可以直接在「异常溯源」里顺着一条异常往下查到原始照片和处理意见。需要进一步细节可查看附件或联系我。";
    html += '<h4>💬 普通话解释（可直接复制转发）</h4>' +
      '<div class="plain-explain">' + plain.replace(/\n/g, "<br>") + '</div>';
  }

  if (opts.indexOf("review") >= 0) {
    var logs = DataStore.getReviewLogs().filter(function (l) {
      return batch === "all" || l.batchId === batch;
    });
    html += '<h4>✅ 复核记录</h4>';
    if (logs.length) {
      html += '<table><thead><tr><th>样本</th><th>原状态</th><th>新状态</th><th>异常放行</th><th>复核人</th><th>复核时间</th><th>复核原因</th></tr></thead><tbody>' +
        logs.map(function (l) {
          return '<tr><td>' + l.sampleName + '</td><td>' + l.fromStatus + '</td><td>' + l.toStatus +
            '</td><td>' + (l.abnormalRelease ? "是（已留痕）" : "否") + '</td><td>' + l.reviewer +
            '</td><td>' + fmtTime(l.reviewedAt) + '</td><td>' + (l.reason || "—") + '</td></tr>';
        }).join("") + '</tbody></table>';
    } else {
      html += '<p style="color:#64748b">本范围暂无复核记录。</p>';
    }
  }

  $("#reportBody").innerHTML = html;
  $("#reportContent").classList.remove("hidden");
}

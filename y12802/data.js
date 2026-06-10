var SPECIES_SYNONYMS = {
  "大肠杆菌": ["大肠埃希氏菌", "Escherichia coli", "E. coli"],
  "大肠埃希氏菌": ["大肠杆菌", "Escherichia coli", "E. coli"],
  "金黄色葡萄球菌": ["金葡菌", "Staphylococcus aureus", "S. aureus"],
  "枯草芽孢杆菌": ["枯草杆菌", "Bacillus subtilis", "B. subtilis"],
  "白色念珠菌": ["白假丝酵母菌", "Candida albicans", "C. albicans"],
  "白假丝酵母菌": ["白色念珠菌", "Candida albicans", "C. albicans"],
  "黑曲霉": ["Aspergillus niger", "A. niger"]
};

var SPECIES_LATIN = {
  "大肠杆菌": "Escherichia coli",
  "大肠埃希氏菌": "Escherichia coli",
  "金黄色葡萄球菌": "Staphylococcus aureus",
  "枯草芽孢杆菌": "Bacillus subtilis",
  "白色念珠菌": "Candida albicans",
  "白假丝酵母菌": "Candida albicans",
  "黑曲霉": "Aspergillus niger"
};

var SPECIES_CANONICAL = {
  "大肠杆菌": "大肠杆菌",
  "大肠埃希氏菌": "大肠杆菌",
  "Escherichia coli": "大肠杆菌",
  "E. coli": "大肠杆菌",
  "金黄色葡萄球菌": "金黄色葡萄球菌",
  "金葡菌": "金黄色葡萄球菌",
  "Staphylococcus aureus": "金黄色葡萄球菌",
  "S. aureus": "金黄色葡萄球菌",
  "枯草芽孢杆菌": "枯草芽孢杆菌",
  "枯草杆菌": "枯草芽孢杆菌",
  "Bacillus subtilis": "枯草芽孢杆菌",
  "B. subtilis": "枯草芽孢杆菌",
  "白色念珠菌": "白色念珠菌",
  "白假丝酵母菌": "白色念珠菌",
  "Candida albicans": "白色念珠菌",
  "C. albicans": "白色念珠菌",
  "黑曲霉": "黑曲霉",
  "Aspergillus niger": "黑曲霉",
  "A. niger": "黑曲霉"
};

var USERS = ["张研究员", "李主管", "王检验师", "赵质控"];

function makeFakeColonyImage(seed, count) {
  var cvs = document.createElement("canvas");
  cvs.width = 520;
  cvs.height = 380;
  var ctx = cvs.getContext("2d");
  var grad = ctx.createRadialGradient(260, 190, 40, 260, 190, 240);
  grad.addColorStop(0, "#fef9e7");
  grad.addColorStop(1, "#ecf0f1");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 520, 380);
  ctx.strokeStyle = "#95a5a6";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(260, 190, 170, 0, Math.PI * 2);
  ctx.stroke();

  var rng = function (s) {
    var x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  var colors = ["#27ae60", "#f39c12", "#e74c3c", "#8e44ad", "#2980b9"];
  for (var i = 0; i < count; i++) {
    var rx = rng(seed + i * 3.7) * 300 + 110;
    var ry = rng(seed + i * 7.3 + 1.5) * 300 + 40;
    var rr = rng(seed + i * 11.1 + 2.3) * 10 + 5;
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(rx, ry, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return cvs.toDataURL("image/png");
}

function buildSampleData() {
  var now = Date.now();
  var rec1Photo = makeFakeColonyImage(1, 156);
  var rec2Photo = makeFakeColonyImage(2, 0);
  var rec3Photo = makeFakeColonyImage(3, 89);
  var rec4Photo = makeFakeColonyImage(4, 234);
  var rec5Photo = makeFakeColonyImage(5, 12);

  return {
    currentUser: "张研究员",
    records: [
      {
        id: "R20260610001",
        batchId: "B20260610-A",
        sampleName: "批次A-平板1（原液）",
        photo: rec1Photo,
        autoCount: 156,
        manualDelta: 3,
        finalCount: 159,
        species: "大肠杆菌",
        expectedSpecies: "大肠杆菌",
        cultureCondition: "需氧37℃ 24h",
        isNegativeControl: false,
        note: "菌落形态均匀，边缘清晰，与预期一致。自动识别有3处粘连，已人工补点。",
        status: "approved",
        anomalyType: null,
        anomalyReason: null,
        parentId: null,
        marks: { auto: 156, added: 3, removed: 0 },
        processedBy: "张研究员",
        processedAt: now - 3600 * 1000 * 5
      },
      {
        id: "R20260610002",
        batchId: "B20260610-A",
        sampleName: "批次A-阴性对照（PBS空白）",
        photo: rec2Photo,
        autoCount: 0,
        manualDelta: 0,
        finalCount: 0,
        species: "—",
        expectedSpecies: "大肠杆菌",
        cultureCondition: "需氧37℃ 24h",
        isNegativeControl: true,
        note: "阴性对照平板无可见菌落，符合预期。",
        status: "approved",
        anomalyType: null,
        anomalyReason: null,
        parentId: null,
        marks: { auto: 0, added: 0, removed: 0 },
        processedBy: "张研究员",
        processedAt: now - 3600 * 1000 * 4.5
      },
      {
        id: "R20260610003",
        batchId: "B20260610-A",
        sampleName: "批次A-平板2（10倍稀释）",
        photo: rec3Photo,
        autoCount: 91,
        manualDelta: -2,
        finalCount: 89,
        species: "大肠埃希氏菌",
        expectedSpecies: "大肠杆菌",
        cultureCondition: "需氧37℃ 24h",
        isNegativeControl: false,
        note: "使用了物种别名'大肠埃希氏菌'（与大肠杆菌为同种异名）。自动误识别2个气泡，已删除。",
        status: "pending",
        anomalyType: "synonym",
        anomalyReason: null,
        parentId: "R20260610001",
        marks: { auto: 91, added: 0, removed: 2 },
        processedBy: "李主管",
        processedAt: now - 3600 * 1000 * 4
      },
      {
        id: "R20260610004",
        batchId: "B20260610-B",
        sampleName: "批次B-阴性对照（异常）",
        photo: rec4Photo,
        autoCount: 234,
        manualDelta: 0,
        finalCount: 234,
        species: "金黄色葡萄球菌",
        expectedSpecies: "—",
        cultureCondition: "需氧37℃ 24h",
        isNegativeControl: true,
        note: "阴性对照出现大量菌落，明显异常，疑似交叉污染。已标记待复核。",
        status: "pending",
        anomalyType: "negativeControlAbnormal",
        anomalyReason: null,
        parentId: null,
        marks: { auto: 234, added: 0, removed: 0 },
        processedBy: "王检验师",
        processedAt: now - 3600 * 1000 * 3
      },
      {
        id: "R20260610005",
        batchId: "B20260610-B",
        sampleName: "批次B-平板1",
        photo: rec5Photo,
        autoCount: 12,
        manualDelta: 0,
        finalCount: 12,
        species: "白假丝酵母菌",
        expectedSpecies: "白色念珠菌",
        cultureCondition: "霉菌28℃ 72h",
        isNegativeControl: false,
        note: "物种名使用了'白假丝酵母菌'（白色念珠菌异名）。菌落生长缓慢，形态符合酵母样真菌。",
        status: "approved",
        anomalyType: "synonym",
        anomalyReason: null,
        parentId: null,
        marks: { auto: 12, added: 0, removed: 0 },
        processedBy: "张研究员",
        processedAt: now - 3600 * 1000 * 2
      }
    ],
    reviewLogs: [
      {
        id: "RV20260610001",
        recordId: "R20260610001",
        batchId: "B20260610-A",
        sampleName: "批次A-平板1（原液）",
        fromStatus: "pending",
        toStatus: "approved",
        abnormalRelease: false,
        reviewer: "李主管",
        reviewedAt: now - 3600 * 1000 * 4.2,
        reason: "自动计数与人工复核差异在可接受范围（+3），物种鉴定一致，同意通过。"
      },
      {
        id: "RV20260610002",
        recordId: "R20260610005",
        batchId: "B20260610-B",
        sampleName: "批次B-平板1",
        fromStatus: "pending",
        toStatus: "approved",
        abnormalRelease: false,
        reviewer: "李主管",
        reviewedAt: now - 3600 * 1000 * 1.5,
        reason: "物种为'白假丝酵母菌'，与预期'白色念珠菌'系同种异名，系统已识别同义关系，数据可信。"
      }
    ]
  };
}

var DataStore = (function () {
  var KEY = "colony_counter_db_v1";
  var data = null;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        data = JSON.parse(raw);
      } else {
        data = buildSampleData();
        save();
      }
    } catch (e) {
      data = buildSampleData();
    }
    if (!data.records) data.records = [];
    if (!data.reviewLogs) data.reviewLogs = [];
    if (!data.currentUser) data.currentUser = USERS[0];
    return data;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("保存失败", e);
    }
  }

  function reset() {
    localStorage.removeItem(KEY);
    data = buildSampleData();
    save();
  }

  function loadSample() {
    data = buildSampleData();
    save();
  }

  function getRecords(filterBatch) {
    if (!filterBatch || filterBatch === "all") return data.records.slice();
    return data.records.filter(function (r) { return r.batchId === filterBatch; });
  }

  function getRecordById(id) {
    return data.records.find(function (r) { return r.id === id; });
  }

  function addRecord(rec) {
    data.records.unshift(rec);
    save();
  }

  function updateRecord(id, patch) {
    var rec = getRecordById(id);
    if (rec) {
      Object.assign(rec, patch);
      save();
    }
    return rec;
  }

  function getBatches() {
    var set = {};
    data.records.forEach(function (r) { set[r.batchId] = true; });
    return Object.keys(set);
  }

  function getReviewLogs() {
    return data.reviewLogs.slice();
  }

  function addReviewLog(log) {
    data.reviewLogs.unshift(log);
    save();
  }

  function getCurrentUser() { return data.currentUser; }
  function setCurrentUser(u) { data.currentUser = u; save(); }

  function getSynonymTip(species) {
    var canon = SPECIES_CANONICAL[species];
    var list = SPECIES_SYNONYMS[species] || [];
    if (!canon || list.length === 0) return null;
    return "与「" + canon + "」为同种异名（含：" + list.join(" / ") + "）";
  }

  function isSynonym(a, b) {
    if (!a || !b) return false;
    return SPECIES_CANONICAL[a] === SPECIES_CANONICAL[b] && a !== b;
  }

  function generateId(prefix) {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    var rand = String(Math.floor(Math.random() * 9000) + 1000);
    return prefix + y + m + day + rand;
  }

  return {
    load: load,
    save: save,
    reset: reset,
    loadSample: loadSample,
    getRecords: getRecords,
    getRecordById: getRecordById,
    addRecord: addRecord,
    updateRecord: updateRecord,
    getBatches: getBatches,
    getReviewLogs: getReviewLogs,
    addReviewLog: addReviewLog,
    getCurrentUser: getCurrentUser,
    setCurrentUser: setCurrentUser,
    getSynonymTip: getSynonymTip,
    isSynonym: isSynonym,
    generateId: generateId
  };
})();

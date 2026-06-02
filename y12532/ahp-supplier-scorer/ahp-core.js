var RI_TABLE = {1:0, 2:0, 3:0.58, 4:0.90, 5:1.12, 6:1.24, 7:1.32, 8:1.41, 9:1.45, 10:1.49};

var DEFAULT_DB = {
  suppliers: [
    {id:'S001', name:'华东精工有限公司', category:'原材料', contact:'张明远', phone:'021-5555-1001', materials:'钢材/铝材', notes:'长期合作供应商'},
    {id:'S002', name:'德盛制造集团', category:'零部件', contact:'李建国', phone:'010-5555-2002', materials:'传动部件', notes:'ISO9001认证'},
    {id:'S003', name:'信达新材料科技', category:'原材料', contact:'王晓峰', phone:'0571-5555-3003', materials:'复合材料', notes:'新品供应商'},
    {id:'S004', name:'恒力表面处理厂', category:'加工服务', contact:'赵宇航', phone:'0755-5555-4004', materials:'表面处理', notes:'区域供应商'}
  ],
  inspections: [
    {id:'Q001', supplierId:'S001', date:'2026-05-10', item:'冷轧钢板-Q235', batchNo:'B2026-0510A', sampleSize:200, qualified:194, defects:6, passRate:97.0, result:'合格', notes:'表面轻微划痕'},
    {id:'Q002', supplierId:'S001', date:'2026-05-18', item:'铝合金板-6061', batchNo:'B2026-0518B', sampleSize:150, qualified:147, defects:3, passRate:98.0, result:'合格', notes:''},
    {id:'Q003', supplierId:'S002', date:'2026-05-12', item:'齿轮组件-G20', batchNo:'B2026-0512C', sampleSize:100, qualified:92, defects:8, passRate:92.0, result:'合格', notes:'公差偏上限'},
    {id:'Q004', supplierId:'S002', date:'2026-05-20', item:'轴承座-B15', batchNo:'B2026-0520D', sampleSize:80, qualified:78, defects:2, passRate:97.5, result:'合格', notes:'返修2件'},
    {id:'Q005', supplierId:'S003', date:'2026-05-15', item:'碳纤维板-CF30', batchNo:'B2026-0515E', sampleSize:50, qualified:48, defects:2, passRate:96.0, result:'合格', notes:'层间结合力略低'},
    {id:'Q006', supplierId:'S003', date:'2026-05-22', item:'玻璃纤维布-EWR200', batchNo:'B2026-0522F', sampleSize:100, qualified:99, defects:1, passRate:99.0, result:'合格', notes:''},
    {id:'Q007', supplierId:'S004', date:'2026-05-16', item:'阳极氧化-AL6061', batchNo:'B2026-0516G', sampleSize:120, qualified:110, defects:10, passRate:91.7, result:'让步接收', notes:'色差超标10件'},
    {id:'Q008', supplierId:'S004', date:'2026-05-25', item:'电镀锌-SECC', batchNo:'B2026-0525H', sampleSize:90, qualified:85, defects:5, passRate:94.4, result:'合格', notes:''}
  ],
  criteria: [
    {id:'C1', name:'质量', parentId:null, level:1},
    {id:'C2', name:'交付', parentId:null, level:1},
    {id:'C3', name:'价格', parentId:null, level:1},
    {id:'C1-1', name:'来料合格率', parentId:'C1', level:2},
    {id:'C1-2', name:'缺陷严重度', parentId:'C1', level:2},
    {id:'C2-1', name:'准时交付率', parentId:'C2', level:2},
    {id:'C2-2', name:'交付灵活性', parentId:'C2', level:2},
    {id:'C3-1', name:'价格竞争力', parentId:'C3', level:2},
    {id:'C3-2', name:'付款条件', parentId:'C3', level:2}
  ],
  matrices: {},
  scores: [],
  auditLog: [],
  matrixEdits: {},
  mergeLog: []
};

var BASE_SCORES = {
  S001: {'C1-1':97, 'C1-2':85, 'C2-1':95, 'C2-2':80, 'C3-1':82, 'C3-2':85},
  S002: {'C1-1':93, 'C1-2':78, 'C2-1':88, 'C2-2':85, 'C3-1':75, 'C3-2':90},
  S003: {'C1-1':96, 'C1-2':88, 'C2-1':82, 'C2-2':70, 'C3-1':90, 'C3-2':80},
  S004: {'C1-1':92, 'C1-2':72, 'C2-1':85, 'C2-2':75, 'C3-1':88, 'C3-2':92}
};

var DB;
var currentTab = 'suppliers';

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

function loadDB() {
  try {
    var s = localStorage.getItem('ahp_supplier_scorer_db');
    if (s) { DB = JSON.parse(s); return; }
  } catch(e) {}
  DB = deepClone(DEFAULT_DB);
}

function saveDB() {
  try { localStorage.setItem('ahp_supplier_scorer_db', JSON.stringify(DB)); } catch(e) {}
}

function resetData() {
  if (!confirm('确认重置所有数据为示例数据？此操作不可恢复。')) return;
  DB = deepClone(DEFAULT_DB);
  initDefaultMatrix();
  initDefaultScores();
  saveDB();
  renderAll();
}

function addAudit(action, detail, oldVal, newVal) {
  DB.auditLog.unshift({
    ts: new Date().toLocaleString('zh-CN'),
    action: action,
    detail: detail,
    oldVal: oldVal || '',
    newVal: newVal || ''
  });
  if (DB.auditLog.length > 500) DB.auditLog.length = 500;
  saveDB();
}

function genId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function getTopCriteria() { return DB.criteria.filter(function(c){ return !c.parentId; }); }
function getSubCriteria(pid) { return DB.criteria.filter(function(c){ return c.parentId === pid; }); }

function ahpCalculate(matrix) {
  var n = matrix.length;
  if (n < 1) return {weights:[], lambdaMax:0, CI:0, CR:0, consistent:true};
  var geoMeans = [];
  for (var i = 0; i < n; i++) {
    var product = 1;
    for (var j = 0; j < n; j++) product *= matrix[i][j];
    geoMeans.push(Math.pow(product, 1/n));
  }
  var sumGeo = geoMeans.reduce(function(a,b){ return a+b; }, 0);
  var weights = geoMeans.map(function(g){ return g / sumGeo; });
  var lambdaMax = 0;
  for (var i = 0; i < n; i++) {
    var awSum = 0;
    for (var j = 0; j < n; j++) awSum += matrix[i][j] * weights[j];
    lambdaMax += awSum / weights[i];
  }
  lambdaMax /= n;
  var CI = n > 1 ? (lambdaMax - n) / (n - 1) : 0;
  var RI = RI_TABLE[n] || 0;
  var CR = RI > 0 ? CI / RI : 0;
  return {weights: weights, lambdaMax: lambdaMax, CI: CI, CR: CR, consistent: CR < 0.1};
}

function sensitivityAnalysis(weights, supplierScores, delta) {
  var results = [];
  delta = delta || 0.05;
  for (var wIdx = 0; wIdx < weights.length; wIdx++) {
    var series = [];
    for (var d = -0.3; d <= 0.3001; d += delta) {
      var adjWeights = weights.slice();
      adjWeights[wIdx] = Math.max(0.001, adjWeights[wIdx] + d);
      var sumW = adjWeights.reduce(function(a,b){ return a+b; }, 0);
      var normW = adjWeights.map(function(w){ return w / sumW; });
      var scores = supplierScores.map(function(ss) {
        var total = 0;
        for (var k = 0; k < normW.length; k++) total += normW[k] * ss.scores[k];
        return {supplier: ss.supplier, score: total};
      });
      scores.sort(function(a,b){ return b.score - a.score; });
      series.push({delta: d, weights: normW, rankings: scores.map(function(s){ return s.supplier; }), scores: scores});
    }
    results.push({criterionIdx: wIdx, criterionName: '', series: series});
  }
  return results;
}

function initDefaultMatrix() {
  var top = getTopCriteria();
  if (DB.matrices['top'] && DB.matrices['top'].criteriaIds && DB.matrices['top'].criteriaIds.length === top.length) return;
  var n = top.length;
  var m = [];
  for (var i = 0; i < n; i++) { m[i] = []; for (var j = 0; j < n; j++) m[i][j] = (i === j) ? 1 : 1; }
  if (n >= 3) {
    m[0][1] = 3; m[1][0] = 1/3;
    m[0][2] = 5; m[2][0] = 1/5;
    m[1][2] = 2; m[2][1] = 1/2;
  }
  DB.matrices['top'] = {criteriaIds: top.map(function(c){ return c.id; }), matrix: m, weights: [], CR: 0, consistent: true, lambdaMax: 0, CI: 0};
  top.forEach(function(tc) {
    var subs = getSubCriteria(tc.id);
    if (subs.length >= 2) {
      var sn = subs.length;
      var sm = [];
      for (var i = 0; i < sn; i++) { sm[i] = []; for (var j = 0; j < sn; j++) sm[i][j] = (i === j) ? 1 : 1; }
      if (tc.id === 'C1' && sn >= 2) { sm[0][1] = 3; sm[1][0] = 1/3; }
      if (tc.id === 'C2' && sn >= 2) { sm[0][1] = 2; sm[1][0] = 1/2; }
      if (tc.id === 'C3' && sn >= 2) { sm[0][1] = 3; sm[1][0] = 1/3; }
      DB.matrices[tc.id] = {criteriaIds: subs.map(function(c){ return c.id; }), matrix: sm, weights: [], CR: 0, consistent: true, lambdaMax: 0, CI: 0};
    }
  });
  saveDB();
}

function computeAllWeights() {
  var hasInconsistency = false;
  var topResult = ahpCalculate(DB.matrices['top'].matrix);
  Object.assign(DB.matrices['top'], {weights: topResult.weights, lambdaMax: topResult.lambdaMax, CI: topResult.CI, CR: topResult.CR, consistent: topResult.consistent});
  if (!topResult.consistent) hasInconsistency = true;
  var topCriteria = getTopCriteria();
  topCriteria.forEach(function(tc) {
    if (DB.matrices[tc.id]) {
      var subResult = ahpCalculate(DB.matrices[tc.id].matrix);
      Object.assign(DB.matrices[tc.id], {weights: subResult.weights, lambdaMax: subResult.lambdaMax, CI: subResult.CI, CR: subResult.CR, consistent: subResult.consistent});
      if (!subResult.consistent) hasInconsistency = true;
    }
  });
  saveDB();
  return hasInconsistency;
}

function getGlobalWeights() {
  var globalWeights = [];
  var topCrit = getTopCriteria();
  var topWeights = (DB.matrices['top'] && DB.matrices['top'].weights) ? DB.matrices['top'].weights : topCrit.map(function(){ return 1/topCrit.length; });
  topCrit.forEach(function(tc, i) {
    var subs = getSubCriteria(tc.id);
    if (subs.length > 0 && DB.matrices[tc.id] && DB.matrices[tc.id].weights) {
      var subWeights = DB.matrices[tc.id].weights;
      subs.forEach(function(sc, j) {
        globalWeights.push({id: sc.id, name: sc.name, parentId: tc.id, parentName: tc.name, globalWeight: topWeights[i] * subWeights[j], parentWeight: topWeights[i], subWeight: subWeights[j]});
      });
    } else {
      globalWeights.push({id: tc.id, name: tc.name, parentId: null, parentName: null, globalWeight: topWeights[i], parentWeight: topWeights[i], subWeight: 1});
    }
  });
  var totalGW = globalWeights.reduce(function(a,g){ return a + g.globalWeight; }, 0);
  if (totalGW > 0) globalWeights.forEach(function(g){ g.globalWeight = g.globalWeight / totalGW; });
  return globalWeights;
}

function getInspectionRef(supplierId, criterionId) {
  var related = DB.inspections.filter(function(q){ return q.supplierId === supplierId; });
  if (criterionId.indexOf('C1') === 0 && related.length > 0) return related.map(function(q){ return q.id; }).join(',');
  if (criterionId.indexOf('C2') === 0 && related.length > 0) return related[0].id;
  return '';
}

function initDefaultScores() {
  DB.scores = [];
  var gw = getGlobalWeights();
  DB.suppliers.forEach(function(sup) {
    gw.forEach(function(g) {
      var val = (BASE_SCORES[sup.id] && BASE_SCORES[sup.id][g.id]) || Math.floor(70 + Math.random()*25);
      DB.scores.push({
        supplierId: sup.id, criterionId: g.id, score: val,
        source: '初始录入', modifiedAt: new Date().toLocaleString('zh-CN'), modifiedBy: '系统',
        inspectionRef: getInspectionRef(sup.id, g.id),
        history: [{score: val, ts: new Date().toLocaleString('zh-CN'), by: '系统', reason: '初始录入'}]
      });
    });
  });
  saveDB();
}

function getSupplierFinalScores() {
  var gw = getGlobalWeights();
  return DB.suppliers.map(function(sup) {
    var row = {supplier: sup, globalScores: {}, totalScore: 0, missingCriteria: []};
    gw.forEach(function(g) {
      var found = DB.scores.find(function(sc){ return sc.supplierId === sup.id && sc.criterionId === g.id; });
      if (found) { row.globalScores[g.id] = found.score; row.totalScore += found.score * g.globalWeight; }
      else { row.globalScores[g.id] = null; row.missingCriteria.push(g); }
    });
    return row;
  });
}

loadDB();
initDefaultMatrix();
if (DB.scores.length === 0) initDefaultScores();
computeAllWeights();

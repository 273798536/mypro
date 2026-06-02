var TABS = [
  {id:'suppliers', label:'供应商资料'},
  {id:'inspections', label:'质检记录'},
  {id:'criteria', label:'准则设置'},
  {id:'matrix', label:'判断矩阵'},
  {id:'weight-check', label:'权重校验'},
  {id:'scoring', label:'供应商评分'},
  {id:'sensitivity', label:'敏感性分析'},
  {id:'report', label:'评分报告'}
];

function showDialog(title, bodyHtml, onConfirm, readOnly) {
  var overlay = document.getElementById('dialogOverlay');
  var content = document.getElementById('dialogContent');
  var btns = readOnly
    ? '<button class="btn btn-outline" onclick="closeDialog()">关闭</button>'
    : '<button class="btn btn-outline" onclick="closeDialog()">取消</button><button class="btn btn-primary" id="dialogConfirm">确认</button>';
  content.innerHTML = '<h3>' + title + '</h3>' + bodyHtml + '<div class="btn-row">' + btns + '</div>';
  overlay.className = 'dialog-overlay active';
  if (onConfirm) document.getElementById('dialogConfirm').onclick = function() { onConfirm(); closeDialog(); };
}

function closeDialog() { document.getElementById('dialogOverlay').className = 'dialog-overlay'; }

function renderNav() {
  var nav = document.getElementById('nav');
  nav.innerHTML = TABS.map(function(t){
    return '<button data-tab="' + t.id + '" class="' + (t.id === currentTab ? 'active' : '') + '">' + t.label + '</button>';
  }).join('');
  nav.querySelectorAll('button').forEach(function(btn){
    btn.onclick = function() { currentTab = btn.dataset.tab; renderAll(); };
  });
}

function renderAll() {
  renderNav();
  document.getElementById('headerTime').textContent = new Date().toLocaleString('zh-CN');
  var main = document.getElementById('main');
  main.innerHTML = '';
  TABS.forEach(function(t){
    var div = document.createElement('div');
    div.className = 'tab' + (t.id === currentTab ? ' active' : '');
    div.id = 'tab-' + t.id;
    main.appendChild(div);
  });
  var renderers = {
    suppliers: renderSuppliers, inspections: renderInspections, criteria: renderCriteria,
    matrix: renderMatrix, 'weight-check': renderWeightCheck, scoring: renderScoring,
    sensitivity: renderSensitivity, report: renderReport
  };
  if (renderers[currentTab]) renderers[currentTab]();
}

function renderSuppliers() {
  var el = document.getElementById('tab-suppliers');
  var rows = DB.suppliers.map(function(s){
    return '<tr><td>' + s.id + '</td><td><strong>' + esc(s.name) + '</strong></td><td>' + esc(s.category) + '</td><td>' + esc(s.contact) + '</td><td>' + esc(s.phone) + '</td><td>' + esc(s.materials) + '</td><td style="font-size:12px;color:var(--dim)">' + esc(s.notes||'—') + '</td><td><button class="btn btn-outline btn-sm" onclick="editSupplier(\'' + s.id + '\')">编辑</button> <button class="btn btn-danger btn-sm" onclick="deleteSupplier(\'' + s.id + '\')">删除</button></td></tr>';
  }).join('');

  var mergeRows = '';
  if (DB.mergeLog && DB.mergeLog.length > 0) {
    mergeRows = DB.mergeLog.map(function(m){
      return '<tr><td>' + m.fromId + '</td><td>' + esc(m.fromName) + '</td><td>' + m.toId + ' ' + esc(m.toName) + '</td><td><span class="badge badge-warn">已合并</span></td><td><span class="trace-link" onclick="traceMerge(\'' + m.fromId + '\',\'' + m.toId + '\')">追溯记录</span></td></tr>';
    }).join('');
  } else {
    mergeRows = '<tr><td colspan="5" style="color:var(--dim)">暂无合并记录</td></tr>';
  }

  el.innerHTML =
    '<div class="card"><h2>供应商资料</h2>' +
    '<div class="toolbar"><button class="btn btn-primary btn-sm" onclick="addSupplier()">+ 新增供应商</button>' +
    '<button class="btn btn-outline btn-sm" onclick="showMergeDialog()">合并供应商</button>' +
    '<button class="btn btn-outline btn-sm" onclick="resetData()">重置示例数据</button></div>' +
    '<table><thead><tr><th>编号</th><th>名称</th><th>类别</th><th>联系人</th><th>电话</th><th>供应物资</th><th>备注</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="card"><h2>供应商合并与关联</h2>' +
    '<p style="font-size:13px;color:var(--dim);margin-bottom:8px">当供应商存在合并或更名时，可将评分记录指向新供应商，保留可追溯标记。</p>' +
    '<table><thead><tr><th>原编号</th><th>原名称</th><th>合并至</th><th>状态</th><th>操作</th></tr></thead><tbody>' + mergeRows + '</tbody></table></div>';
}

function addSupplier() {
  showDialog('新增供应商',
    '<div style="display:grid;gap:8px">' +
    '<div>名称: <input id="d-name" style="width:300px"></div>' +
    '<div>类别: <select id="d-category"><option>原材料</option><option>零部件</option><option>加工服务</option><option>其他</option></select></div>' +
    '<div>联系人: <input id="d-contact" style="width:200px"></div>' +
    '<div>电话: <input id="d-phone" style="width:200px"></div>' +
    '<div>供应物资: <input id="d-materials" style="width:300px"></div>' +
    '<div>备注: <input id="d-notes" style="width:300px"></div></div>',
    function(){
      var name = document.getElementById('d-name').value.trim();
      if (!name) { alert('名称不能为空'); return; }
      var s = {id:genId('S'),name:name,category:document.getElementById('d-category').value,contact:document.getElementById('d-contact').value,phone:document.getElementById('d-phone').value,materials:document.getElementById('d-materials').value,notes:document.getElementById('d-notes').value};
      DB.suppliers.push(s);
      addAudit('新增供应商',s.name,'',s.id);
      initDefaultScores();
      saveDB(); renderAll();
    });
}

function editSupplier(id) {
  var s = DB.suppliers.find(function(x){ return x.id===id; });
  if (!s) return;
  var catOpts = ['原材料','零部件','加工服务','其他'].map(function(c){
    return '<option' + (s.category===c?' selected':'') + '>' + c + '</option>';
  }).join('');
  showDialog('编辑供应商',
    '<div style="display:grid;gap:8px">' +
    '<div>编号: ' + s.id + '</div>' +
    '<div>名称: <input id="d-name" value="' + esc(s.name) + '" style="width:300px"></div>' +
    '<div>类别: <select id="d-category">' + catOpts + '</select></div>' +
    '<div>联系人: <input id="d-contact" value="' + esc(s.contact) + '" style="width:200px"></div>' +
    '<div>电话: <input id="d-phone" value="' + esc(s.phone) + '" style="width:200px"></div>' +
    '<div>供应物资: <input id="d-materials" value="' + esc(s.materials) + '" style="width:300px"></div>' +
    '<div>备注: <input id="d-notes" value="' + esc(s.notes||'') + '" style="width:300px"></div></div>',
    function(){
      var oldName = s.name;
      s.name = document.getElementById('d-name').value.trim();
      s.category = document.getElementById('d-category').value;
      s.contact = document.getElementById('d-contact').value;
      s.phone = document.getElementById('d-phone').value;
      s.materials = document.getElementById('d-materials').value;
      s.notes = document.getElementById('d-notes').value;
      if (oldName !== s.name) addAudit('编辑供应商','名称变更',oldName,s.name);
      saveDB(); renderAll();
    });
}

function deleteSupplier(id) {
  var s = DB.suppliers.find(function(x){ return x.id===id; });
  if (!s) return;
  if (!confirm('确认删除供应商「' + s.name + '」？相关评分记录将被标记为缺项。')) return;
  DB.suppliers = DB.suppliers.filter(function(x){ return x.id !== id; });
  addAudit('删除供应商',s.name,s.id,'');
  saveDB(); renderAll();
}

function showMergeDialog() {
  var opts = DB.suppliers.map(function(s){ return '<option value="'+s.id+'">' + esc(s.name) + '</option>'; }).join('');
  showDialog('合并供应商',
    '<p style="font-size:13px;color:var(--dim);margin-bottom:10px">将一个供应商的评分记录合并到另一个供应商，原供应商标记为已合并。</p>' +
    '<div style="display:grid;gap:8px">' +
    '<div>原供应商: <select id="d-from">' + opts + '</select></div>' +
    '<div>合并至: <select id="d-to">' + opts + '</select></div></div>',
    function(){
      var fromId = document.getElementById('d-from').value;
      var toId = document.getElementById('d-to').value;
      if (fromId === toId) { alert('不能合并到自身'); return; }
      var fromSup = DB.suppliers.find(function(s){ return s.id===fromId; });
      var toSup = DB.suppliers.find(function(s){ return s.id===toId; });
      if (!fromSup || !toSup) return;
      DB.scores.forEach(function(sc){
        if (sc.supplierId === fromId) {
          sc.history.push({score:sc.score,ts:new Date().toLocaleString('zh-CN'),by:'用户',reason:'从 '+fromSup.name+' 合并'});
          sc.supplierId = toId;
          sc.source = '合并自 ' + fromSup.name;
        }
      });
      if (!DB.mergeLog) DB.mergeLog = [];
      DB.mergeLog.push({fromId:fromId,fromName:fromSup.name,toId:toId,toName:toSup.name,ts:new Date().toLocaleString('zh-CN')});
      addAudit('供应商合并',fromSup.name+' → '+toSup.name,fromId,toId);
      saveDB(); renderAll();
    });
}

function traceMerge(fromId, toId) {
  var related = DB.scores.filter(function(sc){ return sc.supplierId===toId && sc.source && sc.source.indexOf('合并')>=0; });
  var rows = related.map(function(r){
    return '<tr><td>' + r.criterionId + '</td><td>' + r.score + '</td><td>' + esc(r.source) + '</td><td>' + esc(r.modifiedAt) + '</td></tr>';
  }).join('');
  showDialog('合并追溯 — ' + fromId + ' → ' + toId,
    '<table><thead><tr><th>准则</th><th>评分</th><th>来源</th><th>修改时间</th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="4" style="color:var(--dim)">无相关记录</td></tr>') +
    '</tbody></table>', null, true);
}

function renderInspections() {
  var el = document.getElementById('tab-inspections');
  function supName(id) { var s = DB.suppliers.find(function(x){ return x.id===id; }); return s ? s.name : id; }
  var rows = DB.inspections.map(function(q){
    var bc = q.result==='合格'?'badge-ok':(q.result==='让步接收'?'badge-warn':'badge-danger');
    return '<tr><td>'+q.id+'</td><td><strong>'+esc(supName(q.supplierId))+'</strong></td><td>'+q.date+'</td><td>'+esc(q.item)+'</td><td style="font-size:12px">'+esc(q.batchNo)+'</td><td>'+q.sampleSize+'</td><td>'+q.qualified+'</td><td>'+q.defects+'</td><td><strong>'+q.passRate.toFixed(1)+'</strong></td><td><span class="badge '+bc+'">'+q.result+'</span></td><td style="font-size:12px;color:var(--dim)">'+esc(q.notes||'—')+'</td><td><button class="btn btn-outline btn-sm" onclick="editInspection(\''+q.id+'\')">编辑</button></td></tr>';
  }).join('');

  el.innerHTML =
    '<div class="card"><h2>质检记录</h2>' +
    '<div class="toolbar"><button class="btn btn-primary btn-sm" onclick="addInspection()">+ 新增质检记录</button></div>' +
    '<table><thead><tr><th>编号</th><th>供应商</th><th>日期</th><th>检验项目</th><th>批次号</th><th>抽检数</th><th>合格数</th><th>缺陷数</th><th>合格率(%)</th><th>结论</th><th>备注</th><th>操作</th></tr></thead><tbody>'+rows+'</tbody></table></div>' +
    '<div class="card"><h3>公式与单位说明</h3>' +
    '<div class="formula-box">合格率(%) = 合格数 / 抽检数 × 100\n单位: 百分比(%)\n边界: 0% ≤ 合格率 ≤ 100%\n缺陷数 = 抽检数 - 合格数\n结论判定: 合格率 ≥ 95% → 合格; 90% ≤ 合格率 &lt; 95% → 让步接收; &lt; 90% → 不合格</div></div>';
}

function addInspection() {
  var supOpts = DB.suppliers.map(function(s){ return '<option value="'+s.id+'">'+esc(s.name)+'</option>'; }).join('');
  showDialog('新增质检记录',
    '<div style="display:grid;gap:8px">' +
    '<div>供应商: <select id="d-sup">'+supOpts+'</select></div>' +
    '<div>日期: <input id="d-date" type="date" value="'+new Date().toISOString().slice(0,10)+'"></div>' +
    '<div>检验项目: <input id="d-item" style="width:300px"></div>' +
    '<div>批次号: <input id="d-batch" style="width:200px"></div>' +
    '<div>抽检数: <input id="d-sample" type="number" min="1"></div>' +
    '<div>合格数: <input id="d-qual" type="number" min="0"></div>' +
    '<div>缺陷数: <input id="d-defect" type="number" min="0"></div>' +
    '<div>备注: <input id="d-notes" style="width:300px"></div></div>',
    function(){
      var sample = parseInt(document.getElementById('d-sample').value)||0;
      var qual = parseInt(document.getElementById('d-qual').value)||0;
      var defect = parseInt(document.getElementById('d-defect').value)||0;
      var passRate = sample>0?(qual/sample*100):0;
      var result = passRate>=95?'合格':(passRate>=90?'让步接收':'不合格');
      var q = {id:genId('Q'),supplierId:document.getElementById('d-sup').value,date:document.getElementById('d-date').value,item:document.getElementById('d-item').value,batchNo:document.getElementById('d-batch').value,sampleSize:sample,qualified:qual,defects:defect,passRate:passRate,result:result,notes:document.getElementById('d-notes').value};
      DB.inspections.push(q);
      addAudit('新增质检',q.item,'',q.id);
      saveDB(); renderAll();
    });
}

function editInspection(id) {
  var q = DB.inspections.find(function(x){ return x.id===id; });
  if (!q) return;
  var supOpts = DB.suppliers.map(function(s){ return '<option value="'+s.id+'"'+(s.id===q.supplierId?' selected':'')+'>'+esc(s.name)+'</option>'; }).join('');
  showDialog('编辑质检记录',
    '<div style="display:grid;gap:8px">' +
    '<div>编号: '+q.id+'</div>' +
    '<div>供应商: <select id="d-sup">'+supOpts+'</select></div>' +
    '<div>日期: <input id="d-date" type="date" value="'+q.date+'"></div>' +
    '<div>检验项目: <input id="d-item" value="'+esc(q.item)+'" style="width:300px"></div>' +
    '<div>批次号: <input id="d-batch" value="'+esc(q.batchNo)+'" style="width:200px"></div>' +
    '<div>抽检数: <input id="d-sample" type="number" value="'+q.sampleSize+'" min="1"></div>' +
    '<div>合格数: <input id="d-qual" type="number" value="'+q.qualified+'" min="0"></div>' +
    '<div>缺陷数: <input id="d-defect" type="number" value="'+q.defects+'" min="0"></div>' +
    '<div>备注: <input id="d-notes" value="'+esc(q.notes||'')+'" style="width:300px"></div></div>',
    function(){
      var oldPR = q.passRate;
      q.supplierId = document.getElementById('d-sup').value;
      q.date = document.getElementById('d-date').value;
      q.item = document.getElementById('d-item').value;
      q.batchNo = document.getElementById('d-batch').value;
      q.sampleSize = parseInt(document.getElementById('d-sample').value)||0;
      q.qualified = parseInt(document.getElementById('d-qual').value)||0;
      q.defects = parseInt(document.getElementById('d-defect').value)||0;
      q.passRate = q.sampleSize>0?(q.qualified/q.sampleSize*100):0;
      q.result = q.passRate>=95?'合格':(q.passRate>=90?'让步接收':'不合格');
      q.notes = document.getElementById('d-notes').value;
      if (oldPR.toFixed(1) !== q.passRate.toFixed(1))
        addAudit('编辑质检','合格率变更',oldPR.toFixed(1)+'%',q.passRate.toFixed(1)+'%');
      saveDB(); renderAll();
    });
}

function renderCriteria() {
  var el = document.getElementById('tab-criteria');
  var topCrit = getTopCriteria();
  var rows = '';
  topCrit.forEach(function(c){
    var subs = getSubCriteria(c.id);
    rows += '<tr style="background:#f8f9fa"><td><strong>'+c.id+'</strong></td><td><strong>'+esc(c.name)+'</strong></td><td>一级</td><td>—</td><td>'+subs.length+'</td><td><button class="btn btn-outline btn-sm" onclick="editCriterion(\''+c.id+'\')">编辑</button> <button class="btn btn-danger btn-sm" onclick="deleteCriterion(\''+c.id+'\')">删除</button></td></tr>';
    subs.forEach(function(sc){
      rows += '<tr><td style="padding-left:30px">'+sc.id+'</td><td style="padding-left:30px">'+esc(sc.name)+'</td><td>二级</td><td>'+esc(c.name)+'</td><td>—</td><td><button class="btn btn-outline btn-sm" onclick="editCriterion(\''+sc.id+'\')">编辑</button> <button class="btn btn-danger btn-sm" onclick="deleteCriterion(\''+sc.id+'\')">删除</button></td></tr>';
    });
  });
  el.innerHTML =
    '<div class="card"><h2>准则层次结构</h2>' +
    '<div class="toolbar"><button class="btn btn-primary btn-sm" onclick="addCriterion()">+ 新增准则</button></div>' +
    '<table><thead><tr><th>编号</th><th>准则名称</th><th>层级</th><th>父准则</th><th>子准则数</th><th>操作</th></tr></thead><tbody>'+rows+'</tbody></table></div>' +
    '<div class="card"><h3>AHP层次结构说明</h3>' +
    '<div class="formula-box">目标层: 供应商综合评分\n准则层(一级): '+topCrit.map(function(c){return c.name;}).join('、')+'\n子准则层(二级): '+topCrit.map(function(c){return getSubCriteria(c.id).map(function(sc){return sc.name;}).join('、');}).filter(Boolean).join('；')+'\n结构要求: 每个一级准则至少有2个子准则才能构建判断矩阵\n权重路径: 一级权重 × 二级权重 = 全局权重</div></div>';
}

function addCriterion() {
  var parents = [{id:'',name:'（一级准则）'}].concat(getTopCriteria());
  var parentOpts = parents.map(function(p){ return '<option value="'+p.id+'">'+esc(p.name)+'</option>'; }).join('');
  showDialog('新增准则',
    '<div style="display:grid;gap:8px">' +
    '<div>准则名称: <input id="d-name" style="width:200px"></div>' +
    '<div>父准则: <select id="d-parent">'+parentOpts+'</select></div></div>',
    function(){
      var name = document.getElementById('d-name').value.trim();
      var parentId = document.getElementById('d-parent').value || null;
      if (!name) { alert('名称不能为空'); return; }
      var level = parentId ? 2 : 1;
      var prefix = parentId ? parentId+'-' : 'C';
      var c = {id:genId(prefix),name:name,parentId:parentId,level:level};
      DB.criteria.push(c);
      if (level===2 && DB.matrices[parentId]) {
        var mat = DB.matrices[parentId];
        var n = mat.criteriaIds.length + 1;
        var newMat = [];
        for (var i=0;i<n;i++){newMat[i]=[];for(var j=0;j<n;j++){
          if(i<n-1&&j<n-1)newMat[i][j]=mat.matrix[i][j];
          else if(i===j)newMat[i][j]=1;
          else newMat[i][j]=1;
        }}
        mat.criteriaIds.push(c.id);
        mat.matrix = newMat;
      }
      addAudit('新增准则',name,'',c.id);
      saveDB(); renderAll();
    });
}

function editCriterion(id) {
  var c = DB.criteria.find(function(x){return x.id===id;});
  if (!c) return;
  showDialog('编辑准则','<div>名称: <input id="d-name" value="'+esc(c.name)+'" style="width:200px"></div>',
    function(){
      var oldName = c.name;
      c.name = document.getElementById('d-name').value.trim();
      if (oldName!==c.name) addAudit('编辑准则','名称变更',oldName,c.name);
      saveDB(); renderAll();
    });
}

function deleteCriterion(id) {
  var c = DB.criteria.find(function(x){return x.id===id;});
  if (!c) return;
  if (!confirm('确认删除准则「'+c.name+'」？')) return;
  getSubCriteria(id).forEach(function(sc){ DB.criteria=DB.criteria.filter(function(x){return x.id!==sc.id;}); });
  DB.criteria = DB.criteria.filter(function(x){return x.id!==id;});
  delete DB.matrices[id];
  addAudit('删除准则',c.name,c.id,'');
  saveDB(); renderAll();
}

function renderMatrix() {
  var el = document.getElementById('tab-matrix');
  var topCrit = getTopCriteria();
  var topMatrix = DB.matrices['top'];
  var html = '<div class="card"><h2>一级准则判断矩阵（目标层）</h2>' +
    '<p style="font-size:12px;color:var(--dim);margin-bottom:8px">输入准则两两比较的重要性标度（1-9标度），对角线固定为1，下三角自动取倒数</p>' +
    '<div class="formula-box">Saaty 1-9标度法:\n1 = 同等重要 | 3 = 稍微重要 | 5 = 明显重要 | 7 = 强烈重要 | 9 = 极端重要\n2,4,6,8 = 中间值\n判断矩阵性质: aij = 1/aji（互反性），aii = 1\n权重计算: 几何平均法 — wi = (∏j aij)^(1/n) / Σ(∏j akj)^(1/n)</div>';

  if (topMatrix && topCrit.length >= 2) {
    var n = topCrit.length;
    var tempResult = ahpCalculate(topMatrix.matrix);
    html += '<table><thead><tr><th></th>';
    topCrit.forEach(function(c){ html += '<th>'+esc(c.name)+'</th>'; });
    html += '<th>几何均值</th><th>权重</th></tr></thead><tbody>';
    for (var i=0; i<n; i++) {
      var product = 1;
      for (var j=0; j<n; j++) product *= topMatrix.matrix[i][j];
      var geoMean = Math.pow(product, 1/n);
      html += '<tr><th>'+esc(topCrit[i].name)+'</th>';
      for (var j=0; j<n; j++) {
        if (i===j) html += '<td style="background:#f0f2f5">1</td>';
        else if (i<j) html += '<td class="matrix-edit-cell"><input type="number" min="0.111" max="9" step="any" value="'+topMatrix.matrix[i][j].toFixed(4)+'" onchange="updateMatrix(\'top\','+i+','+j+',this.value)"></td>';
        else html += '<td style="background:#fafafa;font-size:12px;color:var(--dim)">'+topMatrix.matrix[i][j].toFixed(4)+'</td>';
      }
      html += '<td>'+geoMean.toFixed(4)+'</td><td><strong>'+(tempResult.weights[i]*100).toFixed(1)+'%</strong></td></tr>';
    }
    html += '</tbody></table>';
  }
  html += '</div>';

  topCrit.forEach(function(tc){
    var subs = getSubCriteria(tc.id);
    var subMat = DB.matrices[tc.id];
    if (!subMat || subs.length < 2) return;
    var n = subs.length;
    var subResult = ahpCalculate(subMat.matrix);
    html += '<div class="card"><h2>二级判断矩阵 — '+esc(tc.name)+'</h2><table><thead><tr><th></th>';
    subs.forEach(function(s){ html += '<th>'+esc(s.name)+'</th>'; });
    html += '<th>权重</th></tr></thead><tbody>';
    for (var i=0; i<n; i++) {
      html += '<tr><th>'+esc(subs[i].name)+'</th>';
      for (var j=0; j<n; j++) {
        if (i===j) html += '<td style="background:#f0f2f5">1</td>';
        else if (i<j) html += '<td class="matrix-edit-cell"><input type="number" min="0.111" max="9" step="any" value="'+subMat.matrix[i][j].toFixed(4)+'" onchange="updateMatrix(\''+tc.id+'\','+i+','+j+',this.value)"></td>';
        else html += '<td style="background:#fafafa;font-size:12px;color:var(--dim)">'+subMat.matrix[i][j].toFixed(4)+'</td>';
      }
      html += '<td><strong>'+(subResult.weights[i]*100).toFixed(1)+'%</strong></td></tr>';
    }
    html += '</tbody></table></div>';
  });

  el.innerHTML = html;
}

function updateMatrix(matrixKey, i, j, val) {
  var v = parseFloat(val);
  if (isNaN(v) || v < 0.111 || v > 9) { alert('请输入1/9~9之间的数值'); renderMatrix(); return; }
  var mat = DB.matrices[matrixKey];
  if (!mat) return;
  var oldVal = mat.matrix[i][j];
  mat.matrix[i][j] = v;
  mat.matrix[j][i] = 1/v;
  var cName = matrixKey==='top' ? '目标层' : ((DB.criteria.find(function(c){return c.id===matrixKey;})||{}).name||matrixKey);
  addAudit('修改判断矩阵', cName+' ['+i+','+j+']', oldVal.toFixed(4), v.toFixed(4));
  if (!DB.matrixEdits[matrixKey]) DB.matrixEdits[matrixKey] = [];
  DB.matrixEdits[matrixKey].push({i:i,j:j,oldVal:oldVal,newVal:v,ts:new Date().toLocaleString('zh-CN')});
  computeAllWeights();
  saveDB();
  renderMatrix();
}

function renderWeightCheck() {
  var el = document.getElementById('tab-weight-check');
  var hasInconsistency = false;
  var topResult = ahpCalculate(DB.matrices['top'].matrix);
  var topCrit = getTopCriteria();
  if (!topResult.consistent) hasInconsistency = true;

  var html = '<div class="card"><h2>权重校验与一致性检验</h2>' +
    '<div class="formula-box">一致性指标 CI = (λmax - n) / (n - 1)\n随机一致性指标 RI（查表）:\n  n=3: RI=0.58 | n=4: RI=0.90 | n=5: RI=1.12 | n=6: RI=1.24\n一致性比率 CR = CI / RI\n判定标准: CR &lt; 0.1 → 一致性可接受; CR ≥ 0.1 → 需调整判断矩阵</div>';

  html += '<h3>一级准则一致性检验</h3>' +
    '<div class="summary-block '+(topResult.consistent?'consistent':'inconsistent')+'">' +
    '<strong>λmax</strong> = '+topResult.lambdaMax.toFixed(4)+' &nbsp;|&nbsp; ' +
    '<strong>CI</strong> = '+topResult.CI.toFixed(4)+' &nbsp;|&nbsp; ' +
    '<strong>RI</strong> = '+(RI_TABLE[topCrit.length]||0)+' &nbsp;|&nbsp; ' +
    '<strong>CR</strong> = <span class="cr-display '+(topResult.consistent?'cr-ok':'cr-fail')+'">'+topResult.CR.toFixed(4)+'</span>' +
    ' &nbsp; '+(topResult.consistent?'<span class="badge badge-ok">通过</span>':'<span class="badge badge-danger">不通过 — 需调整判断矩阵</span>') +
    '</div>' +
    '<table><thead><tr><th>准则</th><th>权重</th><th>权重柱状图</th></tr></thead><tbody>';
  topCrit.forEach(function(c,i){
    html += '<tr><td><strong>'+esc(c.name)+'</strong></td><td>'+(topResult.weights[i]*100).toFixed(1)+'%</td><td><div class="weight-bar" style="width:'+(topResult.weights[i]*300)+'px;background:var(--accent)"></div></td></tr>';
  });
  html += '</tbody></table>';

  topCrit.forEach(function(tc){
    var subMat = DB.matrices[tc.id];
    if (!subMat) return;
    var subs = getSubCriteria(tc.id);
    var subResult = ahpCalculate(subMat.matrix);
    if (!subResult.consistent) hasInconsistency = true;
    html += '<h3>二级准则一致性检验 — '+esc(tc.name)+'</h3>' +
      '<div class="summary-block '+(subResult.consistent?'consistent':'inconsistent')+'">' +
      '<strong>λmax</strong> = '+subResult.lambdaMax.toFixed(4)+' &nbsp;|&nbsp; ' +
      '<strong>CI</strong> = '+subResult.CI.toFixed(4)+' &nbsp;|&nbsp; ' +
      '<strong>RI</strong> = '+(RI_TABLE[subs.length]||0)+' &nbsp;|&nbsp; ' +
      '<strong>CR</strong> = <span class="cr-display '+(subResult.consistent?'cr-ok':'cr-fail')+'">'+subResult.CR.toFixed(4)+'</span>' +
      ' &nbsp; '+(subResult.consistent?'<span class="badge badge-ok">通过</span>':'<span class="badge badge-danger">不通过 — 需调整判断矩阵</span>') +
      '</div>' +
      '<table><thead><tr><th>子准则</th><th>局部权重</th><th>权重柱状图</th></tr></thead><tbody>';
    subs.forEach(function(sc,i){
      html += '<tr><td>'+esc(sc.name)+'</td><td>'+(subResult.weights[i]*100).toFixed(1)+'%</td><td><div class="weight-bar" style="width:'+(subResult.weights[i]*300)+'px;background:var(--ok)"></div></td></tr>';
    });
    html += '</tbody></table>';
  });

  var gw = getGlobalWeights();
  html += '<h3>全局权重汇总</h3>' +
    '<table><thead><tr><th>一级准则</th><th>一级权重</th><th>二级准则</th><th>二级权重</th><th>全局权重</th><th>全局权重柱状图</th></tr></thead><tbody>';
  gw.forEach(function(g){
    html += '<tr><td>'+esc(g.parentName||'—')+'</td><td>'+(g.parentWeight*100).toFixed(1)+'%</td><td>'+esc(g.name)+'</td><td>'+(g.subWeight*100).toFixed(1)+'%</td><td><strong>'+(g.globalWeight*100).toFixed(2)+'%</strong></td><td><div class="weight-bar" style="width:'+(g.globalWeight*500)+'px;background:var(--warn)"></div></td></tr>';
  });
  html += '</tbody></table></div>';

  if (hasInconsistency) {
    html += '<div class="card" style="border-left:4px solid var(--danger)"><h2 style="color:var(--danger)">⚠ 权重一致性警告</h2>' +
      '<p style="font-size:13px">存在判断矩阵一致性检验未通过（CR ≥ 0.1），请返回「判断矩阵」标签页调整比较值后再进行评分。权重不一致将影响评分结果的可靠性。</p></div>';
  }

  html += '<div class="card"><h3>判断矩阵修改记录</h3><div class="audit-log">';
  var editEntries = '';
  Object.keys(DB.matrixEdits).forEach(function(k){
    var name = k==='top'?'目标层':((DB.criteria.find(function(c){return c.id===k;})||{}).name||k);
    DB.matrixEdits[k].forEach(function(e){
      editEntries += '<div class="entry"><span class="ts">'+e.ts+'</span><span class="act">'+esc(name)+'</span><span class="detail">['+e.i+','+e.j+'] '+e.oldVal.toFixed(4)+' → '+e.newVal.toFixed(4)+'</span></div>';
    });
  });
  html += editEntries || '<div style="padding:12px;color:var(--dim)">暂无修改记录</div>';
  html += '</div></div>';

  el.innerHTML = html;
}

function renderScoring() {
  var el = document.getElementById('tab-scoring');
  var gw = getGlobalWeights();
  var scores = getSupplierFinalScores();
  var sorted = scores.slice().sort(function(a,b){return b.totalScore-a.totalScore;});
  var hasMissing = scores.some(function(s){return s.missingCriteria.length>0;});

  var html = '<div class="card"><h2>供应商评分</h2>' +
    '<div class="toolbar"><button class="btn btn-primary btn-sm" onclick="computeAllWeights();renderScoring()">重新计算权重</button>' +
    '<button class="btn btn-outline btn-sm" onclick="initDefaultScores();renderScoring()">初始化示例评分</button></div>' +
    '<div class="formula-box">综合评分 = Σ (全局权重i × 准则i评分)\n评分范围: 0-100 分\n全局权重 = 一级权重 × 二级权重（已在权重校验中计算）\n缺项评分按 0 分计入综合评分</div>';

  if (hasMissing) {
    html += '<div class="summary-block inconsistent"><strong>⚠ 存在缺项评分</strong> — 以下供应商有未填写的评分项，将按0分计入综合评分：';
    scores.filter(function(s){return s.missingCriteria.length>0;}).forEach(function(s){
      html += '<br>· '+esc(s.supplier.name)+': '+s.missingCriteria.map(function(m){
        var inspLink = currentTab==='inspections'?'':' onclick="currentTab=\'inspections\';renderAll()"';
        return '<span class="trace-link"'+inspLink+'>['+esc(m.name)+']</span>';
      }).join(', ');
    });
    html += '</div>';
  }

  html += '<table><thead><tr><th>排名</th><th>供应商</th>';
  gw.forEach(function(g){ html += '<th>'+esc(g.name)+'<br><span style="font-size:10px;color:var(--dim)">'+(g.globalWeight*100).toFixed(1)+'%</span></th>'; });
  html += '<th>综合评分</th></tr></thead><tbody>';

  sorted.forEach(function(s,idx){
    var rc = idx===0?'rank-1':(idx===1?'rank-2':(idx===2?'rank-3':''));
    html += '<tr><td class="'+rc+'">'+(idx+1)+'</td><td><strong>'+esc(s.supplier.name)+'</strong></td>';
    gw.forEach(function(g){
      var val = s.globalScores[g.id];
      if (val===null) html += '<td class="score-missing"><span class="missing-mark">缺项</span></td>';
      else html += '<td><input type="number" min="0" max="100" value="'+val+'" style="width:60px" onchange="updateScore(\''+s.supplier.id+'\',\''+g.id+'\',this.value)"></td>';
    });
    html += '<td><strong style="font-size:15px">'+s.totalScore.toFixed(2)+'</strong></td></tr>';
  });
  html += '</tbody></table></div>';

  html += '<div class="card"><h3>评分来源与质检关联</h3>' +
    '<table><thead><tr><th>供应商</th><th>准则</th><th>评分</th><th>来源</th><th>关联质检</th><th>最后修改</th></tr></thead><tbody>';
  DB.scores.forEach(function(sc){
    var sup = (DB.suppliers.find(function(x){return x.id===sc.supplierId;})||{}).name||sc.supplierId;
    var crit = (DB.criteria.find(function(x){return x.id===sc.criterionId;})||{}).name||sc.criterionId;
    var inspRefs = sc.inspectionRef ? sc.inspectionRef.split(',').map(function(qid){
      return '<span class="trace-link" onclick="currentTab=\'inspections\';renderAll()">'+qid+'</span>';
    }).join(', ') : '—';
    html += '<tr><td>'+esc(sup)+'</td><td>'+esc(crit)+'</td><td>'+sc.score+'</td><td>'+esc(sc.source)+'</td><td>'+inspRefs+'</td><td style="font-size:12px;color:var(--dim)">'+esc(sc.modifiedAt)+'</td></tr>';
  });
  html += '</tbody></table></div>';

  html += '<div class="card"><h3>评分排名图</h3><canvas id="rankChart" width="700" height="300"></canvas></div>';

  html += '<div class="card"><h3>评分修改记录</h3><div class="audit-log">';
  var scoreHistory = '';
  DB.scores.filter(function(s){return s.history&&s.history.length>1;}).forEach(function(s){
    var sup = (DB.suppliers.find(function(x){return x.id===s.supplierId;})||{}).name||s.supplierId;
    var crit = (DB.criteria.find(function(x){return x.id===s.criterionId;})||{}).name||s.criterionId;
    s.history.forEach(function(h){
      scoreHistory += '<div class="entry"><span class="ts">'+h.ts+'</span><span class="act">'+esc(sup)+'</span><span class="detail">'+esc(crit)+': '+h.score+'分 ('+esc(h.reason)+')</span></div>';
    });
  });
  html += scoreHistory || '<div style="padding:12px;color:var(--dim)">暂无修改记录</div>';
  html += '</div></div>';

  el.innerHTML = html;
  setTimeout(function(){ drawRankChart(sorted, gw); }, 50);
}

function drawRankChart(sorted, gw) {
  var canvas = document.getElementById('rankChart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  var colors = ['#2980b9','#27ae60','#e67e22','#8e44ad','#c0392b','#16a085'];
  var margin = {top:30,right:20,bottom:40,left:120};
  var chartW = W-margin.left-margin.right;
  var chartH = H-margin.top-margin.bottom;
  var barH = Math.min(30, chartH/sorted.length-8);

  sorted.forEach(function(s,i){
    var y = margin.top + i*(barH+10);
    var w = s.totalScore/100*chartW;
    ctx.fillStyle = colors[i%colors.length];
    ctx.fillRect(margin.left, y, w, barH);
    ctx.fillStyle = '#333';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(s.supplier.name, margin.left-8, y+barH/2+4);
    ctx.textAlign = 'left';
    ctx.fillText(s.totalScore.toFixed(2), margin.left+w+6, y+barH/2+4);
  });

  ctx.fillStyle = '#999';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  for (var v=0;v<=100;v+=20){
    var x = margin.left+v/100*chartW;
    ctx.fillText(v, x, H-10);
    ctx.strokeStyle = '#eee';
    ctx.beginPath(); ctx.moveTo(x,margin.top); ctx.lineTo(x,H-margin.bottom); ctx.stroke();
  }
}

function updateScore(supplierId, criterionId, val) {
  var v = parseFloat(val);
  if (isNaN(v)||v<0||v>100) { alert('评分范围0-100'); renderScoring(); return; }
  var existing = DB.scores.find(function(sc){return sc.supplierId===supplierId&&sc.criterionId===criterionId;});
  if (existing) {
    var oldScore = existing.score;
    existing.score = v;
    existing.modifiedAt = new Date().toLocaleString('zh-CN');
    existing.modifiedBy = '用户';
    existing.source = '手动修改';
    if (!existing.history) existing.history = [];
    existing.history.push({score:v,ts:new Date().toLocaleString('zh-CN'),by:'用户',reason:'手动修改'});
    var sup = (DB.suppliers.find(function(s){return s.id===supplierId;})||{}).name||supplierId;
    var crit = (DB.criteria.find(function(c){return c.id===criterionId;})||{}).name||criterionId;
    addAudit('修改评分',sup+'/'+crit,String(oldScore),String(v));
  }
  saveDB(); renderScoring();
}

function renderSensitivity() {
  var el = document.getElementById('tab-sensitivity');
  var gw = getGlobalWeights();
  var topCrit = getTopCriteria();
  var topWeights = (DB.matrices['top']&&DB.matrices['top'].weights) ? DB.matrices['top'].weights : topCrit.map(function(){return 1/topCrit.length;});
  var hasInconsistency = !(DB.matrices['top']&&DB.matrices['top'].consistent);

  var html = '<div class="card"><h2>敏感性分析</h2>';
  if (hasInconsistency) {
    html += '<div class="summary-block inconsistent"><strong>⚠ 权重一致性未通过</strong> — 当前判断矩阵CR未达标，敏感性分析结果可能不可靠，建议先调整判断矩阵。</div>';
  }
  html += '<div class="formula-box">敏感性分析方法: 逐一调整一级准则权重 ±Δ，观察供应商排名是否变化。\n若某准则权重微小变动即导致排名反转，则该准则是敏感因素，决策时需特别注意。\n当前一级权重: '+topCrit.map(function(c,i){return c.name+'='+(topWeights[i]*100).toFixed(1)+'%';}).join(', ')+'</div>' +
    '<div class="toolbar"><span style="font-size:13px">调整步长:</span><input type="number" id="sensDelta" value="0.05" min="0.01" max="0.2" step="0.01" style="width:60px">' +
    '<button class="btn btn-primary btn-sm" onclick="runSensitivity()">运行分析</button></div></div>' +
    '<div class="card"><h3>一级准则权重影响分析</h3><canvas id="sensChart" width="900" height="350"></canvas></div>' +
    '<div id="sensResult"></div>';

  el.innerHTML = html;
  setTimeout(function(){ runSensitivity(); }, 100);
}

function runSensitivity() {
  var deltaEl = document.getElementById('sensDelta');
  var delta = deltaEl ? parseFloat(deltaEl.value)||0.05 : 0.05;
  var gw = getGlobalWeights();
  var topCrit = getTopCriteria();
  var topWeights = (DB.matrices['top']&&DB.matrices['top'].weights) ? DB.matrices['top'].weights : topCrit.map(function(){return 1/topCrit.length;});

  var supScores = DB.suppliers.map(function(sup){
    var scoresArr = [];
    gw.forEach(function(g){
      var found = DB.scores.find(function(sc){return sc.supplierId===sup.id&&sc.criterionId===g.id;});
      scoresArr.push(found?found.score:0);
    });
    return {supplier:sup.name, scores:scoresArr};
  });

  var results = sensitivityAnalysis(topWeights, supScores, delta);
  var colors = ['#2980b9','#27ae60','#e67e22','#8e44ad','#c0392b','#16a085'];

  var canvas = document.getElementById('sensChart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  var numCharts = results.length;
  var chartWidth = W / numCharts;

  results.forEach(function(res, cIdx){
    var cMargin = {top:40, right:10, bottom:30, left:50};
    var offsetX = cIdx * chartWidth;
    var cW = chartWidth - cMargin.left - cMargin.right;
    var cH = H - cMargin.top - cMargin.bottom;
    var baseX = offsetX + cMargin.left;
    var baseY = cMargin.top;

    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('准则: '+topCrit[cIdx].name, offsetX+chartWidth/2, 18);

    var minX=-0.3, maxX=0.3, minY=60, maxY=100;
    for (var g=0;g<=4;g++){
      var y = baseY+cH-g/4*cH;
      ctx.strokeStyle='#eee';
      ctx.beginPath(); ctx.moveTo(baseX,y); ctx.lineTo(baseX+cW,y); ctx.stroke();
      ctx.fillStyle='#999'; ctx.font='10px sans-serif'; ctx.textAlign='right';
      ctx.fillText((minY+g/4*(maxY-minY)).toFixed(0), baseX-4, y+3);
    }

    supScores.forEach(function(sup,si){
      ctx.strokeStyle = colors[si%colors.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      var first = true;
      res.series.forEach(function(pt){
        var x = baseX+(pt.delta-minX)/(maxX-minX)*cW;
        var scoreObj = pt.scores.find(function(s2){return s2.supplier===sup.supplier;});
        var scoreVal = scoreObj ? scoreObj.score : minY;
        scoreVal = Math.max(minY, Math.min(maxY, scoreVal));
        var y = baseY+cH-(scoreVal-minY)/(maxY-minY)*cH;
        if (first){ctx.moveTo(x,y);first=false;}else ctx.lineTo(x,y);
      });
      ctx.stroke();
    });

    ctx.setLineDash([5,5]);
    var zeroX = baseX+(0-minX)/(maxX-minX)*cW;
    ctx.strokeStyle='#333'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(zeroX,baseY); ctx.lineTo(zeroX,baseY+cH); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle='#999'; ctx.font='10px sans-serif'; ctx.textAlign='center';
    for (var d=-0.3;d<=0.301;d+=0.1){
      var x = baseX+(d-minX)/(maxX-minX)*cW;
      ctx.fillText(d>=0?'+'+d.toFixed(1):d.toFixed(1), x, baseY+cH+15);
    }
  });

  var legendY = H-8;
  ctx.font = '11px sans-serif';
  var legendX = 30;
  supScores.forEach(function(sup,i){
    ctx.fillStyle = colors[i%colors.length];
    ctx.fillRect(legendX,legendY-8,12,12);
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText(sup.supplier, legendX+16, legendY+2);
    legendX += ctx.measureText(sup.supplier).width+30;
  });

  var resultHtml = '<div class="card"><h3>敏感性结论</h3><table><thead><tr><th>准则</th><th>原始权重</th><th>排名反转区间</th><th>敏感度</th></tr></thead><tbody>';
  results.forEach(function(res,cIdx){
    var rankChanged = false;
    var changeStart = null, changeEnd = null;
    var baseSeries = res.series.find(function(s){return Math.abs(s.delta)<0.001;});
    var baseOrder = baseSeries ? baseSeries.rankings.join(',') : null;
    res.series.forEach(function(pt){
      if (pt.rankings.join(',') !== baseOrder) {
        rankChanged = true;
        if (changeStart===null) changeStart = pt.delta;
        changeEnd = pt.delta;
      }
    });
    resultHtml += '<tr><td><strong>'+esc(topCrit[cIdx].name)+'</strong></td><td>'+(topWeights[cIdx]*100).toFixed(1)+'%</td>' +
      '<td>'+(rankChanged?'['+(changeStart||0).toFixed(2)+' , '+(changeEnd||0).toFixed(2)+']':'权重±30%内排名稳定')+'</td>' +
      '<td>'+(rankChanged?'<span class="badge badge-danger">高敏感</span>':'<span class="badge badge-ok">低敏感</span>')+'</td></tr>';
  });
  resultHtml += '</tbody></table></div>';
  document.getElementById('sensResult').innerHTML = resultHtml;
}

function renderReport() {
  var el = document.getElementById('tab-report');
  var gw = getGlobalWeights();
  var scores = getSupplierFinalScores();
  var sorted = scores.slice().sort(function(a,b){return b.totalScore-a.totalScore;});
  var topCrit = getTopCriteria();
  var topWeights = (DB.matrices['top']&&DB.matrices['top'].weights) ? DB.matrices['top'].weights : topCrit.map(function(){return 1/topCrit.length;});
  var topResult = ahpCalculate(DB.matrices['top'].matrix);

  var hasInconsistency = !topResult.consistent;
  topCrit.forEach(function(tc){
    if (DB.matrices[tc.id]) {
      var subResult = ahpCalculate(DB.matrices[tc.id].matrix);
      if (!subResult.consistent) hasInconsistency = true;
    }
  });
  var hasMissing = scores.some(function(s){return s.missingCriteria.length>0;});

  var html = '<div class="card"><h2>评分报告摘要</h2>' +
    '<div class="summary-block '+(hasInconsistency?'inconsistent':'consistent')+'">' +
    '<strong>报告生成时间:</strong> '+new Date().toLocaleString('zh-CN')+'<br>' +
    '<strong>权重一致性状态:</strong> '+(hasInconsistency?'<span class="badge badge-danger">存在不一致 (CR ≥ 0.1)</span>':'<span class="badge badge-ok">全部通过</span>')+'<br>' +
    '<strong>缺项状态:</strong> '+(hasMissing?'<span class="badge badge-warn">存在缺项评分</span>':'<span class="badge badge-ok">无缺项</span>')+'<br>' +
    (hasInconsistency?'<strong style="color:var(--danger)">⚠ 判断矩阵一致性未通过，评分结果可能不可靠，建议调整后重新评估。</strong>':'') +
    '</div>';

  html += '<h3>一级准则权重与一致性</h3>' +
    '<table><thead><tr><th>准则</th><th>权重</th><th>CR</th><th>一致性</th></tr></thead><tbody>' +
    '<tr><td colspan="4" style="background:#f0f2f5;font-weight:600">目标层 (n='+topCrit.length+')</td></tr>';
  topCrit.forEach(function(c,i){
    html += '<tr><td>'+esc(c.name)+'</td><td>'+(topWeights[i]*100).toFixed(1)+'%</td>' +
      (i===0?'<td rowspan="'+topCrit.length+'"><span class="cr-display '+(topResult.consistent?'cr-ok':'cr-fail')+'">'+topResult.CR.toFixed(4)+'</span></td>' +
      '<td rowspan="'+topCrit.length+'">'+(topResult.consistent?'<span class="badge badge-ok">通过</span>':'<span class="badge badge-danger">不通过</span>')+'</td>':'') +
      '</tr>';
  });
  html += '</tbody></table>';

  topCrit.forEach(function(tc){
    var subMat = DB.matrices[tc.id];
    if (!subMat) return;
    var subs = getSubCriteria(tc.id);
    var subResult = ahpCalculate(subMat.matrix);
    html += '<table><thead><tr><th colspan="4" style="background:#f0f2f5">'+esc(tc.name)+'子准则 (n='+subs.length+', CR='+subResult.CR.toFixed(4)+' '+(subResult.consistent?'<span class="badge badge-ok">通过</span>':'<span class="badge badge-danger">不通过</span>')+')</th></tr>' +
      '<tr><th>子准则</th><th>局部权重</th><th>全局权重</th><th>贡献度</th></tr></thead><tbody>';
    subs.forEach(function(sc,i){
      var gItem = gw.find(function(g){return g.id===sc.id;});
      html += '<tr><td>'+esc(sc.name)+'</td><td>'+(subResult.weights[i]*100).toFixed(1)+'%</td><td>'+(gItem?(gItem.globalWeight*100).toFixed(2):'—')+'%</td><td>'+(gItem?(gItem.globalWeight*100).toFixed(2):'—')+'%</td></tr>';
    });
    html += '</tbody></table>';
  });

  html += '<h3>供应商综合评分排名</h3>' +
    '<table><thead><tr><th>排名</th><th>供应商</th><th>类别</th>';
  gw.forEach(function(g){ html += '<th>'+esc(g.name)+'</th>'; });
  html += '<th>综合评分</th></tr></thead><tbody>';

  sorted.forEach(function(s,idx){
    var rc = idx===0?'rank-1':(idx===1?'rank-2':(idx===2?'rank-3':''));
    html += '<tr><td class="'+rc+'">'+(idx+1)+'</td><td><strong>'+esc(s.supplier.name)+'</strong></td><td>'+esc(s.supplier.category)+'</td>';
    gw.forEach(function(g){
      var val = s.globalScores[g.id];
      if (val===null) html += '<td class="score-missing"><span class="missing-mark">缺项</span></td>';
      else html += '<td>'+val+'</td>';
    });
    html += '<td><strong>'+s.totalScore.toFixed(2)+'</strong></td></tr>';
  });
  html += '</tbody></table></div>';

  html += '<div class="card"><h2>质检记录关联</h2>' +
    '<table><thead><tr><th>供应商</th><th>质检次数</th><th>平均合格率</th><th>最近检验</th><th>关联记录</th></tr></thead><tbody>';
  DB.suppliers.forEach(function(s){
    var relInsp = DB.inspections.filter(function(q){return q.supplierId===s.id;});
    var avgPass = relInsp.length>0 ? (relInsp.reduce(function(a,q){return a+q.passRate;},0)/relInsp.length).toFixed(1) : '—';
    var latest = relInsp.length>0 ? relInsp.sort(function(a,b){return b.date.localeCompare(a.date);})[0].date : '—';
    var refLinks = relInsp.map(function(q){return '<span class="trace-link" onclick="currentTab=\'inspections\';renderAll()">'+q.id+'</span>';}).join(', ')||'—';
    html += '<tr><td>'+esc(s.name)+'</td><td>'+relInsp.length+'</td><td>'+avgPass+(avgPass!=='—'?'%':'')+'</td><td>'+latest+'</td><td>'+refLinks+'</td></tr>';
  });
  html += '</tbody></table></div>';

  html += '<div class="card"><h2>修改审计日志</h2><div class="audit-log">';
  if (DB.auditLog.length > 0) {
    DB.auditLog.slice(0,50).forEach(function(a){
      html += '<div class="entry"><span class="ts">'+a.ts+'</span><span class="act">'+esc(a.action)+'</span><span class="detail">'+esc(a.detail)+(a.oldVal?' | 旧值: '+esc(a.oldVal):'')+(a.newVal?' | 新值: '+esc(a.newVal):'')+'</span></div>';
    });
  } else {
    html += '<div style="padding:12px;color:var(--dim)">暂无审计记录</div>';
  }
  html += '</div></div>';

  html += '<div class="toolbar" style="margin-top:12px">' +
    '<button class="btn btn-primary" onclick="exportReport()">导出报告 (HTML)</button>' +
    '<button class="btn btn-outline" onclick="window.print()">打印报告</button></div>';

  el.innerHTML = html;
}

function exportReport() {
  var reportEl = document.getElementById('tab-report');
  if (!reportEl) return;
  var htmlContent = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>AHP供应商评分报告 '+new Date().toLocaleDateString('zh-CN')+'</title>' +
    '<style>body{font-family:sans-serif;padding:20px;color:#333;line-height:1.6}table{width:100%;border-collapse:collapse;font-size:13px;margin:10px 0}th,td{border:1px solid #ddd;padding:8px;text-align:center}th{background:#f5f5f5}h2{color:#2c3e50;border-bottom:1px solid #ddd;padding-bottom:6px}h3{color:#2980b9}.badge-ok{background:#d5f5e3;color:#27ae60;padding:2px 8px;border-radius:10px;font-size:11px}.badge-danger{background:#fadbd8;color:#c0392b;padding:2px 8px;border-radius:10px;font-size:11px}.badge-warn{background:#fdebd0;color:#e67e22;padding:2px 8px;border-radius:10px;font-size:11px}.summary-block{border-left:4px solid #2980b9;padding:12px 16px;margin:10px 0;background:#f8f9fa}.summary-block.inconsistent{border-left-color:#c0392b;background:#fef5f5}.cr-ok{background:#d5f5e3;color:#27ae60;padding:4px 8px;font-weight:700}.cr-fail{background:#fadbd8;color:#c0392b;padding:4px 8px;font-weight:700}.weight-bar{height:18px;border-radius:3px}.audit-log .entry{padding:4px 10px;border-bottom:1px solid #eee;display:flex;gap:10px;font-size:12px}.ts{color:#7f8c8d;min-width:140px}.act{font-weight:600;min-width:80px}.missing-mark{color:#c0392b;font-weight:700}</style>' +
    '</head><body>' + reportEl.innerHTML + '</body></html>';

  var blob = new Blob([htmlContent], {type:'text/html;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'AHP供应商评分报告_' + new Date().toISOString().slice(0,10) + '.html';
  a.click();
  URL.revokeObjectURL(url);
}

renderAll();

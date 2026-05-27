let investors = [], products = [], currentReportId = null;

function $(id) { return document.getElementById(id); }

function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $('page-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  event.target.classList.add('active');
  if (name === 'dashboard') loadDashboard();
  if (name === 'investors') loadInvestors();
  if (name === 'products') loadProducts();
  if (name === 'assessments') loadAssessments();
  if (name === 'docs') loadDocs();
  if (name === 'cooling') loadCooling();
  if (name === 'check') loadCheckSelects();
  if (name === 'reports') loadReports();
}

function showModal(id) {
  if (['assessmentModal','docModal','coolingModal','genReportModal'].includes(id)) populateSelects();
  $(id).classList.add('active');
}
function hideModal(id) { $(id).classList.remove('active'); }

function updateTime() {
  $('currentTime').textContent = new Date().toLocaleString('zh-CN');
}
setInterval(updateTime, 1000);
updateTime();

function populateSelects() {
  const invSels = ['assessInvestor','docInvestor','cpInvestor','grInvestor'];
  invSels.forEach(sid => {
    const sel = $(sid); if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">请选择</option>' + investors.map(i => `<option value="${i.id}">${i.name} (${i.investor_type})</option>`).join('');
    sel.value = cur;
  });
  const prdSels = ['cpProduct','grProduct'];
  prdSels.forEach(sid => {
    const sel = $(sid); if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">请选择</option>' + products.map(p => `<option value="${p.id}">${p.product_name} (${p.product_code})</option>`).join('');
    sel.value = cur;
  });
}

function getRiskBadge(level) {
  const colors = {1:'badge-blue',2:'badge-green',3:'badge-yellow',4:'badge-purple',5:'badge-red'};
  const labels = {1:'C1-保守型',2:'C2-稳健型',3:'C3-平衡型',4:'C4-进取型',5:'C5-专业型'};
  return `<span class="badge ${colors[level]||'badge-gray'}">${labels[level]||'未知'}</span>`;
}
function getProductRiskBadge(level) {
  const colors = {1:'badge-blue',2:'badge-green',3:'badge-yellow',4:'badge-purple',5:'badge-red'};
  const labels = {1:'R1-低风险',2:'R2-中低风险',3:'R3-中风险',4:'R4-中高风险',5:'R5-高风险'};
  return `<span class="badge ${colors[level]||'badge-gray'}">${labels[level]||'未知'}</span>`;
}
function getResultBadge(status) {
  const map = {'通过':'badge-green','不通过':'badge-red','待人工确认':'badge-purple','待处理':'badge-yellow','已修正':'badge-blue'};
  return `<span class="badge ${map[status]||'badge-gray'}">${status}</span>`;
}

function loadDashboard() {
  fetch('/api/dashboard').then(r=>r.json()).then(d=>{
    const s = d.stats;
    $('statGrid').innerHTML = `
      <div class="stat-card"><div class="stat-num">${s.total_investors}</div><div class="stat-label">投资者总数</div></div>
      <div class="stat-card"><div class="stat-num">${s.total_products}</div><div class="stat-label">产品总数</div></div>
      <div class="stat-card"><div class="stat-num">${s.total_reports}</div><div class="stat-label">报告总数</div></div>
      <div class="stat-card pending"><div class="stat-num">${s.pending}</div><div class="stat-label">待处理</div></div>
      <div class="stat-card passed"><div class="stat-num">${s.passed}</div><div class="stat-label">已通过</div></div>
      <div class="stat-card manual"><div class="stat-num">${s.manual}</div><div class="stat-label">待人工确认</div></div>
      <div class="stat-card"><div class="stat-num">${s.corrected}</div><div class="stat-label">已修正</div></div>
      <div class="stat-card failed"><div class="stat-num">${s.failed}</div><div class="stat-label">不通过</div></div>
    `;
    const el = d.expiring_assessments;
    $('expiringList').innerHTML = el.length === 0 ? '<div class="empty-state">暂无即将过期的测评</div>' :
      '<table><thead><tr><th>投资者</th><th>等级</th><th>有效期至</th><th>剩余</th></tr></thead><tbody>' +
      el.map(a => `<tr><td>${a.investor_name}</td><td>${getRiskBadge(a.risk_level)}</td><td>${a.expiry_date}</td><td><span class="badge badge-red">${a.days_left}天</span></td></tr>`).join('') + '</tbody></table>';
    const ud = d.unverified_docs;
    $('unverifiedDocs').innerHTML = ud.length === 0 ? '<div class="empty-state">所有材料已核实</div>' :
      '<table><thead><tr><th>投资者</th><th>类型</th><th>文件名</th><th>来源</th></tr></thead><tbody>' +
      ud.map(d2 => `<tr><td>${d2.investor_name}</td><td>${d2.doc_type}</td><td>${d2.doc_name||'-'}</td><td>${d2.source||'-'}</td></tr>`).join('') + '</tbody></table>';
    const ac = d.active_cooling;
    $('activeCooling').innerHTML = ac.length === 0 ? '<div class="empty-state">无进行中的冷静期</div>' :
      '<table><thead><tr><th>投资者</th><th>产品</th><th>结束</th><th>剩余</th></tr></thead><tbody>' +
      ac.map(c => `<tr><td>${c.investor_name}</td><td>${c.product_name}</td><td>${c.end_date}</td><td><span class="badge badge-purple">${c.days_remaining}天</span></td></tr>`).join('') + '</tbody></table>';
    const rr = d.recent_reports;
    $('recentReports').innerHTML = rr.length === 0 ? '<div class="empty-state">暂无报告</div>' :
      '<table><thead><tr><th>投资者</th><th>产品</th><th>结论</th><th>时间</th></tr></thead><tbody>' +
      rr.map(r => `<tr><td>${r.investor_name}</td><td>${r.product_name}</td><td>${getResultBadge(r.overall_result)}</td><td>${r.created_at}</td></tr>`).join('') + '</tbody></table>';
  });
}

function loadInvestors() {
  fetch('/api/investors').then(r=>r.json()).then(d=>{
    investors = d;
    if (d.length === 0) {
      $('investorTable').innerHTML = '<tr><td colspan="8" class="empty-state">暂无投资者，点击右上角新增</td></tr>';
      return;
    }
    $('investorTable').innerHTML = d.map(i => `
      <tr><td>${i.id}</td><td>${i.name}</td><td>${i.investor_type}</td><td>${i.id_type}</td>
      <td>${i.id_number}</td><td>${i.phone||'-'}</td><td>${i.created_at}</td>
      <td><button class="btn-link" onclick="viewInvestor(${i.id})">详情</button>
      <button class="btn-link" onclick="deleteInvestor(${i.id})">删除</button></td></tr>
    `).join('');
  });
}

function viewInvestor(id) {
  fetch(`/api/investors/${id}/detail`).then(r=>r.json()).then(d=>{
    $('investorDetailTitle').textContent = d.investor.name + ' - 档案详情';
    $('investorDetailCard').style.display = 'block';
    let html = `
      <div class="sub-section"><h4>基本信息</h4>
        <div class="detail-row"><span class="label">姓名/名称</span><span class="value">${d.investor.name}</span></div>
        <div class="detail-row"><span class="label">类型</span><span class="value">${d.investor.investor_type}</span></div>
        <div class="detail-row"><span class="label">证件类型</span><span class="value">${d.investor.id_type}</span></div>
        <div class="detail-row"><span class="label">证件号</span><span class="value">${d.investor.id_number}</span></div>
        <div class="detail-row"><span class="label">电话</span><span class="value">${d.investor.phone||'-'}</span></div>
        <div class="detail-row"><span class="label">地址</span><span class="value">${d.investor.contact||'-'}</span></div>
        <div class="detail-row"><span class="label">创建时间</span><span class="value">${d.investor.created_at}</span></div>
      </div>
      <div class="sub-section"><h4>风险测评记录</h4>
      ${d.assessments.length === 0 ? '<div class="empty-state">无测评记录</div>' :
        '<table><thead><tr><th>等级</th><th>分数</th><th>测评日期</th><th>有效期至</th><th>来源</th></tr></thead><tbody>' +
        d.assessments.map(a => `<tr><td>${getRiskBadge(a.risk_level)}</td><td>${a.risk_score}</td><td>${a.assessment_date}</td><td>${a.expiry_date}</td><td>${a.source}</td></tr>`).join('') + '</tbody></table>'}
      </div>
      <div class="sub-section"><h4>证明材料</h4>
      ${d.docs.length === 0 ? '<div class="empty-state">无材料</div>' :
        '<table><thead><tr><th>类型</th><th>名称</th><th>说明</th><th>来源</th><th>核实状态</th></tr></thead><tbody>' +
        d.docs.map(d2 => `<tr><td>${d2.doc_type}</td><td>${d2.doc_name||'-'}</td><td>${d2.doc_desc||'-'}</td><td>${d2.source||'-'}</td><td>${d2.verified ? '<span class="badge badge-green">已核实</span>' : '<span class="badge badge-yellow">未核实</span>'}</td></tr>`).join('') + '</tbody></table>'}
      </div>
    `;
    $('investorDetailBody').innerHTML = html;
    $('investorDetailCard').scrollIntoView({behavior:'smooth'});
  });
}

function saveInvestor() {
  const data = {
    name: $('invName').value.trim(), investor_type: $('invType').value,
    id_type: $('invIdType').value, id_number: $('invIdNum').value.trim(),
    phone: $('invPhone').value.trim(), contact: $('invContact').value.trim()
  };
  if (!data.name) { alert('请填写姓名'); return; }
  fetch('/api/investors', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(r=>r.json()).then(d=>{
      if (d.status === 'ok') {
        hideModal('investorModal');
        $('invName').value=''; $('invIdNum').value=''; $('invPhone').value=''; $('invContact').value='';
        loadInvestors();
      }
    });
}

function deleteInvestor(id) {
  if (!confirm('确认删除该投资者？相关测评、材料、报告也将被删除。')) return;
  fetch(`/api/investors/${id}`, {method:'DELETE'}).then(r=>r.json()).then(()=>loadInvestors());
}

function loadProducts() {
  fetch('/api/products').then(r=>r.json()).then(d=>{
    products = d;
    if (d.length === 0) {
      $('productTable').innerHTML = '<tr><td colspan="6" class="empty-state">暂无产品，点击右上角新增</td></tr>';
      return;
    }
    $('productTable').innerHTML = d.map(p => `
      <tr><td>${p.id}</td><td>${p.product_code}</td><td>${p.product_name}</td>
      <td>${getProductRiskBadge(p.risk_level)}</td><td>${p.status}</td>
      <td><button class="btn-link" onclick="deleteProduct(${p.id})">删除</button></td></tr>
    `).join('');
  });
}

function saveProduct() {
  const data = {
    product_code: $('prdCode').value.trim(), product_name: $('prdName').value.trim(),
    risk_level: parseInt($('prdRisk').value), status: $('prdStatus').value
  };
  if (!data.product_code || !data.product_name) { alert('请填写产品代码和名称'); return; }
  fetch('/api/products', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(r=>r.json()).then(d=>{
      if (d.status === 'ok') {
        hideModal('productModal');
        $('prdCode').value=''; $('prdName').value='';
        loadProducts();
      }
    });
}

function deleteProduct(id) {
  if (!confirm('确认删除该产品？')) return;
  fetch(`/api/products/${id}`, {method:'DELETE'}).then(r=>r.json()).then(()=>loadProducts());
}

function loadAssessments() {
  fetch('/api/investors').then(r=>r.json()).then(d=>{
    investors = d;
    const filter = $('assessInvestorFilter');
    const cur = filter.value;
    filter.innerHTML = '<option value="">全部</option>' + d.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
    filter.value = cur;
    populateSelects();
  });
  const fid = $('assessInvestorFilter').value;
  const now = new Date();
  let allRows = [], loaded = 0;
  const list = fid ? [{id:parseInt(fid)}] : investors;
  list.forEach(inv => {
    fetch(`/api/investors/${inv.id}/detail`).then(r=>r.json()).then(d=>{
      d.assessments.forEach(a => {
        const invObj = investors.find(i => i.id === inv.id);
        const exp = new Date(a.expiry_date);
        const expired = now > exp;
        const daysLeft = Math.ceil((exp - now) / (1000*60*60*24));
        allRows.push(`
          <tr><td>${a.id}</td><td>${invObj?.name||inv.id}</td>
          <td>${getRiskBadge(a.risk_level)}</td><td>${a.risk_score}</td>
          <td>${a.assessment_date}</td>
          <td>${a.expiry_date} ${expired?'<span class="badge badge-red">已过期</span>':(daysLeft<=90?`<span class="badge badge-yellow">剩${daysLeft}天</span>`:'')}</td>
          <td>${a.source}</td>
          <td>${expired?'<span class="badge badge-red">失效</span>':'<span class="badge badge-green">有效</span>'}</td>
          <td><button class="btn-link" onclick="deleteAssessment(${a.id})">删除</button></td></tr>
        `);
      });
      loaded++;
      if (loaded === list.length) {
        $('assessmentTable').innerHTML = allRows.length === 0 ? '<tr><td colspan="9" class="empty-state">暂无测评记录</td></tr>' : allRows.join('');
      }
    });
  });
}

function saveAssessment() {
  const investor_id = parseInt($('assessInvestor').value);
  if (!investor_id) { alert('请选择投资者'); return; }
  const data = {
    investor_id, risk_level: parseInt($('assessLevel').value),
    risk_score: parseInt($('assessScore').value) || 0,
    assessment_date: $('assessDate').value ? $('assessDate').value.replace('T',' ') + ':00' : new Date().toISOString().slice(0,19).replace('T',' '),
    expiry_date: $('assessExpiry').value ? $('assessExpiry').value.replace('T',' ') + ':00' : '',
    source: $('assessSource').value
  };
  fetch('/api/risk-assessments', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(r=>r.json()).then(d=>{ if (d.status === 'ok') { hideModal('assessmentModal'); loadAssessments(); }});
}

function deleteAssessment(id) {
  if (!confirm('确认删除该测评记录？')) return;
  fetch(`/api/risk-assessments/${id}`, {method:'DELETE'}).then(r=>r.json()).then(()=>loadAssessments());
}

function loadDocs() {
  fetch('/api/investors').then(r=>r.json()).then(d=>{
    investors = d;
    const filter = $('docInvestorFilter');
    const cur = filter.value;
    filter.innerHTML = '<option value="">全部</option>' + d.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
    filter.value = cur;
    populateSelects();
  });
  const fid = $('docInvestorFilter').value;
  const fver = $('docVerifiedFilter').value;
  let allRows = [], loaded = 0;
  const list = fid ? [{id:parseInt(fid)}] : investors;
  list.forEach(inv => {
    fetch(`/api/investors/${inv.id}/detail`).then(r=>r.json()).then(d=>{
      const invObj = investors.find(i => i.id === inv.id);
      d.docs.forEach(d2 => {
        if (fver !== '' && String(d2.verified) !== fver) return;
        allRows.push(`
          <tr><td>${d2.id}</td><td>${invObj?.name||inv.id}</td><td>${d2.doc_type}</td>
          <td>${d2.doc_name||'-'}</td><td>${d2.doc_desc||'-'}</td><td>${d2.source||'-'}</td>
          <td>${d2.verified ? '<span class="badge badge-green">已核实</span>' : '<span class="badge badge-yellow">未核实</span>'}</td>
          <td>${d2.verified_by||'-'}</td><td>${d2.verified_at||'-'}</td>
          <td>${!d2.verified ? `<button class="btn-link" onclick="verifyDoc(${d2.id})">核实</button>` : ''}
          <button class="btn-link" onclick="deleteDoc(${d2.id})">删除</button></td></tr>
        `);
      });
      loaded++;
      if (loaded === list.length) {
        $('docTable').innerHTML = allRows.length === 0 ? '<tr><td colspan="10" class="empty-state">暂无材料记录</td></tr>' : allRows.join('');
      }
    });
  });
}

function saveDoc() {
  const investor_id = parseInt($('docInvestor').value);
  if (!investor_id) { alert('请选择投资者'); return; }
  const data = {
    investor_id, doc_type: $('docType').value,
    doc_name: $('docName').value.trim(), doc_desc: $('docDesc').value.trim(), source: $('docSource').value
  };
  fetch('/api/supporting-docs', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(r=>r.json()).then(d=>{ if (d.status === 'ok') { hideModal('docModal'); $('docName').value=''; $('docDesc').value=''; loadDocs(); }});
}

function verifyDoc(id) {
  const by = prompt('请输入核实人姓名：', '系统管理员');
  if (!by) return;
  fetch(`/api/supporting-docs/${id}/verify`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({verified_by:by})})
    .then(r=>r.json()).then(()=>loadDocs());
}

function deleteDoc(id) {
  if (!confirm('确认删除该材料？')) return;
  fetch(`/api/supporting-docs/${id}`, {method:'DELETE'}).then(r=>r.json()).then(()=>loadDocs());
}

function loadCooling() {
  $('coolingTable').innerHTML = '<tr><td colspan="8" class="empty-state">加载中...</td></tr>';
  let allRows = [], total = investors.length * products.length, done = 0;
  if (total === 0) { $('coolingTable').innerHTML = '<tr><td colspan="8" class="empty-state">暂无投资者或产品数据</td></tr>'; return; }
  investors.forEach(inv => {
    products.forEach(prd => {
      fetch(`/api/investors/${inv.id}/products/${prd.id}/cooling-status`).then(r=>r.json()).then(d=>{
        d.history.forEach(cp => {
          const now = new Date();
          const end = new Date(cp.end_date);
          const daysLeft = Math.ceil((end - now) / (1000*60*60*24));
          allRows.push(`
            <tr><td>${cp.id}</td><td>${inv.name}</td><td>${prd.product_name}</td>
            <td>${cp.start_date}</td><td>${cp.end_date}</td>
            <td>${cp.status==='已完成'?'<span class="badge badge-green">已完成</span>':cp.status==='进行中'?'<span class="badge badge-purple">进行中</span>':'<span class="badge badge-gray">已取消</span>'}</td>
            <td>${cp.status==='进行中' ? '<span class="badge badge-yellow">'+daysLeft+'天</span>' : '-'}</td>
            <td>${cp.status==='进行中' ? `<button class="btn-link" onclick="completeCooling(${cp.id})">标记完成</button>` : ''}
            <button class="btn-link" onclick="deleteCooling(${cp.id})">删除</button></td></tr>
          `);
        });
        done++;
        if (done === total) {
          $('coolingTable').innerHTML = allRows.length === 0 ? '<tr><td colspan="8" class="empty-state">暂无冷静期记录</td></tr>' : allRows.join('');
        }
      });
    });
  });
}

function saveCooling() {
  const investor_id = parseInt($('cpInvestor').value);
  const product_id = parseInt($('cpProduct').value);
  if (!investor_id || !product_id) { alert('请选择投资者和产品'); return; }
  const data = {
    investor_id, product_id,
    start_date: $('cpStart').value ? $('cpStart').value.replace('T',' ') + ':00' : new Date().toISOString().slice(0,19).replace('T',' '),
    end_date: $('cpEnd').value ? $('cpEnd').value.replace('T',' ') + ':00' : '',
    status: $('cpStatus').value
  };
  fetch('/api/cooling-periods', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(r=>r.json()).then(d=>{ if (d.status === 'ok') { hideModal('coolingModal'); loadCooling(); }});
}

function completeCooling(id) {
  fetch(`/api/cooling-periods/${id}`, {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'已完成'})})
    .then(r=>r.json()).then(()=>loadCooling());
}

function deleteCooling(id) {
  if (!confirm('确认删除该冷静期记录？')) return;
  fetch(`/api/cooling-periods/${id}`, {method:'DELETE'}).then(r=>r.json()).then(()=>loadCooling());
}

function loadCheckSelects() {
  $('checkInvestor').innerHTML = '<option value="">请选择</option>' + investors.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
  $('checkProduct').innerHTML = '<option value="">请选择</option>' + products.map(p => `<option value="${p.id}">${p.product_name} (${p.product_code})</option>`).join('');
}

function runCheck() {
  const iid = parseInt($('checkInvestor').value);
  const pid = parseInt($('checkProduct').value);
  if (!iid || !pid) { alert('请选择投资者和产品'); return; }
  fetch('/api/suitability/check', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({investor_id:iid,product_id:pid})})
    .then(r=>r.json()).then(d=>{
      const a = d.assessment, doc = d.docs, cool = d.cooling, rm = d.risk_match;
      let html = `
        <div class="check-section">
          <div class="check-title">${a.valid?'<span class="check-ok">✓</span>':'<span class="check-fail">✗</span>'} 风险测评有效期</div>
          ${a.valid ? `<div>当前有效测评：${getRiskBadge(a.current.risk_level)}，分数 ${a.current.risk_score}，有效期至 ${a.current.expiry_date}，来源：${a.current.source}</div>` : `<div class="issue-item expired">${a.reason}</div>`}
        </div>
        <div class="check-section">
          <div class="check-title">${doc.complete?'<span class="check-ok">✓</span>':'<span class="check-fail">✗</span>'} 证明材料完整性（已核实 ${doc.verified_count} 份）</div>
          ${doc.complete ? '<div>所有必需材料已核实</div>' : `<div class="issue-item missing">缺失材料：${doc.missing.join('、')}</div>`}
        </div>
        <div class="check-section">
          <div class="check-title">${cool.cooling_ok?'<span class="check-ok">✓</span>':'<span class="check-fail">✗</span>'} 冷静期状态</div>
          ${cool.cooling_ok ? '<div>冷静期已完成</div>' : (cool.current_cooling ? `<div class="issue-item cooling">冷静期未满，到期时间：${cool.current_cooling.end_date}</div>` : '<div class="issue-item cooling">未设置冷静期或冷静期未完成</div>')}
        </div>
        <div class="check-section">
          <div class="check-title">${rm.match?'<span class="check-ok">✓</span>':'<span class="check-fail">✗</span>'} 风险等级匹配</div>
          ${rm.match ? `<div>${rm.detail}</div>` : `<div class="issue-item risk">${rm.detail}</div>`}
        </div>
        <div style="margin-top:16px;padding:14px;background:${d.all_ok?'#f6ffed':(d.need_manual?'#f9f0ff':'#fff1f0')};border-radius:6px;text-align:center;">
          <div style="font-size:18px;font-weight:600;color:${d.all_ok?'#52c41a':(d.need_manual?'#722ed1':'#f5222d')};">总体结论：${d.overall}</div>
          ${d.issues.length > 0 ? `<div style="margin-top:8px;font-size:13px;color:#666;">存在问题：${d.issues.length}项</div>` : ''}
          <div style="margin-top:10px;"><button class="btn btn-primary" onclick="quickGenReport(${iid},${pid})">生成适当性报告</button></div>
        </div>
      `;
      $('checkResult').innerHTML = html;
    });
}

function quickGenReport(iid, pid) {
  $('grInvestor').value = iid;
  $('grProduct').value = pid;
  showModal('genReportModal');
}

function genReport() {
  const investor_id = parseInt($('grInvestor').value);
  const product_id = parseInt($('grProduct').value);
  if (!investor_id || !product_id) { alert('请选择投资者和产品'); return; }
  const data = { investor_id, product_id, operator: $('grOperator').value || '系统管理员' };
  fetch('/api/suitability-reports', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(r=>r.json()).then(d=>{
      if (d.status === 'ok') {
        hideModal('genReportModal');
        alert('报告生成成功！编号：' + d.id + '，结论：' + d.overall);
        loadReports();
      }
    });
}

function loadReports() {
  const status = $('reportStatusFilter').value;
  let url = '/api/suitability-reports';
  if (status) url += '?status=' + encodeURIComponent(status);
  fetch(url).then(r=>r.json()).then(d=>{
    if (d.length === 0) {
      $('reportTable').innerHTML = '<tr><td colspan="11" class="empty-state">暂无报告，点击右上角生成</td></tr>';
      return;
    }
    $('reportTable').innerHTML = d.map(r => `
      <tr><td>${r.id}</td><td>${r.investor_name}</td><td>${r.product_name}</td>
      <td>${r.match_level}</td>
      <td>${r.risk_match?'<span class="badge badge-green">✓</span>':'<span class="badge badge-red">✗</span>'}</td>
      <td>${r.docs_complete?'<span class="badge badge-green">✓</span>':'<span class="badge badge-red">✗</span>'}</td>
      <td>${r.cooling_ok?'<span class="badge badge-green">✓</span>':'<span class="badge badge-red">✗</span>'}</td>
      <td>${getResultBadge(r.overall_result)}</td>
      <td>${r.created_by||'-'}</td><td>${r.created_at}</td>
      <td>
        <button class="btn-link" onclick="viewReport(${r.id})">详情</button>
        <button class="btn-link" onclick="exportReport(${r.id})">导出</button>
        <button class="btn-link" onclick="changeReportStatus(${r.id})">变更状态</button>
        <button class="btn-link" onclick="deleteReport(${r.id})">删除</button>
      </td></tr>
    `).join('');
  });
}

function viewReport(id) {
  fetch(`/api/suitability-reports/${id}`).then(r=>r.json()).then(d=>{
    const rep = d.report;
    $('reportDetailTitle').textContent = '报告详情 - SR-' + String(rep.id).padStart(6,'0');
    $('reportDetailCard').style.display = 'block';
    let issues = d.issues || [];
    let html = `
      <div class="sub-section"><h4>基本信息</h4>
        <div class="detail-row"><span class="label">投资者</span><span class="value">${rep.investor_name} (${rep.investor_type})</span></div>
        <div class="detail-row"><span class="label">产品</span><span class="value">${rep.product_name} (${rep.product_code})</span></div>
        <div class="detail-row"><span class="label">产品风险</span><span class="value">${getProductRiskBadge(rep.product_risk_level)} ${rep.product_risk_label||''}</span></div>
        <div class="detail-row"><span class="label">操作人</span><span class="value">${rep.created_by||'-'}</span></div>
        <div class="detail-row"><span class="label">创建时间</span><span class="value">${rep.created_at}</span></div>
        <div class="detail-row"><span class="label">最后更新</span><span class="value">${rep.updated_at}</span></div>
      </div>
      <div class="sub-section"><h4>匹配结果</h4>
        <div class="detail-row"><span class="label">匹配等级</span><span class="value">${rep.match_level}</span></div>
        <div class="detail-row"><span class="label">风险匹配</span><span class="value">${rep.risk_match?'<span class="badge badge-green">是</span>':'<span class="badge badge-red">否</span>'}</span></div>
        <div class="detail-row"><span class="label">材料完整</span><span class="value">${rep.docs_complete?'<span class="badge badge-green">是</span>':'<span class="badge badge-red">否</span>'}</span></div>
        <div class="detail-row"><span class="label">冷静期完成</span><span class="value">${rep.cooling_ok?'<span class="badge badge-green">是</span>':'<span class="badge badge-red">否</span>'}</span></div>
        <div class="detail-row"><span class="label">总体结论</span><span class="value">${getResultBadge(rep.overall_result)}</span></div>
      </div>
      <div class="sub-section"><h4>问题清单 (${issues.length}项)</h4>
      ${issues.length === 0 ? '<div style="color:#999;font-size:13px;padding:6px 0;">无问题</div>' :
        issues.map((iss,i) => {
          let cls = 'risk';
          if (iss.includes('过期')) cls = 'expired';
          else if (iss.includes('缺失') || iss.includes('材料缺')) cls = 'missing';
          else if (iss.includes('冷静期') || iss.includes('未满')) cls = 'cooling';
          return `<div class="issue-item ${cls}">${i+1}. ${iss}</div>`;
        }).join('')}
      </div>
      <div class="sub-section"><h4>复核历史 (${d.history.length}条)</h4>
      ${d.history.length === 0 ? '<div style="color:#999;font-size:13px;padding:6px 0;">无复核记录</div>' :
        d.history.map(h => `
          <div class="history-item">
            <span class="time">[${h.created_at}]</span><span class="action">${h.action}</span>
            ${h.action_desc ? `<div>${h.action_desc}</div>` : ''}
            ${h.operator ? `<div>操作人：${h.operator}</div>` : ''}
            ${h.old_value || h.new_value ? `<div class="change">${h.old_value} → ${h.new_value}</div>` : ''}
          </div>
        `).join('')}
      </div>
      <div class="sub-section"><h4>修正记录 (${d.corrections.length}条)</h4>
      ${d.corrections.length === 0 ? '<div style="color:#999;font-size:13px;padding:6px 0;">无修正记录</div>' :
        d.corrections.map(c => `
          <div class="correction-item">
            <span class="time">[${c.created_at}]</span><span class="field">字段：${c.field}</span>
            ${c.reason ? `<div class="reason">原因：${c.reason}</div>` : ''}
            ${c.corrected_by ? `<div>操作人：${c.corrected_by}</div>` : ''}
          </div>
        `).join('')}
      </div>
      <div class="sub-section"><h4>原始数据来源</h4>
        <div style="font-size:12px;color:#888;">投资者档案ID: ${rep.investor_id} | 产品ID: ${rep.product_id} | 测评ID: ${rep.assessment_id||'无'}</div>
      </div>
    `;
    $('reportDetailBody').innerHTML = html;
    $('reportDetailCard').scrollIntoView({behavior:'smooth'});
  });
}

function exportReport(id) {
  fetch(`/api/suitability-reports/${id}/export`).then(r=>r.json()).then(d=>{
    const blob = new Blob([d.content], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = d.filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  });
}

function changeReportStatus(id) {
  currentReportId = id;
  $('statusReason').value = '';
  showModal('statusModal');
}

function confirmStatusChange() {
  const data = {
    overall_result: $('newStatus').value,
    reason: $('statusReason').value.trim(),
    operator: $('statusOperator').value.trim()
  };
  fetch(`/api/suitability-reports/${currentReportId}/status`, {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(r=>r.json()).then(d=>{
      if (d.status === 'ok') {
        hideModal('statusModal');
        loadReports();
        if ($('reportDetailCard').style.display !== 'none') viewReport(currentReportId);
      }
    });
}

function deleteReport(id) {
  if (!confirm('确认删除该报告？相关复核和修正记录也将被删除。')) return;
  fetch(`/api/suitability-reports/${id}`, {method:'DELETE'}).then(r=>r.json()).then(()=>loadReports());
}

document.addEventListener('DOMContentLoaded', function() {
  fetch('/api/investors').then(r=>r.json()).then(d=>{ investors = d; populateSelects(); });
  fetch('/api/products').then(r=>r.json()).then(d=>{ products = d; populateSelects(); });
  loadDashboard();
});

(() => {
  const $ = (id) => document.getElementById(id);
  const toast = (msg) => {
    let t = $('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
  };

  let currentResult = null;
  let currentTab = 'successful';

  const loadSamples = async () => {
    const resp = await fetch('/api/samples');
    const data = await resp.json();
    const host = location.origin;
    const box = $('sampleList');
    box.innerHTML = '';
    (data.files || []).forEach(f => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = f.name;
      chip.title = '用这个样例文件';
      chip.onclick = () => {
        toast(`已选样例：${f.name}，点击"开始处理"`);
        chip.dataset.sampleUrl = `${host}/api/download/sample?name=${encodeURIComponent(f.name)}`;
        chip.dataset.sampleName = f.name;
        document.querySelectorAll('.chip').forEach(c => c.style.background = '');
        chip.style.background = '#c8d5f5';
      };
      box.appendChild(chip);
    });
  };

  const runProcess = async () => {
    const fileInput = $('fileInput');
    const selectedChip = document.querySelector('.chip[style*="background"]');
    let file, filename;

    if (fileInput.files && fileInput.files[0]) {
      file = fileInput.files[0];
      filename = file.name;
    } else if (selectedChip) {
      const url = selectedChip.dataset.sampleUrl;
      filename = selectedChip.dataset.sampleName;
      const resp = await fetch(url);
      const blob = await resp.blob();
      file = new File([blob], filename, { type: blob.type });
    } else {
      toast('请先选一个文件或样例');
      return;
    }

    const fd = new FormData();
    fd.append('file', file);

    $('runBtn').disabled = true;
    $('runBtn').textContent = '处理中...';
    toast(`正在处理 ${filename} ...`);

    try {
      const resp = await fetch('/api/process', { method: 'POST', body: fd });
      const data = await resp.json();
      if (!data.success) {
        toast(data.error || '处理失败');
        return;
      }
      currentResult = data;
      renderResult(data);
      toast('处理完成');
    } catch (e) {
      toast('网络错误：' + e.message);
    } finally {
      $('runBtn').disabled = false;
      $('runBtn').textContent = '开始处理';
    }
  };

  const renderResult = (data) => {
    $('resultCard').style.display = 'block';
    const s = data.summary || {};

    $('summary').innerHTML = `
      <div class="sum-item"><div class="num">${s.total || 0}</div><div class="lbl">总计</div></div>
      <div class="sum-item"><div class="num">${s.successful || 0}</div><div class="lbl">成功</div></div>
      <div class="sum-item warn"><div class="num">${s.bad_missing || 0}</div><div class="lbl">缺字段</div></div>
      <div class="sum-item warn"><div class="num">${s.bad_format || 0}</div><div class="lbl">格式问题</div></div>
      <div class="sum-item bad"><div class="num">${s.bad_business || 0}</div><div class="lbl">业务规则</div></div>
      <div class="sum-item bad"><div class="num">${s.duplicates || 0}</div><div class="lbl">重复样本</div></div>
    `;

    const files = data.files || {};
    const setupLink = (id, category, pathKey) => {
      const a = $(id);
      const p = files[pathKey] || '';
      if (p) {
        const name = p.split('/').pop() || p.split('\\').pop();
        a.href = `/api/download/${category}?name=${encodeURIComponent(name)}`;
        a.style.display = '';
      } else {
        a.style.display = 'none';
      }
    };
    setupLink('dlSuccess', 'success', 'success');
    setupLink('dlBad', 'bad', 'bad_records');
    setupLink('dlReport', 'report', 'report');

    $('cnt-success').textContent = s.successful || 0;
    $('cnt-missing').textContent = s.bad_missing || 0;
    $('cnt-format').textContent = s.bad_format || 0;
    $('cnt-business').textContent = s.bad_business || 0;
    $('cnt-dup').textContent = s.duplicates || 0;

    renderTab(currentTab);
  };

  const renderTab = (tab) => {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

    const details = currentResult.details || {};
    const list = details[tab] || [];
    const box = $('tabContent');

    if (!list.length) {
      box.innerHTML = '<p style="color:#888;">（本分类暂无非记录）</p>';
      return;
    }

    const headers = tab === 'successful'
      ? ['record_id', 'source', 'equation_type', 'input_params', 'solution', 'remark', 'status', 'last_manual_note']
      : ['record_id', 'source', 'equation_type', 'input_params', 'solution', 'bad_category', 'error_detail', 'error_fields', 'is_duplicate_of', 'last_manual_note'];

    const headerZh = {
      record_id: '记录ID', source: '来源', equation_type: '方程类型',
      input_params: '输入参数', solution: '给出解', remark: '备注',
      status: '状态', last_manual_note: '最后人工说明',
      bad_category: '坏数据分类', error_detail: '错误明细',
      error_fields: '涉及字段', is_duplicate_of: '重复自',
    };

    const head = '<tr>' + headers.map(h => `<th>${headerZh[h] || h}</th>`).join('') + '</tr>';
    const rows = list.map(r => {
      return '<tr>' + headers.map(h => {
        let v = r[h];
        if (v === undefined || v === null) v = '';
        if (Array.isArray(v)) v = v.join('; ');
        if (typeof v === 'object') v = JSON.stringify(v);
        return `<td>${String(v)}</td>`;
      }).join('') + '</tr>';
    }).join('');

    box.innerHTML = `<table>${head}${rows}</table>`;
  };

  document.querySelectorAll('.tab').forEach(btn => {
    btn.onclick = () => renderTab(btn.dataset.tab);
  });

  $('runBtn').onclick = runProcess;
  loadSamples();
})();

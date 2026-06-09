const statDefs = [
  ['Mn', '数均分子量'],
  ['Mw', '重均分子量'],
  ['Mz', 'Z均分子量'],
  ['Mp', '峰位分子量'],
  ['Mw/Mn', '多分散比'],
  ['PDI', '多分散指数'],
  ['Mz/Mw', 'Z/M比'],
  ['M10', '10%分位'],
  ['M50', '中位数'],
  ['M90', '90%分位'],
];

let currentBatch = null;
let chartDist = null;
let chartCum = null;

function fmt(v) {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'number') {
    if (Math.abs(v) >= 10000) return v.toFixed(0);
    if (Math.abs(v) >= 100) return v.toFixed(1);
    return v.toFixed(3);
  }
  return String(v);
}

async function api(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || '请求失败');
  }
  return r.json();
}

async function loadBatches() {
  const list = await api('/api/batches');
  const tbody = document.querySelector('#batch-table tbody');
  tbody.innerHTML = '';
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="color:#888;text-align:center;">暂无批次，可点击右上角"加载示例数据"体验完整流程。</td></tr>';
    return;
  }
  for (const b of list) {
    const tr = document.createElement('tr');
    const s = b.latest_stats || {};
    tr.innerHTML = `
      <td><a href="#" class="batch-link" data-bn="${b.batch_no}">${b.batch_no}</a></td>
      <td>${b.last_seen ? b.last_seen.slice(0, 19).replace('T', ' ') : ''}</td>
      <td>${b.run_count}</td>
      <td>${fmt(s.Mn)}</td>
      <td>${fmt(s.Mw)}</td>
      <td>${fmt(s.PDI)}</td>
      <td>${b.warning_count ? `<span class="sev-warn">${b.warning_count}警告</span>` : (b.anomaly_count ? `${b.anomaly_count}提示` : '无')}</td>
      <td>
        <button class="btn-secondary btn-view" data-bn="${b.batch_no}">查看详情</button>
        <button class="btn-secondary btn-export" data-bn="${b.batch_no}">导出</button>
      </td>`;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll('.btn-view, .batch-link').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      showBatchDetail(el.dataset.bn);
    });
  });
  tbody.querySelectorAll('.btn-export').forEach(el => {
    el.addEventListener('click', () => {
      window.location = `/api/batches/${el.dataset.bn}/export`;
    });
  });
}

async function loadAnomalies() {
  const list = await api('/api/anomalies');
  const tbody = document.querySelector('#anomaly-table tbody');
  tbody.innerHTML = '';
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="color:#888;text-align:center;">暂无异常记录</td></tr>';
    return;
  }
  for (const a of list) {
    const tr = document.createElement('tr');
    const sevCls = a.severity === 'warning' ? 'sev-warn' : 'sev-info';
    const sevTxt = a.severity === 'warning' ? '警告' : '提示';
    tr.innerHTML = `
      <td>${a.anomaly_id}</td>
      <td><a href="#" class="batch-link" data-bn="${a.batch_no}">${a.batch_no}</a></td>
      <td class="${sevCls}">${sevTxt}</td>
      <td>${a.title}</td>
      <td>${a.description}</td>
      <td>${a.suggestion}</td>
      <td>${a.safety_note}</td>
      <td>${a.timestamp ? a.timestamp.slice(0, 19).replace('T', ' ') : ''}</td>`;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll('.batch-link').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      showBatchDetail(el.dataset.bn);
    });
  });
}

async function showBatchDetail(bn) {
  currentBatch = bn;
  const data = await api(`/api/batches/${bn}`);
  document.getElementById('section-detail').classList.remove('hidden');
  document.getElementById('detail-batch-no').textContent = bn;
  document.getElementById('section-detail').scrollIntoView({ behavior: 'smooth' });

  const stats = (data.batch.latest_stats) || {};
  const statBody = document.querySelector('#stat-table tbody');
  statBody.innerHTML = statDefs.map(([k, cn]) =>
    `<tr><td>${k}</td><td>${cn}</td><td>${fmt(stats[k])}</td></tr>`).join('');

  const runsBody = document.querySelector('#run-table tbody');
  runsBody.innerHTML = (data.runs || []).map(r => {
    const s = r.stats || {};
    const dup = r.conflict_info && r.conflict_info.exists ? '是（已合并）' : '否';
    return `<tr><td>${r.run_id}</td><td>${r.timestamp ? r.timestamp.slice(0,19).replace('T',' ') : ''}</td>
      <td>${fmt(s.Mn)}</td><td>${fmt(s.Mw)}</td><td>${fmt(s.PDI)}</td><td>${dup}</td></tr>`;
  }).join('') || '<tr><td colspan="6">无</td></tr>';

  const dp = data.batch.latest_data_points || {};
  if (dp.log_mw && dp.weight) {
    if (chartDist) chartDist.destroy();
    chartDist = new Chart(document.getElementById('chart-dist'), {
      type: 'line',
      data: {
        labels: dp.log_mw.map((v, i) => i),
        datasets: [{
          label: 'dW/dlogM',
          data: dp.weight,
          borderColor: '#2b6cb0',
          backgroundColor: 'rgba(43,108,176,0.15)',
          fill: true,
          pointRadius: 0,
          tension: 0.25,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => {
                const i = items[0].dataIndex;
                return `log10(M)=${dp.log_mw[i].toFixed(2)}, M=${fmt(dp.mw[i])}`;
              },
            },
          },
        },
        scales: {
          x: { title: { display: true, text: 'log10(分子量 M)' }, ticks: { maxTicksLimit: 10 } },
          y: { title: { display: true, text: '归一化重量分数' } },
        },
      },
    });

    if (chartCum) chartCum.destroy();
    chartCum = new Chart(document.getElementById('chart-cum'), {
      type: 'line',
      data: {
        labels: dp.log_mw.map((v, i) => i),
        datasets: [{
          label: '累积重量分数',
          data: dp.cumulative,
          borderColor: '#38a169',
          backgroundColor: 'rgba(56,161,105,0.1)',
          fill: true,
          pointRadius: 0,
          tension: 0.2,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: 'log10(分子量 M)' } },
          y: { title: { display: true, text: '累积重量分数' }, min: 0, max: 1 },
        },
      },
    });
  }

  const anomBox = document.getElementById('anomaly-list');
  if (!data.anomalies.length) {
    anomBox.innerHTML = '<p class="hint">本批次未检测到异常。</p>';
  } else {
    anomBox.innerHTML = data.anomalies.map(a => {
      const cls = a.severity === 'warning' ? 'sev-warn' : 'sev-info';
      const tagCls = a.severity === 'warning' ? 'tag-warn' : 'tag-info';
      const tagTxt = a.severity === 'warning' ? '警告' : '提示';
      return `<div class="anomaly-item ${cls}">
        <h4><span class="tag ${tagCls}">${tagTxt}</span>${a.title}
          <span style="float:right;color:#888;font-size:12px;">异常号: ${a.anomaly_id} / 运行号: ${a.run_id}</span></h4>
        <p><strong>描述：</strong>${a.description}</p>
        <p><strong>处理意见：</strong>${a.suggestion}</p>
        <p><strong>安全备注：</strong>${a.safety_note}</p>
      </div>`;
    }).join('');
  }

  document.getElementById('btn-export-batch').onclick = () => {
    window.location = `/api/batches/${bn}/export`;
  };
  document.getElementById('btn-retest').onclick = async () => {
    const r = await api(`/api/retest_suggestion/${bn}`);
    const box = document.getElementById('retest-box');
    box.classList.remove('hidden');
    const list = document.getElementById('retest-list');
    list.innerHTML = r.suggestions.map(s => `
      <div class="anomaly-item sev-info">
        <h4>${s.scope}${s.anomaly_id ? ` <span style="float:right;color:#888;font-size:12px;">关联异常: ${s.anomaly_id}</span>` : ''}</h4>
        <p><strong>建议操作：</strong>${s.action}</p>
        ${s.safety_note ? `<p><strong>安全备注：</strong>${s.safety_note}</p>` : ''}
        <p style="color:#666;font-size:12px;">依据：${s.basis}</p>
      </div>`).join('');
  };
  document.getElementById('retest-box').classList.add('hidden');
}

document.getElementById('upload-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('upload-msg');
  msg.className = ''; msg.textContent = '处理中...';
  try {
    const fd = new FormData(e.target);
    if (!fd.get('file') || !fd.get('file').name) throw new Error('请先选择数据文件');
    const r = await api('/api/upload', { method: 'POST', body: fd });
    if (r.skipped) {
      msg.className = 'ok';
      msg.textContent = `批号 ${r.batch_no} 已存在，按策略跳过。历史运行 ${r.conflict_info.previous_runs} 次。`;
    } else {
      msg.className = 'ok';
      let txt = `已完成：批号 ${r.batch_no}，Mn=${fmt(r.stats.Mn)}，Mw=${fmt(r.stats.Mw)}，PDI=${fmt(r.stats.PDI)}，异常 ${r.anomalies.length} 条。`;
      if (r.conflict_info && r.conflict_info.exists) {
        txt += `（该批号为重复导入，策略：${r.conflict_info.strategy}，最大相对偏差 ${(r.conflict_info.max_relative_diff*100).toFixed(1)}%）`;
      }
      msg.textContent = txt;
      showLastRun(r);
      showBatchDetail(r.batch_no);
    }
    await loadBatches();
    await loadAnomalies();
  } catch (err) {
    msg.className = 'err';
    msg.textContent = '导入失败：' + err.message;
  }
});

function showLastRun(r) {
  const sec = document.getElementById('section-last-run');
  sec.classList.remove('hidden');
  const body = document.getElementById('last-run-body');
  const stats = r.stats || {};
  body.innerHTML = `
    <table class="data-table">
      <tr><th>批号</th><td>${r.batch_no}</td>
        <th>运行号</th><td>${r.run_id}</td>
        <th>数据点数</th><td>${r.row_count}</td></tr>
    </table>
    <table class="data-table" style="margin-top:8px;">
      <tr>${statDefs.map(([k, cn]) => `<th>${k}<br><span style="color:#888;font-weight:normal;">${cn}</span></th>`).join('')}</tr>
      <tr>${statDefs.map(([k]) => `<td>${fmt(stats[k])}</td>`).join('')}</tr>
    </table>
    ${r.conflict_info && r.conflict_info.exists ? `
      <p class="hint" style="margin-top:8px;"><strong>批号重复说明：</strong>
      该批号已导入过 ${r.conflict_info.previous_runs} 次，本次采用「${r.conflict_info.strategy}」策略。
      主要指标相对偏差：${Object.entries(r.conflict_info.differences).map(([k, d]) =>
        `${k}: ${(d.rel_diff*100).toFixed(1)}%`).join('；')}。
      界面、复测建议、导出报告共用本条处理记录，不会出现互相矛盾的结论。</p>` : ''}
  `;
}

document.getElementById('btn-export-all').addEventListener('click', () => {
  window.location = '/api/export_all';
});

document.getElementById('btn-load-samples').addEventListener('click', async () => {
  const msg = document.getElementById('upload-msg');
  msg.className = ''; msg.textContent = '正在生成示例数据...';
  try {
    await api('/api/upload_json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SAMPLES.normal),
    });
    await api('/api/upload_json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SAMPLES.wide),
    });
    await api('/api/upload_json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SAMPLES.duplicate),
    });
    await loadBatches();
    await loadAnomalies();
    msg.className = 'ok';
    msg.textContent = '已载入 3 个示例批次，其中 PS-SAMPLE-002 被导入了两次（模拟批号重复）。可在批次列表查看详情。';
  } catch (err) {
    msg.className = 'err';
    msg.textContent = err.message;
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  await loadBatches();
  await loadAnomalies();
});

const SAMPLES = {
  normal: {
    batch_no: 'PS-SAMPLE-001',
    note: '常规聚苯乙烯样品，分布适中，用作基准。',
    rows: (function () {
      const rows = [];
      const centers = [3.0, 3.5, 4.0, 4.5, 5.0, 5.5];
      const heights = [0.05, 0.2, 0.35, 0.25, 0.1, 0.05];
      for (let logm = 2.5; logm <= 6.0; logm += 0.05) {
        let w = 0;
        centers.forEach((c, i) => { w += heights[i] * Math.exp(-Math.pow((logm - c) / 0.25, 2)); });
        rows.push({ '分子量': Math.pow(10, logm), '重量分数': w });
      }
      return rows;
    })(),
  },
  wide: {
    batch_no: 'PS-SAMPLE-002',
    note: '宽分布样品，第一次导入（反应温度波动导致 PDI 偏高）。',
    rows: (function () {
      const rows = [];
      for (let logm = 2.0; logm <= 6.5; logm += 0.05) {
        const w1 = Math.exp(-Math.pow((logm - 3.3) / 0.6, 2));
        const w2 = 0.8 * Math.exp(-Math.pow((logm - 5.2) / 0.5, 2));
        rows.push({ '分子量': Math.pow(10, logm), '重量分数': w1 + w2 });
      }
      return rows;
    })(),
  },
  duplicate: {
    batch_no: 'PS-SAMPLE-002',
    note: '同一批号复测，第二次导入（数据略有差异以模拟复测）。',
    rows: (function () {
      const rows = [];
      for (let logm = 2.0; logm <= 6.5; logm += 0.05) {
        const w1 = Math.exp(-Math.pow((logm - 3.4) / 0.55, 2));
        const w2 = 0.75 * Math.exp(-Math.pow((logm - 5.1) / 0.55, 2));
        rows.push({ '分子量': Math.pow(10, logm), '重量分数': w1 + w2 });
      }
      return rows;
    })(),
  },
};

// ============================================================
// 时序图表模块
// ============================================================

const Timeline = (() => {
  let chart = null;
  let playTimer = null;

  function init() {
    buildChart();
    bindControls();
    updateRange();
  }

  function currentDataset() {
    return DATASETS[STATE.currentDatasetId];
  }

  function updateRange() {
    const ds = currentDataset();
    if (!ds || !ds.points.length) {
      document.getElementById('timelineRange').textContent = '--';
      return;
    }
    const start = ds.points[0].actualTime;
    const end = ds.points[ds.points.length - 1].actualTime;
    document.getElementById('timelineRange').textContent = `${fmtTime(start)} ~ ${fmtTime(end)}`;
    STATE.currentTime = start;
    updateTimeLabel();
  }

  function buildChart() {
    const ctx = document.getElementById('timelineChart').getContext('2d');
    const ds = currentDataset();

    const labels = ds.points.map(p => p.id);
    const delays = ds.points.map(p => p.delaySec);
    const colors = ds.points.map(p => {
      if (p.status === 'anomaly') return '#f43f5e';
      if (p.status === 'delay') return '#f59e0b';
      return '#10b981';
    });

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: '延迟 (s)',
            data: delays,
            backgroundColor: colors.map(c => c + '99'),
            borderColor: colors,
            borderWidth: 1.5,
            borderRadius: 3,
            yAxisID: 'y',
          },
          {
            type: 'line',
            label: '累计时间 (s)',
            data: ds.points.map((p, i) => p.actualTime - ds.points[0].actualTime),
            borderColor: '#22d3ee',
            backgroundColor: 'rgba(34, 211, 238, 0.1)',
            pointBackgroundColor: colors,
            pointBorderColor: '#0f172a',
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.25,
            fill: true,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12 },
          },
          tooltip: {
            backgroundColor: '#1e293b',
            borderColor: '#475569',
            borderWidth: 1,
            titleColor: '#e2e8f0',
            bodyColor: '#cbd5e1',
            callbacks: {
              title: items => {
                const i = items[0].dataIndex;
                const p = ds.points[i];
                return `${p.id} · ${p.label}`;
              },
              label: item => {
                const p = ds.points[item.dataIndex];
                if (item.dataset.type === 'bar') {
                  return `延迟: ${p.delaySec}s · ${p.status === 'anomaly' ? '异常' : p.status === 'delay' ? '延迟' : '正常'}`;
                }
                return `累计用时: ${item.parsed.y}s`;
              },
              afterLabel: items => {
                const p = ds.points[items.dataIndex];
                return [
                  `计划: ${fmtTime(p.plannedTime)}`,
                  `实际: ${fmtTime(p.actualTime)}`,
                  p.anomaly ? `异常: ${p.anomaly.type}` : '',
                ].filter(Boolean);
              },
            },
          },
        },
        onClick: (e, elements) => {
          if (!elements.length) return;
          const idx = elements[0].index;
          const p = ds.points[idx];
          STATE.selectedPointId = p.id;
          STATE.currentTime = p.actualTime;
          App.onPointSelected(p);
          update();
          document.getElementById('timelineSlider').value = progressPercent();
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8', font: { size: 10 } },
            grid: { color: 'rgba(71, 85, 105, 0.2)' },
          },
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: '延迟 (s)', color: '#94a3b8', font: { size: 10 } },
            ticks: { color: '#94a3b8', font: { size: 10 } },
            grid: { color: 'rgba(71, 85, 105, 0.2)' },
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: '累计时间 (s)', color: '#22d3ee', font: { size: 10 } },
            ticks: { color: '#22d3ee', font: { size: 10 } },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
  }

  function progressPercent() {
    const ds = currentDataset();
    if (!ds || !ds.points.length) return 0;
    const start = ds.points[0].actualTime;
    const end = ds.points[ds.points.length - 1].actualTime;
    if (end === start) return 0;
    return Math.max(0, Math.min(100, ((STATE.currentTime - start) / (end - start)) * 100));
  }

  function percentToTime(pct) {
    const ds = currentDataset();
    if (!ds || !ds.points.length) return 0;
    const start = ds.points[0].actualTime;
    const end = ds.points[ds.points.length - 1].actualTime;
    return start + (end - start) * (pct / 100);
  }

  function updateTimeLabel() {
    document.getElementById('currentTimeLabel').textContent = fmtTime(STATE.currentTime);
  }

  function bindControls() {
    const btn = document.getElementById('btnPlayPause');
    btn.onclick = () => {
      STATE.playing = !STATE.playing;
      updatePlayIcon();
      if (STATE.playing) startPlay();
      else stopPlay();
    };

    const slider = document.getElementById('timelineSlider');
    slider.addEventListener('input', () => {
      STATE.currentTime = percentToTime(Number(slider.value));
      updateTimeLabel();
      CAD.draw();
    });

    document.getElementById('speedSelect').onchange = e => {
      STATE.speed = Number(e.target.value);
      if (STATE.playing) { stopPlay(); startPlay(); }
    };

    document.getElementById('btnPrevAnomaly').onclick = () => jumpAnomaly(-1);
    document.getElementById('btnNextAnomaly').onclick = () => jumpAnomaly(1);
  }

  function updatePlayIcon() {
    document.getElementById('iconPlay').classList.toggle('hidden', STATE.playing);
    document.getElementById('iconPause').classList.toggle('hidden', !STATE.playing);
    const s = document.getElementById('playStatus');
    s.textContent = STATE.playing ? '播放中' : '已暂停';
    s.className = 'text-xs px-2 py-0.5 rounded ' + (STATE.playing ? 'bg-emerald-600/20 text-emerald-300' : 'bg-slate-700 text-slate-300');
  }

  function startPlay() {
    if (playTimer) clearInterval(playTimer);
    const ds = currentDataset();
    if (!ds) return;
    const end = ds.points[ds.points.length - 1].actualTime;
    playTimer = setInterval(() => {
      STATE.currentTime += STATE.speed * 5;
      if (STATE.currentTime >= end) {
        STATE.currentTime = end;
        STATE.playing = false;
        stopPlay();
        updatePlayIcon();
      }
      updateTimeLabel();
      document.getElementById('timelineSlider').value = progressPercent();
      CAD.draw();
    }, 100);
  }

  function stopPlay() {
    if (playTimer) { clearInterval(playTimer); playTimer = null; }
  }

  function jumpAnomaly(dir) {
    const ds = currentDataset();
    if (!ds) return;
    const anomalies = ds.points.filter(p => p.status === 'anomaly');
    if (!anomalies.length) return;
    if (!STATE.selectedPointId) {
      const target = dir > 0 ? anomalies[0] : anomalies[anomalies.length - 1];
      selectPoint(target);
      return;
    }
    const curr = ds.points.findIndex(p => p.id === STATE.selectedPointId);
    const candidates = anomalies
      .map(p => ({ p, i: ds.points.indexOf(p) }))
      .filter(x => dir > 0 ? x.i > curr : x.i < curr);
    const target = dir > 0 ? candidates[0] : candidates[candidates.length - 1];
    if (target) selectPoint(target.p);
  }

  function selectPoint(p) {
    STATE.selectedPointId = p.id;
    STATE.currentTime = p.actualTime;
    App.onPointSelected(p);
    update();
    document.getElementById('timelineSlider').value = progressPercent();
  }

  function update() {
    buildChart();
    updateTimeLabel();
    CAD.draw();
  }

  function reloadDataset() {
    stopPlay();
    STATE.playing = false;
    STATE.selectedPointId = null;
    updatePlayIcon();
    buildChart();
    updateRange();
    CAD.draw();
    Detail.clear();
  }

  function fmtTime(sec) {
    const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return { init, update, reloadDataset, selectPoint, fmtTime, progressPercent };
})();

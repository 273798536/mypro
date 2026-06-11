// ============================================================
// 医院物流机器人时序回放 - 主应用入口
// ============================================================

const App = (() => {
  function init() {
    syncDatasetSelectFromState();

    CAD.init();
    Timeline.init();
    Detail.init();
    Views.init();
    History.init();
    Export.init();
    updateDatasetInfo();

    document.getElementById('datasetSelect').onchange = e => {
      STATE.currentDatasetId = e.target.value;
      STATE.selectedPointId = null;
      Timeline.reloadDataset();
      Detail.clear();
      updateDatasetInfo();
    };

    setTimeout(() => {
      CAD.fitToContainer();
      const ds = DATASETS[STATE.currentDatasetId];
      const anomalies = ds.points.filter(p => p.status === 'anomaly');
      if (anomalies.length) {
        STATE.selectedPointId = anomalies[0].id;
        STATE.currentTime = anomalies[0].actualTime;
        onPointSelected(anomalies[0]);
        Timeline.update();
      }
    }, 50);
  }

  function syncDatasetSelectFromState() {
    const select = document.getElementById('datasetSelect');
    if (select && select.value !== STATE.currentDatasetId) {
      select.value = STATE.currentDatasetId;
    }
  }

  function updateDatasetInfo() {
    const ds = DATASETS[STATE.currentDatasetId];
    document.getElementById('infoCampus').textContent = ds.campus;
    document.getElementById('infoFloor').textContent = ds.floor;
    document.getElementById('infoRobot').textContent = ds.robot;
  }

  function onPointSelected(p) {
    Detail.renderPoint(p);
    const panel = document.getElementById('detailPanel');
    panel.scrollTop = 0;
  }

  return { init, onPointSelected, syncDatasetSelectFromState };
})();

window.addEventListener('DOMContentLoaded', App.init);

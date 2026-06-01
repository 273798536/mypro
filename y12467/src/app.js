var App = (function () {
  var instance = null;

  function init() {
    var maze = MazeModel.createMaze({ rows: 10, cols: 12, cellSize: 50 });
    var canvas = document.getElementById('maze-canvas');
    var renderer = MazeRenderer.createRenderer(canvas, maze);
    var currentTool = 'select';
    var currentReport = null;
    var currentReplay = null;

    var app = {
      maze: maze,
      renderer: renderer,
      getCurrentTool: function () { return currentTool; },
      setCurrentTool: function (t) { currentTool = t; },
      runCheck: runCheck,
      updateUI: updateUI,
      exportReport: exportReport,
      startReplay: startReplay,
      selectedCell: null
    };

    function runCheck() {
      var beamResult = OpticsPhysics.traceBeam(maze);
      maze.beamResult = beamResult;
      var conflicts = MazeModel.detectConflicts(maze, beamResult);
      var score = MazeModel.calculateScore(maze, beamResult);
      renderer.beamResult = beamResult;
      currentReport = ReportSystem.generateReport(maze, beamResult);
      document.getElementById('report-list').innerHTML = ReportSystem.renderReportToHTML(currentReport);
      document.getElementById('conflict-list').innerHTML = ReportSystem.renderConflictsToHTML(conflicts);
      MazeRenderer.render(renderer);
      updateScoreDisplay(score);
    }

    function updateScoreDisplay(score) {
      document.getElementById('score-total').textContent = score.total;
      document.getElementById('score-fill').style.width = score.total + '%';
      document.getElementById('score-reflect').textContent = score.reflectionAccuracy.toFixed(0) + '%';
      document.getElementById('score-focal').textContent = score.focalAccuracy.toFixed(0) + '%';
      document.getElementById('score-beam').textContent = score.beamCompliance.toFixed(0) + '%';
    }

    function updateUI() {
      updateScoreDisplay(maze.score);
      MazeRenderer.resizeCanvas(renderer);
      MazeRenderer.render(renderer);
    }

    function exportReport() {
      if (!currentReport) {
        runCheck();
      }
      var text = ReportSystem.exportReportAsText(currentReport);
      var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'optics-maze-report-' + Date.now() + '.txt';
      a.click();
      URL.revokeObjectURL(url);
    }

    function startReplay() {
      if (currentReplay) {
        ReplaySystem.stopAutoPlay(currentReplay);
      }
      currentReplay = ReplaySystem.createReplay(maze);
      var replayList = document.getElementById('replay-list');
      replayList.innerHTML = ReplaySystem.renderReplayListToHTML(currentReplay);
      document.getElementById('replay-progress').textContent = '0 / ' + (currentReplay.snapshots.length - 1);
      switchTab('replay');
    }

    function handleCanvasClick(e) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var px = (e.clientX - rect.left) * scaleX;
      var py = (e.clientY - rect.top) * scaleY;
      var cellInfo = MazeModel.getCellAtPixel(maze, px, py);
      if (!cellInfo) return;

      if (currentTool === 'select') {
        app.selectedCell = cellInfo;
        renderer.selectedCell = cellInfo;
        updatePropPanel(cellInfo);
        MazeRenderer.render(renderer);
      } else if (currentTool === 'eraser') {
        if (cellInfo.cell.type !== 'empty') {
          MazeModel.removeElement(maze, cellInfo.row, cellInfo.col);
          runCheck();
        }
      } else if (currentTool === 'mirror') {
        MazeModel.placeElement(maze, cellInfo.row, cellInfo.col, 'mirror', { angle: 45 });
        runCheck();
      } else if (currentTool === 'lens') {
        var focal = parseInt(document.getElementById('focal-input').value) || 10;
        MazeModel.placeElement(maze, cellInfo.row, cellInfo.col, 'lens', { angle: 90, focalLength: focal });
        runCheck();
      } else if (currentTool === 'concave') {
        var focal2 = parseInt(document.getElementById('focal-input').value) || 10;
        MazeModel.placeElement(maze, cellInfo.row, cellInfo.col, 'concave', { angle: 90, focalLength: focal2 });
        runCheck();
      } else if (currentTool === 'wall') {
        MazeModel.placeElement(maze, cellInfo.row, cellInfo.col, 'wall');
        runCheck();
      }
    }

    function handleCanvasMove(e) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var px = (e.clientX - rect.left) * scaleX;
      var py = (e.clientY - rect.top) * scaleY;
      var cellInfo = MazeModel.getCellAtPixel(maze, px, py);
      renderer.highlightCell = cellInfo;
      if (!currentReplay || !currentReplay.isPlaying) {
        MazeRenderer.render(renderer);
      }

      if (renderer.beamResult && renderer.beamResult.reflections) {
        var hint = document.getElementById('angle-hint');
        var found = false;
        for (var i = 0; i < renderer.beamResult.reflections.length; i++) {
          var ref = renderer.beamResult.reflections[i];
          var dx = px - ref.point.x;
          var dy = py - ref.point.y;
          if (Math.sqrt(dx * dx + dy * dy) < 15) {
            hint.style.display = 'block';
            hint.style.left = (e.clientX + 15) + 'px';
            hint.style.top = (e.clientY - 10) + 'px';
            document.getElementById('hint-incident').textContent = ref.incidentAngleDeg.toFixed(1) + '°';
            document.getElementById('hint-reflect').textContent = ref.reflectedAngleDeg.toFixed(1) + '°';
            found = true;
            break;
          }
        }
        if (!found) hint.style.display = 'none';
      }
    }

    function updatePropPanel(cellInfo) {
      var cell = cellInfo.cell;
      var typeNames = { empty: '空', mirror: '平面镜', lens: '凸透镜', concave: '凹透镜', wall: '墙壁' };
      document.getElementById('prop-type').textContent = typeNames[cell.type] || cell.type;
      document.getElementById('prop-angle').textContent = cell.type === 'mirror' || cell.type === 'lens' || cell.type === 'concave' ? cell.angle + '°' : '—';
      document.getElementById('prop-focal').textContent = cell.type === 'lens' || cell.type === 'concave' ? cell.focalLength + 'cm' : '—';
      var angleCtrl = document.getElementById('angle-control');
      var focalCtrl = document.getElementById('focal-control');
      if (cell.type === 'mirror' || cell.type === 'lens' || cell.type === 'concave') {
        angleCtrl.style.display = 'block';
        document.getElementById('angle-slider').value = cell.angle;
        document.getElementById('angle-display').textContent = cell.angle + '°';
      } else {
        angleCtrl.style.display = 'none';
      }
      if (cell.type === 'lens' || cell.type === 'concave') {
        focalCtrl.style.display = 'block';
        document.getElementById('focal-input').value = cell.focalLength;
      } else {
        focalCtrl.style.display = 'none';
      }
    }

    function switchTab(tabName) {
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.tab-content').forEach(function (t) { t.classList.remove('active'); });
      document.querySelector('.tab[data-tab="' + tabName + '"]').classList.add('active');
      document.getElementById('tab-' + tabName).classList.add('active');
    }

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleCanvasMove);
    canvas.addEventListener('mouseleave', function () {
      renderer.highlightCell = null;
      document.getElementById('angle-hint').style.display = 'none';
      if (!currentReplay || !currentReplay.isPlaying) {
        MazeRenderer.render(renderer);
      }
    });

    document.querySelectorAll('.tool-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.tool-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentTool = btn.dataset.tool;
      });
    });

    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        switchTab(tab.dataset.tab);
      });
    });

    document.getElementById('angle-slider').addEventListener('input', function () {
      var val = parseInt(this.value);
      document.getElementById('angle-display').textContent = val + '°';
      if (app.selectedCell && (app.selectedCell.cell.type === 'mirror' || app.selectedCell.cell.type === 'lens' || app.selectedCell.cell.type === 'concave')) {
        MazeModel.updateElement(maze, app.selectedCell.row, app.selectedCell.col, { angle: val });
        app.selectedCell.cell.angle = val;
        runCheck();
      }
    });

    document.getElementById('focal-input').addEventListener('change', function () {
      var val = parseInt(this.value) || 10;
      if (app.selectedCell && (app.selectedCell.cell.type === 'lens' || app.selectedCell.cell.type === 'concave')) {
        MazeModel.updateElement(maze, app.selectedCell.row, app.selectedCell.col, { focalLength: val });
        app.selectedCell.cell.focalLength = val;
        runCheck();
      }
    });

    document.getElementById('btn-check').addEventListener('click', function () {
      runCheck();
    });

    document.getElementById('btn-reset').addEventListener('click', function () {
      MazeModel.resetMaze(maze);
      renderer.beamResult = null;
      renderer.selectedCell = null;
      app.selectedCell = null;
      currentReport = null;
      currentReplay = null;
      document.getElementById('report-list').innerHTML = '<div class="report-item info"><div class="report-title">等待验算</div><div class="report-detail">点击「验算光路」查看诊断报告</div></div>';
      document.getElementById('conflict-list').innerHTML = '<div class="report-item info"><div class="report-title">无冲突</div><div class="report-detail">尚未检测到光束/透镜/靶冲突</div></div>';
      document.getElementById('replay-list').innerHTML = '';
      updateScoreDisplay(maze.score);
      MazeRenderer.render(renderer);
    });

    document.getElementById('btn-export').addEventListener('click', function () {
      exportReport();
    });

    document.getElementById('btn-replay').addEventListener('click', function () {
      startReplay();
    });

    document.getElementById('btn-replay-prev').addEventListener('click', function () {
      if (!currentReplay) return;
      var snap = ReplaySystem.stepBackward(currentReplay);
      if (snap) {
        MazeRenderer.renderSnapshot(renderer, snap, maze);
        updateReplayUI();
      }
    });

    document.getElementById('btn-replay-next').addEventListener('click', function () {
      if (!currentReplay) return;
      var snap = ReplaySystem.stepForward(currentReplay);
      if (snap) {
        MazeRenderer.renderSnapshot(renderer, snap, maze);
        updateReplayUI();
      }
    });

    document.getElementById('btn-replay-play').addEventListener('click', function () {
      if (!currentReplay) {
        startReplay();
      }
      if (currentReplay.isPlaying) {
        ReplaySystem.stopAutoPlay(currentReplay);
        document.getElementById('btn-replay-play').textContent = '▶ 自动回放';
      } else {
        ReplaySystem.startAutoPlay(currentReplay, function (snap, cur, total) {
          MazeRenderer.renderSnapshot(renderer, snap, maze);
          updateReplayUI();
        }, function () {
          document.getElementById('btn-replay-play').textContent = '▶ 自动回放';
        });
        document.getElementById('btn-replay-play').textContent = '⏸ 暂停';
      }
    });

    function updateReplayUI() {
      if (!currentReplay) return;
      document.getElementById('replay-progress').textContent = currentReplay.currentStep + ' / ' + (currentReplay.snapshots.length - 1);
      var replayList = document.getElementById('replay-list');
      replayList.innerHTML = ReplaySystem.renderReplayListToHTML(currentReplay);
      var currentEl = replayList.querySelector('.replay-step[data-step="' + currentReplay.currentStep + '"]');
      if (currentEl) currentEl.scrollIntoView({ block: 'nearest' });
    }

    document.getElementById('replay-list').addEventListener('click', function (e) {
      var stepEl = e.target.closest('.replay-step');
      if (!stepEl || !currentReplay) return;
      var stepIdx = parseInt(stepEl.dataset.step);
      currentReplay.currentStep = stepIdx;
      var snap = ReplaySystem.getSnapshotAt(currentReplay, stepIdx);
      if (snap) {
        MazeRenderer.renderSnapshot(renderer, snap, maze);
        updateReplayUI();
      }
    });

    document.querySelectorAll('.test-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var scenario = btn.dataset.test;
        if (scenario === 'normal') TestData.loadScenario_normal(app);
        else if (scenario === 'supplement') TestData.loadScenario_supplement(app);
        else if (scenario === 'conflict') TestData.loadScenario_conflict(app);
        else if (scenario === 'export') TestData.loadScenario_export(app);
      });
    });

    window.addEventListener('resize', function () {
      MazeRenderer.resizeCanvas(renderer);
      MazeRenderer.render(renderer);
    });

    MazeRenderer.resizeCanvas(renderer);
    MazeRenderer.render(renderer);

    return app;
  }

  return {
    init: init,
    getInstance: function () {
      if (!instance) instance = init();
      return instance;
    }
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  App.getInstance();
});

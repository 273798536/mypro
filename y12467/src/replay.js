var ReplaySystem = (function () {

  function createReplay(maze) {
    return {
      steps: maze.steps.slice(),
      currentStep: -1,
      isPlaying: false,
      playInterval: null,
      snapshots: buildSnapshots(maze)
    };
  }

  function buildSnapshots(maze) {
    var snapshots = [];
    var tempMaze = MazeModel.createMaze({
      rows: maze.rows,
      cols: maze.cols,
      cellSize: maze.cellSize,
      offsetX: maze.offsetX,
      offsetY: maze.offsetY,
      lightSource: maze.lightSource,
      lightAngle: maze.lightAngle,
      target: maze.target
    });

    snapshots.push({
      stepIndex: -1,
      grid: JSON.parse(JSON.stringify(tempMaze.grid)),
      description: '初始状态',
      timestamp: Date.now(),
      triggeredCalc: false,
      calcResult: null
    });

    for (var i = 0; i < maze.steps.length; i++) {
      var step = maze.steps[i];
      applyStep(tempMaze, step);
      var beamResult = null;
      if (step.triggeredCalc) {
        beamResult = OpticsPhysics.traceBeam(tempMaze);
      }
      snapshots.push({
        stepIndex: i,
        grid: JSON.parse(JSON.stringify(tempMaze.grid)),
        description: describeStep(step),
        timestamp: step.timestamp,
        triggeredCalc: step.triggeredCalc,
        calcResult: beamResult,
        stepData: step
      });
    }

    return snapshots;
  }

  function applyStep(maze, step) {
    if (step.action === 'place') {
      maze.grid[step.row][step.col] = {
        type: step.type,
        angle: step.angle,
        focalLength: step.focalLength
      };
    } else if (step.action === 'remove') {
      maze.grid[step.row][step.col] = { type: 'empty', angle: 0, focalLength: 0 };
    } else if (step.action === 'update') {
      maze.grid[step.row][step.col].angle = step.newAngle;
      maze.grid[step.row][step.col].focalLength = step.newFocalLength;
    } else if (step.action === 'supplement') {
      maze.grid[step.row][step.col].focalLength = step.newFocalLength;
    }
  }

  function describeStep(step) {
    var typeNames = {
      mirror: '平面镜', lens: '凸透镜', concave: '凹透镜', wall: '墙壁'
    };
    if (step.action === 'place') {
      return '放置' + (typeNames[step.type] || step.type) + ' 于(' + step.row + ',' + step.col + ')' + (step.type === 'mirror' ? ' 角度' + step.angle + '°' : '') + (step.type === 'lens' || step.type === 'concave' ? ' f=' + step.focalLength + 'cm' : '');
    } else if (step.action === 'remove') {
      return '移除(' + step.row + ',' + step.col + ')的' + (typeNames[step.previousType] || step.previousType);
    } else if (step.action === 'update') {
      var parts = [];
      if (step.oldAngle !== step.newAngle) parts.push('角度 ' + step.oldAngle + '°→' + step.newAngle + '°');
      if (step.oldFocalLength !== step.newFocalLength) parts.push('焦距 ' + step.oldFocalLength + '→' + step.newFocalLength + 'cm');
      return '修改(' + step.row + ',' + step.col + ') ' + parts.join(', ');
    } else if (step.action === 'supplement') {
      return '补录: (' + step.row + ',' + step.col + ') 焦距 ' + step.oldFocalLength + '→' + step.newFocalLength + 'cm';
    }
    return step.action;
  }

  function getSnapshotAt(replay, stepIndex) {
    if (stepIndex < 0 || stepIndex >= replay.snapshots.length) return null;
    return replay.snapshots[stepIndex];
  }

  function stepForward(replay) {
    if (replay.currentStep < replay.snapshots.length - 1) {
      replay.currentStep++;
      return replay.snapshots[replay.currentStep];
    }
    return null;
  }

  function stepBackward(replay) {
    if (replay.currentStep > 0) {
      replay.currentStep--;
      return replay.snapshots[replay.currentStep];
    }
    return null;
  }

  function startAutoPlay(replay, onStep, onComplete) {
    if (replay.isPlaying) return;
    replay.isPlaying = true;
    replay.currentStep = -1;
    replay.playInterval = setInterval(function () {
      var snap = stepForward(replay);
      if (snap) {
        onStep(snap, replay.currentStep, replay.snapshots.length - 1);
      } else {
        stopAutoPlay(replay);
        if (onComplete) onComplete();
      }
    }, 800);
  }

  function stopAutoPlay(replay) {
    replay.isPlaying = false;
    if (replay.playInterval) {
      clearInterval(replay.playInterval);
      replay.playInterval = null;
    }
  }

  function getCalcTriggeredSteps(replay) {
    var result = [];
    for (var i = 0; i < replay.snapshots.length; i++) {
      if (replay.snapshots[i].triggeredCalc) {
        result.push({
          stepIndex: i,
          description: replay.snapshots[i].description,
          calcResult: replay.snapshots[i].calcResult
        });
      }
    }
    return result;
  }

  function explainFailureImpact(stepData, calcResult) {
    if (!calcResult) return '此步骤未触发光路计算';
    var impacts = [];
    if (calcResult.reflections) {
      for (var i = 0; i < calcResult.reflections.length; i++) {
        var ref = calcResult.reflections[i];
        if (!ref.isCorrect) {
          impacts.push('反射角错误: 镜(' + ref.mirrorRow + ',' + ref.mirrorCol + ') 入射=' + ref.incidentAngleDeg.toFixed(1) + '° 反射=' + ref.reflectedAngleDeg.toFixed(1) + '° → 成绩-10分');
        }
      }
    }
    if (calcResult.refractions) {
      for (var j = 0; j < calcResult.refractions.length; j++) {
        var refr = calcResult.refractions[j];
        if (refr.focalLength === 0) {
          impacts.push('焦距漏算: 透镜(' + refr.lensRow + ',' + refr.lensCol + ') f=0 → 成绩-15分');
        } else if (!refr.isFocalCorrect) {
          impacts.push('焦距偏差: 透镜(' + refr.lensRow + ',' + refr.lensCol + ') f=' + refr.focalLength + 'cm → 成绩-8分');
        }
      }
    }
    if (calcResult.wallViolations && calcResult.wallViolations.length > 0) {
      impacts.push('光束穿墙 ' + calcResult.wallViolations.length + ' 处 → 成绩-12分/处');
    }
    if (!calcResult.reachedTarget) {
      impacts.push('未命中目标靶 → 成绩-30分');
    }
    if (impacts.length === 0) {
      return '此步骤触发的光路计算无异常, 不影响成绩';
    }
    return impacts.join('\n');
  }

  function renderReplayListToHTML(replay) {
    var html = '';
    for (var i = 0; i < replay.snapshots.length; i++) {
      var snap = replay.snapshots[i];
      var isCurrent = i === replay.currentStep;
      html += '<div class="replay-step' + (isCurrent ? ' current' : '') + '" data-step="' + i + '">';
      html += '<div class="step-num">' + (i === 0 ? '0' : i) + '</div>';
      html += '<div class="step-info">';
      html += '<div class="step-action">' + snap.description + '</div>';
      html += '<div class="step-time">' + new Date(snap.timestamp).toLocaleTimeString() + '</div>';
      if (snap.triggeredCalc) {
        html += '<div class="step-trigger">⚡ 触发了光路计算</div>';
      }
      if (snap.calcResult && i > 0) {
        var impactText = explainFailureImpact(snap.stepData, snap.calcResult);
        if (impactText !== '此步骤触发的光路计算无异常, 不影响成绩') {
          var impactLines = impactText.split('\n');
          html += '<div style="font-size:11px;color:#f85149;margin-top:2px;">';
          for (var j = 0; j < impactLines.length; j++) {
            html += impactLines[j] + '<br>';
          }
          html += '</div>';
        }
      }
      html += '</div></div>';
    }
    return html;
  }

  return {
    createReplay: createReplay,
    getSnapshotAt: getSnapshotAt,
    stepForward: stepForward,
    stepBackward: stepBackward,
    startAutoPlay: startAutoPlay,
    stopAutoPlay: stopAutoPlay,
    getCalcTriggeredSteps: getCalcTriggeredSteps,
    explainFailureImpact: explainFailureImpact,
    renderReplayListToHTML: renderReplayListToHTML
  };
})();

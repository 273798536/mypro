var MazeModel = (function () {
  function createGrid(rows, cols) {
    var grid = [];
    for (var r = 0; r < rows; r++) {
      grid[r] = [];
      for (var c = 0; c < cols; c++) {
        grid[r][c] = { type: 'empty', angle: 0, focalLength: 0 };
      }
    }
    return grid;
  }

  function createMaze(options) {
    var opts = options || {};
    var rows = opts.rows || 10;
    var cols = opts.cols || 12;
    var cellSize = opts.cellSize || 50;
    var offsetX = opts.offsetX || 30;
    var offsetY = opts.offsetY || 30;
    return {
      rows: rows,
      cols: cols,
      cellSize: cellSize,
      offsetX: offsetX,
      offsetY: offsetY,
      grid: createGrid(rows, cols),
      lightSource: opts.lightSource || { x: offsetX, y: offsetY + rows * cellSize / 2 },
      lightAngle: opts.lightAngle || 0,
      target: opts.target || { row: rows - 2, col: cols - 2 },
      score: { total: 0, reflectionAccuracy: 0, focalAccuracy: 0, beamCompliance: 0 },
      steps: [],
      conflicts: [],
      beamResult: null,
      isComplete: false
    };
  }

  function placeElement(maze, row, col, type, props) {
    if (row < 0 || row >= maze.rows || col < 0 || col >= maze.cols) return false;
    var p = props || {};
    maze.grid[row][col] = {
      type: type,
      angle: p.angle || 0,
      focalLength: p.focalLength || 10
    };
    var step = {
      action: 'place',
      row: row,
      col: col,
      type: type,
      angle: p.angle || 0,
      focalLength: p.focalLength || 10,
      timestamp: Date.now(),
      triggeredCalc: false,
      calcResult: null
    };
    maze.steps.push(step);
    return step;
  }

  function removeElement(maze, row, col) {
    if (row < 0 || row >= maze.rows || col < 0 || col >= maze.cols) return null;
    var old = maze.grid[row][col];
    maze.grid[row][col] = { type: 'empty', angle: 0, focalLength: 0 };
    var step = {
      action: 'remove',
      row: row,
      col: col,
      previousType: old.type,
      previousAngle: old.angle,
      previousFocal: old.focalLength,
      timestamp: Date.now(),
      triggeredCalc: false,
      calcResult: null
    };
    maze.steps.push(step);
    return step;
  }

  function updateElement(maze, row, col, props) {
    if (row < 0 || row >= maze.rows || col < 0 || col >= maze.cols) return null;
    var cell = maze.grid[row][col];
    var oldAngle = cell.angle;
    var oldFocal = cell.focalLength;
    if (props.angle !== undefined) cell.angle = props.angle;
    if (props.focalLength !== undefined) cell.focalLength = props.focalLength;
    var step = {
      action: 'update',
      row: row,
      col: col,
      type: cell.type,
      oldAngle: oldAngle,
      newAngle: cell.angle,
      oldFocalLength: oldFocal,
      newFocalLength: cell.focalLength,
      timestamp: Date.now(),
      triggeredCalc: false,
      calcResult: null
    };
    maze.steps.push(step);
    return step;
  }

  function supplementLens(maze, row, col, focalLength) {
    if (row < 0 || row >= maze.rows || col < 0 || col >= maze.cols) return null;
    var cell = maze.grid[row][col];
    if (cell.type !== 'lens' && cell.type !== 'concave') return null;
    var oldFocal = cell.focalLength;
    cell.focalLength = focalLength;
    var step = {
      action: 'supplement',
      row: row,
      col: col,
      type: cell.type,
      oldFocalLength: oldFocal,
      newFocalLength: focalLength,
      description: '补录透镜焦距: ' + oldFocal + 'cm → ' + focalLength + 'cm',
      timestamp: Date.now(),
      triggeredCalc: true,
      calcResult: null
    };
    maze.steps.push(step);
    return step;
  }

  function detectConflicts(maze, beamResult) {
    var conflicts = [];
    if (!beamResult) return conflicts;

    for (var i = 0; i < beamResult.reflections.length; i++) {
      var ref = beamResult.reflections[i];
      if (!ref.isCorrect) {
        var hasTargetConflict = false;
        if (beamResult.reachedTarget) {
          var segAfter = findSegmentAfterReflection(beamResult, i);
          if (segAfter && isSegmentNearTarget(segAfter, maze)) {
            hasTargetConflict = true;
          }
        }
        conflicts.push({
          type: 'reflection_angle',
          severity: 'error',
          sources: ['beam'],
          mirrorRow: ref.mirrorRow,
          mirrorCol: ref.mirrorCol,
          incidentAngle: ref.incidentAngleDeg,
          reflectedAngle: ref.reflectedAngleDeg,
          affectsTarget: hasTargetConflict,
          description: '平面镜(' + ref.mirrorRow + ',' + ref.mirrorCol + ')反射角错误: 入射角=' + ref.incidentAngleDeg.toFixed(1) + '°, 反射角=' + ref.reflectedAngleDeg.toFixed(1) + '°'
        });
      }
    }

    for (var j = 0; j < beamResult.refractions.length; j++) {
      var refr = beamResult.refractions[j];
      if (!refr.isFocalCorrect || refr.focalLength === 0) {
        var isOmission = refr.focalLength === 0;
        conflicts.push({
          type: isOmission ? 'focal_omission' : 'focal_error',
          severity: isOmission ? 'error' : 'warn',
          sources: ['lens'],
          lensRow: refr.lensRow,
          lensCol: refr.lensCol,
          focalLength: refr.focalLength,
          lensType: refr.lensType,
          heightFromAxis: refr.heightFromAxis,
          description: isOmission
            ? '透镜(' + refr.lensRow + ',' + refr.lensCol + ')焦距漏算, 未设定有效焦距'
            : '透镜(' + refr.lensRow + ',' + refr.lensCol + ')焦距偏差: 设定=' + refr.focalLength + 'cm, 计算偏差=' + Math.abs(refr.heightFromAxis / refr.focalLength - 1).toFixed(2)
        });
      }
    }

    for (var k = 0; k < beamResult.wallViolations.length; k++) {
      var v = beamResult.wallViolations[k];
      conflicts.push({
        type: 'beam_through_wall',
        severity: 'error',
        sources: ['beam', 'wall'],
        beamSegmentIndex: v.beamSegmentIndex,
        wallIndex: v.wallIndex,
        hitPoint: v.hitPoint,
        description: v.description
      });
    }

    if (beamResult.reachedTarget) {
      var targetSeg = beamResult.segments[beamResult.segments.length - 1];
      var hasAngleError = beamResult.reflections.some(function (r) { return !r.isCorrect; });
      var hasFocalError = beamResult.refractions.some(function (r) { return !r.isFocalCorrect; });
      if (hasAngleError || hasFocalError) {
        conflicts.push({
          type: 'target_conflict',
          severity: 'warn',
          sources: ['beam', 'lens', 'target'],
          description: '光束虽到达目标靶, 但途中存在' + (hasAngleError ? '反射角错误' : '') + (hasAngleError && hasFocalError ? '和' : '') + (hasFocalError ? '透镜焦距偏差' : '') + ', 命中不可靠'
        });
      }
    } else {
      var lastSeg = beamResult.segments[beamResult.segments.length - 1];
      if (lastSeg) {
        conflicts.push({
          type: 'target_miss',
          severity: 'warn',
          sources: ['beam', 'target'],
          description: '光束未到达目标靶, 最终停于(' + lastSeg.end.x.toFixed(0) + ',' + lastSeg.end.y.toFixed(0) + ')'
        });
      }
    }

    maze.conflicts = conflicts;
    return conflicts;
  }

  function findSegmentAfterReflection(beamResult, reflectionIndex) {
    var ref = beamResult.reflections[reflectionIndex];
    for (var i = 0; i < beamResult.segments.length; i++) {
      var seg = beamResult.segments[i];
      var dx = seg.start.x - ref.point.x;
      var dy = seg.start.y - ref.point.y;
      if (Math.sqrt(dx * dx + dy * dy) < 2) {
        return beamResult.segments[i + 1] || null;
      }
    }
    return null;
  }

  function isSegmentNearTarget(seg, maze) {
    if (!seg || !maze.target) return false;
    var tx = maze.target.col * maze.cellSize + maze.offsetX + maze.cellSize / 2;
    var ty = maze.target.row * maze.cellSize + maze.offsetY + maze.cellSize / 2;
    var dx = seg.end.x - tx;
    var dy = seg.end.y - ty;
    return Math.sqrt(dx * dx + dy * dy) < maze.cellSize * 0.5;
  }

  function calculateScore(maze, beamResult) {
    var score = { total: 0, reflectionAccuracy: 0, focalAccuracy: 0, beamCompliance: 0 };
    if (!beamResult) return score;

    var totalReflections = beamResult.reflections.length;
    var correctReflections = beamResult.reflections.filter(function (r) { return r.isCorrect; }).length;
    score.reflectionAccuracy = totalReflections > 0 ? correctReflections / totalReflections * 100 : 100;

    var totalRefractions = beamResult.refractions.length;
    var correctRefractions = beamResult.refractions.filter(function (r) { return r.isFocalCorrect && r.focalLength > 0; }).length;
    score.focalAccuracy = totalRefractions > 0 ? correctRefractions / totalRefractions * 100 : 100;

    var totalSegments = beamResult.segments.length;
    var violatedSegments = beamResult.wallViolations.length;
    score.beamCompliance = totalSegments > 0 ? (totalSegments - violatedSegments) / totalSegments * 100 : 100;

    var targetBonus = beamResult.reachedTarget ? 30 : 0;
    score.total = Math.round(score.reflectionAccuracy * 0.3 + score.focalAccuracy * 0.3 + score.beamCompliance * 0.1 + targetBonus);

    maze.score = score;
    return score;
  }

  function markStepCalcTriggered(maze, stepIndex, calcResult) {
    if (stepIndex >= 0 && stepIndex < maze.steps.length) {
      maze.steps[stepIndex].triggeredCalc = true;
      maze.steps[stepIndex].calcResult = calcResult;
    }
  }

  function getCellAtPixel(maze, px, py) {
    var col = Math.floor((px - maze.offsetX) / maze.cellSize);
    var row = Math.floor((py - maze.offsetY) / maze.cellSize);
    if (row < 0 || row >= maze.rows || col < 0 || col >= maze.cols) return null;
    return { row: row, col: col, cell: maze.grid[row][col] };
  }

  function resetMaze(maze) {
    maze.grid = createGrid(maze.rows, maze.cols);
    maze.steps = [];
    maze.conflicts = [];
    maze.beamResult = null;
    maze.score = { total: 0, reflectionAccuracy: 0, focalAccuracy: 0, beamCompliance: 0 };
    maze.isComplete = false;
  }

  function exportMazeState(maze) {
    return JSON.parse(JSON.stringify({
      rows: maze.rows,
      cols: maze.cols,
      grid: maze.grid,
      lightSource: maze.lightSource,
      lightAngle: maze.lightAngle,
      target: maze.target,
      score: maze.score,
      steps: maze.steps,
      conflicts: maze.conflicts,
      beamResult: maze.beamResult
    }));
  }

  return {
    createMaze: createMaze,
    placeElement: placeElement,
    removeElement: removeElement,
    updateElement: updateElement,
    supplementLens: supplementLens,
    detectConflicts: detectConflicts,
    calculateScore: calculateScore,
    markStepCalcTriggered: markStepCalcTriggered,
    getCellAtPixel: getCellAtPixel,
    resetMaze: resetMaze,
    exportMazeState: exportMazeState
  };
})();

var MazeRenderer = (function () {

  function createRenderer(canvas, maze) {
    var ctx = canvas.getContext('2d');
    return {
      canvas: canvas,
      ctx: ctx,
      maze: maze,
      highlightCell: null,
      selectedCell: null,
      beamResult: null,
      animPhase: 0
    };
  }

  function clear(renderer) {
    var ctx = renderer.ctx;
    var w = renderer.canvas.width;
    var h = renderer.canvas.height;
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);
  }

  function drawGrid(renderer) {
    var ctx = renderer.ctx;
    var maze = renderer.maze;
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;
    for (var r = 0; r <= maze.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(maze.offsetX, maze.offsetY + r * maze.cellSize);
      ctx.lineTo(maze.offsetX + maze.cols * maze.cellSize, maze.offsetY + r * maze.cellSize);
      ctx.stroke();
    }
    for (var c = 0; c <= maze.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(maze.offsetX + c * maze.cellSize, maze.offsetY);
      ctx.lineTo(maze.offsetX + c * maze.cellSize, maze.offsetY + maze.rows * maze.cellSize);
      ctx.stroke();
    }
  }

  function drawCell(renderer, row, col, cell) {
    var ctx = renderer.ctx;
    var maze = renderer.maze;
    var x = maze.offsetX + col * maze.cellSize;
    var y = maze.offsetY + row * maze.cellSize;
    var cx = x + maze.cellSize / 2;
    var cy = y + maze.cellSize / 2;
    var halfLen = maze.cellSize * 0.4;

    if (cell.type === 'wall') {
      ctx.fillStyle = '#484f58';
      ctx.fillRect(x + 2, y + 2, maze.cellSize - 4, maze.cellSize - 4);
      ctx.strokeStyle = '#6e7681';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, y + 2, maze.cellSize - 4, maze.cellSize - 4);
    } else if (cell.type === 'mirror') {
      var angle = cell.angle * Math.PI / 180;
      var dx = Math.cos(angle) * halfLen;
      var dy = Math.sin(angle) * halfLen;
      ctx.strokeStyle = '#79c0ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - dx, cy - dy);
      ctx.lineTo(cx + dx, cy + dy);
      ctx.stroke();
      ctx.fillStyle = '#79c0ff';
      ctx.beginPath();
      ctx.arc(cx - dx, cy - dy, 3, 0, 2 * Math.PI);
      ctx.arc(cx + dx, cy + dy, 3, 0, 2 * Math.PI);
      ctx.fill();
      var normalAngle = angle + Math.PI / 2;
      var nx = Math.cos(normalAngle) * 12;
      var ny = Math.sin(normalAngle) * 12;
      ctx.strokeStyle = 'rgba(121,192,255,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + nx, cy + ny);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (cell.type === 'lens' || cell.type === 'concave') {
      var isConvex = cell.type === 'lens';
      var lAngle = cell.angle * Math.PI / 180;
      var ldx = Math.cos(lAngle) * halfLen;
      var ldy = Math.sin(lAngle) * halfLen;
      ctx.strokeStyle = isConvex ? '#d2a8ff' : '#ffa657';
      ctx.lineWidth = 2.5;
      if (isConvex) {
        ctx.beginPath();
        ctx.moveTo(cx - ldx, cy - ldy);
        ctx.quadraticCurveTo(cx + Math.cos(lAngle + Math.PI / 2) * 8, cy + Math.sin(lAngle + Math.PI / 2) * 8, cx + ldx, cy + ldy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - ldx, cy - ldy);
        ctx.quadraticCurveTo(cx - Math.cos(lAngle + Math.PI / 2) * 8, cy - Math.sin(lAngle + Math.PI / 2) * 8, cx + ldx, cy + ldy);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(cx - ldx, cy - ldy);
        ctx.quadraticCurveTo(cx - Math.cos(lAngle + Math.PI / 2) * 6, cy - Math.sin(lAngle + Math.PI / 2) * 6, cx + ldx, cy + ldy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - ldx, cy - ldy);
        ctx.quadraticCurveTo(cx + Math.cos(lAngle + Math.PI / 2) * 6, cy + Math.sin(lAngle + Math.PI / 2) * 6, cx + ldx, cy + ldy);
        ctx.stroke();
      }
      if (cell.focalLength > 0) {
        ctx.fillStyle = isConvex ? '#d2a8ff' : '#ffa657';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('f=' + cell.focalLength, cx, cy + maze.cellSize * 0.42);
      } else {
        ctx.fillStyle = '#f85149';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('f=?', cx, cy + maze.cellSize * 0.42);
      }
    }
  }

  function drawCells(renderer) {
    var maze = renderer.maze;
    for (var r = 0; r < maze.rows; r++) {
      for (var c = 0; c < maze.cols; c++) {
        var cell = maze.grid[r][c];
        if (cell.type !== 'empty') {
          drawCell(renderer, r, c, cell);
        }
      }
    }
  }

  function drawLightSource(renderer) {
    var ctx = renderer.ctx;
    var src = renderer.maze.lightSource;
    var angle = renderer.maze.lightAngle * Math.PI / 180;
    ctx.fillStyle = '#f0e68c';
    ctx.beginPath();
    ctx.arc(src.x, src.y, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#f0e68c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(src.x + Math.cos(angle) * 20, src.y + Math.sin(angle) * 20);
    ctx.stroke();
    ctx.fillStyle = '#f0e68c';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('光源', src.x, src.y - 14);
  }

  function drawTarget(renderer) {
    var ctx = renderer.ctx;
    var maze = renderer.maze;
    var tx = maze.target.col * maze.cellSize + maze.offsetX + maze.cellSize / 2;
    var ty = maze.target.row * maze.cellSize + maze.offsetY + maze.cellSize / 2;
    var r = maze.cellSize * 0.3;
    var reached = renderer.beamResult && renderer.beamResult.reachedTarget;
    ctx.strokeStyle = reached ? '#3fb950' : '#f85149';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty, r, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(tx, ty, r * 0.6, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(tx, ty, r * 0.25, 0, 2 * Math.PI);
    ctx.fillStyle = reached ? '#3fb950' : '#f85149';
    ctx.fill();
    ctx.fillStyle = reached ? '#3fb950' : '#f85149';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('靶', tx, ty - r - 4);
  }

  function drawBeam(renderer) {
    var ctx = renderer.ctx;
    var beam = renderer.beamResult;
    if (!beam || !beam.segments || beam.segments.length === 0) return;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#f0e68c';
    for (var i = 0; i < beam.segments.length; i++) {
      var seg = beam.segments[i];
      ctx.strokeStyle = '#f0e68c';
      ctx.beginPath();
      ctx.moveTo(seg.start.x, seg.start.y);
      ctx.lineTo(seg.end.x, seg.end.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    for (var j = 0; j < beam.reflections.length; j++) {
      var ref = beam.reflections[j];
      ctx.fillStyle = ref.isCorrect ? '#3fb950' : '#f85149';
      ctx.beginPath();
      ctx.arc(ref.point.x, ref.point.y, 4, 0, 2 * Math.PI);
      ctx.fill();
      if (!ref.isCorrect) {
        ctx.strokeStyle = '#f85149';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.arc(ref.point.x, ref.point.y, 8, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    for (var k = 0; k < beam.refractions.length; k++) {
      var refr = beam.refractions[k];
      ctx.fillStyle = refr.isFocalCorrect ? '#d2a8ff' : '#ffa657';
      ctx.beginPath();
      ctx.arc(refr.point.x, refr.point.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
    for (var w = 0; w < beam.wallViolations.length; w++) {
      var v = beam.wallViolations[w];
      ctx.strokeStyle = '#f85149';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(v.hitPoint.x, v.hitPoint.y, 6, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f85149';
      ctx.font = '9px sans-serif';
      ctx.fillText('!', v.hitPoint.x - 3, v.hitPoint.y - 10);
    }
  }

  function drawHighlight(renderer) {
    if (!renderer.highlightCell) return;
    var ctx = renderer.ctx;
    var maze = renderer.maze;
    var r = renderer.highlightCell.row;
    var c = renderer.highlightCell.col;
    var x = maze.offsetX + c * maze.cellSize;
    var y = maze.offsetY + r * maze.cellSize;
    ctx.strokeStyle = 'rgba(88,166,255,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, maze.cellSize - 2, maze.cellSize - 2);
  }

  function drawSelection(renderer) {
    if (!renderer.selectedCell) return;
    var ctx = renderer.ctx;
    var maze = renderer.maze;
    var r = renderer.selectedCell.row;
    var c = renderer.selectedCell.col;
    var x = maze.offsetX + c * maze.cellSize;
    var y = maze.offsetY + r * maze.cellSize;
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, maze.cellSize, maze.cellSize);
  }

  function drawAngleHint(renderer, reflectionInfo) {
    if (!reflectionInfo) return;
    var ctx = renderer.ctx;
    var p = reflectionInfo.point;
    var normalAngle = reflectionInfo.normalAngleDeg * Math.PI / 180;
    var radius = 18;
    ctx.strokeStyle = 'rgba(121,192,255,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, normalAngle - reflectionInfo.incidentAngleDeg * Math.PI / 180, normalAngle);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(63,185,80,0.6)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, normalAngle, normalAngle + reflectionInfo.reflectedAngleDeg * Math.PI / 180);
    ctx.stroke();
  }

  function render(renderer) {
    clear(renderer);
    drawGrid(renderer);
    drawCells(renderer);
    drawLightSource(renderer);
    drawTarget(renderer);
    drawBeam(renderer);
    drawHighlight(renderer);
    drawSelection(renderer);
  }

  function renderSnapshot(renderer, snapshot, maze) {
    var savedGrid = maze.grid;
    maze.grid = snapshot.grid;
    clear(renderer);
    drawGrid(renderer);
    drawCells(renderer);
    drawLightSource(renderer);
    drawTarget(renderer);
    if (snapshot.calcResult) {
      renderer.beamResult = snapshot.calcResult;
      drawBeam(renderer);
    }
    maze.grid = savedGrid;
  }

  function resizeCanvas(renderer) {
    var wrap = renderer.canvas.parentElement;
    var maze = renderer.maze;
    var canvasW = maze.cols * maze.cellSize + 2 * maze.offsetX;
    var canvasH = maze.rows * maze.cellSize + 2 * maze.offsetY;
    var maxW = wrap.clientWidth - 40;
    var maxH = wrap.clientHeight - 40;
    var scale = Math.min(maxW / canvasW, maxH / canvasH, 1);
    renderer.canvas.width = Math.floor(canvasW * scale);
    renderer.canvas.height = Math.floor(canvasH * scale);
    renderer.canvas.style.width = renderer.canvas.width + 'px';
    renderer.canvas.style.height = renderer.canvas.height + 'px';
    renderer.ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  return {
    createRenderer: createRenderer,
    clear: clear,
    drawGrid: drawGrid,
    drawCells: drawCells,
    drawLightSource: drawLightSource,
    drawTarget: drawTarget,
    drawBeam: drawBeam,
    drawHighlight: drawHighlight,
    drawSelection: drawSelection,
    drawAngleHint: drawAngleHint,
    render: render,
    renderSnapshot: renderSnapshot,
    resizeCanvas: resizeCanvas
  };
})();

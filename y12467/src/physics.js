var OpticsPhysics = (function () {
  var DEG = Math.PI / 180;
  var EPS = 1e-6;

  function vec(x, y) { return { x: x, y: y }; }
  function vadd(a, b) { return vec(a.x + b.x, a.y + b.y); }
  function vsub(a, b) { return vec(a.x - b.x, a.y - b.y); }
  function vscale(v, s) { return vec(v.x * s, v.y * s); }
  function vdot(a, b) { return a.x * b.x + a.y * b.y; }
  function vlen(v) { return Math.sqrt(v.x * v.x + v.y * v.y); }
  function vnorm(v) { var l = vlen(v); return l < EPS ? vec(0, 0) : vec(v.x / l, v.y / l); }
  function vrotate(v, angle) {
    var c = Math.cos(angle), s = Math.sin(angle);
    return vec(v.x * c - v.y * s, v.x * s + v.y * c);
  }

  function reflectVector(incident, normal) {
    var d = vdot(incident, normal);
    return vsub(incident, vscale(normal, 2 * d));
  }

  function computeReflectionAngle(incidentDir, mirrorAngle) {
    var normal = vec(Math.cos(mirrorAngle + Math.PI / 2), Math.sin(mirrorAngle + Math.PI / 2));
    var incAngle = Math.atan2(incidentDir.y, incidentDir.x);
    var normAngle = Math.atan2(normal.y, normal.x);
    var theta_i = incAngle - normAngle;
    while (theta_i < -Math.PI) theta_i += 2 * Math.PI;
    while (theta_i > Math.PI) theta_i -= 2 * Math.PI;
    var theta_r = -theta_i;
    var refDir = vrotate(normal, theta_r);
    return {
      incidentAngleDeg: Math.abs(theta_i / DEG),
      reflectedAngleDeg: Math.abs(theta_r / DEG),
      normalAngleDeg: normAngle / DEG,
      reflectedDir: vnorm(refDir),
      isCorrect: Math.abs(Math.abs(theta_i) - Math.abs(theta_r)) < 0.5 * DEG
    };
  }

  function thinLensRefraction(incidentDir, lensPos, lensAngle, focalLength, hitPoint) {
    var opticalAxis = vec(Math.cos(lensAngle), Math.sin(lensAngle));
    var lateral = vsub(hitPoint, lensPos);
    var h = vdot(lateral, vec(-opticalAxis.y, opticalAxis.x));
    var outDir = vnorm(vadd(incidentDir, vscale(opticalAxis, -h / focalLength)));
    var expectedFocal = focalLength;
    var actualDeflection = h / expectedFocal;
    var computedDeflection = -vdot(vsub(outDir, incidentDir), opticalAxis);
    return {
      outputDir: outDir,
      heightFromAxis: h,
      expectedFocalLength: expectedFocal,
      actualDeflection: actualDeflection,
      computedDeflection: computedDeflection,
      isFocalCorrect: Math.abs(actualDeflection - computedDeflection) < 0.1
    };
  }

  function raySegmentIntersect(rayOrigin, rayDir, p1, p2) {
    var segDir = vsub(p2, p1);
    var denom = rayDir.x * segDir.y - rayDir.y * segDir.x;
    if (Math.abs(denom) < EPS) return null;
    var diff = vsub(p1, rayOrigin);
    var t = (diff.x * segDir.y - diff.y * segDir.x) / denom;
    var u = (diff.x * rayDir.y - diff.y * rayDir.x) / denom;
    if (t > EPS && u >= 0 && u <= 1) {
      return { t: t, point: vadd(rayOrigin, vscale(rayDir, t)), u: u };
    }
    return null;
  }

  function checkBeamThroughWall(beamSegments, walls) {
    var violations = [];
    for (var i = 0; i < beamSegments.length; i++) {
      var seg = beamSegments[i];
      for (var j = 0; j < walls.length; j++) {
        var wall = walls[j];
        var hit = raySegmentIntersect(
          seg.start, vnorm(vsub(seg.end, seg.start)),
          wall.p1, wall.p2
        );
        if (hit && hit.t > EPS && hit.t < vlen(vsub(seg.end, seg.start)) - EPS) {
          violations.push({
            beamSegmentIndex: i,
            wallIndex: j,
            hitPoint: hit.point,
            description: '光束第' + (i + 1) + '段穿过了第' + (j + 1) + '面墙'
          });
        }
      }
    }
    return violations;
  }

  function traceBeam(maze) {
    var result = {
      segments: [],
      reflections: [],
      refractions: [],
      wallViolations: [],
      reachedTarget: false,
      targetHitPoint: null
    };
    var origin = maze.lightSource;
    var dir = vnorm(vec(Math.cos(maze.lightAngle * DEG), Math.sin(maze.lightAngle * DEG)));
    var pos = vec(origin.x, origin.y);
    var maxBounces = 20;
    var walls = [];
    var mirrors = [];
    var lenses = [];

    for (var r = 0; r < maze.rows; r++) {
      for (var c = 0; c < maze.cols; c++) {
        var cell = maze.grid[r][c];
        if (cell.type === 'wall') {
          var cx = c * maze.cellSize + maze.offsetX;
          var cy = r * maze.cellSize + maze.offsetY;
          walls.push({
            p1: vec(cx, cy), p2: vec(cx + maze.cellSize, cy),
            index: walls.length, row: r, col: c
          });
          walls.push({
            p1: vec(cx + maze.cellSize, cy), p2: vec(cx + maze.cellSize, cy + maze.cellSize),
            index: walls.length, row: r, col: c
          });
          walls.push({
            p1: vec(cx + maze.cellSize, cy + maze.cellSize), p2: vec(cx, cy + maze.cellSize),
            index: walls.length, row: r, col: c
          });
          walls.push({
            p1: vec(cx, cy + maze.cellSize), p2: vec(cx, cy),
            index: walls.length, row: r, col: c
          });
        } else if (cell.type === 'mirror') {
          mirrors.push({ row: r, col: c, angle: cell.angle, cell: cell });
        } else if (cell.type === 'lens' || cell.type === 'concave') {
          lenses.push({ row: r, col: c, angle: cell.angle, focalLength: cell.focalLength, cell: cell, lensType: cell.type });
        }
      }
    }

    for (var bounce = 0; bounce < maxBounces; bounce++) {
      var closestHit = null;
      var closestT = Infinity;
      var hitType = null;
      var hitObject = null;

      for (var mi = 0; mi < mirrors.length; mi++) {
        var m = mirrors[mi];
        var mx = m.col * maze.cellSize + maze.offsetX + maze.cellSize / 2;
        var my = m.row * maze.cellSize + maze.offsetY + maze.cellSize / 2;
        var halfLen = maze.cellSize * 0.45;
        var mDir = vec(Math.cos(m.angle * DEG), Math.sin(m.angle * DEG));
        var mp1 = vadd(vec(mx, my), vscale(mDir, halfLen));
        var mp2 = vsub(vec(mx, my), vscale(mDir, halfLen));
        var hit = raySegmentIntersect(pos, dir, mp1, mp2);
        if (hit && hit.t < closestT) {
          closestT = hit.t;
          closestHit = hit;
          hitType = 'mirror';
          hitObject = m;
        }
      }

      for (var li = 0; li < lenses.length; li++) {
        var l = lenses[li];
        var lx = l.col * maze.cellSize + maze.offsetX + maze.cellSize / 2;
        var ly = l.row * maze.cellSize + maze.offsetY + maze.cellSize / 2;
        var halfLen = maze.cellSize * 0.45;
        var lDir = vec(Math.cos(l.angle * DEG), Math.sin(l.angle * DEG));
        var lp1 = vadd(vec(lx, ly), vscale(lDir, halfLen));
        var lp2 = vsub(vec(lx, ly), vscale(lDir, halfLen));
        var hit = raySegmentIntersect(pos, dir, lp1, lp2);
        if (hit && hit.t < closestT) {
          closestT = hit.t;
          closestHit = hit;
          hitType = 'lens';
          hitObject = l;
        }
      }

      for (var wi = 0; wi < walls.length; wi++) {
        var w = walls[wi];
        var hit = raySegmentIntersect(pos, dir, w.p1, w.p2);
        if (hit && hit.t < closestT) {
          closestT = hit.t;
          closestHit = hit;
          hitType = 'wall';
          hitObject = w;
        }
      }

      var canvasW = maze.cols * maze.cellSize + 2 * maze.offsetX;
      var canvasH = maze.rows * maze.cellSize + 2 * maze.offsetY;
      var boundaryWalls = [
        { p1: vec(0, 0), p2: vec(canvasW, 0) },
        { p1: vec(canvasW, 0), p2: vec(canvasW, canvasH) },
        { p1: vec(canvasW, canvasH), p2: vec(0, canvasH) },
        { p1: vec(0, canvasH), p2: vec(0, 0) }
      ];
      for (var bi = 0; bi < boundaryWalls.length; bi++) {
        var bw = boundaryWalls[bi];
        var hit = raySegmentIntersect(pos, dir, bw.p1, bw.p2);
        if (hit && hit.t < closestT) {
          closestT = hit.t;
          closestHit = hit;
          hitType = 'boundary';
          hitObject = bw;
        }
      }

      if (!closestHit) break;

      var segStart = vec(pos.x, pos.y);
      var segEnd = vec(closestHit.point.x, closestHit.point.y);
      result.segments.push({ start: segStart, end: segEnd });

      if (hitType === 'mirror') {
        var m = hitObject;
        var refResult = computeReflectionAngle(dir, m.angle * DEG);
        dir = refResult.reflectedDir;
        pos = vec(closestHit.point.x, closestHit.point.y);
        result.reflections.push({
          mirrorRow: m.row,
          mirrorCol: m.col,
          mirrorAngle: m.angle,
          incidentAngleDeg: refResult.incidentAngleDeg,
          reflectedAngleDeg: refResult.reflectedAngleDeg,
          isCorrect: refResult.isCorrect,
          point: vec(closestHit.point.x, closestHit.point.y)
        });
      } else if (hitType === 'lens') {
        var l = hitObject;
        var lPos = vec(
          l.col * maze.cellSize + maze.offsetX + maze.cellSize / 2,
          l.row * maze.cellSize + maze.offsetY + maze.cellSize / 2
        );
        var effectiveFocal = l.lensType === 'concave' ? -Math.abs(l.focalLength) : Math.abs(l.focalLength);
        var refrResult = thinLensRefraction(dir, lPos, l.angle * DEG, effectiveFocal, closestHit.point);
        dir = refrResult.outputDir;
        pos = vec(closestHit.point.x, closestHit.point.y);
        result.refractions.push({
          lensRow: l.row,
          lensCol: l.col,
          lensAngle: l.angle,
          focalLength: l.focalLength,
          lensType: l.lensType,
          heightFromAxis: refrResult.heightFromAxis,
          expectedFocalLength: refrResult.expectedFocalLength,
          isFocalCorrect: refrResult.isFocalCorrect,
          point: vec(closestHit.point.x, closestHit.point.y)
        });
      } else {
        pos = vec(closestHit.point.x, closestHit.point.y);
        break;
      }

      var targetCX = maze.target.col * maze.cellSize + maze.offsetX + maze.cellSize / 2;
      var targetCY = maze.target.row * maze.cellSize + maze.offsetY + maze.cellSize / 2;
      var targetR = maze.cellSize * 0.3;
      var toTarget = vsub(vec(targetCX, targetCY), segEnd);
      if (vlen(toTarget) < targetR) {
        result.reachedTarget = true;
        result.targetHitPoint = vec(segEnd.x, segEnd.y);
      }
    }

    result.wallViolations = checkBeamThroughWall(result.segments, walls);

    return result;
  }

  return {
    vec: vec,
    vadd: vadd,
    vsub: vsub,
    vscale: vscale,
    vdot: vdot,
    vlen: vlen,
    vnorm: vnorm,
    vrotate: vrotate,
    reflectVector: reflectVector,
    computeReflectionAngle: computeReflectionAngle,
    thinLensRefraction: thinLensRefraction,
    raySegmentIntersect: raySegmentIntersect,
    checkBeamThroughWall: checkBeamThroughWall,
    traceBeam: traceBeam
  };
})();

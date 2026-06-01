var ReportSystem = (function () {

  function generateReport(maze, beamResult) {
    var report = {
      timestamp: new Date().toISOString(),
      mazeInfo: { rows: maze.rows, cols: maze.cols },
      summary: generateSummary(maze, beamResult),
      sections: []
    };

    report.sections.push(generateReflectionSection(beamResult));
    report.sections.push(generateFocalSection(beamResult));
    report.sections.push(generateBeamSection(maze, beamResult));
    report.sections.push(generateConflictSection(maze.conflicts));
    report.sections.push(generateScoreSection(maze.score, beamResult));

    return report;
  }

  function generateSummary(maze, beamResult) {
    var totalErrors = 0;
    var totalWarnings = 0;
    if (beamResult) {
      totalErrors += beamResult.reflections.filter(function (r) { return !r.isCorrect; }).length;
      totalErrors += beamResult.wallViolations.length;
      totalWarnings += beamResult.refractions.filter(function (r) { return !r.isFocalCorrect || r.focalLength === 0; }).length;
      if (!beamResult.reachedTarget) totalWarnings++;
    }
    return {
      reachedTarget: beamResult ? beamResult.reachedTarget : false,
      totalReflections: beamResult ? beamResult.reflections.length : 0,
      totalRefractions: beamResult ? beamResult.refractions.length : 0,
      errorCount: totalErrors,
      warningCount: totalWarnings,
      score: maze.score.total
    };
  }

  function generateReflectionSection(beamResult) {
    var section = {
      title: '反射角诊断',
      icon: '🪞',
      items: []
    };
    if (!beamResult || beamResult.reflections.length === 0) {
      section.items.push({
        level: 'info',
        title: '无反射记录',
        detail: '当前光路未经过任何平面镜反射',
        formula: null
      });
      return section;
    }
    for (var i = 0; i < beamResult.reflections.length; i++) {
      var ref = beamResult.reflections[i];
      if (ref.isCorrect) {
        section.items.push({
          level: 'ok',
          title: '平面镜(' + ref.mirrorRow + ',' + ref.mirrorCol + ') — 反射角正确',
          detail: '入射角 = 反射角 = ' + ref.incidentAngleDeg.toFixed(1) + '°, 满足反射定律: θᵢ = θᵣ',
          formula: 'θᵢ = θᵣ → ' + ref.incidentAngleDeg.toFixed(1) + '° = ' + ref.reflectedAngleDeg.toFixed(1) + '° ✓',
          mirrorAngle: ref.mirrorAngle,
          incidentAngle: ref.incidentAngleDeg,
          reflectedAngle: ref.reflectedAngleDeg
        });
      } else {
        section.items.push({
          level: 'error',
          title: '平面镜(' + ref.mirrorRow + ',' + ref.mirrorCol + ') — 反射角错误',
          detail: '入射角 = ' + ref.incidentAngleDeg.toFixed(1) + '°, 但反射角 = ' + ref.reflectedAngleDeg.toFixed(1) + '°, 不满足反射定律。'
            + '原因分析: 平面镜角度=' + ref.mirrorAngle + '°, 法线方向与镜面垂直, 检查镜面朝向是否正确。',
          formula: 'θᵢ ≠ θᵣ → ' + ref.incidentAngleDeg.toFixed(1) + '° ≠ ' + ref.reflectedAngleDeg.toFixed(1) + '° ✗'
            + '\n应满足: θᵣ = θᵢ = ' + ref.incidentAngleDeg.toFixed(1) + '°'
            + '\n修正: 将平面镜角度调整为 ' + (ref.mirrorAngle + (ref.reflectedAngleDeg - ref.incidentAngleDeg)).toFixed(1) + '°',
          mirrorAngle: ref.mirrorAngle,
          incidentAngle: ref.incidentAngleDeg,
          reflectedAngle: ref.reflectedAngleDeg,
          affectsScore: true,
          scoreImpact: -10
        });
      }
    }
    return section;
  }

  function generateFocalSection(beamResult) {
    var section = {
      title: '透镜焦距诊断',
      icon: '🔬',
      items: []
    };
    if (!beamResult || beamResult.refractions.length === 0) {
      section.items.push({
        level: 'info',
        title: '无透镜记录',
        detail: '当前光路未经过任何透镜折射',
        formula: null
      });
      return section;
    }
    for (var i = 0; i < beamResult.refractions.length; i++) {
      var refr = beamResult.refractions[i];
      var isOmission = refr.focalLength === 0;
      if (isOmission) {
        section.items.push({
          level: 'error',
          title: '透镜(' + refr.lensRow + ',' + refr.lensCol + ') — 焦距漏算',
          detail: '该' + (refr.lensType === 'concave' ? '凹透镜' : '凸透镜') + '未设定有效焦距(f=0), 薄透镜公式无法计算折射方向。'
            + '离轴高度 h=' + refr.heightFromAxis.toFixed(2) + 'cm, 但焦距为0导致偏折无法确定。',
          formula: '1/f = 1/v - 1/u → f=0 无意义'
            + '\n凸透镜: f > 0 (会聚), 凹透镜: f < 0 (发散)'
            + '\n建议: 设定焦距为合理值 (如 10cm)',
          affectsScore: true,
          scoreImpact: -15,
          isSupplementable: true
        });
      } else if (!refr.isFocalCorrect) {
        section.items.push({
          level: 'warn',
          title: '透镜(' + refr.lensRow + ',' + refr.lensCol + ') — 焦距偏差',
          detail: '该' + (refr.lensType === 'concave' ? '凹透镜' : '凸透镜') + '焦距f=' + refr.focalLength + 'cm, '
            + '离轴高度h=' + refr.heightFromAxis.toFixed(2) + 'cm, '
            + '理论偏折=' + (refr.heightFromAxis / refr.focalLength).toFixed(4) + ', '
            + '实际偏折=' + refr.computedDeflection.toFixed(4) + ', 偏差较大。',
          formula: '偏折角 δ ≈ h/f = ' + refr.heightFromAxis.toFixed(2) + '/' + refr.focalLength + ' = ' + (refr.heightFromAxis / refr.focalLength).toFixed(4)
            + '\n薄透镜近似: 出射光线偏向焦点方向',
          affectsScore: true,
          scoreImpact: -8
        });
      } else {
        section.items.push({
          level: 'ok',
          title: '透镜(' + refr.lensRow + ',' + refr.lensCol + ') — 焦距正确',
          detail: 'f=' + refr.focalLength + 'cm, h=' + refr.heightFromAxis.toFixed(2) + 'cm, 偏折计算正确',
          formula: 'δ = h/f = ' + refr.heightFromAxis.toFixed(2) + '/' + refr.focalLength + ' = ' + (refr.heightFromAxis / refr.focalLength).toFixed(4) + ' ✓'
        });
      }
    }
    return section;
  }

  function generateBeamSection(maze, beamResult) {
    var section = {
      title: '光束合规检查',
      icon: '💡',
      items: []
    };
    if (!beamResult) {
      section.items.push({ level: 'info', title: '无光路数据', detail: '尚未进行光路追踪' });
      return section;
    }
    if (beamResult.wallViolations.length === 0) {
      section.items.push({
        level: 'ok',
        title: '光束无穿墙',
        detail: '全部' + beamResult.segments.length + '段光束均未穿过墙壁',
        formula: null
      });
    } else {
      for (var i = 0; i < beamResult.wallViolations.length; i++) {
        var v = beamResult.wallViolations[i];
        section.items.push({
          level: 'error',
          title: '光束穿墙 — 第' + (v.beamSegmentIndex + 1) + '段',
          detail: v.description + ', 穿墙点坐标(' + v.hitPoint.x.toFixed(1) + ',' + v.hitPoint.y.toFixed(1) + ')。'
            + '可能原因: 墙壁位置阻挡了光路, 需调整镜面角度或增加反射次数使光束绕行。',
          formula: null,
          affectsScore: true,
          scoreImpact: -12
        });
      }
    }
    if (beamResult.reachedTarget) {
      section.items.push({
        level: 'ok',
        title: '光束命中目标靶',
        detail: '光束成功到达目标靶位置',
        formula: null
      });
    } else {
      var lastSeg = beamResult.segments[beamResult.segments.length - 1];
      section.items.push({
        level: 'warn',
        title: '光束未命中目标靶',
        detail: lastSeg
          ? '光束最终停于(' + lastSeg.end.x.toFixed(0) + ',' + lastSeg.end.y.toFixed(0) + '), 未到达目标靶(' + maze.target.row + ',' + maze.target.col + ')'
          : '光束未进行有效追踪',
        formula: null,
        affectsScore: true,
        scoreImpact: -30
      });
    }
    return section;
  }

  function generateConflictSection(conflicts) {
    var section = {
      title: '冲突明细',
      icon: '⚠️',
      items: []
    };
    var targetConflicts = conflicts.filter(function (c) {
      return c.type === 'target_conflict' || c.type === 'target_miss';
    });
    var otherConflicts = conflicts.filter(function (c) {
      return c.type !== 'target_conflict' && c.type !== 'target_miss';
    });
    if (conflicts.length === 0) {
      section.items.push({ level: 'ok', title: '无冲突', detail: '光束、透镜、目标靶之间无冲突' });
      return section;
    }
    for (var i = 0; i < otherConflicts.length; i++) {
      var c = otherConflicts[i];
      var sourceTags = c.sources.map(function (s) {
        return '<span class="conflict-badge ' + s + '">' + s + '</span>';
      }).join(' ');
      section.items.push({
        level: c.severity,
        title: c.type === 'reflection_angle' ? '反射角冲突' : c.type === 'focal_omission' ? '焦距漏算' : c.type === 'focal_error' ? '焦距偏差' : c.type === 'beam_through_wall' ? '光束穿墙' : c.type,
        detail: c.description + '\n冲突源: ' + sourceTags,
        formula: null,
        sources: c.sources,
        affectsScore: true
      });
    }
    for (var j = 0; j < targetConflicts.length; j++) {
      var tc = targetConflicts[j];
      section.items.push({
        level: tc.severity,
        title: tc.type === 'target_conflict' ? '目标靶冲突' : '目标靶未命中',
        detail: tc.description,
        formula: null,
        sources: tc.sources,
        affectsScore: true
      });
    }
    return section;
  }

  function generateScoreSection(score, beamResult) {
    var section = {
      title: '成绩影响',
      icon: '📊',
      items: []
    };
    section.items.push({
      level: score.reflectionAccuracy >= 80 ? 'ok' : score.reflectionAccuracy >= 50 ? 'warn' : 'error',
      title: '反射角正确率: ' + score.reflectionAccuracy.toFixed(0) + '%',
      detail: '权重 30%, 贡献 ' + (score.reflectionAccuracy * 0.3).toFixed(1) + ' 分'
    });
    section.items.push({
      level: score.focalAccuracy >= 80 ? 'ok' : score.focalAccuracy >= 50 ? 'warn' : 'error',
      title: '透镜焦距准确率: ' + score.focalAccuracy.toFixed(0) + '%',
      detail: '权重 30%, 贡献 ' + (score.focalAccuracy * 0.3).toFixed(1) + ' 分'
    });
    section.items.push({
      level: score.beamCompliance >= 80 ? 'ok' : 'warn',
      title: '光束合规率: ' + score.beamCompliance.toFixed(0) + '%',
      detail: '权重 10%, 贡献 ' + (score.beamCompliance * 0.1).toFixed(1) + ' 分'
    });
    var targetBonus = beamResult && beamResult.reachedTarget ? 30 : 0;
    section.items.push({
      level: targetBonus > 0 ? 'ok' : 'warn',
      title: '命中目标靶: ' + (targetBonus > 0 ? '+' + targetBonus : '0') + ' 分',
      detail: targetBonus > 0 ? '光束成功到达目标靶, 加30分' : '光束未到达目标靶, 不加分'
    });
    section.items.push({
      level: score.total >= 70 ? 'ok' : score.total >= 40 ? 'warn' : 'error',
      title: '总得分: ' + score.total + ' 分',
      detail: '满分100 = 反射30% + 焦距30% + 合规10% + 命中30'
    });
    return section;
  }

  function renderReportToHTML(report) {
    var html = '';
    for (var s = 0; s < report.sections.length; s++) {
      var section = report.sections[s];
      html += '<div style="margin-bottom:12px;">';
      html += '<h4 style="font-size:13px;color:#8b949e;margin-bottom:6px;">' + section.icon + ' ' + section.title + '</h4>';
      for (var i = 0; i < section.items.length; i++) {
        var item = section.items[i];
        var lines = item.detail.split('\n');
        var detailHTML = lines.join('<br>');
        var formulaHTML = '';
        if (item.formula) {
          var formulaLines = item.formula.split('\n');
          formulaHTML = '<div class="report-formula">' + formulaLines.join('<br>') + '</div>';
        }
        html += '<div class="report-item ' + item.level + '">';
        html += '<div class="report-title">' + item.title + '</div>';
        html += '<div class="report-detail">' + detailHTML + '</div>';
        html += formulaHTML;
        if (item.affectsScore && item.scoreImpact) {
          html += '<div style="font-size:11px;color:#f85149;margin-top:4px;">影响成绩: ' + item.scoreImpact + ' 分</div>';
        }
        if (item.isSupplementable) {
          html += '<div style="font-size:11px;color:#58a6ff;margin-top:4px;">→ 可通过「补录焦距」修正</div>';
        }
        html += '</div>';
      }
      html += '</div>';
    }
    return html;
  }

  function renderConflictsToHTML(conflicts) {
    if (!conflicts || conflicts.length === 0) {
      return '<div class="report-item ok"><div class="report-title">无冲突</div><div class="report-detail">光束、透镜、目标靶之间无冲突</div></div>';
    }
    var html = '';
    var grouped = {};
    for (var i = 0; i < conflicts.length; i++) {
      var c = conflicts[i];
      var key = c.sources.sort().join('+');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(c);
    }
    for (var groupKey in grouped) {
      var items = grouped[groupKey];
      var sourceTags = groupKey.split('+').map(function (s) {
        return '<span class="conflict-badge ' + s + '">' + s + '</span>';
      }).join(' ');
      html += '<div style="margin-bottom:12px;">';
      html += '<h4 style="font-size:13px;color:#8b949e;margin-bottom:6px;">冲突源: ' + sourceTags + '</h4>';
      for (var j = 0; j < items.length; j++) {
        html += '<div class="report-item ' + items[j].severity + '">';
        html += '<div class="report-title">' + items[j].type + '</div>';
        html += '<div class="report-detail">' + items[j].description + '</div>';
        html += '</div>';
      }
      html += '</div>';
    }
    return html;
  }

  function exportReportAsText(report) {
    var lines = [];
    lines.push('═══════════════════════════════════════');
    lines.push('  几何光学反射迷宫 — 诊断报告');
    lines.push('  生成时间: ' + report.timestamp);
    lines.push('═══════════════════════════════════════');
    lines.push('');
    lines.push('【总览】');
    lines.push('  命中目标: ' + (report.summary.reachedTarget ? '是' : '否'));
    lines.push('  反射次数: ' + report.summary.totalReflections);
    lines.push('  折射次数: ' + report.summary.totalRefractions);
    lines.push('  错误数: ' + report.summary.errorCount);
    lines.push('  警告数: ' + report.summary.warningCount);
    lines.push('  总得分: ' + report.summary.score);
    lines.push('');
    for (var s = 0; s < report.sections.length; s++) {
      var section = report.sections[s];
      lines.push('【' + section.title + '】');
      for (var i = 0; i < section.items.length; i++) {
        var item = section.items[i];
        var levelTag = item.level === 'ok' ? '[✓]' : item.level === 'error' ? '[✗]' : item.level === 'warn' ? '[!]' : '[i]';
        lines.push('  ' + levelTag + ' ' + item.title);
        lines.push('    ' + item.detail.replace(/\n/g, '\n    '));
        if (item.formula) lines.push('    公式: ' + item.formula.replace(/\n/g, '\n    '));
        if (item.affectsScore && item.scoreImpact) lines.push('    影响成绩: ' + item.scoreImpact + ' 分');
      }
      lines.push('');
    }
    lines.push('═══════════════════════════════════════');
    return lines.join('\n');
  }

  return {
    generateReport: generateReport,
    renderReportToHTML: renderReportToHTML,
    renderConflictsToHTML: renderConflictsToHTML,
    exportReportAsText: exportReportAsText
  };
})();

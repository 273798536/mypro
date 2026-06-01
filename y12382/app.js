var App = (function () {
  var records = [];
  var pendingRaw = { audioFiles: [], textNotes: [], trackList: [], practiceDuration: null, durationReporter: '' };
  var pendingAnalysis = null;
  var charts = {};
  var nextId = 1;

  var EMOTION_KEYWORDS = {
    positive: ['开心', '高兴', '满意', '进步', '成功', '掌握', '流畅', '自信', '享受', '兴奋', '愉快', '顺利', '突破', '提高', '好', '棒', '赞', '喜欢', '爱', '完美', '轻松', '自豪', '骄傲', '欣慰'],
    neutral: ['一般', '还行', '正常', '普通', '平常', '如常', '标准', '继续', '坚持', '练习', '完成', '日常', '惯例', '按部就班'],
    negative: ['困难', '挫折', '烦躁', '沮丧', '疲惫', '无聊', '焦虑', '紧张', '错误', '失败', '退步', '卡住', '不会', '难', '累', '糟', '差', '崩溃', '放弃', '痛苦', '挣扎', '纠结', '难受', '头疼']
  };

  var ANOMALY_TYPES = {
    AUDIO_GAP: 'audio_gap',
    TRACK_MISMATCH: 'track_mismatch',
    EMOTION_MISJUDGE: 'emotion_misjudge'
  };

  function generateId() {
    return 'REC-' + String(nextId++).padStart(4, '0');
  }

  function formatDate(d) {
    if (!d) return '';
    var date = d instanceof Date ? d : new Date(d);
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function formatDateTime(d) {
    if (!d) return '';
    var date = d instanceof Date ? d : new Date(d);
    return formatDate(date) + ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
  }

  function showToast(msg, type) {
    type = type || 'info';
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast ' + type;
    setTimeout(function () {
      toast.classList.add('hiding');
      setTimeout(function () { toast.classList.add('hidden'); toast.classList.remove('hiding'); }, 300);
    }, 2500);
  }

  function analyzeEmotionFromText(text) {
    if (!text || text.trim() === '') return { emotion: 'neutral', score: 50, confidence: 0 };
    var lower = text.toLowerCase();
    var posCount = 0;
    var negCount = 0;
    var neuCount = 0;
    EMOTION_KEYWORDS.positive.forEach(function (kw) { if (lower.includes(kw)) posCount++; });
    EMOTION_KEYWORDS.negative.forEach(function (kw) { if (lower.includes(kw)) negCount++; });
    EMOTION_KEYWORDS.neutral.forEach(function (kw) { if (lower.includes(kw)) neuCount++; });
    var total = posCount + negCount + neuCount;
    if (total === 0) return { emotion: 'neutral', score: 50, confidence: 0.1 };
    var posRatio = posCount / total;
    var negRatio = negCount / total;
    var emotion, score;
    if (posRatio > negRatio + 0.15) {
      emotion = 'positive';
      score = Math.min(95, 65 + Math.round(posRatio * 40));
    } else if (negRatio > posRatio + 0.15) {
      emotion = 'negative';
      score = Math.max(5, 35 - Math.round(negRatio * 30));
    } else {
      emotion = 'neutral';
      score = 40 + Math.round((posRatio - negRatio) * 30);
    }
    return { emotion: emotion, score: score, confidence: Math.min(1, total / 5) };
  }

  function detectAnomalies(raw, analysis) {
    var anomalies = [];
    if (raw.audioFiles && raw.audioFiles.length > 0) {
      raw.audioFiles.forEach(function (af) {
        if (af.hasGaps) {
          anomalies.push({
            type: ANOMALY_TYPES.AUDIO_GAP,
            severity: 'high',
            description: '音频"' + af.name + '"存在缺段（时长 ' + af.duration + '秒，存在间断）',
            source: 'audio:' + af.name,
            suggestion: '建议补录缺失部分或标注缺段位置'
          });
        }
        if (af.duration < 60 && raw.practiceDuration && raw.practiceDuration > 5) {
          anomalies.push({
            type: ANOMALY_TYPES.AUDIO_GAP,
            severity: 'medium',
            description: '音频"' + af.name + '"时长（' + af.duration + '秒）远短于申报练习时长（' + raw.practiceDuration + '分钟）',
            source: 'audio:' + af.name,
            suggestion: '音频可能不完整，请核实是否上传了全部录音'
          });
        }
      });
    }
    if (raw.trackList && raw.trackList.length > 0) {
      var totalExpected = 0;
      raw.trackList.forEach(function (t) { totalExpected += (t.duration || 0); });
      if (raw.practiceDuration && totalExpected > 0) {
        var diff = Math.abs(raw.practiceDuration - totalExpected);
        if (diff > totalExpected * 0.5) {
          anomalies.push({
            type: ANOMALY_TYPES.TRACK_MISMATCH,
            severity: 'medium',
            description: '曲目预计总时长（' + totalExpected + '分钟）与实际练习时长（' + raw.practiceDuration + '分钟）差异较大',
            source: 'trackList',
            suggestion: '请核实曲目清单是否完整或练习时长是否准确'
          });
        }
      }
      if (raw.audioFiles && raw.audioFiles.length > 0) {
        var totalAudioDur = 0;
        raw.audioFiles.forEach(function (af) { totalAudioDur += (af.duration || 0); });
        var audioMin = Math.round(totalAudioDur / 60);
        if (totalExpected > 0 && Math.abs(audioMin - totalExpected) > totalExpected * 0.4) {
          anomalies.push({
            type: ANOMALY_TYPES.TRACK_MISMATCH,
            severity: 'low',
            description: '音频总时长（约' + audioMin + '分钟）与曲目预计总时长（' + totalExpected + '分钟）不匹配',
            source: 'audio+trackList',
            suggestion: '可能存在曲目错配，建议核对音频与曲目对应关系'
          });
        }
      }
    }
    if (analysis && analysis.confidence < 0.4 && raw.textNotes && raw.textNotes.length > 0) {
      anomalies.push({
        type: ANOMALY_TYPES.EMOTION_MISJUDGE,
        severity: 'medium',
        description: '文字心得情绪判定置信度较低（' + Math.round(analysis.confidence * 100) + '%），可能存在误判',
        source: 'textNote',
        suggestion: '建议人工复核情绪标签，心得内容可能含隐含情绪'
      });
    }
    if (raw.textNotes && raw.textNotes.length > 1) {
      var emotions = raw.textNotes.map(function (n) { return analyzeEmotionFromText(n.content); });
      var hasConflict = emotions.some(function (e, i) {
        return i > 0 && e.emotion !== emotions[0].emotion;
      });
      if (hasConflict) {
        anomalies.push({
          type: ANOMALY_TYPES.EMOTION_MISJUDGE,
          severity: 'low',
          description: '多条文字心得情绪倾向不一致，存在矛盾',
          source: 'textNote:multi',
          suggestion: '不同心得可能来自不同时段，建议分段分析或标注'
        });
      }
    }
    return anomalies;
  }

  function generateTextInsight(analysis, raw) {
    var parts = [];
    var emotionMap = { positive: '积极', neutral: '中性', negative: '消极' };
    parts.push('情绪倾向：' + (emotionMap[analysis.emotion] || analysis.emotion));
    parts.push('情绪分值：' + analysis.score + '/100');
    if (raw.textNotes && raw.textNotes.length > 0) {
      var allText = raw.textNotes.map(function (n) { return n.content; }).join('；');
      if (allText.length > 100) allText = allText.substring(0, 100) + '…';
      parts.push('心得摘要：' + allText);
    }
    if (raw.practiceDuration) {
      parts.push('练习时长：' + raw.practiceDuration + '分钟');
    }
    if (raw.trackList && raw.trackList.length > 0) {
      parts.push('练习曲目：' + raw.trackList.map(function (t) { return t.name; }).join('、'));
    }
    return parts.join(' | ');
  }

  function analyzeCheckIn() {
    var textContent = '';
    if (pendingRaw.textNotes.length > 0) {
      textContent = pendingRaw.textNotes.map(function (n) { return n.content; }).join(' ');
    }
    var analysis = analyzeEmotionFromText(textContent);
    var anomalies = detectAnomalies(pendingRaw, analysis);
    var insight = generateTextInsight(analysis, pendingRaw);
    return {
      emotion: analysis.emotion,
      emotionScore: analysis.score,
      confidence: analysis.confidence,
      anomalies: anomalies,
      textInsight: insight
    };
  }

  function buildTraceability(record) {
    var chain = [];
    if (record.raw.audioFiles && record.raw.audioFiles.length > 0) {
      record.raw.audioFiles.forEach(function (af) {
        chain.push({ type: 'audio', label: af.name, id: 'audio:' + af.name });
      });
    }
    if (record.raw.textNotes && record.raw.textNotes.length > 0) {
      record.raw.textNotes.forEach(function (n, i) {
        chain.push({ type: 'text', label: '心得#' + (i + 1) + (n.author ? '(' + n.author + ')' : ''), id: 'text:' + i });
      });
    }
    if (record.raw.trackList && record.raw.trackList.length > 0) {
      chain.push({ type: 'trackList', label: '曲目清单(' + record.raw.trackList.length + '首)', id: 'trackList' });
    }
    if (record.raw.practiceDuration) {
      chain.push({ type: 'duration', label: '时长:' + record.raw.practiceDuration + '分', id: 'duration' });
    }
    chain.push({ type: 'analysis', label: '分析结果', id: 'analysis' });
    if (record.report) {
      chain.push({ type: 'report', label: '导出报告', id: 'report:' + formatDate(record.report.exportedAt) });
    }
    return chain;
  }

  function confirmRecord() {
    if (!pendingAnalysis) return;
    var studentName = document.getElementById('studentName').value.trim();
    var checkInDate = document.getElementById('checkInDate').value;
    if (!studentName) { showToast('请输入学生姓名', 'warning'); return; }
    if (!checkInDate) { showToast('请选择打卡日期', 'warning'); return; }
    var record = {
      id: generateId(),
      studentName: studentName,
      checkInDate: checkInDate,
      raw: JSON.parse(JSON.stringify(pendingRaw)),
      analysis: JSON.parse(JSON.stringify(pendingAnalysis)),
      report: null,
      traceability: [],
      createdAt: new Date()
    };
    record.traceability = buildTraceability(record);
    records.push(record);
    pendingRaw = { audioFiles: [], textNotes: [], trackList: [], practiceDuration: null, durationReporter: '' };
    pendingAnalysis = null;
    document.getElementById('analysisPreview').classList.add('hidden');
    document.getElementById('studentName').value = '';
    document.getElementById('audioFileList').innerHTML = '';
    document.getElementById('textNoteInput').value = '';
    document.getElementById('noteAuthor').value = '';
    document.getElementById('practiceDuration').value = '';
    document.getElementById('durationReporter').value = '';
    document.getElementById('trackListContainer').innerHTML = '<div class="track-row"><input type="text" placeholder="曲目名称" class="track-name"><input type="number" placeholder="预计时长(分)" class="track-duration" min="0"><button class="btn-icon btn-remove" title="移除">×</button></div>';
    renderRecordsList();
    updateCharts();
    showToast('打卡记录已录入：' + record.id, 'success');
  }

  function renderRecordsList() {
    var container = document.getElementById('recordsList');
    document.getElementById('recordCount').textContent = records.length;
    if (records.length === 0) {
      container.innerHTML = '<p class="empty-hint">暂无打卡记录，请在左侧导入后分析</p>';
      return;
    }
    var html = '';
    records.slice().reverse().forEach(function (r) {
      var emotionLabel = { positive: '积极', neutral: '中性', negative: '消极' }[r.analysis.emotion] || r.analysis.emotion;
      var anomalyBadge = r.analysis.anomalies.length > 0 ? '<span class="badge-anomaly">' + r.analysis.anomalies.length + '个异常</span>' : '';
      var exportBadge = r.report ? '<span class="badge-exported">已导出</span>' : '';
      html += '<div class="record-item" data-id="' + r.id + '">' +
        '<div class="record-meta">' +
        '<div class="record-name">' + r.studentName + ' - ' + r.checkInDate + '</div>' +
        '<div class="record-sub">' + r.id + ' | 时长' + (r.raw.practiceDuration || '-') + '分 | ' + (r.raw.trackList ? r.raw.trackList.length : 0) + '首曲目</div>' +
        '</div>' +
        '<div class="record-badges">' +
        '<span class="badge-emotion ' + r.analysis.emotion + '">' + emotionLabel + '</span>' +
        anomalyBadge + exportBadge +
        '</div></div>';
    });
    container.innerHTML = html;
    container.querySelectorAll('.record-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-id');
        switchTab('detail');
        openDetailModal(id);
      });
    });
  }

  function renderDetailList() {
    var container = document.getElementById('detailList');
    var filter = document.getElementById('detailFilter').value;
    var search = document.getElementById('detailSearch').value.trim().toLowerCase();
    var filtered = records.filter(function (r) {
      if (search && r.studentName.toLowerCase().indexOf(search) === -1 && r.checkInDate.indexOf(search) === -1) return false;
      if (filter === 'anomaly' && r.analysis.anomalies.length === 0) return false;
      if (filter === 'exported' && !r.report) return false;
      if (filter === 'not_exported' && r.report) return false;
      return true;
    });
    if (filtered.length === 0) {
      container.innerHTML = '<p class="empty-hint">无匹配记录</p>';
      return;
    }
    var html = '';
    filtered.slice().reverse().forEach(function (r) {
      var emotionLabel = { positive: '积极', neutral: '中性', negative: '消极' }[r.analysis.emotion] || r.analysis.emotion;
      var anomalyBadge = r.analysis.anomalies.length > 0 ? '<span class="badge-anomaly">' + r.analysis.anomalies.length + '个异常</span>' : '';
      var exportBadge = r.report ? '<span class="badge-exported">已导出</span>' : '';
      var traceHtml = r.traceability.map(function (t) { return t.label; }).join(' → ');
      html += '<div class="detail-card" role="button" tabindex="0" data-id="' + r.id + '" aria-label="查看' + r.studentName + '的打卡详情">' +
        '<div class="detail-card-header">' +
        '<span class="detail-card-title">' + r.studentName + ' - ' + r.checkInDate + ' (' + r.id + ')</span>' +
        '<div class="detail-card-badges">' +
        '<span class="badge-emotion ' + r.analysis.emotion + '">' + emotionLabel + '</span>' +
        anomalyBadge + exportBadge +
        '</div></div>' +
        '<div class="detail-card-body">' +
        '<span>时长: ' + (r.raw.practiceDuration || '-') + '分</span>' +
        '<span>曲目: ' + (r.raw.trackList ? r.raw.trackList.length : 0) + '首</span>' +
        '<span>音频: ' + (r.raw.audioFiles ? r.raw.audioFiles.length : 0) + '个</span>' +
        '<span>心得: ' + (r.raw.textNotes ? r.raw.textNotes.length : 0) + '条</span>' +
        '</div>' +
        '<div class="detail-traceability">追溯链: ' + traceHtml + '</div>' +
        '</div>';
    });
    container.innerHTML = html;
    container.querySelectorAll('.detail-card').forEach(function (el) {
      el.addEventListener('click', function () {
        openDetailModal(el.getAttribute('data-id'));
      });
    });
  }

  function openDetailModal(id) {
    var record = records.find(function (r) { return r.id === id; });
    if (!record) return;
    document.getElementById('modalTitle').textContent = record.id + ' - ' + record.studentName;
    var body = document.getElementById('modalBody');
    var html = '';
    html += '<div class="detail-section"><h3>📎 追溯对应关系</h3>';
    html += '<div class="trace-chain">';
    record.traceability.forEach(function (t, i) {
      if (i > 0) html += '<span class="trace-arrow">→</span>';
      html += '<span class="trace-link" title="' + t.id + '">' + t.label + '</span>';
    });
    html += '</div></div>';
    html += '<div class="detail-section"><h3>📂 原始材料</h3>';
    html += '<table class="detail-table"><thead><tr><th>类型</th><th>内容</th><th>来源</th></tr></thead><tbody>';
    if (record.raw.audioFiles && record.raw.audioFiles.length > 0) {
      record.raw.audioFiles.forEach(function (af) {
        html += '<tr><td>音频</td><td>' + af.name + '（' + af.duration + '秒' + (af.hasGaps ? '，有缺段' : '') + '）</td><td>' + (af.uploader || '未知') + '</td></tr>';
      });
    }
    if (record.raw.textNotes && record.raw.textNotes.length > 0) {
      record.raw.textNotes.forEach(function (n, i) {
        html += '<tr><td>文字心得</td><td>' + n.content + '</td><td>' + (n.author || '未知') + '</td></tr>';
      });
    }
    if (record.raw.trackList && record.raw.trackList.length > 0) {
      record.raw.trackList.forEach(function (t) {
        html += '<tr><td>曲目</td><td>' + t.name + '（预计' + (t.duration || '-') + '分钟）</td><td>-</td></tr>';
      });
    }
    if (record.raw.practiceDuration) {
      html += '<tr><td>练习时长</td><td>' + record.raw.practiceDuration + '分钟</td><td>' + (record.raw.durationReporter || '未知') + '</td></tr>';
    }
    html += '</tbody></table></div>';
    html += '<div class="detail-section"><h3>🔬 分析结果</h3>';
    var emotionLabel = { positive: '积极', neutral: '中性', negative: '消极' }[record.analysis.emotion] || record.analysis.emotion;
    html += '<table class="detail-table"><tbody>';
    html += '<tr><td style="width:120px;font-weight:600">情绪判定</td><td><span class="badge-emotion ' + record.analysis.emotion + '">' + emotionLabel + '</span></td></tr>';
    html += '<tr><td style="font-weight:600">情绪分值</td><td>' + record.analysis.emotionScore + '/100</td></tr>';
    html += '<tr><td style="font-weight:600">置信度</td><td>' + Math.round(record.analysis.confidence * 100) + '%</td></tr>';
    html += '<tr><td style="font-weight:600">文字心得结论</td><td>' + record.analysis.textInsight + '</td></tr>';
    html += '</tbody></table></div>';
    if (record.analysis.anomalies.length > 0) {
      html += '<div class="detail-section"><h3>⚠️ 异常信息</h3>';
      record.analysis.anomalies.forEach(function (a) {
        var typeLabel = { audio_gap: '音频缺段', track_mismatch: '曲目错配', emotion_misjudge: '情绪误判' }[a.type] || a.type;
        html += '<div class="anomaly-item severity-' + a.severity + '">' +
          '<div class="anomaly-type">[' + typeLabel + '] 严重度: ' + a.severity + '</div>' +
          '<div>' + a.description + '</div>' +
          '<div style="color:#6b7280;margin-top:4px">建议: ' + a.suggestion + '</div>' +
          '</div>';
      });
      html += '</div>';
    }
    if (record.report) {
      html += '<div class="detail-section"><h3>📄 导出报告</h3>';
      html += '<table class="detail-table"><tbody>';
      html += '<tr><td style="width:120px;font-weight:600">导出时间</td><td>' + formatDateTime(record.report.exportedAt) + '</td></tr>';
      html += '<tr><td style="font-weight:600">报告结论</td><td>' + record.report.conclusion + '</td></tr>';
      html += '<tr><td style="font-weight:600">包含异常</td><td>' + (record.report.anomaliesIncluded ? '是' : '否') + '</td></tr>';
      html += '<tr><td style="font-weight:600">包含追溯</td><td>' + (record.report.traceabilityIncluded ? '是' : '否') + '</td></tr>';
      html += '</tbody></table></div>';
    }
    body.innerHTML = html;
    document.getElementById('detailModal').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
  }

  function updateCharts() {
    if (records.length === 0) {
      Object.keys(charts).forEach(function (k) { if (charts[k]) charts[k].destroy(); charts[k] = null; });
      return;
    }
    var sorted = records.slice().sort(function (a, b) { return a.checkInDate.localeCompare(b.checkInDate); });
    var labels = sorted.map(function (r) { return r.checkInDate; });
    var durations = sorted.map(function (r) { return r.raw.practiceDuration || 0; });
    var scores = sorted.map(function (r) { return r.analysis.emotionScore; });
    var emotionCounts = { positive: 0, neutral: 0, negative: 0 };
    sorted.forEach(function (r) { emotionCounts[r.analysis.emotion]++; });
    var anomalyTypeCounts = { audio_gap: 0, track_mismatch: 0, emotion_misjudge: 0 };
    sorted.forEach(function (r) {
      r.analysis.anomalies.forEach(function (a) { anomalyTypeCounts[a.type]++; });
    });

    document.getElementById('statTotalRecords').textContent = records.length;
    document.getElementById('statTotalDuration').textContent = records.reduce(function (s, r) { return s + (r.raw.practiceDuration || 0); }, 0);
    document.getElementById('statAvgScore').textContent = records.length > 0 ? Math.round(records.reduce(function (s, r) { return s + r.analysis.emotionScore; }, 0) / records.length) : '-';
    document.getElementById('statAnomalyCount').textContent = records.reduce(function (s, r) { return s + r.analysis.anomalies.length; }, 0);

    var chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } } }
    };

    if (charts.duration) charts.duration.destroy();
    charts.duration = new Chart(document.getElementById('durationChart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{ label: '练习时长(分)', data: durations, backgroundColor: '#818cf8', borderRadius: 4 }]
      },
      options: chartOptions
    });

    if (charts.emotion) charts.emotion.destroy();
    charts.emotion = new Chart(document.getElementById('emotionChart'), {
      type: 'doughnut',
      data: {
        labels: ['积极', '中性', '消极'],
        datasets: [{
          data: [emotionCounts.positive, emotionCounts.neutral, emotionCounts.negative],
          backgroundColor: ['#059669', '#d97706', '#dc2626']
        }]
      },
      options: chartOptions
    });

    if (charts.emotionTrend) charts.emotionTrend.destroy();
    charts.emotionTrend = new Chart(document.getElementById('emotionTrendChart'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '情绪分值',
          data: scores,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79,70,229,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#4f46e5'
        }]
      },
      options: chartOptions
    });

    if (charts.anomaly) charts.anomaly.destroy();
    charts.anomaly = new Chart(document.getElementById('anomalyChart'), {
      type: 'bar',
      data: {
        labels: ['音频缺段', '曲目错配', '情绪误判'],
        datasets: [{
          label: '异常次数',
          data: [anomalyTypeCounts.audio_gap, anomalyTypeCounts.track_mismatch, anomalyTypeCounts.emotion_misjudge],
          backgroundColor: ['#dc2626', '#d97706', '#818cf8'],
          borderRadius: 4
        }]
      },
      options: chartOptions
    });
  }

  function generateReport() {
    var scope = document.getElementById('exportScope').value;
    var includeAnomalies = document.getElementById('exportIncludeAnomalies').checked;
    var includeRaw = document.getElementById('exportIncludeRaw').checked;
    var includeTraceability = document.getElementById('exportIncludeTraceability').checked;
    var targetRecords = [];
    if (scope === 'all') {
      targetRecords = records.slice();
    } else if (scope === 'date_range') {
      var from = document.getElementById('exportDateFrom').value;
      var to = document.getElementById('exportDateTo').value;
      if (!from || !to) { showToast('请选择日期范围', 'warning'); return; }
      targetRecords = records.filter(function (r) { return r.checkInDate >= from && r.checkInDate <= to; });
    } else if (scope === 'single') {
      var sel = document.getElementById('exportRecordSelect').value;
      if (!sel) { showToast('请选择记录', 'warning'); return; }
      var rec = records.find(function (r) { return r.id === sel; });
      if (rec) targetRecords = [rec];
    }
    if (targetRecords.length === 0) { showToast('没有可导出的记录', 'warning'); return; }
    var lines = [];
    lines.push('═══════════════════════════════════════');
    lines.push('       练琴打卡情绪分析报告');
    lines.push('═══════════════════════════════════════');
    lines.push('生成时间: ' + formatDateTime(new Date()));
    lines.push('记录数量: ' + targetRecords.length);
    lines.push('');
    targetRecords.forEach(function (r) {
      var emotionLabel = { positive: '积极', neutral: '中性', negative: '消极' }[r.analysis.emotion] || r.analysis.emotion;
      lines.push('───────────────────────────────────────');
      lines.push('记录编号: ' + r.id);
      lines.push('学生姓名: ' + r.studentName);
      lines.push('打卡日期: ' + r.checkInDate);
      lines.push('');
      lines.push('【分析结论】');
      lines.push('情绪判定: ' + emotionLabel);
      lines.push('情绪分值: ' + r.analysis.emotionScore + '/100');
      lines.push('文字心得结论: ' + r.analysis.textInsight);
      lines.push('');
      if (includeRaw) {
        lines.push('【原始材料索引】');
        if (r.raw.audioFiles && r.raw.audioFiles.length > 0) {
          r.raw.audioFiles.forEach(function (af) {
            lines.push('  音频: ' + af.name + ' (' + af.duration + '秒' + (af.hasGaps ? ', 有缺段' : '') + ') [来源: ' + (af.uploader || '未知') + ']');
          });
        }
        if (r.raw.textNotes && r.raw.textNotes.length > 0) {
          r.raw.textNotes.forEach(function (n, i) {
            lines.push('  心得#' + (i + 1) + ': ' + n.content + ' [作者: ' + (n.author || '未知') + ']');
          });
        }
        if (r.raw.trackList && r.raw.trackList.length > 0) {
          r.raw.trackList.forEach(function (t) {
            lines.push('  曲目: ' + t.name + ' (预计' + (t.duration || '-') + '分钟)');
          });
        }
        if (r.raw.practiceDuration) {
          lines.push('  练习时长: ' + r.raw.practiceDuration + '分钟 [提供者: ' + (r.raw.durationReporter || '未知') + ']');
        }
        lines.push('');
      }
      if (includeAnomalies && r.analysis.anomalies.length > 0) {
        lines.push('【异常信息】');
        r.analysis.anomalies.forEach(function (a, i) {
          var typeLabel = { audio_gap: '音频缺段', track_mismatch: '曲目错配', emotion_misjudge: '情绪误判' }[a.type] || a.type;
          lines.push('  ' + (i + 1) + '. [' + typeLabel + '] 严重度: ' + a.severity);
          lines.push('     描述: ' + a.description);
          lines.push('     建议: ' + a.suggestion);
        });
        lines.push('');
      }
      if (includeTraceability) {
        lines.push('【追溯对应关系】');
        r.traceability.forEach(function (t, i) {
          lines.push('  ' + (i + 1) + '. ' + t.label + ' → ' + t.id);
        });
        lines.push('');
      }
    });
    lines.push('═══════════════════════════════════════');
    lines.push('报告结束');
    lines.push('═══════════════════════════════════════');
    var reportText = lines.join('\n');
    var conclusion = targetRecords.map(function (r) {
      return r.id + ': ' + r.analysis.textInsight;
    }).join('；');
    targetRecords.forEach(function (r) {
      r.report = {
        exportedAt: new Date(),
        conclusion: conclusion,
        anomaliesIncluded: includeAnomalies,
        traceabilityIncluded: includeTraceability,
        rawIncluded: includeRaw
      };
      r.traceability = buildTraceability(r);
    });
    document.getElementById('reportPreview').textContent = reportText;
    document.getElementById('exportActions').classList.remove('hidden');
    renderRecordsList();
    renderDetailList();
    updateCharts();
    showToast('报告已生成，可下载', 'success');
    return reportText;
  }

  function downloadFile(content, filename, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadTxtReport() {
    var text = document.getElementById('reportPreview').textContent;
    if (!text || text.indexOf('点击') === 0) { showToast('请先生成报告', 'warning'); return; }
    downloadFile(text, '练琴打卡情绪分析报告_' + formatDate(new Date()) + '.txt', 'text/plain;charset=utf-8');
    showToast('TXT报告已下载', 'success');
  }

  function downloadJsonData() {
    var scope = document.getElementById('exportScope').value;
    var targetRecords = [];
    if (scope === 'all') {
      targetRecords = records.slice();
    } else if (scope === 'date_range') {
      var from = document.getElementById('exportDateFrom').value;
      var to = document.getElementById('exportDateTo').value;
      targetRecords = records.filter(function (r) { return r.checkInDate >= from && r.checkInDate <= to; });
    } else if (scope === 'single') {
      var sel = document.getElementById('exportRecordSelect').value;
      var rec = records.find(function (r) { return r.id === sel; });
      if (rec) targetRecords = [rec];
    }
    var exportData = targetRecords.map(function (r) {
      return {
        id: r.id,
        studentName: r.studentName,
        checkInDate: r.checkInDate,
        raw: r.raw,
        analysis: {
          emotion: r.analysis.emotion,
          emotionScore: r.analysis.emotionScore,
          confidence: r.analysis.confidence,
          anomalies: r.analysis.anomalies,
          textInsight: r.analysis.textInsight
        },
        report: r.report,
        traceability: r.traceability
      };
    });
    var json = JSON.stringify(exportData, null, 2);
    downloadFile(json, '练琴打卡数据_' + formatDate(new Date()) + '.json', 'application/json;charset=utf-8');
    showToast('JSON数据已下载', 'success');
  }

  function switchTab(tabName) {
    document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
    document.querySelectorAll('.nav-btn').forEach(function (b) { b.classList.remove('active'); });
    document.getElementById('tab-' + tabName).classList.add('active');
    document.querySelector('.nav-btn[data-tab="' + tabName + '"]').classList.add('active');
    if (tabName === 'dashboard') updateCharts();
    if (tabName === 'detail') renderDetailList();
    if (tabName === 'export') updateExportRecordSelect();
  }

  function updateExportRecordSelect() {
    var select = document.getElementById('exportRecordSelect');
    select.innerHTML = '';
    records.forEach(function (r) {
      var opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.id + ' - ' + r.studentName + ' (' + r.checkInDate + ')';
      select.appendChild(opt);
    });
  }

  function init() {
    document.getElementById('checkInDate').value = formatDate(new Date());

    document.querySelectorAll('.nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(btn.getAttribute('data-tab'));
      });
    });

    var audioDrop = document.getElementById('audioDrop');
    var audioInput = document.getElementById('audioInput');
    audioDrop.addEventListener('click', function () { audioInput.click(); });
    audioDrop.addEventListener('dragover', function (e) { e.preventDefault(); audioDrop.classList.add('dragover'); });
    audioDrop.addEventListener('dragleave', function () { audioDrop.classList.remove('dragover'); });
    audioDrop.addEventListener('drop', function (e) {
      e.preventDefault();
      audioDrop.classList.remove('dragover');
      handleAudioFiles(e.dataTransfer.files);
    });
    audioInput.addEventListener('change', function () { handleAudioFiles(audioInput.files); });

    function handleAudioFiles(files) {
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        if (!f.type.startsWith('audio/')) continue;
        var duration = Math.round(f.size / 16000);
        var hasGaps = Math.random() < 0.25;
        var uploader = f.name.split('_')[0] || '未知';
        pendingRaw.audioFiles.push({
          name: f.name,
          duration: duration,
          hasGaps: hasGaps,
          size: f.size,
          uploader: uploader
        });
      }
      renderAudioFileList();
    }

    function renderAudioFileList() {
      var list = document.getElementById('audioFileList');
      if (pendingRaw.audioFiles.length === 0) { list.innerHTML = ''; return; }
      var html = '';
      pendingRaw.audioFiles.forEach(function (af, i) {
        html += '<div class="file-item"><div class="file-item-info"><span class="file-item-tag">原始</span><span>' + af.name + '</span><span style="color:#9ca3af">(' + af.duration + '秒' + (af.hasGaps ? ' ⚠缺段' : '') + ')</span></div><button class="btn-icon btn-remove" data-index="' + i + '">×</button></div>';
      });
      list.innerHTML = html;
      list.querySelectorAll('.btn-remove').forEach(function (btn) {
        btn.addEventListener('click', function () {
          pendingRaw.audioFiles.splice(parseInt(btn.getAttribute('data-index')), 1);
          renderAudioFileList();
        });
      });
    }

    document.getElementById('addNoteBtn').addEventListener('click', function () {
      var content = document.getElementById('textNoteInput').value.trim();
      if (!content) { showToast('请输入心得内容', 'warning'); return; }
      var author = document.getElementById('noteAuthor').value.trim() || '匿名';
      pendingRaw.textNotes.push({ content: content, author: author, addedAt: new Date() });
      document.getElementById('textNoteInput').value = '';
      document.getElementById('noteAuthor').value = '';
      showToast('心得已添加（' + author + '）', 'success');
    });

    document.getElementById('addTrackBtn').addEventListener('click', function () {
      var container = document.getElementById('trackListContainer');
      var row = document.createElement('div');
      row.className = 'track-row';
      row.innerHTML = '<input type="text" placeholder="曲目名称" class="track-name"><input type="number" placeholder="预计时长(分)" class="track-duration" min="0"><button class="btn-icon btn-remove" title="移除">×</button>';
      container.appendChild(row);
      row.querySelector('.btn-remove').addEventListener('click', function () { row.remove(); });
    });

    document.getElementById('trackListContainer').addEventListener('click', function (e) {
      if (e.target.classList.contains('btn-remove')) {
        e.target.closest('.track-row').remove();
      }
    });

    document.getElementById('analyzeBtn').addEventListener('click', function () {
      var duration = document.getElementById('practiceDuration').value;
      var reporter = document.getElementById('durationReporter').value.trim();
      if (duration) {
        pendingRaw.practiceDuration = parseFloat(duration);
        pendingRaw.durationReporter = reporter || '未知';
      }
      var trackRows = document.querySelectorAll('#trackListContainer .track-row');
      pendingRaw.trackList = [];
      trackRows.forEach(function (row) {
        var name = row.querySelector('.track-name').value.trim();
        var dur = row.querySelector('.track-duration').value;
        if (name) {
          pendingRaw.trackList.push({ name: name, duration: dur ? parseFloat(dur) : null });
        }
      });
      if (pendingRaw.audioFiles.length === 0 && pendingRaw.textNotes.length === 0 && pendingRaw.trackList.length === 0 && !pendingRaw.practiceDuration) {
        showToast('请至少导入一项原始材料', 'warning');
        return;
      }
      pendingAnalysis = analyzeCheckIn();
      var emotionLabel = { positive: '积极', neutral: '中性', negative: '消极' }[pendingAnalysis.emotion] || pendingAnalysis.emotion;
      document.getElementById('previewEmotion').textContent = emotionLabel;
      document.getElementById('previewScore').textContent = pendingAnalysis.emotionScore + '/100';
      document.getElementById('previewInsight').textContent = pendingAnalysis.textInsight;
      document.getElementById('previewAnomalyCount').textContent = pendingAnalysis.anomalies.length;
      document.getElementById('analysisPreview').classList.remove('hidden');
      showToast('分析完成，请确认录入', 'success');
    });

    document.getElementById('confirmRecordBtn').addEventListener('click', confirmRecord);

    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
    document.querySelector('.modal-overlay').addEventListener('click', closeModal);

    document.getElementById('detailSearch').addEventListener('input', renderDetailList);
    document.getElementById('detailFilter').addEventListener('change', renderDetailList);

    document.getElementById('exportScope').addEventListener('change', function () {
      var v = this.value;
      document.getElementById('dateRangeGroup').style.display = v === 'date_range' ? 'flex' : 'none';
      document.getElementById('singleRecordGroup').style.display = v === 'single' ? 'block' : 'none';
    });

    document.getElementById('generateReportBtn').addEventListener('click', generateReport);
    document.getElementById('downloadTxtBtn').addEventListener('click', downloadTxtReport);
    document.getElementById('downloadJsonBtn').addEventListener('click', downloadJsonData);

    loadSampleData();
  }

  function loadSampleData() {
    var sampleRecords = [
      {
        studentName: '张小明',
        checkInDate: '2026-05-27',
        raw: {
          audioFiles: [
            { name: '张小明_拜厄第58条.mp3', duration: 480, hasGaps: false, size: 7680000, uploader: '张小明' }
          ],
          textNotes: [
            { content: '今天拜厄58条练得很流畅，特别开心，进步明显！', author: '张小明', addedAt: new Date('2026-05-27') }
          ],
          trackList: [
            { name: '拜厄第58条', duration: 8 },
            { name: '拜厄第59条', duration: 6 }
          ],
          practiceDuration: 45,
          durationReporter: '家长'
        }
      },
      {
        studentName: '李思雨',
        checkInDate: '2026-05-28',
        raw: {
          audioFiles: [
            { name: '李思雨_车尔尼599.mp3', duration: 90, hasGaps: true, size: 1440000, uploader: '李思雨' }
          ],
          textNotes: [
            { content: '车尔尼599太难了，手指总是卡住，很烦躁', author: '李思雨', addedAt: new Date('2026-05-28') }
          ],
          trackList: [
            { name: '车尔尼599第15条', duration: 10 }
          ],
          practiceDuration: 30,
          durationReporter: '李思雨'
        }
      },
      {
        studentName: '王浩然',
        checkInDate: '2026-05-29',
        raw: {
          audioFiles: [
            { name: '王浩然_小奏鸣曲.m4a', duration: 360, hasGaps: false, size: 5760000, uploader: '王浩然' }
          ],
          textNotes: [
            { content: '小奏鸣曲第一乐章基本掌握了，第二乐章还要继续练', author: '王浩然', addedAt: new Date('2026-05-29') },
            { content: '今天状态不太好，有点累', author: '王浩然', addedAt: new Date('2026-05-29') }
          ],
          trackList: [
            { name: '小奏鸣曲第一乐章', duration: 8 },
            { name: '小奏鸣曲第二乐章', duration: 10 }
          ],
          practiceDuration: 40,
          durationReporter: '老师'
        }
      },
      {
        studentName: '陈雨萱',
        checkInDate: '2026-05-30',
        raw: {
          audioFiles: [
            { name: '陈雨萱_哈农练习.wav', duration: 300, hasGaps: true, size: 4800000, uploader: '陈雨萱' },
            { name: '陈雨萱_巴赫.mp3', duration: 120, hasGaps: false, size: 1920000, uploader: '家长' }
          ],
          textNotes: [
            { content: '哈农练习还行，巴赫小步舞曲感觉进步了，比较满意', author: '陈雨萱', addedAt: new Date('2026-05-30') }
          ],
          trackList: [
            { name: '哈农第5条', duration: 5 },
            { name: '巴赫小步舞曲', duration: 7 }
          ],
          practiceDuration: 35,
          durationReporter: '陈雨萱'
        }
      },
      {
        studentName: '赵子轩',
        checkInDate: '2026-05-31',
        raw: {
          audioFiles: [],
          textNotes: [
            { content: '今天只练了一会儿，不太想练，感觉没什么进展，比较沮丧', author: '赵子轩', addedAt: new Date('2026-05-31') }
          ],
          trackList: [
            { name: '拜厄第60条', duration: 10 }
          ],
          practiceDuration: 10,
          durationReporter: '赵子轩'
        }
      }
    ];

    sampleRecords.forEach(function (s) {
      var analysis = analyzeCheckIn();
      var textContent = '';
      if (s.raw.textNotes.length > 0) {
        textContent = s.raw.textNotes.map(function (n) { return n.content; }).join(' ');
      }
      var textAnalysis = analyzeEmotionFromText(textContent);
      var anomalies = detectAnomalies(s.raw, textAnalysis);
      var insight = generateTextInsight(textAnalysis, s.raw);
      var record = {
        id: generateId(),
        studentName: s.studentName,
        checkInDate: s.checkInDate,
        raw: s.raw,
        analysis: {
          emotion: textAnalysis.emotion,
          emotionScore: textAnalysis.emotionScore,
          confidence: textAnalysis.confidence,
          anomalies: anomalies,
          textInsight: insight
        },
        report: null,
        traceability: [],
        createdAt: new Date(s.checkInDate)
      };
      record.traceability = buildTraceability(record);
      records.push(record);
    });

    renderRecordsList();
    updateCharts();
  }

  return { init: init };
})();

document.addEventListener('DOMContentLoaded', App.init);

(function () {
  'use strict';

  var RANKS = ['青铜', '白银', '黄金', '铂金', '钻石', '星耀', '王者'];
  var RANK_LEVEL = {};
  RANKS.forEach(function (r, i) { RANK_LEVEL[r] = i; });

  var orders = [
    { orderId: 'CO20260501001', playerName: '玩家小天', coachName: '陪练阿飞', rankOrdered: '钻石', rankActual: '钻石', durationOrdered: 2, durationActual: 2, amount: 240, status: '正常', isBackfill: false, createTime: '2026-05-02' },
    { orderId: 'CO20260502001', playerName: '玩家明轩', coachName: '陪练阿飞', rankOrdered: '星耀', rankActual: '钻石', durationOrdered: 3, durationActual: 2, amount: 450, status: '争议', isBackfill: false, createTime: '2026-05-03' },
    { orderId: 'CO20260503001', playerName: '玩家若曦', coachName: '陪练小铭', rankOrdered: '王者', rankActual: '王者', durationOrdered: 1, durationActual: 0.5, amount: 200, status: '争议', isBackfill: false, createTime: '2026-05-05' },
    { orderId: 'CO20260504001', playerName: '玩家云起', coachName: '陪练小铭', rankOrdered: '铂金', rankActual: '黄金', durationOrdered: 2, durationActual: 2, amount: 200, status: '争议', isBackfill: false, createTime: '2026-05-07' },
    { orderId: 'CO20260505001', playerName: '玩家青锋', coachName: '陪练大风', rankOrdered: '钻石', rankActual: '钻石', durationOrdered: 2, durationActual: 2, amount: 240, status: '正常', isBackfill: false, createTime: '2026-05-08' },
    { orderId: 'CO20260506001', playerName: '玩家暮雪', coachName: '陪练大风', rankOrdered: '铂金', rankActual: '铂金', durationOrdered: 4, durationActual: 3, amount: 400, status: '争议', isBackfill: false, createTime: '2026-05-09' },
    { orderId: 'CO20260507001', playerName: '玩家清风', coachName: '陪练阿飞', rankOrdered: '王者', rankActual: '星耀', durationOrdered: 2, durationActual: 1, amount: 400, status: '争议', isBackfill: false, createTime: '2026-05-10' },
    { orderId: 'CO20260508001', playerName: '玩家听雨', coachName: '陪练小铭', rankOrdered: '黄金', rankActual: '黄金', durationOrdered: 1, durationActual: 1, amount: 80, status: '正常', isBackfill: false, createTime: '2026-05-12' },
    { orderId: 'CO20260509001', playerName: '玩家流云', coachName: '陪练大风', rankOrdered: '星耀', rankActual: '星耀', durationOrdered: 3, durationActual: 3, amount: 450, status: '正常', isBackfill: false, createTime: '2026-05-14' },
    { orderId: 'CO20260510001', playerName: '玩家星河', coachName: '陪练阿飞', rankOrdered: '钻石', rankActual: '铂金', durationOrdered: 2, durationActual: 1.5, amount: 240, status: '争议', isBackfill: false, createTime: '2026-05-15' },
    { orderId: 'CO20260511001', playerName: '玩家长歌', coachName: '陪练小铭', rankOrdered: '铂金', rankActual: '铂金', durationOrdered: 1, durationActual: 1, amount: 100, status: '正常', isBackfill: true, createTime: '2026-05-16' },
    { orderId: 'CO20260512001', playerName: '玩家落霞', coachName: '陪练大风', rankOrdered: '王者', rankActual: '王者', durationOrdered: 2, durationActual: 2, amount: 400, status: '已仲裁', isBackfill: false, createTime: '2026-05-17' },
    { orderId: 'CO20260513001', playerName: '玩家惊鸿', coachName: '陪练阿飞', rankOrdered: '星耀', rankActual: '钻石', durationOrdered: 3, durationActual: 2.5, amount: 450, status: '争议', isBackfill: false, createTime: '2026-05-19' },
    { orderId: 'CO20260514001', playerName: '玩家霜华', coachName: '陪练小铭', rankOrdered: '黄金', rankActual: '白银', durationOrdered: 2, durationActual: 2, amount: 160, status: '争议', isBackfill: true, createTime: '2026-05-20' },
    { orderId: 'CO20260515001', playerName: '玩家霁月', coachName: '陪练大风', rankOrdered: '钻石', rankActual: '钻石', durationOrdered: 1, durationActual: 1, amount: 120, status: '正常', isBackfill: false, createTime: '2026-05-22' },
  ];

  var tickets = [
    { ticketId: 'TK20260503001', orderId: 'CO20260502001', complaintType: '时长争议', description: '实际陪练2小时，订单记3小时', compensationAmount: 150, status: '待处理' },
    { ticketId: 'TK20260503002', orderId: 'CO20260502001', complaintType: '段位错配', description: '下单星耀陪练，实际为钻石陪练', compensationAmount: 100, status: '待处理' },
    { ticketId: 'TK20260505001', orderId: 'CO20260503001', complaintType: '时长争议', description: '仅陪练30分钟，订单记1小时', compensationAmount: 100, status: '已处理' },
    { ticketId: 'TK20260507001', orderId: 'CO20260504001', complaintType: '段位错配', description: '下单铂金陪练，实际为黄金陪练', compensationAmount: 50, status: '待处理' },
    { ticketId: 'TK20260509001', orderId: 'CO20260506001', complaintType: '时长争议', description: '实际3小时，订单记4小时', compensationAmount: 100, status: '待处理' },
    { ticketId: 'TK20260510001', orderId: 'CO20260507001', complaintType: '段位错配', description: '下单王者陪练，实际为星耀陪练', compensationAmount: 200, status: '待处理' },
    { ticketId: 'TK20260510002', orderId: 'CO20260507001', complaintType: '时长争议', description: '实际1小时，订单记2小时', compensationAmount: 200, status: '待处理' },
    { ticketId: 'TK20260515001', orderId: 'CO20260510001', complaintType: '段位错配', description: '下单钻石陪练，实际为铂金陪练', compensationAmount: 60, status: '待处理' },
    { ticketId: 'TK20260515002', orderId: 'CO20260510001', complaintType: '时长争议', description: '实际1.5小时，订单记2小时', compensationAmount: 60, status: '已处理' },
    { ticketId: 'TK20260519001', orderId: 'CO20260513001', complaintType: '段位错配', description: '下单星耀陪练，实际为钻石陪练', compensationAmount: 75, status: '待处理' },
    { ticketId: 'TK20260519002', orderId: 'CO20260513001', complaintType: '时长争议', description: '实际2.5小时，订单记3小时', compensationAmount: 75, status: '待处理' },
    { ticketId: 'TK20260520001', orderId: 'CO20260514001', complaintType: '段位错配', description: '下单黄金陪练，实际为白银陪练', compensationAmount: 40, status: '待处理' },
  ];

  var wageRules = [
    { ruleId: 'WR001', rank: '青铜', hourlyRate: 40, bonusRate: 0, effectiveDate: '2026-01-01' },
    { ruleId: 'WR002', rank: '白银', hourlyRate: 50, bonusRate: 0, effectiveDate: '2026-01-01' },
    { ruleId: 'WR003', rank: '黄金', hourlyRate: 80, bonusRate: 0.05, effectiveDate: '2026-01-01' },
    { ruleId: 'WR004', rank: '铂金', hourlyRate: 100, bonusRate: 0.08, effectiveDate: '2026-01-01' },
    { ruleId: 'WR005', rank: '钻石', hourlyRate: 120, bonusRate: 0.1, effectiveDate: '2026-01-01' },
    { ruleId: 'WR006', rank: '星耀', hourlyRate: 150, bonusRate: 0.12, effectiveDate: '2026-01-01' },
    { ruleId: 'WR007', rank: '王者', hourlyRate: 200, bonusRate: 0.15, effectiveDate: '2026-01-01' },
  ];

  function getWageRule(rank) {
    return wageRules.find(function (r) { return r.rank === rank; }) || null;
  }

  function getTicketsForOrder(orderId) {
    return tickets.filter(function (t) { return t.orderId === orderId; });
  }

  function detectDisputeTags(order) {
    var tags = [];
    if (order.durationActual !== order.durationOrdered) {
      tags.push('duration');
    }
    if (order.rankActual !== order.rankOrdered) {
      tags.push('rank');
    }
    var related = getTicketsForOrder(order.orderId);
    var compTickets = related.filter(function (t) { return t.complaintType === '补偿重复'; });
    if (compTickets.length > 0) {
      tags.push('compensation');
    }
    var expectedRate = getWageRule(order.rankActual);
    if (expectedRate) {
      var impliedRate = order.amount / order.durationActual;
      if (Math.abs(impliedRate - expectedRate.hourlyRate) > 5) {
        tags.push('wage');
      }
    }
    return tags;
  }

  function detectConflicts(filteredOrders) {
    var conflicts = [];
    filteredOrders.forEach(function (order) {
      var related = getTicketsForOrder(order.orderId);
      var tags = detectDisputeTags(order);

      if (tags.indexOf('duration') >= 0) {
        var diff = order.durationActual - order.durationOrdered;
        var dir = diff < 0 ? '少' : '多';
        var durTickets = related.filter(function (t) { return t.complaintType === '时长争议'; });
        var ticketDesc = durTickets.length > 0
          ? '投诉工单(' + durTickets.map(function (t) { return t.ticketId; }).join('、') + ')已申诉'
          : '尚无对应投诉工单';
        var expectedRate = getWageRule(order.rankActual);
        var wageNote = '';
        if (expectedRate) {
          var expectedAmount = expectedRate.hourlyRate * order.durationActual * (1 + expectedRate.bonusRate);
          wageNote = '；按工资规则(' + order.rankActual + '时薪' + expectedRate.hourlyRate + '元)，实际陪练应结算¥' + expectedAmount.toFixed(0) + '，订单金额¥' + order.amount;
        }
        conflicts.push({
          type: 'duration',
          orderId: order.orderId,
          title: '时长争议：' + order.playerName + ' 的订单 ' + order.orderId,
          body: '下单' + order.durationOrdered + '小时，实际' + order.durationActual + '小时，差' + Math.abs(diff) + '小时（' + dir + '了' + Math.abs(diff) + '小时）。' + ticketDesc + wageNote
        });
      }

      if (tags.indexOf('rank') >= 0) {
        var rankTickets = related.filter(function (t) { return t.complaintType === '段位错配'; });
        var rankTicketDesc = rankTickets.length > 0
          ? '投诉工单(' + rankTickets.map(function (t) { return t.ticketId; }).join('、') + ')已申诉'
          : '尚无对应投诉工单';
        var orderedRule = getWageRule(order.rankOrdered);
        var actualRule = getWageRule(order.rankActual);
        var rankWageNote = '';
        if (orderedRule && actualRule) {
          rankWageNote = '；下单段位时薪¥' + orderedRule.hourlyRate + '，实际段位时薪¥' + actualRule.hourlyRate + '，差¥' + Math.abs(orderedRule.hourlyRate - actualRule.hourlyRate) + '/小时';
        }
        conflicts.push({
          type: 'rank',
          orderId: order.orderId,
          title: '段位错配：' + order.playerName + ' 的订单 ' + order.orderId,
          body: '下单' + order.rankOrdered + '陪练，实际为' + order.rankActual + '陪练。' + rankTicketDesc + rankWageNote
        });
      }

      if (tags.indexOf('compensation') >= 0) {
        var compTickets2 = related.filter(function (t) { return t.complaintType === '补偿重复'; });
        conflicts.push({
          type: 'compensation',
          orderId: order.orderId,
          title: '补偿重复：' + order.playerName + ' 的订单 ' + order.orderId,
          body: '存在' + compTickets2.length + '条补偿重复投诉工单(' + compTickets2.map(function (t) { return t.ticketId; }).join('、') + ')，补偿金额合计¥' + compTickets2.reduce(function (s, t) { return s + t.compensationAmount; }, 0) + '，需核验是否重复发放'
        });
      }

      if (tags.indexOf('wage') >= 0) {
        var rule = getWageRule(order.rankActual);
        if (rule) {
          var implied = order.amount / order.durationActual;
          var expected = rule.hourlyRate * (1 + rule.bonusRate);
          conflicts.push({
            type: 'wage',
            orderId: order.orderId,
            title: '工资规则冲突：' + order.playerName + ' 的订单 ' + order.orderId,
            body: '实际段位' + order.rankActual + '，工资规则时薪¥' + rule.hourlyRate + '（含奖金¥' + (rule.hourlyRate * rule.bonusRate).toFixed(0) + '），推算单价¥' + implied.toFixed(0) + '/小时，与规则¥' + expected.toFixed(0) + '/小时不一致，差¥' + Math.abs(implied - expected).toFixed(0) + '/小时'
          });
        }
      }

      if (related.length > 1 && tags.length > 1) {
        conflicts.push({
          type: 'cross',
          orderId: order.orderId,
          title: '多维冲突：' + order.playerName + ' 的订单 ' + order.orderId,
          body: '该订单同时存在' + tags.map(function (t) {
            var map = { duration: '时长争议', rank: '段位错配', compensation: '补偿重复', wage: '工资规则冲突' };
            return map[t];
          }).join('、') + '，共' + related.length + '条投诉工单，仲裁时需一并考虑避免重复补偿或遗漏'
        });
      }
    });
    return conflicts;
  }

  var chartDisputeType = null;
  var chartDurationDiff = null;
  var chartRankMismatch = null;
  var currentTab = 'all';

  function filterOrders() {
    var dateStart = document.getElementById('filterDateStart').value;
    var dateEnd = document.getElementById('filterDateEnd').value;
    var status = document.getElementById('filterStatus').value;
    var dispute = document.getElementById('filterDispute').value;
    var rank = document.getElementById('filterRank').value;

    return orders.filter(function (o) {
      if (dateStart && o.createTime < dateStart) return false;
      if (dateEnd && o.createTime > dateEnd) return false;
      if (status !== 'all' && o.status !== status) return false;
      if (rank !== 'all' && o.rankOrdered !== rank) return false;
      if (dispute !== 'all') {
        var tags = detectDisputeTags(o);
        if (tags.indexOf(dispute) < 0) return false;
      }
      return true;
    });
  }

  function updateStats(filtered) {
    var disputeCount = 0, durationCount = 0, rankCount = 0, conflictCount = 0, totalAmount = 0;
    filtered.forEach(function (o) {
      var tags = detectDisputeTags(o);
      if (o.status === '争议' || tags.length > 0) disputeCount++;
      if (tags.indexOf('duration') >= 0) durationCount++;
      if (tags.indexOf('rank') >= 0) rankCount++;
      var related = getTicketsForOrder(o.orderId);
      if (related.length > 0 && tags.length > 0) conflictCount++;
      if (o.status === '争议') totalAmount += o.amount;
    });
    document.getElementById('statTotal').textContent = filtered.length;
    document.getElementById('statDispute').textContent = disputeCount;
    document.getElementById('statDuration').textContent = durationCount;
    document.getElementById('statRank').textContent = rankCount;
    document.getElementById('statConflict').textContent = conflictCount;
    document.getElementById('statAmount').textContent = '¥' + totalAmount;
  }

  function updateCharts(filtered) {
    var typeCounts = { duration: 0, rank: 0, compensation: 0, wage: 0 };
    filtered.forEach(function (o) {
      detectDisputeTags(o).forEach(function (t) { typeCounts[t]++; });
    });

    if (chartDisputeType) chartDisputeType.destroy();
    chartDisputeType = new Chart(document.getElementById('chartDisputeType'), {
      type: 'doughnut',
      data: {
        labels: ['时长争议', '段位错配', '补偿重复', '工资规则冲突'],
        datasets: [{
          data: [typeCounts.duration, typeCounts.rank, typeCounts.compensation, typeCounts.wage],
          backgroundColor: ['#f39c12', '#fd79a8', '#3498db', '#6c5ce7'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#9ba1b7', padding: 12, font: { size: 11 } } }
        }
      }
    });

    var durationDiffs = filtered
      .filter(function (o) { return o.durationActual !== o.durationOrdered; })
      .map(function (o) { return { label: o.orderId.slice(-4), diff: o.durationActual - o.durationOrdered }; });

    if (chartDurationDiff) chartDurationDiff.destroy();
    chartDurationDiff = new Chart(document.getElementById('chartDurationDiff'), {
      type: 'bar',
      data: {
        labels: durationDiffs.map(function (d) { return d.label; }),
        datasets: [{
          label: '时长偏差(小时)',
          data: durationDiffs.map(function (d) { return d.diff; }),
          backgroundColor: durationDiffs.map(function (d) { return d.diff < 0 ? '#e74c3c' : '#f39c12'; }),
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { labels: { color: '#9ba1b7' } } },
        scales: {
          x: { ticks: { color: '#9ba1b7' }, grid: { color: '#2e3348' } },
          y: { ticks: { color: '#9ba1b7' }, grid: { color: '#2e3348' } }
        }
      }
    });

    var mismatchPairs = {};
    filtered.forEach(function (o) {
      if (o.rankActual !== o.rankOrdered) {
        var key = o.rankOrdered + '→' + o.rankActual;
        mismatchPairs[key] = (mismatchPairs[key] || 0) + 1;
      }
    });
    var pairLabels = Object.keys(mismatchPairs);
    var pairValues = pairLabels.map(function (k) { return mismatchPairs[k]; });

    if (chartRankMismatch) chartRankMismatch.destroy();
    chartRankMismatch = new Chart(document.getElementById('chartRankMismatch'), {
      type: 'bar',
      data: {
        labels: pairLabels,
        datasets: [{
          label: '错配次数',
          data: pairValues,
          backgroundColor: '#fd79a8',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { labels: { color: '#9ba1b7' } } },
        scales: {
          x: { ticks: { color: '#9ba1b7', stepSize: 1 }, grid: { color: '#2e3348' } },
          y: { ticks: { color: '#9ba1b7' }, grid: { color: '#2e3348' } }
        }
      }
    });
  }

  function updateConflicts(filtered) {
    var conflicts = detectConflicts(filtered);
    var container = document.getElementById('conflictList');
    if (conflicts.length === 0) {
      container.innerHTML = '<div class="empty-state">当前筛选条件下无材料冲突</div>';
      document.getElementById('conflictSection').style.display = '';
      return;
    }
    container.innerHTML = conflicts.map(function (c) {
      var typeClass = 'type-' + (c.type === 'cross' ? 'duration' : c.type);
      return '<div class="conflict-item ' + typeClass + '">' +
        '<div class="conflict-title">' + c.title + '</div>' +
        '<div class="conflict-body">' + c.body + '</div>' +
        '</div>';
    }).join('');
  }

  function filterByTab(filtered) {
    if (currentTab === 'all') return filtered;
    if (currentTab === 'dispute') return filtered.filter(function (o) { return o.status === '争议'; });
    if (currentTab === 'backfill') return filtered.filter(function (o) { return o.isBackfill; });
    if (currentTab === 'conflict') {
      var conflictOrderIds = {};
      tickets.forEach(function (t) { conflictOrderIds[t.orderId] = true; });
      return filtered.filter(function (o) { return conflictOrderIds[o.orderId] && detectDisputeTags(o).length > 0; });
    }
    return filtered;
  }

  function updateTable(filtered) {
    var tabFiltered = filterByTab(filtered);
    var tbody = document.getElementById('orderTableBody');
    if (tabFiltered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:#9ba1b7;padding:32px">无匹配订单</td></tr>';
      document.getElementById('tableFooter').textContent = '';
      return;
    }
    tbody.innerHTML = tabFiltered.map(function (o) {
      var tags = detectDisputeTags(o);
      var statusClass = o.status === '正常' ? 'badge-normal' :
        o.status === '争议' ? 'badge-dispute' :
        o.status === '已仲裁' ? 'badge-arbitrated' : 'badge-backfill';
      var tagHtml = tags.map(function (t) {
        var map = {
          duration: '<span class="dispute-tag tag-duration">时长争议</span>',
          rank: '<span class="dispute-tag tag-rank">段位错配</span>',
          compensation: '<span class="dispute-tag tag-compensation">补偿重复</span>',
          wage: '<span class="dispute-tag tag-wage">工资规则冲突</span>'
        };
        return map[t] || '';
      }).join('');
      if (tags.length === 0) tagHtml = '<span style="color:#9ba1b7">—</span>';
      return '<tr>' +
        '<td>' + o.orderId + '</td>' +
        '<td>' + o.playerName + '</td>' +
        '<td>' + o.coachName + '</td>' +
        '<td>' + o.rankOrdered + '</td>' +
        '<td>' + o.rankActual + '</td>' +
        '<td>' + o.durationOrdered + 'h</td>' +
        '<td>' + o.durationActual + 'h</td>' +
        '<td>¥' + o.amount + '</td>' +
        '<td><span class="badge ' + statusClass + '">' + o.status + (o.isBackfill ? '(补录)' : '') + '</span></td>' +
        '<td>' + tagHtml + '</td>' +
        '<td>' + o.createTime + '</td>' +
        '</tr>';
    }).join('');
    document.getElementById('tableFooter').textContent = '共 ' + tabFiltered.length + ' 条';
  }

  function refreshAll() {
    var filtered = filterOrders();
    updateStats(filtered);
    updateCharts(filtered);
    updateConflicts(filtered);
    updateTable(filtered);
  }

  document.getElementById('btnFilter').addEventListener('click', refreshAll);
  document.getElementById('btnReset').addEventListener('click', function () {
    document.getElementById('filterDateStart').value = '2026-05-01';
    document.getElementById('filterDateEnd').value = '2026-05-31';
    document.getElementById('filterStatus').value = 'all';
    document.getElementById('filterDispute').value = 'all';
    document.getElementById('filterRank').value = 'all';
    currentTab = 'all';
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
    document.querySelector('.tab[data-tab="all"]').classList.add('active');
    refreshAll();
  });

  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      currentTab = tab.getAttribute('data-tab');
      updateTable(filterOrders());
    });
  });

  function generateReport(filtered) {
    var conflicts = detectConflicts(filtered);
    var now = new Date();
    var dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';

    var totalOrders = filtered.length;
    var disputeOrders = filtered.filter(function (o) { return o.status === '争议'; });
    var normalOrders = filtered.filter(function (o) { return o.status === '正常'; });
    var backfillOrders = filtered.filter(function (o) { return o.isBackfill; });
    var arbitratedOrders = filtered.filter(function (o) { return o.status === '已仲裁'; });

    var durationDisputes = filtered.filter(function (o) { return detectDisputeTags(o).indexOf('duration') >= 0; });
    var rankMismatches = filtered.filter(function (o) { return detectDisputeTags(o).indexOf('rank') >= 0; });
    var wageConflicts = filtered.filter(function (o) { return detectDisputeTags(o).indexOf('wage') >= 0; });

    var totalCompensation = 0;
    var processedOrderIds = {};
    tickets.forEach(function (t) {
      var matches = filtered.find(function (o) { return o.orderId === t.orderId; });
      if (matches) {
        if (!processedOrderIds[t.orderId]) {
          processedOrderIds[t.orderId] = [];
        }
        processedOrderIds[t.orderId].push(t);
        totalCompensation += t.compensationAmount;
      }
    });

    var html = '';
    html += '<h2>电竞陪练订单仲裁报告</h2>';
    html += '<p>报告日期：' + dateStr + '</p>';
    html += '<p>筛选范围：' + document.getElementById('filterDateStart').value + ' 至 ' + document.getElementById('filterDateEnd').value;
    var statusVal = document.getElementById('filterStatus').value;
    if (statusVal !== 'all') html += '，订单状态：' + statusVal;
    var disputeVal = document.getElementById('filterDispute').value;
    if (disputeVal !== 'all') {
      var dMap = { duration: '时长争议', rank: '段位错配', compensation: '补偿重复', wage: '工资规则冲突' };
      html += '，争议类型：' + dMap[disputeVal];
    }
    var rankVal = document.getElementById('filterRank').value;
    if (rankVal !== 'all') html += '，下单段位：' + rankVal;
    html += '</p>';

    html += '<h3>一、总体概况</h3>';
    html += '<table><thead><tr><th>指标</th><th>数值</th></tr></thead><tbody>';
    html += '<tr><td>涉及订单总数</td><td>' + totalOrders + '</td></tr>';
    html += '<tr><td>正常订单</td><td>' + normalOrders.length + '</td></tr>';
    html += '<tr><td>争议订单</td><td>' + disputeOrders.length + '</td></tr>';
    html += '<tr><td>已仲裁订单</td><td>' + arbitratedOrders.length + '</td></tr>';
    html += '<tr><td>补录订单</td><td>' + backfillOrders.length + '</td></tr>';
    html += '<tr><td>材料冲突条数</td><td>' + conflicts.length + '</td></tr>';
    html += '<tr><td>投诉工单涉及补偿总额</td><td>¥' + totalCompensation + '</td></tr>';
    html += '</tbody></table>';

    html += '<h3>二、时长争议明细</h3>';
    if (durationDisputes.length === 0) {
      html += '<p>当前筛选条件下无时长争议。</p>';
    } else {
      html += '<table><thead><tr><th>玩家</th><th>陪练</th><th>下单时长</th><th>实际时长</th><th>差值</th><th>订单金额</th><th>说明</th></tr></thead><tbody>';
      durationDisputes.forEach(function (o) {
        var diff = o.durationActual - o.durationOrdered;
        var dir = diff < 0 ? '少' : '多';
        var rule = getWageRule(o.rankActual);
        var explain = '实际陪练' + dir + '了' + Math.abs(diff) + '小时';
        if (rule) {
          var correct = rule.hourlyRate * o.durationActual * (1 + rule.bonusRate);
          explain += '；按' + o.rankActual + '时薪¥' + rule.hourlyRate + '（含奖金' + (rule.bonusRate * 100) + '%），合理金额应为¥' + correct.toFixed(0);
        }
        html += '<tr>' +
          '<td>' + o.playerName + '</td>' +
          '<td>' + o.coachName + '</td>' +
          '<td>' + o.durationOrdered + '小时</td>' +
          '<td>' + o.durationActual + '小时</td>' +
          '<td>' + (diff > 0 ? '+' : '') + diff + '小时</td>' +
          '<td>¥' + o.amount + '</td>' +
          '<td>' + explain + '</td>' +
          '</tr>';
      });
      html += '</tbody></table>';
    }

    html += '<h3>三、段位错配明细</h3>';
    if (rankMismatches.length === 0) {
      html += '<p>当前筛选条件下无段位错配。</p>';
    } else {
      html += '<table><thead><tr><th>玩家</th><th>陪练</th><th>下单段位</th><th>实际段位</th><th>时薪差异</th><th>说明</th></tr></thead><tbody>';
      rankMismatches.forEach(function (o) {
        var orderedRule = getWageRule(o.rankOrdered);
        var actualRule = getWageRule(o.rankActual);
        var rateDiff = orderedRule && actualRule ? '¥' + Math.abs(orderedRule.hourlyRate - actualRule.hourlyRate) + '/小时' : '—';
        var explain = '玩家下单' + o.rankOrdered + '陪练，实际提供' + o.rankActual + '陪练';
        if (orderedRule && actualRule) {
          if (RANK_LEVEL[o.rankActual] < RANK_LEVEL[o.rankOrdered]) {
            explain += '，实际段位低于下单段位，时薪差¥' + Math.abs(orderedRule.hourlyRate - actualRule.hourlyRate) + '/小时，需补差价或重新结算';
          } else {
            explain += '，实际段位高于下单段位，按规则不影响结算';
          }
        }
        html += '<tr>' +
          '<td>' + o.playerName + '</td>' +
          '<td>' + o.coachName + '</td>' +
          '<td>' + o.rankOrdered + '</td>' +
          '<td>' + o.rankActual + '</td>' +
          '<td>' + rateDiff + '</td>' +
          '<td>' + explain + '</td>' +
          '</tr>';
      });
      html += '</tbody></table>';
    }

    html += '<h3>四、材料冲突汇总</h3>';
    if (conflicts.length === 0) {
      html += '<p>当前筛选条件下无材料冲突。</p>';
    } else {
      html += '<p>共检测到' + conflicts.length + '处冲突，按类型分布如下：</p>';
      var groupByType = {};
      conflicts.forEach(function (c) {
        var label = { duration: '时长争议', rank: '段位错配', compensation: '补偿重复', wage: '工资规则冲突', cross: '多维冲突' }[c.type] || c.type;
        if (!groupByType[label]) groupByType[label] = [];
        groupByType[label].push(c);
      });
      Object.keys(groupByType).forEach(function (label) {
        html += '<div class="warning"><strong>' + label + '（' + groupByType[label].length + '条）</strong></div>';
        groupByType[label].forEach(function (c) {
          html += '<p>• ' + c.body + '</p>';
        });
      });
    }

    html += '<h3>五、工资规则冲突</h3>';
    if (wageConflicts.length === 0) {
      html += '<p>当前筛选条件下无工资规则冲突。</p>';
    } else {
      html += '<table><thead><tr><th>玩家</th><th>陪练</th><th>实际段位</th><th>规则时薪</th><th>推算单价</th><th>差异</th><th>说明</th></tr></thead><tbody>';
      wageConflicts.forEach(function (o) {
        var rule = getWageRule(o.rankActual);
        var implied = o.amount / o.durationActual;
        var expected = rule.hourlyRate * (1 + rule.bonusRate);
        html += '<tr>' +
          '<td>' + o.playerName + '</td>' +
          '<td>' + o.coachName + '</td>' +
          '<td>' + o.rankActual + '</td>' +
          '<td>¥' + expected.toFixed(0) + '/小时</td>' +
          '<td>¥' + implied.toFixed(0) + '/小时</td>' +
          '<td>¥' + Math.abs(implied - expected).toFixed(0) + '/小时</td>' +
          '<td>订单金额与工资规则计算不一致，需核实结算依据</td>' +
          '</tr>';
      });
      html += '</tbody></table>';
    }

    html += '<h3>六、仲裁建议</h3>';
    html += '<div class="conclusion">';
    if (disputeOrders.length === 0) {
      html += '<p>当前筛选范围内无争议订单，无需仲裁。</p>';
    } else {
      html += '<p>1. 时长争议订单' + durationDisputes.length + '笔：建议按实际陪练时长重新计算金额，参照对应段位工资规则结算。</p>';
      if (rankMismatches.length > 0) {
        html += '<p>2. 段位错配订单' + rankMismatches.length + '笔：实际段位低于下单段位的，应按实际段位时薪补差价；同时检查时长是否也受影响。</p>';
      }
      if (wageConflicts.length > 0) {
        html += '<p>3. 工资规则冲突' + wageConflicts.length + '笔：订单金额与工资规则推算不一致，需核实是否存在特殊补贴或录入错误。</p>';
      }
      var crossConflicts = conflicts.filter(function (c) { return c.type === 'cross'; });
      if (crossConflicts.length > 0) {
        html += '<p>4. 多维冲突' + crossConflicts.length + '笔：同时存在时长争议和段位错配，仲裁时需一并处理，避免部分调整后金额仍不一致。</p>';
      }
      html += '<p>5. 以上建议均基于工资规则（' + wageRules.map(function (r) { return r.rank + '¥' + r.hourlyRate + '/h'; }).join('、') + '），如有特殊协议请以实际约定为准。</p>';
    }
    html += '</div>';

    return html;
  }

  document.getElementById('btnExport').addEventListener('click', function () {
    var filtered = filterOrders();
    var reportHtml = generateReport(filtered);
    document.getElementById('reportContent').innerHTML = reportHtml;
    document.getElementById('reportSection').style.display = '';
    document.getElementById('reportSection').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('btnCloseReport').addEventListener('click', function () {
    document.getElementById('reportSection').style.display = 'none';
  });

  document.getElementById('btnDownloadHtml').addEventListener('click', function () {
    var content = document.getElementById('reportContent').innerHTML;
    var fullHtml = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>电竞陪练订单仲裁报告</title>' +
      '<style>body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;max-width:900px;margin:40px auto;padding:0 20px;color:#1a1a2e;line-height:1.8}' +
      'h2{border-bottom:2px solid #6c5ce7;padding-bottom:8px;color:#6c5ce7}h3{margin-top:20px;color:#2d3436}' +
      'table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}th{background:#f0f0f5;padding:8px 12px;border:1px solid #ddd;text-align:left}td{padding:8px 12px;border:1px solid #ddd}' +
      '.conclusion{background:#f8f9fa;border-left:4px solid #6c5ce7;padding:12px 16px;border-radius:0 6px 6px 0}' +
      '.warning{background:#fff3e0;border-left:4px solid #f39c12;padding:12px 16px;border-radius:0 6px 6px 0;margin:8px 0}' +
      '</style></head><body>' + content + '</body></html>';

    var blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '电竞陪练订单仲裁报告_' + new Date().toISOString().slice(0, 10) + '.html';
    a.click();
    URL.revokeObjectURL(url);
  });

  refreshAll();
})();

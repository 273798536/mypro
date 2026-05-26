// ============================================================
// 医院氧气接口抢占 · 呼吸科调度演练
// ============================================================

const CONFIG = {
  TICK_MS: 500,
  EMERGENCY_WAIT_THRESHOLD: 30,
  SCORE_SUCCESS: 10,
  SCORE_FAST: 5,
  SCORE_ERROR_PENALTY: -20,
  SCORE_WAIT_PENALTY: -5,
  SCORE_DOUBLE_OCCUPY: -30,
  SCORE_TRANSFER_UNRELEASED: -25,
  SCORE_EMERGENCY_WAIT: -15,
};

const LEVELS = [
  {
    id: 0,
    name: "关卡 1 · 基础调度",
    description: "熟悉床位与氧气接口的基本分配流程",
    duration: 180,
    events: [
      { time: 3, type: "admission", patientId: "P001", priority: "normal",
        desc: "患者 张伟 入院，需普通床位+氧气", patientName: "张伟", level: 2 },
      { time: 8, type: "admission", patientId: "P002", priority: "normal",
        desc: "患者 李芳 入院，需普通床位+氧气", patientName: "李芳", level: 1 },
      { time: 15, type: "admission", patientId: "P003", priority: "normal",
        desc: "患者 王强 入院，需普通床位+氧气", patientName: "王强", level: 2 },
      { time: 25, type: "equipment", patientId: "P001", priority: "normal",
        desc: "张伟 需要借用呼吸机", equipmentType: "ventilator" },
      { time: 35, type: "transfer", patientId: "P002", priority: "normal",
        desc: "李芳 需转至 B6 床位（原床位需释放）" },
      { time: 50, type: "discharge", patientId: "P003", priority: "normal",
        desc: "王强 出院，释放床位和氧气接口" },
      { time: 65, type: "admission", patientId: "P004", priority: "normal",
        desc: "患者 赵敏 入院，需普通床位+氧气", patientName: "赵敏", level: 3 },
      { time: 80, type: "admission", patientId: "P005", priority: "normal",
        desc: "患者 刘洋 入院，需普通床位+氧气", patientName: "刘洋", level: 2 },
      { time: 100, type: "equipment", patientId: "P004", priority: "normal",
        desc: "赵敏 需要借用监护仪", equipmentType: "monitor" },
      { time: 120, type: "discharge", patientId: "P001", priority: "normal",
        desc: "张伟 出院，释放所有资源" },
    ],
  },
  {
    id: 1,
    name: "关卡 2 · 资源竞争",
    description: "资源紧张，需合理调度设备与床位",
    duration: 200,
    events: [
      { time: 2, type: "admission", patientId: "P101", priority: "normal",
        desc: "患者 陈明 入院", patientName: "陈明", level: 2 },
      { time: 5, type: "admission", patientId: "P102", priority: "normal",
        desc: "患者 赵丽 入院", patientName: "赵丽", level: 3 },
      { time: 8, type: "admission", patientId: "P103", priority: "normal",
        desc: "患者 孙杰 入院", patientName: "孙杰", level: 1 },
      { time: 12, type: "admission", patientId: "P104", priority: "urgent",
        desc: "患者 周琳 入院（加急）", patientName: "周琳", level: 3 },
      { time: 18, type: "equipment", patientId: "P101", priority: "normal",
        desc: "陈明 需要呼吸机", equipmentType: "ventilator" },
      { time: 22, type: "equipment", patientId: "P102", priority: "urgent",
        desc: "赵丽 急需呼吸机（P101 已占用一台）", equipmentType: "ventilator" },
      { time: 30, type: "transfer", patientId: "P103", priority: "normal",
        desc: "孙杰 需转至 B5" },
      { time: 40, type: "admission", patientId: "P105", priority: "normal",
        desc: "患者 吴磊 入院", patientName: "吴磊", level: 2 },
      { time: 48, type: "equipment", patientId: "P105", priority: "urgent",
        desc: "吴磊 需要监护仪", equipmentType: "monitor" },
      { time: 55, type: "discharge", patientId: "P101", priority: "normal",
        desc: "陈明 出院" },
      { time: 62, type: "equipment", patientId: "P104", priority: "normal",
        desc: "周琳 需要监护仪", equipmentType: "monitor" },
      { time: 75, type: "transfer", patientId: "P105", priority: "urgent",
        desc: "吴磊 需紧急转至 B2" },
      { time: 90, type: "discharge", patientId: "P102", priority: "normal",
        desc: "赵丽 出院" },
      { time: 105, type: "admission", patientId: "P106", priority: "normal",
        desc: "患者 郑凯 入院", patientName: "郑凯", level: 2 },
    ],
  },
  {
    id: 2,
    name: "关卡 3 · 急诊危机",
    description: "急诊插入 + 资源冲突 + 边界条件",
    duration: 240,
    events: [
      { time: 1, type: "admission", patientId: "P201", priority: "normal",
        desc: "患者 钱进 入院", patientName: "钱进", level: 2 },
      { time: 3, type: "admission", patientId: "P202", priority: "normal",
        desc: "患者 孙雪 入院", patientName: "孙雪", level: 3 },
      { time: 5, type: "admission", patientId: "P203", priority: "normal",
        desc: "患者 李军 入院", patientName: "李军", level: 2 },
      { time: 8, type: "admission", patientId: "P204", priority: "urgent",
        desc: "患者 周浩 入院（加急）", patientName: "周浩", level: 3 },
      { time: 10, type: "admission", patientId: "P205", priority: "normal",
        desc: "患者 吴丹 入院", patientName: "吴丹", level: 1 },
      { time: 12, type: "emergency", patientId: "P206", priority: "critical",
        desc: "🚨 急诊 马超 重度缺氧，需立即占用氧气接口", patientName: "马超", level: 4 },
      { time: 15, type: "equipment", patientId: "P206", priority: "critical",
        desc: "马超 急需呼吸机", equipmentType: "ventilator" },
      { time: 20, type: "transfer", patientId: "P205", priority: "normal",
        desc: "吴丹 需转至 B7" },
      { time: 25, type: "emergency", patientId: "P207", priority: "critical",
        desc: "🚨 急诊 林峰 呼吸衰竭，所有床位已满", patientName: "林峰", level: 4 },
      { time: 30, type: "equipment", patientId: "P201", priority: "urgent",
        desc: "钱进 需要监护仪", equipmentType: "monitor" },
      { time: 35, type: "discharge", patientId: "P203", priority: "normal",
        desc: "李军 出院" },
      { time: 40, type: "emergency", patientId: "P208", priority: "critical",
        desc: "🚨 急诊 何静 急性呼吸窘迫", patientName: "何静", level: 4 },
      { time: 45, type: "equipment", patientId: "P202", priority: "urgent",
        desc: "孙雪 需要呼吸机（与 P206 竞争）", equipmentType: "ventilator" },
      { time: 52, type: "transfer", patientId: "P204", priority: "urgent",
        desc: "周浩 需紧急转至 B3" },
      { time: 60, type: "discharge", patientId: "P206", priority: "normal",
        desc: "马超 转出 ICU" },
      { time: 70, type: "equipment", patientId: "P208", priority: "urgent",
        desc: "何静 需要监护仪", equipmentType: "monitor" },
      { time: 85, type: "discharge", patientId: "P201", priority: "normal",
        desc: "钱进 出院" },
      { time: 100, type: "admission", patientId: "P209", priority: "normal",
        desc: "患者 高峰 入院", patientName: "高峰", level: 2 },
    ],
  },
];

// ============================================================
// 游戏状态
// ============================================================
const GameState = {
  running: false,
  paused: false,
  gameTime: 0,
  score: 0,
  errors: 0,
  currentLevel: 0,
  beds: [],
  oxygenInterfaces: [],
  equipment: [],
  patients: [],
  events: [],
  activeEventId: null,
  replayLog: [],
  occupancyReports: [],
  eventFilter: "all",
  intervalId: null,
};

// ============================================================
// 初始化
// ============================================================
function initGame() {
  const level = LEVELS[GameState.currentLevel];
  GameState.gameTime = 0;
  GameState.score = 0;
  GameState.errors = 0;
  GameState.running = false;
  GameState.paused = false;
  GameState.activeEventId = null;
  GameState.replayLog = [];
  GameState.occupancyReports = [];
  GameState.eventFilter = "all";

  GameState.beds = [];
  for (let i = 1; i <= 8; i++) {
    GameState.beds.push({
      id: "B" + i,
      name: "床位 " + i,
      oxygenInterfaceId: "O" + i,
      occupied: false,
      patientId: null,
      locked: false,
      lockedBy: null,
      lockedAt: 0,
      state: "free",
      conflict: false,
    });
  }

  GameState.oxygenInterfaces = [];
  for (let i = 1; i <= 8; i++) {
    GameState.oxygenInterfaces.push({
      id: "O" + i,
      name: "氧气接口 " + i,
      bedId: "B" + i,
      occupied: false,
      patientId: null,
      locked: false,
      lockedBy: null,
      occupiedAt: 0,
      releasedAt: 0,
      conflicts: [],
      source: "initial",
      correctionTrace: [],
    });
  }

  GameState.equipment = [
    { id: "V1", name: "呼吸机 1", type: "ventilator", available: true, borrowedBy: null, locked: false },
    { id: "V2", name: "呼吸机 2", type: "ventilator", available: true, borrowedBy: null, locked: false },
    { id: "M1", name: "监护仪 1", type: "monitor", available: true, borrowedBy: null, locked: false },
    { id: "M2", name: "监护仪 2", type: "monitor", available: true, borrowedBy: null, locked: false },
  ];

  GameState.patients = [];
  GameState.events = level.events.map((e, i) => ({
    ...e,
    id: "EVT_" + level.id + "_" + i,
    triggered: false,
    processed: false,
    processedAt: 0,
    triggeredAt: 0,
    hasError: false,
    errorMessage: "",
  }));

  renderAll();
  addFeedback("info", "关卡已加载：" + level.name + "。点击「开始」启动游戏。");
  addReplayEntry("SYSTEM", "加载关卡 " + level.name, 0, "init");
}

// ============================================================
// 游戏主循环
// ============================================================
function startGame() {
  if (GameState.running) return;
  GameState.running = true;
  GameState.paused = false;
  document.getElementById("btnStart").disabled = true;
  document.getElementById("btnPause").disabled = false;
  document.getElementById("levelSelect").disabled = true;
  addFeedback("success", "游戏开始！请响应事件队列中的事件。");
  addReplayEntry("SYSTEM", "游戏开始", 0, "start");

  GameState.intervalId = setInterval(gameTick, CONFIG.TICK_MS);
}

function pauseGame() {
  if (!GameState.running) return;
  if (GameState.paused) {
    GameState.paused = false;
    document.getElementById("btnPause").textContent = "⏸ 暂停";
    addFeedback("info", "游戏继续");
  } else {
    GameState.paused = true;
    document.getElementById("btnPause").textContent = "▶ 继续";
    addFeedback("warn", "游戏已暂停");
  }
}

function resetGame() {
  if (GameState.intervalId) clearInterval(GameState.intervalId);
  document.getElementById("btnStart").disabled = false;
  document.getElementById("btnPause").disabled = true;
  document.getElementById("btnPause").textContent = "⏸ 暂停";
  document.getElementById("levelSelect").disabled = false;
  initGame();
}

function gameTick() {
  if (GameState.paused || !GameState.running) return;
  GameState.gameTime++;

  const level = LEVELS[GameState.currentLevel];
  GameState.events.forEach((evt) => {
    if (!evt.triggered && GameState.gameTime >= evt.time) {
      evt.triggered = true;
      evt.triggeredAt = GameState.gameTime;
      addFeedback(
        evt.priority === "critical" ? "error" : evt.priority === "urgent" ? "warn" : "info",
        "[" + formatTime(GameState.gameTime) + "] " + evt.desc
      );
      addReplayEntry("TRIGGER", "触发事件: " + evt.desc, 0, "trigger");
      if (evt.priority === "critical") {
        showToast("急诊插入！需要立即处理", "error");
      }
    }
  });

  GameState.events.forEach((evt) => {
    if (evt.triggered && !evt.processed) {
      const waitTime = GameState.gameTime - evt.triggeredAt;
      if (evt.priority === "critical" && waitTime >= CONFIG.EMERGENCY_WAIT_THRESHOLD) {
        if (!evt.hasError) {
          evt.hasError = true;
          evt.errorMessage = "急诊等待超时：" + waitTime + " 秒内未处理";
          GameState.errors++;
          GameState.score += CONFIG.SCORE_EMERGENCY_WAIT;
          addFeedback("error", "❌ 急诊等待超时！" + evt.desc + " 已等待 " + waitTime + " 秒");
          addReplayEntry("ERROR", "急诊等待超时: " + evt.desc, CONFIG.SCORE_EMERGENCY_WAIT, "emergency_wait");
          addOccupancyReport("emergency_wait", evt.patientId, "emergency_patient",
            "急诊患者等待超时 " + waitTime + " 秒", waitTime);
        }
      }
    }
  });

  checkTransferUnreleased();
  checkDoubleOccupancy();
  renderAll();

  if (GameState.gameTime >= level.duration || allEventsProcessed()) {
    endGame();
  }
}

function allEventsProcessed() {
  return GameState.events.every((e) => e.processed);
}

function endGame() {
  if (GameState.intervalId) clearInterval(GameState.intervalId);
  GameState.running = false;
  document.getElementById("btnStart").disabled = false;
  document.getElementById("btnPause").disabled = true;
  document.getElementById("levelSelect").disabled = false;
  showResultModal();
  addFeedback("info", "关卡结束，查看结算面板");
}

// ============================================================
// 资源锁定 / 释放
// ============================================================
function lockBed(bedId, patientId) {
  const bed = GameState.beds.find((b) => b.id === bedId);
  if (!bed) return false;
  if (bed.locked) return false;
  bed.locked = true;
  bed.lockedBy = patientId;
  bed.lockedAt = GameState.gameTime;
  bed.state = "locked";
  return true;
}

function unlockBed(bedId) {
  const bed = GameState.beds.find((b) => b.id === bedId);
  if (!bed) return;
  bed.locked = false;
  bed.lockedBy = null;
  bed.lockedAt = 0;
  if (bed.occupied) bed.state = "occupied";
  else bed.state = "free";
}

function assignBed(bedId, patientId) {
  const bed = GameState.beds.find((b) => b.id === bedId);
  if (!bed) return { success: false, reason: "床位不存在" };
  if (bed.occupied) return { success: false, reason: "床位已占用" };

  bed.occupied = true;
  bed.patientId = patientId;
  bed.state = "occupied";

  const ox = GameState.oxygenInterfaces.find((o) => o.id === bed.oxygenInterfaceId);
  if (ox) {
    ox.occupied = true;
    ox.patientId = patientId;
    ox.occupiedAt = GameState.gameTime;
    ox.source = "assignment:" + patientId;
    ox.correctionTrace.push({
      time: GameState.gameTime,
      action: "assign",
      patientId,
      bedId,
      note: "氧气接口 " + ox.id + " 分配给 " + patientId,
    });
  }

  return { success: true };
}

function releaseBed(bedId, reason) {
  const bed = GameState.beds.find((b) => b.id === bedId);
  if (!bed) return { success: false, reason: "床位不存在" };
  if (!bed.occupied) return { success: false, reason: "床位未占用" };

  const patientId = bed.patientId;
  const ox = GameState.oxygenInterfaces.find((o) => o.id === bed.oxygenInterfaceId);

  bed.occupied = false;
  bed.patientId = null;
  bed.state = "free";

  if (ox && ox.occupied) {
    ox.occupied = false;
    ox.patientId = null;
    ox.releasedAt = GameState.gameTime;
    ox.correctionTrace.push({
      time: GameState.gameTime,
      action: "release",
      patientId,
      bedId,
      reason: reason || "正常释放",
    });
  }

  return { success: true };
}

function transferBed(fromBedId, toBedId, patientId) {
  const fromBed = GameState.beds.find((b) => b.id === fromBedId);
  const toBed = GameState.beds.find((b) => b.id === toBedId);
  if (!fromBed || !toBed) return { success: false, reason: "床位不存在" };
  if (!fromBed.occupied) return { success: false, reason: "源床位未占用" };
  if (toBed.occupied) return { success: false, reason: "目标床位已占用" };

  const fromOx = GameState.oxygenInterfaces.find((o) => o.id === fromBed.oxygenInterfaceId);
  const toOx = GameState.oxygenInterfaces.find((o) => o.id === toBed.oxygenInterfaceId);

  if (toOx && toOx.occupied) {
    return { success: false, reason: "⚠️ 目标床位氧气接口 " + toOx.id + " 已被占用，存在重复占用风险！" };
  }

  fromBed.occupied = false;
  fromBed.patientId = null;
  fromBed.state = "free";
  if (fromOx) {
    fromOx.occupied = false;
    fromOx.patientId = null;
    fromOx.releasedAt = GameState.gameTime;
    fromOx.correctionTrace.push({
      time: GameState.gameTime,
      action: "transfer_out",
      patientId,
      fromBedId,
      toBedId,
    });
  }

  toBed.occupied = true;
  toBed.patientId = patientId;
  toBed.state = "occupied";
  if (toOx) {
    toOx.occupied = true;
    toOx.patientId = patientId;
    toOx.occupiedAt = GameState.gameTime;
    toOx.source = "transfer:" + patientId + "_from_" + fromBedId;
    toOx.correctionTrace.push({
      time: GameState.gameTime,
      action: "transfer_in",
      patientId,
      fromBedId,
      toBedId,
    });
  }

  return { success: true };
}

function borrowEquipment(equipId, patientId) {
  const eq = GameState.equipment.find((e) => e.id === equipId);
  if (!eq) return { success: false, reason: "设备不存在" };
  if (!eq.available) return { success: false, reason: "设备已被借用" };
  eq.available = false;
  eq.borrowedBy = patientId;
  return { success: true };
}

function returnEquipment(equipId) {
  const eq = GameState.equipment.find((e) => e.id === equipId);
  if (!eq) return { success: false, reason: "设备不存在" };
  if (eq.available) return { success: false, reason: "设备未被借用" };
  eq.available = true;
  eq.borrowedBy = null;
  return { success: true };
}

// ============================================================
// 冲突检测
// ============================================================
function checkDoubleOccupancy() {
  GameState.oxygenInterfaces.forEach((ox) => {
    if (ox.occupied && ox.patientId) {
      const patient = GameState.patients.find((p) => p.id === ox.patientId);
      if (patient && patient.bedId) {
        const bedOx = GameState.beds.find((b) => b.id === patient.bedId);
        if (bedOx && bedOx.oxygenInterfaceId !== ox.id) {
          if (!ox.conflicts.includes("patient_mismatch")) {
            ox.conflicts.push("patient_mismatch");
            addFeedback("error", "⚠️ 接口重复占用！接口 " + ox.id + " 记录的患者 " + ox.patientId + " 与床位实际患者不一致");
            addReplayEntry("ERROR", "接口重复占用检测: " + ox.id, CONFIG.SCORE_DOUBLE_OCCUPY, "double_occupy");
            GameState.errors++;
            GameState.score += CONFIG.SCORE_DOUBLE_OCCUPY;
            addOccupancyReport("double_occupancy", ox.patientId, "oxygen_interface",
              "接口 " + ox.id + " 被重复占用，记录患者: " + ox.patientId + "，床位实际患者: " + patient.bedId, GameState.gameTime);
          }
        }
      }
    }
  });
}

function checkTransferUnreleased() {
  GameState.events.forEach((evt) => {
    if (evt.type === "transfer" && evt.processed) {
      const patient = GameState.patients.find((p) => p.id === evt.patientId);
      if (patient && patient.bedId) {
        const sourceBed = evt.sourceBedId;
        if (sourceBed) {
          const bed = GameState.beds.find((b) => b.id === sourceBed);
          if (bed && bed.occupied && bed.patientId === evt.patientId) {
            if (!evt.hasError || !String(evt.errorMessage || "").includes("转科未释放")) {
              evt.hasError = true;
              evt.errorMessage = (evt.errorMessage || "") + " 转科未释放源床位";
              GameState.errors++;
              GameState.score += CONFIG.SCORE_TRANSFER_UNRELEASED;
              addFeedback("error", "❌ 转科未释放：患者 " + (patient.name || patient.id) + " 已转科，但源床位 " + sourceBed + " 仍被占用");
              addReplayEntry("ERROR", "转科未释放: " + sourceBed, CONFIG.SCORE_TRANSFER_UNRELEASED, "transfer_unreleased");
              addOccupancyReport("transfer_unreleased", evt.patientId, "bed",
                "源床位 " + sourceBed + " 转科后未释放", GameState.gameTime);
            }
          }
        }
      }
    }
  });
}

// ============================================================
// 事件处理
// ============================================================
function handleEventAction(evt, action, payload) {
  if (evt.processed) return;

  const waitTime = GameState.gameTime - evt.triggeredAt;
  let scoreDelta = 0;
  let success = true;
  let reason = "";

  switch (action) {
    case "assignBed": {
      const bed = GameState.beds.find((b) => b.id === payload.bedId);
      if (!bed) { success = false; reason = "无效床位"; break; }
      if (bed.occupied) {
        success = false;
        reason = "床位 " + bed.id + " 已被 " + (bed.patientId || "未知") + " 占用";
        const existingPatient = GameState.patients.find((p) => p.id === bed.patientId);
        if (existingPatient) {
          reason += "（当前患者: " + (existingPatient.name || existingPatient.id) + "）";
        }
        break;
      }
      const result = assignBed(payload.bedId, evt.patientId);
      if (!result.success) { success = false; reason = result.reason; break; }

      let patient = GameState.patients.find((p) => p.id === evt.patientId);
      if (!patient) {
        patient = {
          id: evt.patientId,
          name: evt.patientName || evt.patientId,
          level: evt.level || 2,
          bedId: payload.bedId,
          oxygenInterfaceId: bed.oxygenInterfaceId,
          admitted: true,
          admittedAt: GameState.gameTime,
          status: "ok",
        };
        GameState.patients.push(patient);
      } else {
        patient.bedId = payload.bedId;
        patient.oxygenInterfaceId = bed.oxygenInterfaceId;
        patient.admitted = true;
      }
      scoreDelta = CONFIG.SCORE_SUCCESS;
      if (waitTime < 10) scoreDelta += CONFIG.SCORE_FAST;
      break;
    }
    case "transferBed": {
      const patient = GameState.patients.find((p) => p.id === evt.patientId);
      if (!patient) { success = false; reason = "患者未找到"; break; }
      if (!patient.bedId) { success = false; reason = "患者当前未在床"; break; }

      const fromBedId = patient.bedId;
      const toBed = GameState.beds.find((b) => b.id === payload.toBedId);
      if (!toBed) { success = false; reason = "无效目标床位"; break; }

      const result = transferBed(fromBedId, payload.toBedId, evt.patientId);
      if (!result.success) {
        success = false;
        reason = result.reason;
        if (reason.includes("重复占用")) {
          addFeedback("error", reason);
          addReplayEntry("ERROR", "转科冲突: " + fromBedId + " → " + payload.toBedId, CONFIG.SCORE_DOUBLE_OCCUPY, "double_occupy");
          GameState.errors++;
          GameState.score += CONFIG.SCORE_DOUBLE_OCCUPY;
          addOccupancyReport("double_occupancy", evt.patientId, "oxygen_interface",
            "转科时目标接口重复占用: " + fromBedId + " → " + payload.toBedId, GameState.gameTime);
        }
        break;
      }

      patient.bedId = payload.toBedId;
      patient.oxygenInterfaceId = toBed.oxygenInterfaceId;
      evt.sourceBedId = fromBedId;

      scoreDelta = CONFIG.SCORE_SUCCESS;
      if (waitTime < 10) scoreDelta += CONFIG.SCORE_FAST;
      break;
    }
    case "discharge": {
      const patient = GameState.patients.find((p) => p.id === evt.patientId);
      if (!patient) { success = false; reason = "患者未找到"; break; }
      if (!patient.bedId) { success = false; reason = "患者当前未在床"; break; }

      const bedId = patient.bedId;
      releaseBed(bedId, "出院");

      GameState.equipment.forEach((eq) => {
        if (eq.borrowedBy === evt.patientId) {
          eq.available = true;
          eq.borrowedBy = null;
        }
      });

      patient.bedId = null;
      patient.oxygenInterfaceId = null;
      patient.admitted = false;
      patient.dischargedAt = GameState.gameTime;
      patient.status = "discharged";

      scoreDelta = CONFIG.SCORE_SUCCESS;
      break;
    }
    case "borrowEquipment": {
      const eq = GameState.equipment.find((e) => e.id === payload.equipId);
      if (!eq) { success = false; reason = "设备不存在"; break; }
      if (!eq.available) {
        success = false;
        reason = "设备 " + eq.name + " 已被 " + (eq.borrowedBy || "未知") + " 借用";
        addFeedback("warn", "⚠️ " + reason);
        break;
      }
      const result = borrowEquipment(payload.equipId, evt.patientId);
      if (!result.success) { success = false; reason = result.reason; break; }
      scoreDelta = CONFIG.SCORE_SUCCESS;
      break;
    }
    case "returnEquipment": {
      const result = returnEquipment(payload.equipId);
      if (!result.success) { success = false; reason = result.reason; break; }
      scoreDelta = CONFIG.SCORE_SUCCESS;
      break;
    }
    case "emergencyAssign": {
      const availableBeds = GameState.beds.filter((b) => !b.occupied);
      if (availableBeds.length === 0) {
        success = false;
        reason = "所有床位已满！需先释放一个床位才能安排急诊患者";
        addFeedback("error", "🚨 " + reason);
        addReplayEntry("ERROR", "急诊无法入院: 无空闲床位", CONFIG.SCORE_ERROR_PENALTY, "no_bed");
        GameState.errors++;
        GameState.score += CONFIG.SCORE_ERROR_PENALTY;
        addOccupancyReport("emergency_no_bed", evt.patientId, "bed",
          "急诊患者无法入院，所有床位已满", GameState.gameTime);
        break;
      }

      const targetBed = availableBeds[0];
      const assignResult = assignBed(targetBed.id, evt.patientId);
      if (!assignResult.success) { success = false; reason = assignResult.reason; break; }

      let patient = GameState.patients.find((p) => p.id === evt.patientId);
      if (!patient) {
        patient = {
          id: evt.patientId,
          name: evt.patientName || evt.patientId,
          level: evt.level || 4,
          bedId: targetBed.id,
          oxygenInterfaceId: targetBed.oxygenInterfaceId,
          admitted: true,
          admittedAt: GameState.gameTime,
          status: "emergency",
        };
        GameState.patients.push(patient);
      } else {
        patient.bedId = targetBed.id;
        patient.oxygenInterfaceId = targetBed.oxygenInterfaceId;
        patient.admitted = true;
        patient.status = "emergency";
      }

      scoreDelta = CONFIG.SCORE_SUCCESS + (waitTime < 15 ? CONFIG.SCORE_FAST : 0);
      break;
    }
    case "skip":
      scoreDelta = -3;
      break;
  }

  if (success) {
    evt.processed = true;
    evt.processedAt = GameState.gameTime;
    evt.scoreDelta = scoreDelta;
    GameState.score += scoreDelta;

    const actLabel = {
      assignBed: "分配床位",
      transferBed: "转科",
      discharge: "出院",
      borrowEquipment: "借用设备",
      returnEquipment: "归还设备",
      emergencyAssign: "急诊安置",
      skip: "跳过",
    }[action] || action;

    addFeedback("success", "✅ " + actLabel + " 成功: " + evt.desc + "（+" + scoreDelta + " 分）");
    addReplayEntry(actLabel, actLabel + ": " + evt.desc, scoreDelta, action);
    showToast(actLabel + "成功 +" + scoreDelta, "success");
  } else {
    addFeedback("error", "❌ 操作失败: " + reason);
    addReplayEntry("FAIL", action + " 失败: " + reason, 0, action + "_fail");
    showToast("操作失败：" + reason, "error");
  }

  GameState.activeEventId = null;
  renderAll();
}

// ============================================================
// 占用报告
// ============================================================
function addOccupancyReport(type, resourceId, resourceType, details, value) {
  GameState.occupancyReports.push({
    id: "RPT_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    time: GameState.gameTime,
    type,
    resourceId,
    resourceType,
    details,
    value,
    source: "game_engine",
    correctionTrace: [],
  });
}

function generateReport() {
  const lines = [];
  lines.push("╔══════════════════════════════════════════════════════════════╗");
  lines.push("║          医院氧气接口占用报告 · 呼吸科调度演练              ║");
  lines.push("╚══════════════════════════════════════════════════════════════╝");
  lines.push("");
  lines.push("生成时间: " + new Date().toLocaleString("zh-CN"));
  lines.push("关卡: " + LEVELS[GameState.currentLevel].name);
  lines.push("游戏时长: " + formatTime(GameState.gameTime));
  lines.push("最终得分: " + GameState.score);
  lines.push("错误数: " + GameState.errors);
  lines.push("");

  lines.push("─── 床位与氧气接口状态 ───");
  lines.push("");
  GameState.beds.forEach((bed) => {
    const ox = GameState.oxygenInterfaces.find((o) => o.id === bed.oxygenInterfaceId);
    const patient = bed.patientId
      ? GameState.patients.find((p) => p.id === bed.patientId)
      : null;
    lines.push(
      "  " + bed.id + " [" + bed.state.toUpperCase().padEnd(9) + "] " +
      "接口 " + ox.id + " " + (ox.occupied ? "占用" : "空闲") +
      (patient ? " | 患者: " + (patient.name || patient.id) + " (等级" + patient.level + ")" : "")
    );
    if (ox && ox.correctionTrace.length > 0) {
      ox.correctionTrace.forEach((t) => {
        lines.push(
          "    └─ [修正痕迹] " + formatTime(t.time) + " " +
          t.action + (t.patientId ? " " + t.patientId : "") +
          (t.note ? " - " + t.note : "") +
          (t.reason ? " - " + t.reason : "")
        );
      });
    }
  });

  lines.push("");
  lines.push("─── 设备状态 ───");
  lines.push("");
  GameState.equipment.forEach((eq) => {
    lines.push("  " + eq.id + " " + eq.name + " [" + (eq.available ? "可用" : "借用中: " + eq.borrowedBy) + "]");
  });

  lines.push("");
  lines.push("─── 事件处理情况 ───");
  lines.push("");
  GameState.events.forEach((evt, i) => {
    const status = evt.processed ? "已处理" : (evt.triggered ? "待处理" : "未触发");
    const scoreMark = evt.scoreDelta ? (evt.scoreDelta > 0 ? "+" : "") + evt.scoreDelta : "";
    const errMark = evt.hasError ? " [错误: " + evt.errorMessage + "]" : "";
    lines.push(
      "  " + (i + 1) + ". [" + formatTime(evt.time) + "] " +
      evt.type + " | " + (evt.patientId || "") + " | " +
      status + " " + scoreMark + errMark
    );
    lines.push("     " + evt.desc);
  });

  lines.push("");
  lines.push("─── 异常/冲突报告 ───");
  lines.push("");
  if (GameState.occupancyReports.length === 0) {
    lines.push("  （无异常记录）");
  } else {
    GameState.occupancyReports.forEach((r, i) => {
      lines.push("  " + (i + 1) + ". [" + r.type + "] " + formatTime(r.time) + " " +
        r.resourceId + " (" + r.resourceType + ")");
      lines.push("     " + r.details);
    });
  }

  lines.push("");
  lines.push("─── 样例数据 ───");
  lines.push("");
  lines.push("  [正常记录] P001 张伟 入院 → B3/O3 → 正常出院");
  lines.push("  [边界记录] P206 马超 急诊插入 → 所有床位紧张 → 快速分配 B4/O4");
  lines.push("  [坏数据]   O5 接口重复占用 → 被系统检测 → 扣分 + 报告记录");
  lines.push("");
  lines.push("─── 回放评分明细 ───");
  lines.push("");
  GameState.replayLog.forEach((r) => {
    const scoreStr = r.score !== 0 ? (r.score > 0 ? "+" : "") + r.score : "  0";
    lines.push("  [" + formatTime(r.time) + "] " + r.category.padEnd(10) +
      " | " + scoreStr.padEnd(6) + " | " + r.description);
  });

  lines.push("");
  lines.push("─── 评分汇总 ───");
  lines.push("");
  const replayScores = GameState.replayLog.filter((r) => r.score !== 0);
  const positive = replayScores.filter((r) => r.score > 0).reduce((s, r) => s + r.score, 0);
  const negative = replayScores.filter((r) => r.score < 0).reduce((s, r) => s + r.score, 0);
  lines.push("  正向得分: " + positive);
  lines.push("  负向扣分: " + negative);
  lines.push("  最终得分: " + GameState.score);
  lines.push("");

  lines.push("╔══════════════════════════════════════════════════════════════╗");
  lines.push("║  报告来源: game_engine | 保留所有修正痕迹                    ║");
  lines.push("║  关键规则: 接口重复占用 / 转科未释放 / 急诊等待 均有明确提示  ║");
  lines.push("║  数据类型: 床位·氧气接口·设备·患者等级·转科事件·占用报告     ║");
  lines.push("╚══════════════════════════════════════════════════════════════╝");

  return lines.join("\n");
}

// ============================================================
// 回放日志
// ============================================================
function addReplayEntry(category, description, score, actionType) {
  GameState.replayLog.push({
    id: "RL_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    time: GameState.gameTime,
    category,
    description,
    score,
    actionType,
  });
}

// ============================================================
// 反馈系统
// ============================================================
function addFeedback(type, message) {
  const panel = document.getElementById("feedbackPanel");
  const item = document.createElement("div");
  item.className = "feedback-item " + type;
  item.innerHTML = '<span class="fb-time">' + formatTime(GameState.gameTime) + '</span><span>' + message + '</span>';
  panel.insertBefore(item, panel.firstChild);
  while (panel.children.length > 50) {
    panel.removeChild(panel.lastChild);
  }
}

function showToast(message, type) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast " + (type || "info");
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3500);
}

// ============================================================
// 渲染
// ============================================================
function renderAll() {
  renderHUD();
  renderBeds();
  renderEquipment();
  renderEventQueue();
  renderPatients();
  renderActionPanel();
  renderReplayPanel();
}

function renderHUD() {
  document.getElementById("timeValue").textContent = formatTime(GameState.gameTime);
  document.getElementById("scoreValue").textContent = GameState.score;
  document.getElementById("levelValue").textContent = LEVELS[GameState.currentLevel].name.split("·")[0].trim();
  const pending = GameState.events.filter((e) => e.triggered && !e.processed).length;
  document.getElementById("eventsValue").textContent = pending;
  document.getElementById("errorsValue").textContent = GameState.errors;
}

function renderBeds() {
  const grid = document.getElementById("bedsGrid");
  grid.innerHTML = "";
  GameState.beds.forEach((bed) => {
    const ox = GameState.oxygenInterfaces.find((o) => o.id === bed.oxygenInterfaceId);
    const patient = bed.patientId
      ? GameState.patients.find((p) => p.id === bed.patientId)
      : null;
    const card = document.createElement("div");
    card.className = "bed-card state-" + bed.state + (ox && ox.conflicts.length > 0 ? " state-error" : "");
    const stateBadge = bed.state === "free" ? "空闲" : bed.state === "occupied" ? "占用" : bed.state === "locked" ? "锁定" : "异常";
    const patientInfo = patient
      ? '<span class="patient-name">' + (patient.name || patient.id) + '</span>' +
        '<span class="level-badge l' + patient.level + '">L' + patient.level + '</span>'
      : '<span style="color:var(--text-muted)">无</span>';
    const oxConflict = ox && ox.conflicts.length > 0;
    card.innerHTML =
      '<div class="bed-header">' +
        '<span class="bed-name">' + bed.id + '</span>' +
        '<span class="bed-state-badge ' + bed.state + '">' + stateBadge + '</span>' +
      '</div>' +
      '<div class="bed-info">' + patientInfo + '</div>' +
      '<span class="oxygen-tag ' + (oxConflict ? "conflict" : "") + '">' +
        bed.oxygenInterfaceId + (oxConflict ? " ⚠冲突" : "") +
      '</span>';
    grid.appendChild(card);
  });
}

function renderEquipment() {
  const list = document.getElementById("equipmentList");
  list.innerHTML = "";
  GameState.equipment.forEach((eq) => {
    const row = document.createElement("div");
    row.className = "equip-row";
    row.innerHTML =
      '<span class="equip-name">' + eq.name + '</span>' +
      '<span class="equip-status ' + (eq.available ? "avail" : "borrowed") + '">' +
        (eq.available ? "可用" : "借用: " + eq.borrowedBy) +
      '</span>';
    list.appendChild(row);
  });
}

function renderEventQueue() {
  const queue = document.getElementById("eventQueue");
  queue.innerHTML = "";

  let events = GameState.events.slice().sort((a, b) => {
    const prio = { critical: 0, urgent: 1, normal: 2 };
    const pa = a.processed ? 99 : prio[a.priority] || 2;
    const pb = b.processed ? 99 : prio[b.priority] || 2;
    if (pa !== pb) return pa - pb;
    return a.time - b.time;
  });

  if (GameState.eventFilter === "pending") {
    events = events.filter((e) => e.triggered && !e.processed);
  } else if (GameState.eventFilter === "error") {
    events = events.filter((e) => e.hasError);
  }

  if (events.length === 0) {
    queue.innerHTML = '<p class="hint" style="padding:10px;">暂无事件</p>';
    return;
  }

  events.forEach((evt) => {
    const card = document.createElement("div");
    card.className = "event-card" +
      (evt.processed ? " processed" : "") +
      (evt.hasError ? " error-flag" : "") +
      (evt.priority === "critical" && !evt.processed ? " emergency" : "") +
      (GameState.activeEventId === evt.id ? " selected" : "");

    const typeLabel = {
      admission: "入院", transfer: "转科", emergency: "急诊",
      equipment: "设备", discharge: "出院",
    }[evt.type] || evt.type;

    const prioLabel = { normal: "普通", urgent: "加急", critical: "紧急" }[evt.priority] || "";
    const waitTime = evt.triggered && !evt.processed ? GameState.gameTime - evt.triggeredAt : 0;

    card.innerHTML =
      '<div class="event-top">' +
        '<span class="event-type ' + evt.type + '">' + typeLabel + '</span>' +
        '<span class="event-time">' + formatTime(evt.time) +
        (waitTime > 0 ? ' / 等待 ' + waitTime + 's' : '') +
        '</span>' +
      '</div>' +
      '<div class="event-desc">' + evt.desc + '</div>' +
      '<div class="event-meta">' +
        '<span>患者: ' + (evt.patientId || "—") + '</span>' +
        (evt.priority !== "normal" ? '<span class="event-priority p-' + evt.priority + '">' + prioLabel + '</span>' : '') +
        (evt.hasError ? '<span class="event-priority p-critical">⚠错误</span>' : "") +
      '</div>';

    if (!evt.processed) {
      card.addEventListener("click", () => {
        GameState.activeEventId = GameState.activeEventId === evt.id ? null : evt.id;
        renderAll();
      });
    }
    queue.appendChild(card);
  });
}

function renderPatients() {
  const tbody = document.getElementById("patientsTableBody");
  tbody.innerHTML = "";
  if (GameState.patients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:16px;">暂无患者</td></tr>';
    return;
  }
  GameState.patients.forEach((p) => {
    const tr = document.createElement("tr");
    const statusClass = p.status === "emergency" ? "status-err" :
      p.status === "discharged" ? "status-warn" : "status-ok";
    const statusText = p.status === "emergency" ? "急诊" :
      p.status === "discharged" ? "已出院" : p.admitted ? "在院" : "未入院";
    tr.innerHTML =
      '<td>' + p.id + '</td>' +
      '<td>' + (p.name || "—") + '</td>' +
      '<td><span class="level-badge l' + p.level + '">L' + p.level + '</span></td>' +
      '<td>' + (p.bedId || "—") + '</td>' +
      '<td>' + (p.oxygenInterfaceId || "—") + '</td>' +
      '<td class="' + statusClass + '">' + statusText + '</td>';
    tbody.appendChild(tr);
  });
}

function renderActionPanel() {
  const panel = document.getElementById("actionPanel");
  if (!GameState.activeEventId) {
    panel.innerHTML = '<p class="hint">请从事件队列中选择一个事件以查看可执行操作</p>';
    return;
  }
  const evt = GameState.events.find((e) => e.id === GameState.activeEventId);
  if (!evt || evt.processed) {
    panel.innerHTML = '<p class="hint">请选择一个待处理事件</p>';
    return;
  }

  let html = '<div style="margin-bottom:10px;font-size:11px;color:var(--text-dim);">';
  html += '<strong style="color:var(--text);">' + evt.desc + '</strong><br>';
  html += '<span>触发时间: ' + formatTime(evt.time) + '</span>';
  if (evt.triggered) {
    html += ' <span style="color:var(--warn);">已等待 ' + (GameState.gameTime - evt.triggeredAt) + ' 秒</span>';
  }
  html += '</div>';

  switch (evt.type) {
    case "admission":
      html += renderAdmissionActions(evt);
      break;
    case "transfer":
      html += renderTransferActions(evt);
      break;
    case "discharge":
      html += renderDischargeActions(evt);
      break;
    case "equipment":
      html += renderEquipmentActions(evt);
      break;
    case "emergency":
      html += renderEmergencyActions(evt);
      break;
  }

  html += '<button class="btn btn-ghost btn-tiny" style="margin-top:10px;width:100%;" ' +
    'onclick="GameState.activeEventId=null;renderAll();">取消选择</button>';

  panel.innerHTML = html;
}

function renderAdmissionActions(evt) {
  const availableBeds = GameState.beds.filter((b) => !b.occupied);
  let html = '<div class="action-group"><div class="action-group-title">分配床位</div>';
  if (availableBeds.length === 0) {
    html += '<p class="hint" style="color:var(--error);">⚠️ 所有床位已满！</p>';
  } else {
    html += '<div class="action-buttons">';
    availableBeds.forEach((bed) => {
      html += '<button class="action-btn" onclick="doAction(\'' + evt.id + '\',\'assignBed\',{bedId:\'' + bed.id + '\'})">' +
        bed.id + ' (' + bed.oxygenInterfaceId + ')</button>';
    });
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderTransferActions(evt) {
  const patient = GameState.patients.find((p) => p.id === evt.patientId);
  if (!patient || !patient.bedId) {
    return '<p class="hint">患者未找到或不在床</p>';
  }
  const availableBeds = GameState.beds.filter((b) => !b.occupied && b.id !== patient.bedId);
  let html = '<div class="action-group">';
  html += '<div class="action-group-title">当前床位: ' + patient.bedId + '</div>';
  html += '<div class="action-group-title">目标床位</div>';

  if (availableBeds.length === 0) {
    html += '<p class="hint" style="color:var(--error);">⚠️ 无可用目标床位</p>';
  } else {
    html += '<div class="action-buttons">';
    availableBeds.forEach((bed) => {
      const toOx = GameState.oxygenInterfaces.find((o) => o.id === bed.oxygenInterfaceId);
      const conflict = toOx && toOx.occupied;
      html += '<button class="action-btn ' + (conflict ? "danger" : "") + '" ' +
        'onclick="doAction(\'' + evt.id + '\',\'transferBed\',{toBedId:\'' + bed.id + '\'})">' +
        bed.id + (conflict ? ' ⚠接口占用' : '') + '</button>';
    });
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderDischargeActions(evt) {
  const patient = GameState.patients.find((p) => p.id === evt.patientId);
  if (!patient) return '<p class="hint">患者未找到</p>';
  let html = '<div class="action-group"><div class="action-group-title">确认出院</div>';
  html += '<p style="font-size:11px;color:var(--text-dim);margin-bottom:6px;">';
  html += '患者: ' + (patient.name || patient.id) + ' (L' + patient.level + ') | 床位: ' + (patient.bedId || '—') + '</p>';
  html += '<button class="btn btn-warn" style="width:100%;" onclick="doAction(\'' + evt.id + '\',\'discharge\',{})">确认出院</button>';
  html += '</div>';
  return html;
}

function renderEquipmentActions(evt) {
  const type = evt.equipmentType;
  const typeName = type === "ventilator" ? "呼吸机" : type === "monitor" ? "监护仪" : "设备";
  const available = GameState.equipment.filter((e) => e.type === type && e.available);
  const borrowed = GameState.equipment.filter((e) => e.type === type && !e.available && e.borrowedBy === evt.patientId);

  let html = '<div class="action-group"><div class="action-group-title">借用 ' + typeName + '</div>';
  if (available.length === 0) {
    html += '<p class="hint" style="color:var(--warn);">⚠️ 所有 ' + typeName + ' 均被借用</p>';
  } else {
    html += '<div class="action-buttons">';
    available.forEach((eq) => {
      html += '<button class="action-btn" onclick="doAction(\'' + evt.id + '\',\'borrowEquipment\',{equipId:\'' + eq.id + '\'})">' +
        eq.name + '</button>';
    });
    html += '</div>';
  }
  html += '</div>';

  if (borrowed.length > 0) {
    html += '<div class="action-group"><div class="action-group-title">归还设备</div><div class="action-buttons">';
    borrowed.forEach((eq) => {
      html += '<button class="action-btn" onclick="doAction(\'' + evt.id + '\',\'returnEquipment\',{equipId:\'' + eq.id + '\'})">归还 ' + eq.name + '</button>';
    });
    html += '</div></div>';
  }
  return html;
}

function renderEmergencyActions(evt) {
  const availableBeds = GameState.beds.filter((b) => !b.occupied);
  let html = '<div class="action-group"><div class="action-group-title" style="color:var(--error);">🚨 急诊处理</div>';
  if (availableBeds.length === 0) {
    html += '<div class="action-conflict-warning">';
    html += '所有床位已满！需先为其他患者办理出院或转科才能安排急诊患者。';
    html += '</div>';
    html += '<button class="btn btn-danger" style="width:100%;margin-top:6px;" ' +
      'onclick="doAction(\'' + evt.id + '\',\'emergencyAssign\',{})">尝试强制分配</button>';
  } else {
    html += '<p style="font-size:11px;color:var(--text-dim);margin-bottom:6px;">';
    html += '可用床位: ' + availableBeds.map((b) => b.id).join(", ") + '</p>';
    html += '<button class="btn btn-danger" style="width:100%;" ' +
      'onclick="doAction(\'' + evt.id + '\',\'emergencyAssign\',{})">优先分配 ' + availableBeds[0].id + ' + ' + availableBeds[0].oxygenInterfaceId + '</button>';

    html += '<div class="action-group-title" style="margin-top:10px;">手动选择床位</div><div class="action-buttons">';
    availableBeds.forEach((bed) => {
      html += '<button class="action-btn" onclick="doAction(\'' + evt.id + '\',\'assignBed\',{bedId:\'' + bed.id + '\'})">' +
        bed.id + '</button>';
    });
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderReplayPanel() {
  const panel = document.getElementById("replayPanel");
  if (GameState.replayLog.length === 0) {
    panel.innerHTML = '<p class="hint">游戏开始后所有操作将在此记录</p>';
    return;
  }
  const recent = GameState.replayLog.slice(-40).reverse();
  let html = "";
  recent.forEach((r) => {
    const scoreClass = r.score > 0 ? "re-ok" : r.score < 0 ? "re-err" : "";
    const scoreStr = r.score !== 0 ? (r.score > 0 ? "+" : "") + r.score : "";
    html += '<div class="replay-entry">' +
      '<span class="re-t">' + formatTime(r.time) + '</span>' +
      '<span class="re-act">' + r.category + '</span>' +
      '<span>' + r.description + '</span>' +
      (scoreStr ? '<span class="re-sc ' + scoreClass + '">' + scoreStr + '</span>' : '') +
      '</div>';
  });
  panel.innerHTML = html;
}

// ============================================================
// 操作入口
// ============================================================
function doAction(eventId, action, payload) {
  const evt = GameState.events.find((e) => e.id === eventId);
  if (!evt) return;
  handleEventAction(evt, action, payload || {});
}

// ============================================================
// 结算
// ============================================================
function showResultModal() {
  const modal = document.getElementById("resultModal");
  const stats = document.getElementById("resultStats");
  const detail = document.getElementById("resultDetail");

  const total = GameState.score;
  const processed = GameState.events.filter((e) => e.processed).length;
  const totalEvents = GameState.events.length;
  const errors = GameState.errors;

  stats.innerHTML =
    '<div class="result-stat"><div class="rs-label">最终得分</div>' +
      '<div class="rs-value ' + (total >= 0 ? "positive" : "negative") + '">' + total + '</div></div>' +
    '<div class="result-stat"><div class="rs-label">处理事件</div>' +
      '<div class="rs-value">' + processed + ' / ' + totalEvents + '</div></div>' +
    '<div class="result-stat"><div class="rs-label">错误次数</div>' +
      '<div class="rs-value ' + (errors > 0 ? "negative" : "positive") + '">' + errors + '</div></div>' +
    '<div class="result-stat"><div class="rs-label">游戏时长</div>' +
      '<div class="rs-value">' + formatTime(GameState.gameTime) + '</div></div>';

  let detailHtml = '<h3>失败原因与评分明细</h3><ul>';
  GameState.events.forEach((evt) => {
    if (!evt.processed) {
      detailHtml += '<li class="err-item">❌ 未处理: ' + evt.desc +
        ' (事件时间 ' + formatTime(evt.time) + ')</li>';
    }
    if (evt.hasError) {
      detailHtml += '<li class="err-item">⚠️ 错误: ' + (evt.errorMessage || evt.desc) + '</li>';
    }
  });
  GameState.occupancyReports.forEach((r) => {
    detailHtml += '<li class="warn-item">⚠️ [' + r.type + '] ' + r.details + '</li>';
  });

  const replayScores = GameState.replayLog.filter((r) => r.score !== 0);
  const positive = replayScores.filter((r) => r.score > 0).reduce((s, r) => s + r.score, 0);
  const negative = replayScores.filter((r) => r.score < 0).reduce((s, r) => s + r.score, 0);
  detailHtml += '<li>✅ 正向得分: ' + positive + '</li>';
  detailHtml += '<li>❌ 负向扣分: ' + negative + '</li>';
  detailHtml += '</ul>';

  detail.innerHTML = detailHtml;
  modal.classList.add("show");
}

function showReplayModal() {
  const modal = document.getElementById("replayModal");
  const list = document.getElementById("replayList");
  let html = '<div class="rl-row rl-header"><span>时间</span><span>操作</span><span>得分</span></div>';
  GameState.replayLog.forEach((r) => {
    const scoreClass = r.score > 0 ? "plus" : r.score < 0 ? "minus" : "";
    const scoreStr = r.score !== 0 ? (r.score > 0 ? "+" : "") + r.score : "0";
    html += '<div class="rl-row ' + scoreClass + '">' +
      '<span class="rl-t">' + formatTime(r.time) + '</span>' +
      '<span class="rl-act">' + r.category + ' — ' + r.description + '</span>' +
      '<span class="rl-sc">' + scoreStr + '</span></div>';
  });
  list.innerHTML = html;
  modal.classList.add("show");
}

function showReportModal() {
  const modal = document.getElementById("reportModal");
  document.getElementById("reportText").textContent = generateReport();
  modal.classList.add("show");
}

// ============================================================
// 工具
// ============================================================
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}

// ============================================================
// 事件绑定
// ============================================================
document.getElementById("btnStart").addEventListener("click", startGame);
document.getElementById("btnPause").addEventListener("click", pauseGame);
document.getElementById("btnReset").addEventListener("click", resetGame);
document.getElementById("btnExport").addEventListener("click", showReportModal);
document.getElementById("btnViewReplay").addEventListener("click", showReplayModal);
document.getElementById("btnCloseResult").addEventListener("click", () =>
  document.getElementById("resultModal").classList.remove("show"));
document.getElementById("btnReplay").addEventListener("click", () => {
  document.getElementById("resultModal").classList.remove("show");
  resetGame();
});
document.getElementById("btnCloseReplay").addEventListener("click", () =>
  document.getElementById("replayModal").classList.remove("show"));
document.getElementById("btnCloseReport").addEventListener("click", () =>
  document.getElementById("reportModal").classList.remove("show"));
document.getElementById("btnCopyReport").addEventListener("click", () => {
  const text = document.getElementById("reportText").textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast("报告已复制到剪贴板", "success");
  }).catch(() => {
    showToast("复制失败，请手动复制", "error");
  });
});
document.getElementById("levelSelect").addEventListener("change", (e) => {
  GameState.currentLevel = parseInt(e.target.value, 10);
  resetGame();
});
document.getElementById("btnFilterAll").addEventListener("click", () => {
  GameState.eventFilter = "all";
  renderEventQueue();
});
document.getElementById("btnFilterPending").addEventListener("click", () => {
  GameState.eventFilter = "pending";
  renderEventQueue();
});
document.getElementById("btnFilterError").addEventListener("click", () => {
  GameState.eventFilter = "error";
  renderEventQueue();
});

initGame();
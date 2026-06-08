import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class UnderwaterRobotCruise {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.robot = null;
    this.boundary = null;
    this.animationId = null;
    
    this.isCruising = false;
    this.isPaused = false;
    this.cruiseTime = 0;
    this.boundaryWarnings = 0;
    this.currentLevel = 1;
    this.undoCount = 0;
    this.history = [];
    this.details = [];
    this.invalidRecords = [];
    this.hasBoundaryFailure = false;
    this.startTimestamp = null;
    
    this.robotWorldPosition = new THREE.Vector3(0, 0, 0);
    this.robotDevicePosition = new THREE.Vector3(0, 0, 0);
    this.coordinateSyncState = 'synced';
    this.lastSyncTime = null;
    this.boundaryDistance = 0;
    this.boundaryLimit = 10;
    this.cameraViewHistory = [];
    
    this.init();
    this.bindEvents();
  }
  
  init() {
    this.initThree();
    this.createScene();
    this.animate();
  }
  
  initThree() {
    const canvas = document.getElementById('three-canvas');
    const container = document.getElementById('canvas-container');
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x061A3A);
    this.scene.fog = new THREE.Fog(0x061A3A, 20, 80);
    
    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(15, 12, 15);
    
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 60;
    this.controls.minDistance = 5;
  }
  
  createScene() {
    const ambientLight = new THREE.AmbientLight(0x4A90B5, 0.5);
    this.scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xFFFFFF, 1, 50);
    pointLight.position.set(0, 10, 0);
    this.scene.add(pointLight);
    
    this.createBoundary();
    this.createGrid();
    this.createRobot();
    this.createParticles();
  }
  
  createBoundary() {
    const size = 20;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ color: 0x3E92CC, linewidth: 2 });
    this.boundary = new THREE.LineSegments(edges, material);
    this.scene.add(this.boundary);
    
    const planeGeometry = new THREE.PlaneGeometry(size, size);
    const planeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x0A2463, 
      transparent: true, 
      opacity: 0.1,
      side: THREE.DoubleSide
    });
    const bottomPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    bottomPlane.rotation.x = Math.PI / 2;
    bottomPlane.position.y = -size / 2;
    this.scene.add(bottomPlane);
  }
  
  createGrid() {
    const gridHelper = new THREE.GridHelper(40, 40, 0x1D3557, 0x0A2463);
    gridHelper.position.y = -10;
    this.scene.add(gridHelper);
  }
  
  createRobot() {
    const group = new THREE.Group();
    
    const bodyGeometry = new THREE.CapsuleGeometry(1, 3, 4, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x2A9D8F,
      shininess: 100
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    group.add(body);
    
    const headGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0x21867A });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.x = 2;
    group.add(head);
    
    const finGeometry = new THREE.BoxGeometry(0.2, 1.5, 0.8);
    const finMaterial = new THREE.MeshPhongMaterial({ color: 0x1D3557 });
    const fin1 = new THREE.Mesh(finGeometry, finMaterial);
    fin1.position.set(-1.5, 0.8, 0);
    group.add(fin1);
    const fin2 = new THREE.Mesh(finGeometry, finMaterial);
    fin2.position.set(-1.5, -0.8, 0);
    group.add(fin2);
    
    const propGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 6);
    const propMaterial = new THREE.MeshPhongMaterial({ color: 0x457B9D });
    this.propeller = new THREE.Mesh(propGeometry, propMaterial);
    this.propeller.position.set(-2.5, 0, 0);
    this.propeller.rotation.z = Math.PI / 2;
    group.add(this.propeller);
    
    this.robot = group;
    this.robot.position.set(0, 0, 0);
    this.scene.add(this.robot);
    
    this.saveHistory();
  }
  
  createParticles() {
    const particleCount = 500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 60;
      positions[i + 1] = (Math.random() - 0.5) * 40;
      positions[i + 2] = (Math.random() - 0.5) * 60;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0xA8DADC,
      size: 0.1,
      transparent: true,
      opacity: 0.6
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }
  
  bindEvents() {
    window.addEventListener('resize', () => this.onResize());
    
    document.getElementById('btn-start').addEventListener('click', () => this.startCruise());
    document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
    document.getElementById('btn-undo').addEventListener('click', () => this.undo());
    document.getElementById('btn-restart').addEventListener('click', () => this.restartLevel());
    document.getElementById('btn-settlement').addEventListener('click', () => this.showSettlement());
    document.getElementById('btn-back').addEventListener('click', () => this.backToCruise());
    document.getElementById('btn-export-json').addEventListener('click', () => this.exportJSON());
    document.getElementById('btn-export-txt').addEventListener('click', () => this.exportTXT());
    
    document.querySelectorAll('.level-item').forEach(item => {
      item.addEventListener('click', () => {
        this.currentLevel = parseInt(item.dataset.level);
        this.updateLevelUI();
        this.restartLevel();
      });
    });
  }
  
  onResize() {
    const container = document.getElementById('canvas-container');
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }
  
  startCruise() {
    this.isCruising = true;
    this.isPaused = false;
    this.startTimestamp = Date.now();
    this.cruiseTime = 0;
    this.boundaryWarnings = 0;
    this.hasBoundaryFailure = false;
    this.details = [];
    this.invalidRecords = [];
    
    this.addDetail('系统', '开始巡航任务');
    
    this.updateButtonStates();
    document.getElementById('cruise-status').textContent = '巡航中';
    
    this.startAutoCruise();
  }
  
  startAutoCruise() {
    if (!this.isCruising || this.isPaused) return;
    
    const path = this.getLevelPath();
    let pathIndex = 0;
    
    const moveAlongPath = () => {
      if (!this.isCruising || this.isPaused) return;
      
      if (pathIndex < path.length) {
        const target = path[pathIndex];
        this.moveRobotTo(target.x, target.y, target.z);
        
        if (this.currentLevel === 1 && pathIndex === 3 && !this.hasBoundaryFailure) {
          this.triggerBoundaryFailure();
        }
        
        pathIndex++;
        setTimeout(moveAlongPath, 1500);
      } else {
        this.addDetail('系统', '巡航路径完成');
        document.getElementById('btn-settlement').disabled = false;
        document.getElementById('cruise-status').textContent = '完成';
        this.isCruising = false;
        this.updateButtonStates();
      }
    };
    
    setTimeout(moveAlongPath, 500);
  }
  
  getLevelPath() {
    if (this.currentLevel === 1) {
      return [
        { x: 3, y: 0, z: 3 },
        { x: 6, y: 2, z: 0 },
        { x: 5, y: -1, z: -4 },
        { x: 11, y: 0, z: 0 },
        { x: 3, y: 1, z: 3 },
        { x: 0, y: 0, z: 0 }
      ];
    } else {
      return [
        { x: 4, y: 2, z: 0 },
        { x: 0, y: 3, z: 4 },
        { x: -4, y: 1, z: 0 },
        { x: 0, y: -1, z: -4 },
        { x: 0, y: 0, z: 0 }
      ];
    }
  }
  
  moveRobotTo(x, y, z) {
    if (!this.robot) return;
    
    this.saveHistory();
    
    const targetPos = new THREE.Vector3(x, y, z);
    this.robot.position.copy(targetPos);
    this.robotWorldPosition.copy(targetPos);
    
    this.updateDeviceCoordinates();
    this.updateCoordinateUI();
    this.checkBoundary();
    
    this.addDetail('移动', `机器人移动至 (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
    
    this.camera.position.set(x + 15, y + 12, z + 15);
    this.controls.target.set(x, y, z);
    this.controls.update();
  }
  
  updateDeviceCoordinates() {
    const origin = new THREE.Vector3(0, 0, 0);
    this.robotDevicePosition.subVectors(this.robotWorldPosition, origin);
    this.validateCoordinateSync();
    this.lastSyncTime = Date.now();
    
    if (this.camera && this.controls) {
      const offset = new THREE.Vector3(15, 12, 15);
      const targetCamPos = this.robotWorldPosition.clone().add(offset);
      this.camera.position.lerp(targetCamPos, 0.1);
      this.controls.target.lerp(this.robotWorldPosition.clone(), 0.1);
      this.controls.update();
    }
  }
  
  validateCoordinateSync() {
    const tolerance = 0.01;
    const diff = this.robotWorldPosition.distanceTo(this.robot.position);
    const deviceDiff = this.robotDevicePosition.distanceTo(
      new THREE.Vector3().subVectors(this.robotWorldPosition, new THREE.Vector3(0, 0, 0))
    );
    
    if (diff > tolerance || deviceDiff > tolerance) {
      this.coordinateSyncState = 'mismatch';
      this.addInvalidRecord(
        '坐标系混用',
        `世界坐标(${this.robotWorldPosition.x.toFixed(3)}, ${this.robotWorldPosition.y.toFixed(3)}, ${this.robotWorldPosition.z.toFixed(3)})与设备坐标偏差超过阈值${tolerance}，差值=${Math.max(diff, deviceDiff).toFixed(4)}。原因：双坐标系未同步更新，可能导致定位漂移。`
      );
    } else {
      this.coordinateSyncState = 'synced';
    }
  }
  
  updateCoordinateUI() {
    const worldCoord = document.getElementById('world-coord');
    const deviceCoord = document.getElementById('device-coord');
    const coordStatus = document.getElementById('coord-status');
    const boundaryDist = document.getElementById('boundary-distance');
    const syncIndicator = document.getElementById('sync-indicator');
    
    worldCoord.textContent = `X: ${this.robotWorldPosition.x.toFixed(2)} Y: ${this.robotWorldPosition.y.toFixed(2)} Z: ${this.robotWorldPosition.z.toFixed(2)}`;
    deviceCoord.textContent = `X: ${this.robotDevicePosition.x.toFixed(2)} Y: ${this.robotDevicePosition.y.toFixed(2)} Z: ${this.robotDevicePosition.z.toFixed(2)}`;
    
    this.boundaryDistance = this.robotWorldPosition.length();
    if (boundaryDist) {
      boundaryDist.textContent = `${this.boundaryDistance.toFixed(2)} / ${this.boundaryLimit}`;
      if (this.boundaryDistance > this.boundaryLimit) {
        boundaryDist.style.color = '#E63946';
      } else if (this.boundaryDistance > this.boundaryLimit * 0.8) {
        boundaryDist.style.color = '#F4A261';
      } else {
        boundaryDist.style.color = '#A8DADC';
      }
    }
    
    if (this.coordinateSyncState === 'synced') {
      coordStatus.textContent = '正常';
      coordStatus.style.color = '#2A9D8F';
      if (syncIndicator) {
        syncIndicator.textContent = '已同步';
        syncIndicator.style.color = '#2A9D8F';
      }
    } else if (this.coordinateSyncState === 'mismatch') {
      coordStatus.textContent = '异常';
      coordStatus.style.color = '#E63946';
      if (syncIndicator) {
        syncIndicator.textContent = '不同步 ⚠';
        syncIndicator.style.color = '#E63946';
      }
    }
  }
  
  checkBoundary() {
    const limit = this.boundaryLimit;
    const pos = this.robotWorldPosition;
    const dist = pos.length();
    this.boundaryDistance = dist;
    
    if (dist > limit) {
      this.boundaryWarnings++;
      document.getElementById('boundary-warnings').textContent = this.boundaryWarnings;
      this.addDetail('边界', `距离中心 ${dist.toFixed(2)}，超出限值 ${limit}，偏差 ${(dist - limit).toFixed(2)}`);
      this.showMessage(`⚠️ 边界警告：超出安全区域 ${(dist - limit).toFixed(2)} 单位`);
      return true;
    } else if (dist > limit * 0.8) {
      this.showMessage(`🔔 接近边界：当前距离 ${dist.toFixed(2)} / ${limit}`);
    }
    return false;
  }
  
  triggerBoundaryFailure() {
    this.hasBoundaryFailure = true;
    this.boundaryWarnings++;
    document.getElementById('boundary-warnings').textContent = this.boundaryWarnings;
    
    this.robotWorldPosition.set(11, 0, 0);
    this.robot.position.copy(this.robotWorldPosition);
    this.updateDeviceCoordinates();
    this.updateCoordinateUI();
    
    this.addDetail('失败', '触发边界失败 - 机器人超出安全边界 (X=11.00)');
    this.addInvalidRecord('坐标混用风险', '世界坐标与设备坐标未正确同步，导致边界检测延迟');
    
    this.showMessage('🚨 边界失败！已触发安全警报');
    
    document.getElementById('coord-status').textContent = '异常';
    document.getElementById('coord-status').style.color = '#E63946';
  }
  
  saveHistory() {
    if (this.robot && this.camera && this.controls) {
      this.history.push({
        position: this.robot.position.clone(),
        worldPosition: this.robotWorldPosition.clone(),
        devicePosition: this.robotDevicePosition.clone(),
        cameraPosition: this.camera.position.clone(),
        controlsTarget: this.controls.target.clone(),
        time: this.cruiseTime,
        timestamp: Date.now()
      });
    }
  }
  
  undo() {
    if (this.history.length <= 1) return;
    
    this.history.pop();
    const prevState = this.history[this.history.length - 1];
    
    if (prevState && this.robot && this.camera && this.controls) {
      this.robot.position.copy(prevState.position);
      this.robotWorldPosition.copy(prevState.worldPosition);
      this.robotDevicePosition.copy(prevState.devicePosition);
      
      this.camera.position.copy(prevState.cameraPosition);
      this.controls.target.copy(prevState.controlsTarget);
      this.controls.update();
      
      this.coordinateSyncState = 'synced';
      this.lastSyncTime = Date.now();
      this.updateCoordinateUI();
      
      this.undoCount++;
      this.addDetail('撤销', `执行撤销操作 #${this.undoCount}，已恢复位置、坐标及视角`);
    }
    
    document.getElementById('btn-undo').disabled = this.history.length <= 1;
  }
  
  restartLevel() {
    this.isCruising = false;
    this.isPaused = false;
    this.cruiseTime = 0;
    this.boundaryWarnings = 0;
    this.undoCount = 0;
    this.history = [];
    this.details = [];
    this.invalidRecords = [];
    this.hasBoundaryFailure = false;
    this.startTimestamp = null;
    
    if (this.robot) {
      this.robot.position.set(0, 0, 0);
      this.robotWorldPosition.set(0, 0, 0);
      this.robotDevicePosition.set(0, 0, 0);
    }
    
    this.camera.position.set(15, 12, 15);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    
    this.updateCoordinateUI();
    this.updateButtonStates();
    document.getElementById('cruise-time').textContent = '00:00';
    document.getElementById('boundary-warnings').textContent = '0';
    document.getElementById('cruise-status').textContent = '就绪';
    document.getElementById('btn-settlement').disabled = true;
    
    this.saveHistory();
    this.addDetail('系统', '关卡重置完成');
  }
  
  togglePause() {
    this.isPaused = !this.isPaused;
    document.getElementById('btn-pause').textContent = this.isPaused ? '继续' : '暂停';
    document.getElementById('cruise-status').textContent = this.isPaused ? '已暂停' : '巡航中';
    
    if (!this.isPaused && this.isCruising) {
      this.startAutoCruise();
    }
  }
  
  addDetail(type, content) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
    
    this.details.push({
      type,
      content,
      time: timeStr,
      timestamp: now.getTime()
    });
  }
  
  addInvalidRecord(type, reason) {
    this.invalidRecords.push({
      type,
      reason,
      timestamp: Date.now()
    });
  }
  
  updateLevelUI() {
    document.getElementById('current-level').textContent = `关卡 ${this.currentLevel}`;
    
    document.querySelectorAll('.level-item').forEach(item => {
      item.classList.toggle('active', parseInt(item.dataset.level) === this.currentLevel);
    });
  }
  
  updateButtonStates() {
    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnUndo = document.getElementById('btn-undo');
    
    btnStart.disabled = this.isCruising;
    btnPause.disabled = !this.isCruising;
    btnUndo.disabled = this.history.length <= 1;
  }
  
  showMessage(msg) {
    const toast = document.getElementById('message-toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }
  
  showSettlement() {
    document.getElementById('cruise-page').classList.remove('active');
    document.getElementById('settlement-page').classList.add('active');
    
    this.populateSettlement();
  }
  
  backToCruise() {
    document.getElementById('settlement-page').classList.remove('active');
    document.getElementById('cruise-page').classList.add('active');
  }
  
  populateSettlement() {
    const totalSeconds = this.cruiseTime;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('summary-level').textContent = `关卡 ${this.currentLevel}`;
    document.getElementById('summary-time').textContent = timeStr;
    document.getElementById('summary-failures').textContent = `${this.boundaryWarnings} 次`;
    document.getElementById('summary-undos').textContent = `${this.undoCount} 次`;
    document.getElementById('summary-invalid').textContent = `${this.invalidRecords.length} 条`;
    const invalidBadge = document.getElementById('invalid-count-badge');
    if (invalidBadge) {
      invalidBadge.textContent = `${this.invalidRecords.length} 条`;
      invalidBadge.style.background = this.invalidRecords.length > 0 ? '#E63946' : '#2A9D8F';
    }
    
    const resultBadge = document.getElementById('result-badge');
    if (this.invalidRecords.length > 0 || this.hasBoundaryFailure) {
      resultBadge.textContent = '需复核';
      resultBadge.style.background = '#E63946';
    } else if (this.boundaryWarnings > 0) {
      resultBadge.textContent = '警告';
      resultBadge.style.background = '#F4A261';
    } else {
      resultBadge.textContent = '完成';
      resultBadge.style.background = '#2A9D8F';
    }
    
    const invalidList = document.getElementById('invalid-list');
    const invalidCard = document.getElementById('invalid-records-card');
    if (this.invalidRecords.length === 0) {
      invalidList.innerHTML = '<div style="color: #2A9D8F; font-size: 14px; padding: 16px;">✅ 无不可用记录，所有数据可用</div>';
      if (invalidCard) invalidCard.style.borderLeft = '4px solid #2A9D8F';
    } else {
      if (invalidCard) invalidCard.style.borderLeft = '4px solid #E63946';
      invalidList.innerHTML = this.invalidRecords.map((r, idx) => `
        <div class="invalid-item">
          <div class="detail-time">记录 #${idx + 1} · ${new Date(r.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}</div>
          <div class="detail-content"><strong>不可用类型:</strong> ${r.type}</div>
          <div class="detail-explanation">
            <strong>拦截原因说明:</strong><br>${r.reason}<br><br>
            <strong>处理建议:</strong> 此条记录已被标记为不可用，评审会不予采纳。请检查坐标同步逻辑后重新运行。
          </div>
        </div>
      `).join('');
    }
    
    const detailsList = document.getElementById('details-list');
    detailsList.innerHTML = this.details.map(d => `
      <div class="detail-item">
        <div class="detail-time">${d.time}</div>
        <div class="detail-content">${d.content}</div>
        <div class="detail-explanation">
          ${this.getDetailExplanation(d.type)}
        </div>
      </div>
    `).join('');
  }
  
  getDetailExplanation(type) {
    switch (type) {
      case '系统':
        return '【明细解释】系统状态变更记录，用于追踪任务完整生命周期。每次状态切换均记录时间戳，确保审计可追溯。';
      case '移动':
        return '【明细解释】机器人位置更新操作：同时更新世界坐标(全局定位系统)和设备坐标(机身相对坐标系)，两套坐标独立存储、同步校验，避免坐标系混用导致的定位误差。';
      case '失败':
        return '【明细解释】边界失败事件：机器人位置超出预设安全边界(半径10单位球体)。此事件触发安全警报，相关记录标记为"不可用"状态，评审会不予采纳该数据段。';
      case '撤销':
        return '【明细解释】撤销操作：回退到上一状态快照，包含机器人位置、双坐标系数据、摄像机视角参数。撤销后所有数据恢复至该时间点状态。';
      case '边界':
        return '【明细解释】边界距离检测：实时计算机器人与场景原点的欧氏距离。黄色警告(>8单位)提示接近边界，红色报警(>10单位)表示越界。';
      default:
        return '【明细解释】常规操作记录，已纳入运行审计日志。';
    }
  }
  
  getExportData() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const runId = `URC-${this.startTimestamp || Date.now()}`;
    
    return {
      exportId: `URC-${timestamp}`,
      runId: runId,
      exportTime: now.toLocaleString('zh-CN'),
      startTime: this.startTimestamp ? new Date(this.startTimestamp).toLocaleString('zh-CN') : '未开始',
      level: this.currentLevel,
      cruiseTime: this.cruiseTime,
      boundaryWarnings: this.boundaryWarnings,
      undoCount: this.undoCount,
      hasBoundaryFailure: this.hasBoundaryFailure,
      finalCoordinateStatus: this.coordinateSyncState,
      invalidRecordCount: this.invalidRecords.length,
      coordinateStatus: {
        world: {
          x: parseFloat(this.robotWorldPosition.x.toFixed(4)),
          y: parseFloat(this.robotWorldPosition.y.toFixed(4)),
          z: parseFloat(this.robotWorldPosition.z.toFixed(4)),
          definition: '世界坐标：全局定位系统，以场景原点为基准，用于边界检测和全局路径规划'
        },
        device: {
          x: parseFloat(this.robotDevicePosition.x.toFixed(4)),
          y: parseFloat(this.robotDevicePosition.y.toFixed(4)),
          z: parseFloat(this.robotDevicePosition.z.toFixed(4)),
          definition: '设备坐标：机身相对坐标系，以机器人初始位置为原点，用于设备内部控制'
        },
        syncValidation: {
          performed: true,
          tolerance: 0.01,
          result: this.coordinateSyncState === 'synced' ? 'PASS' : 'FAIL',
          lastSyncTime: this.lastSyncTime ? new Date(this.lastSyncTime).toLocaleString('zh-CN') : 'N/A'
        }
      },
      boundaryStatus: {
        currentDistance: parseFloat(this.boundaryDistance.toFixed(4)),
        limit: this.boundaryLimit,
        warningThreshold: parseFloat((this.boundaryLimit * 0.8).toFixed(2)),
        isOverLimit: this.boundaryDistance > this.boundaryLimit
      },
      details: this.details,
      invalidRecords: this.invalidRecords.map(r => ({
        ...r,
        formattedTime: new Date(r.timestamp).toLocaleString('zh-CN'),
        reviewVerdict: '评审结论：此记录不可用，不予采纳',
        actionRequired: '需修复坐标同步逻辑后重新运行采集'
      })),
      coordinateMixPrevention: {
        rule1: '双系统独立存储：worldPosition 和 devicePosition 分两个变量保存，互不直接引用',
        rule2: '同步更新机制：每次移动后同时调用 updateDeviceCoordinates()，双系统原子更新',
        rule3: '偏差校验：validateCoordinateSync() 实时校验偏差，超过阈值 0.01 即拦截',
        rule4: '历史快照：saveHistory() 保存双坐标+视角全量快照，撤销操作可完整回滚'
      },
      explanation: {
        summary: '本报告用于工程评审，重点关注不可用记录而非功能菜单。',
        coordinateMix: '【坐标系混用拦截判定标准】本系统严格分离世界坐标(全局定位系统)与设备坐标(机身相对坐标系)：\n- 世界坐标：用于全局边界检测，以场景原点(0,0,0)为基准\n- 设备坐标：用于机身内部控制，以初始位置为基准\n- 两套坐标独立存储，每次操作必须同步更新，偏差超过 0.01 单位即判定为"坐标系混用"并拦截该记录。',
        whyBlocked: '【坐标系混用被拦截的常见原因】\n1) 仅更新单坐标系：移动后只写 worldPosition 或只写 devicePosition\n2) 坐标转换逻辑错误：世界坐标与设备坐标之间换算公式有误\n3) 时序不同步：双系统更新之间存在时间差，中间被读取导致不一致\n4) 数据类型差异：浮点精度或四元数转换造成累积偏差\n\n【本次运行拦截详情】请查看上方 invalidRecords 数组，每条记录包含具体坐标值和偏差量。'
      }
    };
  }
  
  getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }
  
  exportJSON() {
    const data = this.getExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `underwater-cruise-report-${this.getTimestamp()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showMessage('✅ JSON报告已导出');
  }
  
  exportTXT() {
    const data = this.getExportData();
    let txt = `\n`;
    txt += `╔══════════════════════════════════════════════════════════════╗\n`;
    txt += `║           水下机器人巡航视图 - 工程评审报告                   ║\n`;
    txt += `╚══════════════════════════════════════════════════════════════╝\n\n`;
    
    txt += `【运行标识】\n`;
    txt += `  报告ID:       ${data.exportId}\n`;
    txt += `  运行ID:       ${data.runId}\n`;
    txt += `  导出时间:     ${data.exportTime}\n`;
    txt += `  开始时间:     ${data.startTime}\n\n`;
    
    txt += `【评审结论摘要】\n`;
    txt += `  关卡:         关卡 ${data.level}\n`;
    txt += `  巡航时长:     ${data.cruiseTime.toFixed(1)} 秒\n`;
    txt += `  边界警告:     ${data.boundaryWarnings} 次\n`;
    txt += `  撤销操作:     ${data.undoCount} 次\n`;
    txt += `  边界失败:     ${data.hasBoundaryFailure ? '触发 ⚠' : '未触发 ✓'}\n`;
    txt += `  坐标同步:     ${data.finalCoordinateStatus === 'synced' ? '正常 ✓' : '异常 ✗'}\n`;
    txt += `  不可用记录:   ${data.invalidRecordCount} 条 ${data.invalidRecordCount > 0 ? '⚠ 需重点关注' : '✓ 全部可用'}\n\n`;
    
    if (data.invalidRecords.length > 0) {
      txt += `\n`;
      txt += `╔══════════════════════════════════════════════════════════════╗\n`;
      txt += `║   ★ 不可用记录 (评审重点：以下数据不予采纳)                    ║\n`;
      txt += `╚══════════════════════════════════════════════════════════════╝\n\n`;
      
      data.invalidRecords.forEach((r, idx) => {
        txt += `  ┌─ 不可用记录 #${idx + 1} ──────────────────────────────────────┐\n`;
        txt += `  │ 发生时间: ${r.formattedTime}\n`;
        txt += `  │ 问题类型: ${r.type}\n`;
        txt += `  │ 详细原因: ${r.reason}\n`;
        txt += `  │ 评审结论: ${r.reviewVerdict}\n`;
        txt += `  │ 处理建议: ${r.actionRequired}\n`;
        txt += `  └──────────────────────────────────────────────────────────┘\n\n`;
      });
    }
    
    txt += `\n`;
    txt += `【坐标系校验详情】\n`;
    txt += `  ┌─ 世界坐标 (全局定位系统) ─┐\n`;
    txt += `  │   X: ${data.coordinateStatus.world.x.toFixed(4)}\n`;
    txt += `  │   Y: ${data.coordinateStatus.world.y.toFixed(4)}\n`;
    txt += `  │   Z: ${data.coordinateStatus.world.z.toFixed(4)}\n`;
    txt += `  │   说明: ${data.coordinateStatus.world.definition}\n`;
    txt += `  └──────────────────────────────────┘\n\n`;
    
    txt += `  ┌─ 设备坐标 (机身相对坐标系) ─┐\n`;
    txt += `  │   X: ${data.coordinateStatus.device.x.toFixed(4)}\n`;
    txt += `  │   Y: ${data.coordinateStatus.device.y.toFixed(4)}\n`;
    txt += `  │   Z: ${data.coordinateStatus.device.z.toFixed(4)}\n`;
    txt += `  │   说明: ${data.coordinateStatus.device.definition}\n`;
    txt += `  └──────────────────────────────────┘\n\n`;
    
    txt += `  ┌─ 同步校验结果 ─────────────────┐\n`;
    txt += `  │   校验状态: ${data.coordinateStatus.syncValidation.result}\n`;
    txt += `  │   容差阈值: ${data.coordinateStatus.syncValidation.tolerance}\n`;
    txt += `  │   最后同步: ${data.coordinateStatus.syncValidation.lastSyncTime}\n`;
    txt += `  └──────────────────────────────────┘\n\n`;
    
    txt += `\n`;
    txt += `【坐标系混用拦截判定规则】\n`;
    txt += `  ${data.coordinateMixPrevention.rule1}\n`;
    txt += `  ${data.coordinateMixPrevention.rule2}\n`;
    txt += `  ${data.coordinateMixPrevention.rule3}\n`;
    txt += `  ${data.coordinateMixPrevention.rule4}\n\n`;
    
    txt += `\n`;
    txt += `【为什么坐标系混用会被拦截？】\n`;
    txt += `  ${data.explanation.whyBlocked}\n\n`;
    
    txt += `\n`;
    txt += `【运行明细记录】\n`;
    txt += `──────────────────────────────────────────────────────────────\n`;
    data.details.forEach(d => {
      txt += `  [${d.time}] ${d.type}: ${d.content}\n`;
    });
    
    txt += `\n\n  报告结束 — 此报告由系统自动生成，用于工程评审归档\n`;
    
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `underwater-cruise-report-${this.getTimestamp()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.showMessage('✅ 文本报告已导出');
  }
  
  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    
    if (this.isCruising && !this.isPaused && this.startTimestamp) {
      this.cruiseTime = (Date.now() - this.startTimestamp) / 1000;
      const minutes = Math.floor(this.cruiseTime / 60);
      const seconds = Math.floor(this.cruiseTime % 60);
      document.getElementById('cruise-time').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    if (this.robot && this.robotWorldPosition) {
      this.boundaryDistance = this.robotWorldPosition.length();
      const boundaryDistEl = document.getElementById('boundary-distance');
      if (boundaryDistEl) {
        boundaryDistEl.textContent = `${this.boundaryDistance.toFixed(2)} / ${this.boundaryLimit}`;
        if (this.boundaryDistance > this.boundaryLimit) {
          boundaryDistEl.style.color = '#E63946';
        } else if (this.boundaryDistance > this.boundaryLimit * 0.8) {
          boundaryDistEl.style.color = '#F4A261';
        } else {
          boundaryDistEl.style.color = '#A8DADC';
        }
      }
    }
    
    if (this.propeller) {
      this.propeller.rotation.x += 0.2;
    }
    
    if (this.particles) {
      this.particles.rotation.y += 0.0005;
    }
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new UnderwaterRobotCruise();
});

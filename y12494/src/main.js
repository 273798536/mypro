import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class PianoResonanceVisualizer {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    this.pianoModel = null;
    this.strings = [];
    this.stringGroups = [];
    this.noteEvents = [];
    
    this.isPlaying = false;
    this.currentTime = 0;
    this.resonanceStrength = 0.5;
    this.animationId = null;
    
    this.init();
    this.bindEvents();
    this.createDemoData();
    this.updateUI();
    this.animate();
  }

  init() {
    const container = document.getElementById('canvasContainer');
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f0f23);
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(8, 6, 10);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    
    this.addLights();
    this.addGrid();
    this.createPianoModel();
    
    window.addEventListener('resize', () => this.onWindowResize());
  }

  addLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0xe94560, 0.5, 50);
    pointLight.position.set(0, 5, 0);
    this.scene.add(pointLight);
  }

  addGrid() {
    const gridHelper = new THREE.GridHelper(30, 30, 0x333333, 0x222222);
    this.scene.add(gridHelper);
  }

  createPianoModel() {
    this.pianoModel = new THREE.Group();
    
    const bodyGeometry = new THREE.BoxGeometry(12, 0.8, 5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.3,
      roughness: 0.7
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.4;
    body.castShadow = true;
    body.receiveShadow = true;
    this.pianoModel.add(body);
    
    const lidGeometry = new THREE.BoxGeometry(12, 0.1, 5);
    const lidMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a2a,
      metalness: 0.5,
      roughness: 0.5
    });
    const lid = new THREE.Mesh(lidGeometry, lidMaterial);
    lid.position.set(0, 1.2, 0);
    lid.rotation.x = -0.3;
    lid.castShadow = true;
    this.pianoModel.add(lid);
    
    this.createStrings();
    this.scene.add(this.pianoModel);
  }

  createStrings() {
    this.strings.forEach(s => {
      if (s.mesh) this.scene.remove(s.mesh);
      if (s.label) s.label.remove();
    });
    this.strings = [];
    
    const stringCount = 88;
    const startX = -5.5;
    const spacing = 11 / (stringCount - 1);
    
    for (let i = 0; i < stringCount; i++) {
      const x = startX + i * spacing;
      const length = 1.5 + (i / stringCount) * 2.5;
      const thickness = 0.02 - (i / stringCount) * 0.015;
      
      const stringGeometry = new THREE.CylinderGeometry(thickness, thickness, length, 8);
      const stringMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc,
        metalness: 0.9,
        roughness: 0.2
      });
      
      const stringMesh = new THREE.Mesh(stringGeometry, stringMaterial);
      stringMesh.position.set(x, 0.8, 0);
      stringMesh.rotation.z = Math.PI / 2;
      stringMesh.castShadow = true;
      
      const noteNames = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
      const noteIndex = (i + 9) % 12;
      const octave = Math.floor((i + 9) / 12);
      const noteName = noteNames[noteIndex] + octave;
      
      const labelDiv = document.createElement('div');
      labelDiv.className = 'string-label';
      labelDiv.textContent = noteName;
      labelDiv.style.display = 'none';
      document.getElementById('canvasContainer').appendChild(labelDiv);
      
      this.strings.push({
        mesh: stringMesh,
        originalPosition: stringMesh.position.clone(),
        originalScale: stringMesh.scale.clone(),
        noteName: noteName,
        midiNote: i + 21,
        groupId: null,
        resonance: 0,
        vibrating: false,
        label: labelDiv
      });
      
      this.pianoModel.add(stringMesh);
    }
  }

  createDemoData() {
    this.stringGroups = [
      { id: 1, name: '低音区', startNote: 21, endNote: 36, color: '#ff6b6b' },
      { id: 2, name: '中音区', startNote: 37, endNote: 60, color: '#4ecdc4' },
      { id: 3, name: '高音区', startNote: 61, endNote: 88, color: '#ffe66d' }
    ];
    
    this.stringGroups.forEach(group => {
      this.strings.forEach(s => {
        if (s.midiNote >= group.startNote && s.midiNote <= group.endNote) {
          s.groupId = group.id;
          s.mesh.material.color.setStyle(group.color);
        }
      });
    });
    
    this.noteEvents = [
      { id: 1, note: 'C4', midiNote: 60, time: 0.5, duration: 1.0, velocity: 0.8 },
      { id: 2, note: 'E4', midiNote: 64, time: 1.0, duration: 1.0, velocity: 0.7 },
      { id: 3, note: 'G4', midiNote: 67, time: 1.5, duration: 1.0, velocity: 0.9 },
      { id: 4, note: 'C5', midiNote: 72, time: 2.0, duration: 2.0, velocity: 0.6 },
      { id: 5, note: 'G3', midiNote: 55, time: 0.3, duration: 3.0, velocity: 0.5 }
    ];
    
    this.updateStringGroupsUI();
    this.updateNoteEventsUI();
    this.updateTimeline();
  }

  bindEvents() {
    document.getElementById('loadDemoModel').addEventListener('click', () => {
      this.createDemoData();
      this.log('已加载演示模型和数据');
    });
    
    document.getElementById('addGroup').addEventListener('click', () => this.addStringGroup());
    document.getElementById('addNoteEvent').addEventListener('click', () => this.addNoteEvent());
    
    const resonanceSlider = document.getElementById('resonanceSlider');
    resonanceSlider.addEventListener('input', (e) => {
      this.resonanceStrength = parseFloat(e.target.value);
      document.getElementById('resonanceValue').textContent = this.resonanceStrength.toFixed(2);
      
      const warning = document.getElementById('resonanceWarning');
      if (this.resonanceStrength > 0.8) {
        warning.style.display = 'block';
        this.log('⚠️ 警告：共振强度超过安全阈值');
      } else {
        warning.style.display = 'none';
      }
    });
    
    document.getElementById('exportData').addEventListener('click', () => this.exportData());
    document.getElementById('importDataBtn').addEventListener('click', () => {
      document.getElementById('importData').click();
    });
    document.getElementById('importData').addEventListener('change', (e) => this.importData(e));
    document.getElementById('takeScreenshot').addEventListener('click', () => this.takeScreenshot());
    
    document.getElementById('playBtn').addEventListener('click', () => this.play());
    document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  addStringGroup() {
    const id = Date.now();
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da'];
    this.stringGroups.push({
      id,
      name: `分组 ${this.stringGroups.length + 1}`,
      startNote: 21,
      endNote: 88,
      color: colors[this.stringGroups.length % colors.length]
    });
    this.updateStringGroupsUI();
    this.log(`已添加琴弦分组: ${this.stringGroups[this.stringGroups.length - 1].name}`);
  }

  updateStringGroupsUI() {
    const container = document.getElementById('stringGroups');
    container.innerHTML = '';
    
    this.stringGroups.forEach(group => {
      const div = document.createElement('div');
      div.className = 'group-item';
      div.innerHTML = `
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:5px;">
          <div style="width:12px;height:12px;background:${group.color};border-radius:2px;"></div>
          <input type="text" value="${group.name}" data-id="${group.id}" data-field="name">
        </div>
        <input type="number" value="${group.startNote}" data-id="${group.id}" data-field="startNote" placeholder="起始音符 (21-88)" min="21" max="88">
        <input type="number" value="${group.endNote}" data-id="${group.id}" data-field="endNote" placeholder="结束音符 (21-88)" min="21" max="88">
        <button data-id="${group.id}" class="delete-group">删除</button>
      `;
      container.appendChild(div);
    });
    
    container.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', (e) => {
        const id = parseInt(e.target.dataset.id);
        const field = e.target.dataset.field;
        const group = this.stringGroups.find(g => g.id === id);
        if (group) {
          if (field === 'name') {
            group.name = e.target.value;
          } else {
            group[field] = parseInt(e.target.value);
            this.applyGroupColors();
          }
        }
      });
    });
    
    container.querySelectorAll('.delete-group').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        this.stringGroups = this.stringGroups.filter(g => g.id !== id);
        this.applyGroupColors();
        this.updateStringGroupsUI();
        this.log('已删除琴弦分组');
      });
    });
  }

  applyGroupColors() {
    this.strings.forEach(s => {
      s.groupId = null;
      s.mesh.material.color.setHex(0xcccccc);
    });
    
    this.stringGroups.forEach(group => {
      this.strings.forEach(s => {
        if (s.midiNote >= group.startNote && s.midiNote <= group.endNote) {
          s.groupId = group.id;
          s.mesh.material.color.setStyle(group.color);
        }
      });
    });
  }

  addNoteEvent() {
    const id = Date.now();
    const maxTime = this.noteEvents.length > 0 
      ? Math.max(...this.noteEvents.map(e => e.time + e.duration))
      : 0;
    
    this.noteEvents.push({
      id,
      note: 'C4',
      midiNote: 60,
      time: maxTime + 0.5,
      duration: 1.0,
      velocity: 0.8
    });
    
    this.updateNoteEventsUI();
    this.updateTimeline();
    this.log(`已添加音符事件`);
  }

  updateNoteEventsUI() {
    const container = document.getElementById('noteEvents');
    container.innerHTML = '';
    
    this.noteEvents.forEach(event => {
      const div = document.createElement('div');
      div.className = 'event-item';
      div.innerHTML = `
        <input type="text" value="${event.note}" data-id="${event.id}" data-field="note" placeholder="音符 (如 C4)">
        <input type="number" value="${event.time.toFixed(2)}" data-id="${event.id}" data-field="time" placeholder="时间 (秒)" step="0.1">
        <input type="number" value="${event.duration.toFixed(2)}" data-id="${event.id}" data-field="duration" placeholder="持续时间" step="0.1">
        <button data-id="${event.id}" class="delete-event">删除</button>
      `;
      container.appendChild(div);
    });
    
    container.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', (e) => {
        const id = parseInt(e.target.dataset.id);
        const field = e.target.dataset.field;
        const event = this.noteEvents.find(ev => ev.id === id);
        if (event) {
          if (field === 'note') {
            event.note = e.target.value;
          } else {
            event[field] = parseFloat(e.target.value);
          }
          this.updateTimeline();
        }
      });
    });
    
    container.querySelectorAll('.delete-event').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        this.noteEvents = this.noteEvents.filter(ev => ev.id !== id);
        this.updateNoteEventsUI();
        this.updateTimeline();
        this.log('已删除音符事件');
      });
    });
  }

  updateTimeline() {
    const container = document.getElementById('timelineTracks');
    container.innerHTML = '';
    
    const maxTime = this.noteEvents.length > 0
      ? Math.max(...this.noteEvents.map(e => e.time + e.duration)) + 1
      : 5;
    const pixelsPerSecond = 100;
    
    const groups = [...new Set(this.strings.filter(s => s.groupId).map(s => s.groupId))];
    
    if (groups.length === 0) {
      const track = document.createElement('div');
      track.className = 'track';
      track.innerHTML = `
        <div class="track-label">全部</div>
        <div class="track-events" style="width: ${maxTime * pixelsPerSecond}px;"></div>
      `;
      container.appendChild(track);
      
      const trackEvents = track.querySelector('.track-events');
      this.noteEvents.forEach(event => {
        this.createNoteEventElement(event, trackEvents, pixelsPerSecond);
      });
    } else {
      groups.forEach(groupId => {
        const group = this.stringGroups.find(g => g.id === groupId);
        const track = document.createElement('div');
        track.className = 'track';
        track.innerHTML = `
          <div class="track-label">${group ? group.name : '未知'}</div>
          <div class="track-events" style="width: ${maxTime * pixelsPerSecond}px;"></div>
        `;
        container.appendChild(track);
        
        const trackEvents = track.querySelector('.track-events');
        const groupNotes = this.noteEvents.filter(event => {
          const string = this.strings.find(s => s.midiNote === event.midiNote);
          return string && string.groupId === groupId;
        });
        groupNotes.forEach(event => {
          this.createNoteEventElement(event, trackEvents, pixelsPerSecond);
        });
      });
    }
  }

  createNoteEventElement(event, container, pixelsPerSecond) {
    const div = document.createElement('div');
    div.className = 'note-event';
    div.style.left = `${event.time * pixelsPerSecond}px`;
    div.style.width = `${Math.max(event.duration * pixelsPerSecond, 20)}px`;
    div.textContent = event.note;
    div.title = `${event.note} - ${event.time.toFixed(2)}s - ${event.duration.toFixed(2)}s`;
    container.appendChild(div);
  }

  play() {
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.log('开始播放');
    }
  }

  pause() {
    this.isPlaying = false;
    this.log('已暂停');
  }

  reset() {
    this.isPlaying = false;
    this.currentTime = 0;
    this.strings.forEach(s => {
      s.vibrating = false;
      s.resonance = 0;
      s.mesh.position.copy(s.originalPosition);
    });
    document.getElementById('currentTime').textContent = '0.00s';
    this.log('已重置');
  }

  updatePlayback(deltaTime) {
    if (!this.isPlaying) return;
    
    this.currentTime += deltaTime;
    document.getElementById('currentTime').textContent = this.currentTime.toFixed(2) + 's';
    
    this.noteEvents.forEach(event => {
      if (this.currentTime >= event.time && this.currentTime <= event.time + event.duration) {
        const string = this.strings.find(s => s.midiNote === event.midiNote);
        if (string) {
          string.vibrating = true;
          string.resonance = Math.min(1, string.resonance + event.velocity * this.resonanceStrength * deltaTime * 2);
          
          if (string.resonance > 0.95 && this.resonanceStrength > 0.8) {
            this.log(`⚠️ ${string.noteName} 共振接近临界值!`);
          }
        }
      }
    });
    
    const maxTime = this.noteEvents.length > 0
      ? Math.max(...this.noteEvents.map(e => e.time + e.duration))
      : 0;
    if (this.currentTime > maxTime + 1) {
      this.pause();
    }
  }

  updateStringVibrations(deltaTime) {
    this.strings.forEach(string => {
      if (string.vibrating) {
        const vibration = Math.sin(this.currentTime * 20 + string.midiNote) * 0.05 * string.resonance;
        string.mesh.position.y = string.originalPosition.y + vibration;
        string.resonance = Math.max(0, string.resonance - deltaTime * 0.3);
        
        if (string.resonance < 0.01) {
          string.resonance = 0;
          string.vibrating = false;
          string.mesh.position.copy(string.originalPosition);
        }
        
        const stringGroup = this.stringGroups.find(g => g.id === string.groupId);
        const baseColor = stringGroup ? new THREE.Color(stringGroup.color) : new THREE.Color(0xcccccc);
        const resonanceColor = new THREE.Color(0xff0000);
        string.mesh.material.color.lerpColors(baseColor, resonanceColor, string.resonance * 0.5);
      }
    });
  }

  updateStringLabels() {
    const container = document.getElementById('canvasContainer');
    const rect = container.getBoundingClientRect();
    
    this.strings.forEach(string => {
      const vector = string.mesh.position.clone();
      vector.project(this.camera);
      
      const x = (vector.x * 0.5 + 0.5) * rect.width;
      const y = (-vector.y * 0.5 + 0.5) * rect.height;
      
      if (vector.z < 1 && string.resonance > 0.1) {
        string.label.style.display = 'block';
        string.label.style.left = `${x}px`;
        string.label.style.top = `${y}px`;
        string.label.textContent = `${string.noteName} (${(string.resonance * 100).toFixed(0)}%)`;
      } else {
        string.label.style.display = 'none';
      }
    });
  }

  exportData() {
    const data = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      stringGroups: this.stringGroups,
      noteEvents: this.noteEvents,
      resonanceSettings: {
        strength: this.resonanceStrength
      },
      summary: {
        totalGroups: this.stringGroups.length,
        totalEvents: this.noteEvents.length,
        groupedStrings: this.strings.filter(s => s.groupId).length,
        ungroupedStrings: this.strings.filter(s => !s.groupId).length
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `piano-resonance-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.log(`数据已导出! 包含 ${data.summary.totalGroups} 个分组, ${data.summary.totalEvents} 个事件`);
    console.log('导出数据摘要:', data.summary);
  }

  importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        this.stringGroups = data.stringGroups || [];
        this.noteEvents = data.noteEvents || [];
        if (data.resonanceSettings) {
          this.resonanceStrength = data.resonanceSettings.strength || 0.5;
          document.getElementById('resonanceSlider').value = this.resonanceStrength;
          document.getElementById('resonanceValue').textContent = this.resonanceStrength.toFixed(2);
        }
        
        this.applyGroupColors();
        this.updateStringGroupsUI();
        this.updateNoteEventsUI();
        this.updateTimeline();
        
        this.log(`数据已导入! ${data.summary ? `摘要: ${JSON.stringify(data.summary)}` : ''}`);
      } catch (err) {
        this.log('导入失败: 文件格式错误');
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  takeScreenshot() {
    this.renderer.render(this.scene, this.camera);
    
    const link = document.createElement('a');
    link.download = `piano-screenshot-${Date.now()}.png`;
    link.href = this.renderer.domElement.toDataURL('image/png');
    link.click();
    
    this.log('截图已导出');
  }

  updateUI() {
    const statusInfo = document.getElementById('statusInfo');
    const groupedCount = this.strings.filter(s => s.groupId).length;
    const resonatingCount = this.strings.filter(s => s.resonance > 0).length;
    
    statusInfo.innerHTML = `
      <div class="status-item">
        <strong>🎹 琴弦总数</strong><br>
        ${this.strings.length} 根
      </div>
      <div class="status-item">
        <strong>📦 已分组</strong><br>
        ${groupedCount} / ${this.strings.length}
      </div>
      <div class="status-item">
        <strong>🎵 音符事件</strong><br>
        ${this.noteEvents.length} 个
      </div>
      <div class="status-item">
        <strong>🔄 当前共振</strong><br>
        ${resonatingCount} 根琴弦
      </div>
      <div class="status-item">
        <strong>⚡ 共振强度</strong><br>
        ${(this.resonanceStrength * 100).toFixed(0)}%
        ${this.resonanceStrength > 0.8 ? '<br><span style="color:#ff6b6b">⚠️ 过高</span>' : ''}
      </div>
      <div class="status-item">
        <strong>⏱️ 播放时间</strong><br>
        ${this.currentTime.toFixed(2)}s
      </div>
    `;
  }

  log(message) {
    console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    
    const deltaTime = 1 / 60;
    
    this.controls.update();
    this.updatePlayback(deltaTime);
    this.updateStringVibrations(deltaTime);
    this.updateStringLabels();
    this.updateUI();
    
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    const container = document.getElementById('canvasContainer');
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new PianoResonanceVisualizer();
});

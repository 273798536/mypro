import * as THREE from 'three';

export class CarModel {
  constructor(sceneManager, options = {}) {
    this.sceneManager = sceneManager;
    this.group = new THREE.Group();
    this.group.name = 'car';
    this.group.userData.type = 'car';
    this.group.userData.source = options.source || '车身模型 v2.1';
    this.group.userData.maintainer = options.maintainer || '车辆工程组';
    this.group.userData.lastModified = options.lastModified || '2026-05-28';
    
    this.angleOfAttack = 0;
    this.samplingDensity = 50;
    this.windSpeed = 30;
    
    this.bodyMesh = null;
    this.samplingPoints = [];
    this.boundaryLayer = null;
    this.windArrows = [];
    this.surfaceMarkers = [];
    
    this.createModel();
    this.createSamplingPoints();
    this.createBoundaryLayer();
    
    this.sceneManager.addClickableObject(this.group);
    this.sceneManager.scene.add(this.group);
  }

  createModel() {
    const material = new THREE.MeshStandardMaterial({
      color: 0xe6edf3,
      metalness: 0.8,
      roughness: 0.2,
      envMapIntensity: 1.0
    });

    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'car_body';

    const mainBodyGeo = new THREE.BoxGeometry(4.5, 0.6, 1.8);
    const mainBody = new THREE.Mesh(mainBodyGeo, material.clone());
    mainBody.position.y = 0.5;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    bodyGroup.add(mainBody);

    const roofGeo = new THREE.BoxGeometry(2.5, 0.5, 1.6);
    const roof = new THREE.Mesh(roofGeo, material.clone());
    roof.position.set(-0.3, 1.05, 0);
    roof.castShadow = true;
    bodyGroup.add(roof);

    const hoodGeo = new THREE.BoxGeometry(1.2, 0.15, 1.7);
    const hood = new THREE.Mesh(hoodGeo, material.clone());
    hood.position.set(1.7, 0.8, 0);
    hood.rotation.z = -0.1;
    hood.castShadow = true;
    bodyGroup.add(hood);

    const trunkGeo = new THREE.BoxGeometry(1.0, 0.15, 1.7);
    const trunk = new THREE.Mesh(trunkGeo, material.clone());
    trunk.position.set(-1.8, 0.8, 0);
    trunk.rotation.z = 0.15;
    trunk.castShadow = true;
    bodyGroup.add(trunk);

    const frontBumperGeo = new THREE.BoxGeometry(0.3, 0.4, 1.75);
    const frontBumper = new THREE.Mesh(frontBumperGeo, material.clone());
    frontBumper.position.set(2.35, 0.35, 0);
    frontBumper.castShadow = true;
    bodyGroup.add(frontBumper);

    const rearBumperGeo = new THREE.BoxGeometry(0.3, 0.4, 1.75);
    const rearBumper = new THREE.Mesh(rearBumperGeo, material.clone());
    rearBumper.position.set(-2.35, 0.35, 0);
    rearBumper.castShadow = true;
    bodyGroup.add(rearBumper);

    const windshieldGeo = new THREE.BoxGeometry(0.05, 0.5, 1.5);
    const windshieldMat = new THREE.MeshStandardMaterial({
      color: 0x1a1f2e,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7
    });
    const windshield = new THREE.Mesh(windshieldGeo, windshieldMat);
    windshield.position.set(0.95, 1.05, 0);
    windshield.rotation.z = -0.4;
    bodyGroup.add(windshield);

    const rearGlass = new THREE.Mesh(windshieldGeo, windshieldMat.clone());
    rearGlass.position.set(-1.55, 1.05, 0);
    rearGlass.rotation.z = 0.4;
    bodyGroup.add(rearGlass);

    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9
    });
    const wheelPositions = [
      { x: 1.5, z: 0.95 },
      { x: 1.5, z: -0.95 },
      { x: -1.5, z: 0.95 },
      { x: -1.5, z: -0.95 }
    ];

    wheelPositions.forEach(pos => {
      const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 24);
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(pos.x, 0.35, pos.z);
      wheel.castShadow = true;
      bodyGroup.add(wheel);

      const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.26, 12);
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0x8b949e,
        metalness: 0.9,
        roughness: 0.2
      });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(pos.x, 0.35, pos.z);
      bodyGroup.add(rim);
    });

    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffaa,
      emissiveIntensity: 0.3
    });
    const headlightGeo = new THREE.BoxGeometry(0.1, 0.15, 0.4);
    const leftHeadlight = new THREE.Mesh(headlightGeo, headlightMat);
    leftHeadlight.position.set(2.5, 0.55, 0.5);
    bodyGroup.add(leftHeadlight);

    const rightHeadlight = new THREE.Mesh(headlightGeo, headlightMat.clone());
    rightHeadlight.position.set(2.5, 0.55, -0.5);
    bodyGroup.add(rightHeadlight);

    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.2
    });
    const taillightGeo = new THREE.BoxGeometry(0.1, 0.12, 0.35);
    const leftTaillight = new THREE.Mesh(taillightGeo, taillightMat);
    leftTaillight.position.set(-2.5, 0.55, 0.5);
    bodyGroup.add(leftTaillight);

    const rightTaillight = new THREE.Mesh(taillightGeo, taillightMat.clone());
    rightTaillight.position.set(-2.5, 0.55, -0.5);
    bodyGroup.add(rightTaillight);

    const spoilerGeo = new THREE.BoxGeometry(0.1, 0.08, 1.9);
    const spoiler = new THREE.Mesh(spoilerGeo, material.clone());
    spoiler.position.set(-2.2, 1.3, 0);
    spoiler.castShadow = true;
    bodyGroup.add(spoiler);

    const spoilerSupportGeo = new THREE.BoxGeometry(0.05, 0.3, 0.05);
    const leftSupport = new THREE.Mesh(spoilerSupportGeo, material.clone());
    leftSupport.position.set(-2.2, 1.1, 0.8);
    bodyGroup.add(leftSupport);

    const rightSupport = new THREE.Mesh(spoilerSupportGeo, material.clone());
    rightSupport.position.set(-2.2, 1.1, -0.8);
    bodyGroup.add(rightSupport);

    this.bodyMesh = bodyGroup;
    this.group.add(bodyGroup);
  }

  createSamplingPoints() {
    this.clearSamplingPoints();
    
    const density = this.samplingDensity;
    const spacing = 0.3 - (density / 1000);
    
    const pointsGroup = new THREE.Group();
    pointsGroup.name = 'sampling_points';
    
    const surfacePositions = [
      { x: 0, y: 0.8, normal: new THREE.Vector3(0, 1, 0), area: '车顶' },
      { x: 1.5, y: 0.8, normal: new THREE.Vector3(0, 1, 0), area: '引擎盖' },
      { x: -1.5, y: 0.8, normal: new THREE.Vector3(0, 1, 0), area: '后备箱' },
      { x: 2.2, y: 0.5, normal: new THREE.Vector3(1, 0, 0), area: '前保险杠' },
      { x: -2.2, y: 0.5, normal: new THREE.Vector3(-1, 0, 0), area: '后保险杠' },
      { x: 0, y: 0.3, normal: new THREE.Vector3(0, 1, 0), area: '底盘' },
      { x: 0, y: 0.5, normal: new THREE.Vector3(0, 0, 1), area: '左侧车身' },
      { x: 0, y: 0.5, normal: new THREE.Vector3(0, 0, -1), area: '右侧车身' }
    ];

    const pointsPerArea = Math.ceil(density / 8);
    
    surfacePositions.forEach((surf, surfIndex) => {
      for (let i = 0; i < pointsPerArea; i++) {
        const offsetX = (Math.random() - 0.5) * 1.5;
        const offsetY = (Math.random() - 0.5) * 0.3;
        const offsetZ = (Math.random() - 0.5) * 1.5;
        
        const geo = new THREE.SphereGeometry(0.02, 8, 8);
        const mat = new THREE.MeshBasicMaterial({
          color: this.getPointColor(surfIndex),
          transparent: true,
          opacity: 0.8
        });
        const point = new THREE.Mesh(geo, mat);
        
        point.position.set(
          surf.x + offsetX,
          surf.y + offsetY,
          surf.z + offsetZ
        );
        
        point.userData = {
          type: 'sampling_point',
          area: surf.area,
          surfaceNormal: surf.normal.clone(),
          index: surfIndex * pointsPerArea + i,
          velocity: new THREE.Vector3(),
          pressure: 0
        };
        
        pointsGroup.add(point);
        this.samplingPoints.push(point);
      }
    });

    this.group.add(pointsGroup);
  }

  getPointColor(index) {
    const colors = [0x58a6ff, 0x3fb950, 0xd29922, 0xf85149, 0xa371f7, 0x56d4dd, 0xfa7a19, 0x8b949e];
    return colors[index % colors.length];
  }

  createBoundaryLayer() {
    if (this.boundaryLayer) {
      this.group.remove(this.boundaryLayer);
    }

    const layerGroup = new THREE.Group();
    layerGroup.name = 'boundary_layer';

    const curvePoints = [];
    const segments = 50;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = -2.2 + t * 4.4;
      const boundaryThickness = this.calculateBoundaryThickness(x);
      curvePoints.push(new THREE.Vector3(x, boundaryThickness, 0));
    }

    const boundaryShape = new THREE.Shape();
    boundaryShape.moveTo(-2.2, 0);
    curvePoints.forEach((p, i) => {
      if (i === 0) boundaryShape.lineTo(p.x, p.y);
      else boundaryShape.lineTo(p.x, p.y);
    });
    boundaryShape.lineTo(2.2, 0);
    boundaryShape.lineTo(-2.2, 0);

    const extrudeSettings = { depth: 1.6, bevelEnabled: false };
    const layerGeo = new THREE.ExtrudeGeometry(boundaryShape, extrudeSettings);
    const layerMat = new THREE.MeshBasicMaterial({
      color: 0x58a6ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const layerMesh = new THREE.Mesh(layerGeo, layerMat);
    layerMesh.position.z = -0.8;
    layerMesh.position.y = 0.6;
    layerGroup.add(layerMesh);

    const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints.map(p => new THREE.Vector3(p.x, p.y + 0.6, 0.8)));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x58a6ff, linewidth: 2 });
    const line = new THREE.Line(lineGeo, lineMat);
    layerGroup.add(line);

    this.boundaryLayer = layerGroup;
    this.group.add(layerGroup);
  }

  calculateBoundaryThickness(x) {
    const reynolds = this.calculateReynoldsNumber();
    const distanceFromLeadingEdge = Math.abs(x + 2.2) + 0.1;
    const thickness = 0.37 * distanceFromLeadingEdge / Math.pow(reynolds, 0.2);
    return Math.min(thickness * 10, 0.5);
  }

  calculateReynoldsNumber() {
    const characteristicLength = 4.5;
    const kinematicViscosity = 1.5e-5;
    return (this.windSpeed * characteristicLength) / kinematicViscosity;
  }

  updateWindSpeed(speed) {
    this.windSpeed = speed;
    this.updateBoundaryLayer();
    this.updateWindArrows();
  }

  updateAngleOfAttack(angle) {
    this.angleOfAttack = angle;
    this.group.rotation.z = THREE.MathUtils.degToRad(angle);
    this.updateBoundaryLayer();
    this.updateSamplingPointData();
  }

  updateSamplingDensity(density) {
    const wasHigh = this.samplingDensity > 80;
    this.samplingDensity = density;
    this.createSamplingPoints();
    this.updateSamplingPointData();
    
    if (density > 80 && !wasHigh) {
      this.highlightDenseAreas();
    }
  }

  updateBoundaryLayer() {
    this.createBoundaryLayer();
  }

  updateWindArrows() {
    this.clearWindArrows();
    
    if (this.windSpeed < 1) return;

    const arrowsGroup = new THREE.Group();
    arrowsGroup.name = 'wind_arrows';
    
    const arrowCount = Math.min(Math.floor(this.windSpeed / 5) + 5, 30);
    
    for (let i = 0; i < arrowCount; i++) {
      const height = 0.3 + Math.random() * 1.5;
      const zOffset = (Math.random() - 0.5) * 1.8;
      const startX = -8 + Math.random() * 2;
      
      const direction = new THREE.Vector3(1, 0, 0);
      const angleRad = THREE.MathUtils.degToRad(this.angleOfAttack);
      direction.applyAxisAngle(new THREE.Vector3(0, 0, 1), angleRad * 0.3);
      
      const arrowLength = 0.5 + (this.windSpeed / 100) * 1.5;
      const arrowColor = this.getWindArrowColor(this.windSpeed);
      
      const arrow = new THREE.ArrowHelper(
        direction,
        new THREE.Vector3(startX, height, zOffset),
        arrowLength,
        arrowColor,
        0.1,
        0.08
      );
      
      arrow.userData = {
        type: 'wind_arrow',
        speed: this.windSpeed,
        animationOffset: Math.random() * Math.PI * 2
      };
      
      arrowsGroup.add(arrow);
      this.windArrows.push(arrow);
    }
    
    this.group.add(arrowsGroup);
    this.animateWindArrows();
  }

  getWindArrowColor(speed) {
    if (speed < 20) return 0x3fb950;
    if (speed < 50) return 0x58a6ff;
    if (speed < 80) return 0xd29922;
    return 0xf85149;
  }

  animateWindArrows() {
    const animate = () => {
      const time = Date.now() * 0.001;
      this.windArrows.forEach((arrow, i) => {
        if (arrow.userData.type === 'wind_arrow') {
          const offset = arrow.userData.animationOffset;
          const xOffset = ((time * this.windSpeed * 0.5 + offset) % 12) - 8;
          const baseX = -8 + (i / this.windArrows.length) * 4;
          arrow.position.x = baseX + ((time * this.windSpeed * 0.3 + offset) % 10) - 5;
          
          const pulse = 0.7 + Math.sin(time * 3 + offset) * 0.3;
          arrow.setLength(
            (0.5 + (this.windSpeed / 100) * 1.5) * pulse,
            0.1 * pulse,
            0.08 * pulse
          );
        }
      });
      requestAnimationFrame(animate);
    };
    animate();
  }

  updateSamplingPointData() {
    this.samplingPoints.forEach(point => {
      const localPos = point.position.clone();
      localPos.applyAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(this.angleOfAttack));
      
      const velocityMag = this.windSpeed * (1 - Math.abs(localPos.y - 0.6) * 0.3);
      point.userData.velocity.set(-velocityMag, 0, 0);
      
      const pressureFactor = 1 + Math.sin(THREE.MathUtils.degToRad(this.angleOfAttack)) * 0.2;
      point.userData.pressure = (101325 + velocityMag * 10) * pressureFactor;
      
      const intensity = Math.min(velocityMag / 50, 1);
      point.material.color.setHSL(0.6 - intensity * 0.6, 0.8, 0.5 + intensity * 0.3);
    });
  }

  highlightDenseAreas() {
    if (this.samplingDensity <= 80) {
      this.surfaceMarkers.forEach(m => this.group.remove(m));
      this.surfaceMarkers = [];
      return;
    }

    this.surfaceMarkers.forEach(m => this.group.remove(m));
    this.surfaceMarkers = [];

    const denseAreas = [
      { x: 1.8, y: 0.85, z: 0, label: '前驻点区' },
      { x: 0, y: 1.15, z: 0, label: '车顶峰值区' },
      { x: -1.8, y: 0.85, z: 0, label: '后分离区' }
    ];

    denseAreas.forEach(area => {
      const ringGeo = new THREE.RingGeometry(0.2, 0.25, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xf85149,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(area.x, area.y, area.z);
      ring.rotation.y = Math.PI / 2;
      ring.userData = { type: 'dense_marker', area: area.label };
      this.group.add(ring);
      this.surfaceMarkers.push(ring);

      const pulse = () => {
        const time = Date.now() * 0.003;
        const scale = 1 + Math.sin(time) * 0.2;
        ring.scale.setScalar(scale);
        ring.material.opacity = 0.4 + Math.sin(time) * 0.3;
        requestAnimationFrame(pulse);
      };
      pulse();
    });
  }

  clearSamplingPoints() {
    const existing = this.group.getObjectByName('sampling_points');
    if (existing) {
      this.group.remove(existing);
    }
    this.samplingPoints = [];
  }

  clearWindArrows() {
    const existing = this.group.getObjectByName('wind_arrows');
    if (existing) {
      this.group.remove(existing);
    }
    this.windArrows = [];
  }

  getAerodynamicCoefficients() {
    const angleRad = THREE.MathUtils.degToRad(this.angleOfAttack);
    const baseCd = 0.32;
    const baseCl = 0.1;
    
    const cd = baseCd + Math.abs(Math.sin(angleRad * 2)) * 0.15 + (this.windSpeed / 200) * 0.05;
    const cl = baseCl + Math.sin(angleRad * 1.5) * 0.4 - (this.windSpeed / 300) * 0.1;
    
    const avgBoundaryThickness = this.samplingPoints.reduce((sum, p) => {
      return sum + this.calculateBoundaryThickness(p.position.x);
    }, 0) / (this.samplingPoints.length || 1);
    
    const reynolds = this.calculateReynoldsNumber();
    
    return {
      cd,
      cl,
      boundaryThickness: avgBoundaryThickness * 1000,
      reynolds
    };
  }

  getSamplingPointsByArea(areaName) {
    return this.samplingPoints.filter(p => p.userData.area === areaName);
  }

  getInfo() {
    return {
      name: '车身模型',
      source: this.group.userData.source,
      maintainer: this.group.userData.maintainer,
      lastModified: this.group.userData.lastModified,
      currentAngle: this.angleOfAttack.toFixed(1) + '°',
      currentWindSpeed: this.windSpeed.toFixed(1) + ' m/s',
      samplingDensity: this.samplingDensity,
      samplingPointCount: this.samplingPoints.length,
      coefficients: this.getAerodynamicCoefficients()
    };
  }

  dispose() {
    this.clearSamplingPoints();
    this.clearWindArrows();
    this.sceneManager.removeClickableObject(this.group);
    this.sceneManager.scene.remove(this.group);
  }
}

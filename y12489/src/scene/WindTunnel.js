import * as THREE from 'three';

export class WindTunnel {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.group = new THREE.Group();
    this.group.name = 'wind_tunnel';
    this.group.userData.type = 'wind_tunnel';
    
    this.windSpeed = 30;
    this.isWindVisible = true;
    this.particleCount = 2000;
    this.particles = null;
    this.particleSystem = null;
    
    this.createTunnelStructure();
    this.createParticleSystem();
    this.createWindIndicator();
    
    this.sceneManager.scene.add(this.group);
    this.animate();
  }

  createTunnelStructure() {
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x30363d,
      metalness: 0.7,
      roughness: 0.3
    });

    const leftWallGeo = new THREE.BoxGeometry(15, 4, 0.1);
    const leftWall = new THREE.Mesh(leftWallGeo, frameMat);
    leftWall.position.set(0, 2, -3);
    leftWall.receiveShadow = true;
    this.group.add(leftWall);

    const rightWallGeo = new THREE.BoxGeometry(15, 4, 0.1);
    const rightWall = new THREE.Mesh(rightWallGeo, frameMat);
    rightWall.position.set(0, 2, 3);
    rightWall.receiveShadow = true;
    this.group.add(rightWall);

    const ceilingGeo = new THREE.BoxGeometry(15, 0.1, 6);
    const ceiling = new THREE.Mesh(ceilingGeo, frameMat);
    ceiling.position.set(0, 4, 0);
    ceiling.receiveShadow = true;
    this.group.add(ceiling);

    const inletFrameGeo = new THREE.BoxGeometry(0.3, 4.2, 6.2);
    const inletFrame = new THREE.Mesh(inletFrameGeo, frameMat);
    inletFrame.position.set(-7.6, 2, 0);
    this.group.add(inletFrame);

    const outletFrameGeo = new THREE.BoxGeometry(0.3, 4.2, 6.2);
    const outletFrame = new THREE.Mesh(outletFrameGeo, frameMat);
    outletFrame.position.set(7.6, 2, 0);
    this.group.add(outletFrame);

    const fanGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 8);
    const fanMat = new THREE.MeshStandardMaterial({
      color: 0x6e7681,
      metalness: 0.8,
      roughness: 0.2
    });
    const fan = new THREE.Mesh(fanGeo, fanMat);
    fan.rotation.z = Math.PI / 2;
    fan.position.set(-8.5, 2, 0);
    this.group.add(fan);

    const bladeGeo = new THREE.BoxGeometry(2.8, 0.08, 0.3);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x8b949e,
      metalness: 0.9,
      roughness: 0.1
    });
    for (let i = 0; i < 6; i++) {
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.set(-8.5, 2, 0);
      blade.rotation.y = (i / 6) * Math.PI * 2;
      blade.rotation.x = 0.3;
      blade.userData.isFanBlade = true;
      this.group.add(blade);
    }

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1a1f2e,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const frontGlassGeo = new THREE.BoxGeometry(15, 4, 0.05);
    const frontGlass = new THREE.Mesh(frontGlassGeo, glassMat);
    frontGlass.position.set(0, 2, 2.95);
    this.group.add(frontGlass);

    const speedMarkersGroup = new THREE.Group();
    speedMarkersGroup.name = 'speed_markers';
    for (let i = 0; i <= 10; i++) {
      const markerGeo = new THREE.BoxGeometry(0.05, 0.3, 0.05);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0x58a6ff });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(-7 + i * 1.4, 0.15, 2.8);
      speedMarkersGroup.add(marker);
    }
    this.group.add(speedMarkersGroup);
  }

  createParticleSystem() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const velocities = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14 - 7;
      positions[i * 3 + 1] = Math.random() * 3.5 + 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5.5;

      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;

      const color = new THREE.Color();
      color.setHSL(0.55 + Math.random() * 0.1, 0.8, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSystem.name = 'wind_particles';
    this.particleSystem.userData.velocities = velocities;
    this.group.add(this.particleSystem);
  }

  createWindIndicator() {
    const indicatorGroup = new THREE.Group();
    indicatorGroup.name = 'wind_indicator';
    indicatorGroup.position.set(-6, 3.5, -2.5);

    const labelGeo = new THREE.PlaneGeometry(2, 0.5);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(13, 17, 23, 0.9)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#58a6ff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('→ 风向', 128, 42);
    
    const texture = new THREE.CanvasTexture(canvas);
    const labelMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const label = new THREE.Mesh(labelGeo, labelMat);
    indicatorGroup.add(label);

    this.windIndicator = indicatorGroup;
    this.group.add(indicatorGroup);
  }

  updateWindSpeed(speed) {
    this.windSpeed = speed;
    
    if (this.particleSystem) {
      const colors = this.particleSystem.geometry.attributes.color;
      for (let i = 0; i < this.particleCount; i++) {
        const intensity = Math.min(speed / 100, 1);
        const hue = 0.55 - intensity * 0.55;
        const color = new THREE.Color().setHSL(hue, 0.9, 0.5 + intensity * 0.3);
        colors.setXYZ(i, color.r, color.g, color.b);
      }
      colors.needsUpdate = true;
      
      this.particleSystem.material.opacity = 0.4 + (speed / 100) * 0.4;
    }
  }

  animate() {
    const animateLoop = () => {
      if (this.particleSystem && this.isWindVisible) {
        const positions = this.particleSystem.geometry.attributes.position;
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < this.particleCount; i++) {
          let x = positions.getX(i);
          let y = positions.getY(i);
          let z = positions.getZ(i);
          
          const speedFactor = this.windSpeed * 0.02;
          x += speedFactor;
          
          const turbulence = Math.sin(time * 2 + z * 3) * 0.01;
          y += turbulence;
          
          if (x > 7.5) {
            x = -7.5;
            y = Math.random() * 3.5 + 0.2;
            z = (Math.random() - 0.5) * 5.5;
          }
          
          if (y < 0.2) y = 0.2;
          if (y > 3.8) y = 3.8;
          
          positions.setXYZ(i, x, y, z);
        }
        
        positions.needsUpdate = true;
      }
      
      this.group.traverse((obj) => {
        if (obj.userData.isFanBlade) {
          obj.rotation.y += this.windSpeed * 0.001;
        }
      });
      
      requestAnimationFrame(animateLoop);
    };
    animateLoop();
  }

  toggleWindParticles(visible) {
    this.isWindVisible = visible;
    if (this.particleSystem) {
      this.particleSystem.visible = visible;
    }
  }

  getInfo() {
    return {
      name: '风洞环境',
      type: '闭式回流风洞',
      testSection: '15m × 4m × 6m',
      maxSpeed: '100 m/s',
      turbulenceIntensity: '< 0.5%',
      currentSpeed: this.windSpeed.toFixed(1) + ' m/s',
      reynoldsRange: '1e5 ~ 1e7'
    };
  }

  dispose() {
    this.sceneManager.scene.remove(this.group);
    if (this.particleSystem) {
      this.particleSystem.geometry.dispose();
      this.particleSystem.material.dispose();
    }
  }
}

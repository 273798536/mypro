import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useGameStore } from '../store/gameStore';

export default function CraneScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number>(0);
  
  const craneArmRef = useRef<THREE.Group | null>(null);
  const hookRef = useRef<THREE.Mesh | null>(null);
  const loadRef = useRef<THREE.Mesh | null>(null);
  const cableRef = useRef<THREE.Line | null>(null);
  const intruderRef = useRef<THREE.Group | null>(null);
  const warningLineRef = useRef<THREE.Group | null>(null);
  
  const { crane, showIntruder, intruderPosition, setIntruderPosition } = useGameStore();
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 30, 80);
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(20, 15, 25);
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 10;
    controls.maxDistance = 50;
    controlsRef.current = controls;
    
    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(15, 30, 15);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    scene.add(directionalLight);
    
    const fillLight = new THREE.DirectionalLight(0x6080a0, 0.3);
    fillLight.position.set(-10, 10, -10);
    scene.add(fillLight);
    
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3d4f3d,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    const gridHelper = new THREE.GridHelper(60, 60, 0x4a5568, 0x2d3748);
    scene.add(gridHelper);
    
    const warningLineGroup = new THREE.Group();
    const warningPoints = [
      new THREE.Vector3(-8, 0.05, -8),
      new THREE.Vector3(8, 0.05, -8),
      new THREE.Vector3(8, 0.05, 8),
      new THREE.Vector3(-8, 0.05, 8),
      new THREE.Vector3(-8, 0.05, -8),
    ];
    const warningGeometry = new THREE.BufferGeometry().setFromPoints(warningPoints);
    const warningMaterial = new THREE.LineBasicMaterial({ 
      color: 0xff4444, 
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
    });
    const warningLine = new THREE.Line(warningGeometry, warningMaterial);
    warningLineGroup.add(warningLine);
    
    for (let i = 0; i < 5; i++) {
      const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
      const postMaterial = new THREE.MeshStandardMaterial({ color: 0xff4444 });
      const post = new THREE.Mesh(postGeometry, postMaterial);
      const angle = (i / 5) * Math.PI * 2;
      post.position.set(
        Math.cos(angle) * 8,
        0.5,
        Math.sin(angle) * 8
      );
      warningLineGroup.add(post);
    }
    scene.add(warningLineGroup);
    warningLineRef.current = warningLineGroup;
    
    const craneTowerGroup = new THREE.Group();
    
    const towerGeometry = new THREE.BoxGeometry(1.5, 12, 1.5);
    const towerMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff6b35,
      metalness: 0.7,
      roughness: 0.3,
    });
    const tower = new THREE.Mesh(towerGeometry, towerMaterial);
    tower.position.y = 6;
    tower.castShadow = true;
    craneTowerGroup.add(tower);
    
    const cabGeometry = new THREE.BoxGeometry(2.5, 2, 2.5);
    const cabMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4a5568,
      metalness: 0.5,
      roughness: 0.5,
    });
    const cab = new THREE.Mesh(cabGeometry, cabMaterial);
    cab.position.y = 11;
    cab.castShadow = true;
    craneTowerGroup.add(cab);
    
    const windowGeometry = new THREE.BoxGeometry(1.8, 1.2, 0.1);
    const windowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.6,
      metalness: 0.9,
    });
    const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
    window1.position.set(0, 11, 1.3);
    craneTowerGroup.add(window1);
    
    scene.add(craneTowerGroup);
    
    const craneArmGroup = new THREE.Group();
    craneArmGroup.position.y = 12;
    
    const armGeometry = new THREE.BoxGeometry(18, 0.8, 1);
    const armMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff6b35,
      metalness: 0.7,
      roughness: 0.3,
    });
    const arm = new THREE.Mesh(armGeometry, armMaterial);
    arm.position.x = 7;
    arm.castShadow = true;
    craneArmGroup.add(arm);
    
    const counterweightGeometry = new THREE.BoxGeometry(3, 2, 2);
    const counterweightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2d3748,
      metalness: 0.8,
      roughness: 0.2,
    });
    const counterweight = new THREE.Mesh(counterweightGeometry, counterweightMaterial);
    counterweight.position.x = -8;
    counterweight.castShadow = true;
    craneArmGroup.add(counterweight);
    
    for (let i = 0; i < 6; i++) {
      const strutGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
      const strutMaterial = new THREE.MeshStandardMaterial({ color: 0x718096 });
      const strut = new THREE.Mesh(strutGeometry, strutMaterial);
      strut.rotation.z = Math.PI / 6;
      strut.position.set(2 + i * 2.5, 2, 0);
      craneArmGroup.add(strut);
    }
    
    scene.add(craneArmGroup);
    craneArmRef.current = craneArmGroup;
    
    const trolleyGeometry = new THREE.BoxGeometry(1.5, 1, 1.5);
    const trolleyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4a5568,
      metalness: 0.6,
      roughness: 0.4,
    });
    const trolley = new THREE.Mesh(trolleyGeometry, trolleyMaterial);
    trolley.position.set(12, 11.5, 0);
    trolley.castShadow = true;
    craneArmGroup.add(trolley);
    
    const hookGeometry = new THREE.ConeGeometry(0.3, 0.8, 8);
    const hookMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.1,
    });
    const hook = new THREE.Mesh(hookGeometry, hookMaterial);
    hook.position.set(12, 8, 0);
    hook.castShadow = true;
    scene.add(hook);
    hookRef.current = hook;
    
    const loadGeometry = new THREE.BoxGeometry(2, 1.5, 2);
    const loadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8b4513,
      metalness: 0.1,
      roughness: 0.8,
    });
    const load = new THREE.Mesh(loadGeometry, loadMaterial);
    load.position.set(12, 6.25, 0);
    load.castShadow = true;
    scene.add(load);
    loadRef.current = load;
    
    const cableGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(12, 11, 0),
      new THREE.Vector3(12, 8, 0),
    ]);
    const cableMaterial = new THREE.LineBasicMaterial({ color: 0x718096 });
    const cable = new THREE.Line(cableGeometry, cableMaterial);
    scene.add(cable);
    cableRef.current = cable;
    
    const intruderGroup = new THREE.Group();
    
    const bodyGeometry = new THREE.CapsuleGeometry(0.3, 1, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    intruderGroup.add(body);
    
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2;
    head.castShadow = true;
    intruderGroup.add(head);
    
    const helmetGeometry = new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const helmetMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = 2.1;
    helmet.castShadow = true;
    intruderGroup.add(helmet);
    
    intruderGroup.position.set(-10, 0, 0);
    intruderGroup.visible = false;
    scene.add(intruderGroup);
    intruderRef.current = intruderGroup;
    
    for (let i = 0; i < 8; i++) {
      const buildingGeometry = new THREE.BoxGeometry(
        3 + Math.random() * 4,
        8 + Math.random() * 12,
        3 + Math.random() * 4
      );
      const buildingMaterial = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.2, 0.3 + Math.random() * 0.1),
        roughness: 0.9,
      });
      const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
      const angle = (i / 8) * Math.PI * 2;
      const distance = 25 + Math.random() * 10;
      building.position.set(
        Math.cos(angle) * distance,
        (8 + Math.random() * 12) / 2,
        Math.sin(angle) * distance
      );
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);
    }
    
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      
      if (craneArmRef.current) {
        craneArmRef.current.rotation.y = (crane.armAngle * Math.PI) / 180;
      }
      
      if (hookRef.current && loadRef.current && cableRef.current) {
        const targetHeight = crane.hookHeight + 5;
        hookRef.current.position.y = targetHeight;
        loadRef.current.position.y = targetHeight - 1.75;
        
        const cablePoints = [
          new THREE.Vector3(12, 11, 0),
          new THREE.Vector3(12, targetHeight + 0.4, 0),
        ];
        cableRef.current.geometry.dispose();
        cableRef.current.geometry = new THREE.BufferGeometry().setFromPoints(cablePoints);
      }
      
      if (intruderRef.current && showIntruder) {
        intruderRef.current.visible = true;
        intruderRef.current.position.x = intruderPosition;
        setIntruderPosition(intruderPosition + 0.08);
        
        if (intruderPosition > 10) {
          setIntruderPosition(-10);
        }
      } else if (intruderRef.current) {
        intruderRef.current.visible = false;
      }
      
      if (warningLineRef.current) {
        const time = Date.now() * 0.003;
        warningLineRef.current.children.forEach((child, i) => {
          if (i > 0 && child instanceof THREE.Mesh) {
            (child.material as THREE.MeshStandardMaterial).opacity = 0.5 + Math.sin(time + i) * 0.3;
          }
        });
      }
      
      renderer.render(scene, camera);
    };
    animate();
    
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);
  
  useEffect(() => {
    if (loadRef.current) {
      const weightRatio = crane.loadWeight / crane.maxLoad;
      const color = weightRatio > 1 ? 0xff0000 : weightRatio > 0.8 ? 0xff6600 : 0x8b4513;
      (loadRef.current.material as THREE.MeshStandardMaterial).color.setHex(color);
      
      const scale = 0.8 + weightRatio * 0.4;
      loadRef.current.scale.set(scale, scale, scale);
    }
  }, [crane.loadWeight, crane.maxLoad]);
  
  return (
    <div 
      ref={containerRef} 
      className="w-full h-full rounded-lg overflow-hidden"
      style={{ touchAction: 'none' }}
    />
  );
}

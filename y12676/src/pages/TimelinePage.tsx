import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useApp } from '../context/AppContext';
import { ShotPoint } from '../types';
import { getOutlierTypeLabel } from '../mockData';

function createCourt(scene: THREE.Scene) {
  const groundGeometry = new THREE.PlaneGeometry(30, 20);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    side: THREE.DoubleSide,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(30, 30, 0xcccccc, 0xe0e0e0);
  scene.add(gridHelper);

  const hoopGeometry = new THREE.TorusGeometry(0.45, 0.05, 8, 32);
  const hoopMaterial = new THREE.MeshStandardMaterial({ color: 0xff6600 });
  const hoop = new THREE.Mesh(hoopGeometry, hoopMaterial);
  hoop.position.set(10, 3.05, 0);
  scene.add(hoop);
}

function getPointColor(p: ShotPoint) {
  if (!p.isOutlier) return 0x4488ff;
  switch (p.outlierType) {
    case 'drift':
      return 0x9333ea;
    case 'camera-loss':
      return 0xdc2626;
    case 'interference':
      return 0xf97316;
    case 'noise':
      return 0xeab308;
    default:
      return 0x6b7280;
  }
}

function createPointMeshes(points: ShotPoint[], useOriginal: boolean = false) {
  return points.map(point => {
    const geometry = new THREE.SphereGeometry(point.isOutlier ? 0.2 : 0.12, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: getPointColor(point),
      emissive: point.isOutlier ? getPointColor(point) : 0x000000,
      emissiveIntensity: point.isOutlier ? 0.3 : 0,
    });
    const mesh = new THREE.Mesh(geometry, material);
    const x = useOriginal ? point.originalX : point.x;
    const y = useOriginal ? point.originalY : point.y;
    const z = useOriginal ? point.originalZ : point.z;
    mesh.position.set(x, y, z);
    mesh.visible = false;
    return { mesh, point };
  });
}

export function TimelinePage() {
  const { currentSession } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedPoint, setHighlightedPoint] = useState<ShotPoint | null>(null);
  const leftContainerRef = useRef<HTMLDivElement>(null);
  const rightContainerRef = useRef<HTMLDivElement>(null);
  const leftMeshesRef = useRef<Array<{ mesh: THREE.Mesh; point: ShotPoint }>>([]);
  const rightMeshesRef = useRef<Array<{ mesh: THREE.Mesh; point: ShotPoint }>>([]);

  const totalPoints = currentSession?.points.length || 0;

  useEffect(() => {
    if (!leftContainerRef.current || !rightContainerRef.current || !currentSession) return;

    const leftScene = new THREE.Scene();
    leftScene.background = new THREE.Color(0xf0f4f8);
    const leftCamera = new THREE.PerspectiveCamera(
      60,
      leftContainerRef.current.clientWidth / leftContainerRef.current.clientHeight,
      0.1,
      1000
    );
    leftCamera.position.set(14, 10, 14);
    const leftRenderer = new THREE.WebGLRenderer({ antialias: true });
    leftRenderer.setSize(leftContainerRef.current.clientWidth, leftContainerRef.current.clientHeight);
    leftContainerRef.current.appendChild(leftRenderer.domElement);
    const leftControls = new OrbitControls(leftCamera, leftRenderer.domElement);
    leftControls.enableDamping = true;

    const rightScene = new THREE.Scene();
    rightScene.background = new THREE.Color(0xf0f4f8);
    const rightCamera = new THREE.PerspectiveCamera(
      60,
      rightContainerRef.current.clientWidth / rightContainerRef.current.clientHeight,
      0.1,
      1000
    );
    rightCamera.position.set(14, 10, 14);
    const rightRenderer = new THREE.WebGLRenderer({ antialias: true });
    rightRenderer.setSize(rightContainerRef.current.clientWidth, rightContainerRef.current.clientHeight);
    rightContainerRef.current.appendChild(rightRenderer.domElement);
    const rightControls = new OrbitControls(rightCamera, rightRenderer.domElement);
    rightControls.enableDamping = true;

    [leftScene, rightScene].forEach(scene => {
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const light = new THREE.DirectionalLight(0xffffff, 0.8);
      light.position.set(10, 20, 10);
      scene.add(light);
      createCourt(scene);
    });

    const leftPoints = createPointMeshes(currentSession.points, false);
    leftPoints.forEach(p => leftScene.add(p.mesh));
    leftMeshesRef.current = leftPoints;

    const rightPoints = createPointMeshes(currentSession.points, true);
    rightPoints.forEach(p => rightScene.add(p.mesh));
    rightMeshesRef.current = rightPoints;

    const syncCamera = () => {
      rightCamera.position.copy(leftCamera.position);
      rightCamera.quaternion.copy(leftCamera.quaternion);
      rightControls.target.copy(leftControls.target);
    };
    leftControls.addEventListener('change', syncCamera);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      leftControls.update();
      rightControls.update();
      leftRenderer.render(leftScene, leftCamera);
      rightRenderer.render(rightScene, rightCamera);
    };
    animate();

    const handleResize = () => {
      if (!leftContainerRef.current || !rightContainerRef.current) return;
      [
        { cam: leftCamera, renderer: leftRenderer, el: leftContainerRef.current },
        { cam: rightCamera, renderer: rightRenderer, el: rightContainerRef.current },
      ].forEach(({ cam, renderer, el }) => {
        cam.aspect = el.clientWidth / el.clientHeight;
        cam.updateProjectionMatrix();
        renderer.setSize(el.clientWidth, el.clientHeight);
      });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(raf);
      leftControls.removeEventListener('change', syncCamera);
      window.removeEventListener('resize', handleResize);
      leftRenderer.dispose();
      rightRenderer.dispose();
      leftContainerRef.current?.removeChild(leftRenderer.domElement);
      rightContainerRef.current?.removeChild(rightRenderer.domElement);
    };
  }, [currentSession]);

  useEffect(() => {
    const update = () => {
      leftMeshesRef.current.forEach((item, i) => {
        item.mesh.visible = i <= currentIndex;
        item.mesh.scale.setScalar(
          i === currentIndex && item.point.isOutlier ? 1.6 : i === currentIndex ? 1.4 : 1
        );
      });
      rightMeshesRef.current.forEach((item, i) => {
        item.mesh.visible = i <= currentIndex;
        item.mesh.scale.setScalar(
          i === currentIndex && item.point.isOutlier ? 1.6 : i === currentIndex ? 1.4 : 1
        );
      });
      if (currentSession) {
        const pt = currentSession.points[currentIndex];
        if (pt?.isOutlier) setHighlightedPoint(pt);
        else setHighlightedPoint(prev => (prev?.index === pt?.index ? prev : null));
      }
    };
    update();
  }, [currentIndex, currentSession]);

  useEffect(() => {
    if (!isPlaying || !currentSession) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= totalPoints - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 80);
    return () => clearInterval(timer);
  }, [isPlaying, totalPoints, currentSession]);

  const displayedPoint = currentSession?.points[currentIndex] || null;

  const legend = [
    { color: 'bg-blue-500', label: '正常点' },
    { color: 'bg-purple-500', label: '设备漂移' },
    { color: 'bg-red-500', label: '视角丢失' },
    { color: 'bg-orange-500', label: '信号干扰' },
    { color: 'bg-yellow-500', label: '随机噪声' },
  ];

  if (!currentSession) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center text-gray-500 py-12">请先选择或导入一个会话</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50">
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">时间回放</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            左右对比：当前处理值 ↔ 原始拟合参考值，高亮异常点的位置差异
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {legend.map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${l.color}`}></span>
              <span className="text-gray-600">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2">
        <div className="border-r flex flex-col">
          <div className="bg-red-50 px-4 py-2 text-center border-b">
            <span className="text-sm font-medium text-red-700">当前处理值（含异常漂移）</span>
          </div>
          <div ref={leftContainerRef} className="flex-1"></div>
        </div>
        <div className="flex flex-col">
          <div className="bg-green-50 px-4 py-2 text-center border-b">
            <span className="text-sm font-medium text-green-700">原始拟合参考值（应在的位置）</span>
          </div>
          <div ref={rightContainerRef} className="flex-1"></div>
        </div>
      </div>

      <div className="bg-white border-t px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-gray-700"
            title="上一帧"
          >
            <span className="material-icons text-base">skip_previous</span>
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2"
          >
            <span className="material-icons text-base">{isPlaying ? 'pause' : 'play_arrow'}</span>
            {isPlaying ? '暂停' : '播放'}
          </button>
          <button
            onClick={() => setCurrentIndex(Math.min(totalPoints - 1, currentIndex + 1))}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-gray-700"
            title="下一帧"
          >
            <span className="material-icons text-base">skip_next</span>
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentIndex(0);
            }}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-gray-700 ml-2"
            title="重置"
          >
            <span className="material-icons text-base">replay</span>
          </button>

          <div className="flex-1 flex items-center gap-3">
            <span className="text-xs text-gray-500 w-24">
              帧 {currentIndex + 1}/{totalPoints}
            </span>
            <input
              type="range"
              min={0}
              max={totalPoints - 1}
              value={currentIndex}
              onChange={e => {
                setIsPlaying(false);
                setCurrentIndex(Number(e.target.value));
              }}
              className="flex-1 accent-primary"
            />
          </div>

          <button
            onClick={() => {
              const nextOutlier = currentSession.points.findIndex(
                (p, i) => i > currentIndex && p.isOutlier
              );
              if (nextOutlier !== -1) {
                setIsPlaying(false);
                setCurrentIndex(nextOutlier);
              }
            }}
            className="px-3 py-2 rounded-lg bg-accent text-white hover:bg-orange-600 text-sm flex items-center gap-1"
          >
            <span className="material-icons text-base">warning</span>
            跳到下一异常
          </button>
        </div>

        {(displayedPoint || highlightedPoint) && (
          <div className="mt-3 pt-3 border-t grid grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-gray-500">当前帧</span>
              <p className="font-mono text-gray-800 mt-0.5">{displayedPoint?.id}</p>
            </div>
            <div>
              <span className="text-gray-500">状态</span>
              <p className="mt-0.5">
                {displayedPoint?.isOutlier ? (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                    {getOutlierTypeLabel(displayedPoint.outlierType).label}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">正常</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-gray-500">差异（当前↔原始）</span>
              <p className="font-mono text-gray-800 mt-0.5">
                Δx: {(displayedPoint ? (displayedPoint.x - displayedPoint.originalX) : 0).toFixed(3)}
                {' '}Δy: {(displayedPoint ? (displayedPoint.y - displayedPoint.originalY) : 0).toFixed(3)}
                {' '}Δz: {(displayedPoint ? (displayedPoint.z - displayedPoint.originalZ) : 0).toFixed(3)}
              </p>
            </div>
            <div>
              <span className="text-gray-500">来源</span>
              <p className="text-gray-800 mt-0.5 truncate">
                {displayedPoint?.materialName} · {displayedPoint?.materialId}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

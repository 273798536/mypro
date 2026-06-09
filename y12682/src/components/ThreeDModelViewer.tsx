import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ThreeDModelViewerProps {
  modelUrl?: string;
  nodeId?: string;
  onScreenshot?: () => void;
}

const ThreeDModelViewer: React.FC<ThreeDModelViewerProps> = ({ 
  modelUrl, 
  nodeId, 
  onScreenshot 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(5, 5, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(20, 20);
    scene.add(gridHelper);

    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x2563eb,
      metalness: 0.3,
      roughness: 0.4,
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.y = 1;
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const animate = () => {
      requestAnimationFrame(animate);
      cube.rotation.y += 0.005;
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [modelUrl, nodeId]);

  return (
    <div className="model-viewer">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}></div>
      
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '20px',
          borderRadius: '8px',
        }}>
          <div className="loading-spinner"></div>
          <div style={{ marginTop: '8px', fontSize: '12px' }}>加载中...</div>
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#FEE2E2',
          padding: '20px',
          borderRadius: '8px',
          color: '#EF4444',
        }}>
          ❌ {error}
        </div>
      )}

      <div className="model-controls">
        <button 
          className="btn btn-secondary"
          onClick={onScreenshot}
          style={{ fontSize: '11px', padding: '4px 8px' }}
        >
          📷 截图
        </button>
      </div>

      {modelUrl && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          fontSize: '10px',
          color: 'var(--color-text-secondary)',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '4px 8px',
          borderRadius: '4px',
        }}>
          🧊 {modelUrl}
        </div>
      )}
    </div>
  );
};

export default ThreeDModelViewer;

import * as THREE from 'three';

function createToothShape(scale: number = 1): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(scale * 0.5, scale * 0.2, scale * 0.4, scale * 0.8);
  shape.quadraticCurveTo(0, scale * 1.1, -scale * 0.4, scale * 0.8);
  shape.quadraticCurveTo(-scale * 0.5, scale * 0.2, 0, 0);
  return shape;
}

function createTooth(
  position: THREE.Vector3,
  scale: number = 1,
  rotation: THREE.Euler = new THREE.Euler()
): THREE.Mesh {
  const shape = createToothShape(scale);
  
  const extrudeSettings = {
    steps: 8,
    depth: scale * 0.6,
    bevelEnabled: true,
    bevelThickness: scale * 0.1,
    bevelSize: scale * 0.1,
    bevelSegments: 4
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.center();
  
  const material = new THREE.MeshStandardMaterial({
    color: 0xF5F5F0,
    roughness: 0.8,
    metalness: 0.1
  });

  const tooth = new THREE.Mesh(geometry, material);
  tooth.position.copy(position);
  tooth.rotation.copy(rotation);
  tooth.castShadow = true;
  tooth.receiveShadow = true;
  
  return tooth;
}

export function createUpperJaw(): THREE.Group {
  const jaw = new THREE.Group();
  jaw.name = 'upperJaw';

  const archShape = new THREE.Shape();
  archShape.moveTo(-10, -2);
  archShape.quadraticCurveTo(-8, 3, 0, 4);
  archShape.quadraticCurveTo(8, 3, 10, -2);
  archShape.lineTo(8, -4);
  archShape.quadraticCurveTo(0, -3, -8, -4);
  archShape.lineTo(-10, -2);

  const gumExtrude = {
    steps: 2,
    depth: 1.5,
    bevelEnabled: true,
    bevelThickness: 0.3,
    bevelSize: 0.3,
    bevelSegments: 2
  };

  const gumGeometry = new THREE.ExtrudeGeometry(archShape, gumExtrude);
  gumGeometry.center();
  
  const gumMaterial = new THREE.MeshStandardMaterial({
    color: 0xDEB887,
    roughness: 0.9,
    metalness: 0.0
  });
  
  const gum = new THREE.Mesh(gumGeometry, gumMaterial);
  gum.rotation.x = Math.PI / 2;
  gum.position.y = 1.2;
  gum.castShadow = true;
  gum.receiveShadow = true;
  jaw.add(gum);

  const teethPositions = [
    { x: -7, z: 2, scale: 0.7, rotY: 0.2 },
    { x: -5.8, z: 2.8, scale: 0.75, rotY: 0.1 },
    { x: -4.5, z: 3.3, scale: 0.8, rotY: 0.05 },
    { x: -3, z: 3.6, scale: 0.85, rotY: 0 },
    { x: -1.5, z: 3.7, scale: 0.9, rotY: 0 },
    { x: 0, z: 3.75, scale: 0.95, rotY: 0 },
    { x: 1.5, z: 3.7, scale: 0.9, rotY: 0 },
    { x: 3, z: 3.6, scale: 0.85, rotY: 0 },
    { x: 4.5, z: 3.3, scale: 0.8, rotY: -0.05 },
    { x: 5.8, z: 2.8, scale: 0.75, rotY: -0.1 },
    { x: 7, z: 2, scale: 0.7, rotY: -0.2 },
    { x: -8.5, z: 0.5, scale: 0.6, rotY: 0.3 },
    { x: 8.5, z: 0.5, scale: 0.6, rotY: -0.3 },
    { x: -9.5, z: -0.5, scale: 0.55, rotY: 0.4 },
    { x: 9.5, z: -0.5, scale: 0.55, rotY: -0.4 },
    { x: -10.5, z: -1.5, scale: 0.5, rotY: 0.5 },
    { x: 10.5, z: -1.5, scale: 0.5, rotY: -0.5 },
  ];

  teethPositions.forEach((tp, i) => {
    const tooth = createTooth(
      new THREE.Vector3(tp.x, 0, tp.z),
      tp.scale,
      new THREE.Euler(-Math.PI / 2, tp.rotY, 0)
    );
    tooth.name = `upper-tooth-${i}`;
    tooth.userData.toothNumber = i + 1;
    jaw.add(tooth);
  });

  jaw.position.y = 1;
  return jaw;
}

export function createLowerJaw(): THREE.Group {
  const jaw = new THREE.Group();
  jaw.name = 'lowerJaw';

  const archShape = new THREE.Shape();
  archShape.moveTo(-9, 1);
  archShape.quadraticCurveTo(-7, 3, 0, 3.5);
  archShape.quadraticCurveTo(7, 3, 9, 1);
  archShape.lineTo(8, -1);
  archShape.quadraticCurveTo(0, -2, -8, -1);
  archShape.lineTo(-9, 1);

  const gumExtrude = {
    steps: 2,
    depth: 1.5,
    bevelEnabled: true,
    bevelThickness: 0.3,
    bevelSize: 0.3,
    bevelSegments: 2
  };

  const gumGeometry = new THREE.ExtrudeGeometry(archShape, gumExtrude);
  gumGeometry.center();
  
  const gumMaterial = new THREE.MeshStandardMaterial({
    color: 0xDEB887,
    roughness: 0.9,
    metalness: 0.0
  });
  
  const gum = new THREE.Mesh(gumGeometry, gumMaterial);
  gum.rotation.x = -Math.PI / 2;
  gum.position.y = -1.2;
  gum.castShadow = true;
  gum.receiveShadow = true;
  jaw.add(gum);

  const teethPositions = [
    { x: -6.5, z: 1.8, scale: 0.7, rotY: 0.2 },
    { x: -5.3, z: 2.5, scale: 0.75, rotY: 0.1 },
    { x: -4, z: 3, scale: 0.8, rotY: 0.05 },
    { x: -2.5, z: 3.3, scale: 0.85, rotY: 0 },
    { x: -1.2, z: 3.4, scale: 0.9, rotY: 0 },
    { x: 0, z: 3.45, scale: 0.95, rotY: 0 },
    { x: 1.2, z: 3.4, scale: 0.9, rotY: 0 },
    { x: 2.5, z: 3.3, scale: 0.85, rotY: 0 },
    { x: 4, z: 3, scale: 0.8, rotY: -0.05 },
    { x: 5.3, z: 2.5, scale: 0.75, rotY: -0.1 },
    { x: 6.5, z: 1.8, scale: 0.7, rotY: -0.2 },
    { x: -7.8, z: 0.5, scale: 0.6, rotY: 0.3 },
    { x: 7.8, z: 0.5, scale: 0.6, rotY: -0.3 },
    { x: -8.8, z: -0.3, scale: 0.55, rotY: 0.4 },
    { x: 8.8, z: -0.3, scale: 0.55, rotY: -0.4 },
    { x: -9.8, z: -1, scale: 0.5, rotY: 0.5 },
    { x: 9.8, z: -1, scale: 0.5, rotY: -0.5 },
  ];

  teethPositions.forEach((tp, i) => {
    const tooth = createTooth(
      new THREE.Vector3(tp.x, 0, tp.z),
      tp.scale,
      new THREE.Euler(Math.PI / 2, tp.rotY, 0)
    );
    tooth.name = `lower-tooth-${i}`;
    tooth.userData.toothNumber = i + 17;
    jaw.add(tooth);
  });

  jaw.position.y = -1;
  return jaw;
}

export function applyMalocclusion(
  upperJaw: THREE.Group,
  lowerJaw: THREE.Group,
  isComplex: boolean
) {
  if (!isComplex) return;

  upperJaw.traverse((child) => {
    if (child.name === 'upper-tooth-3' || child.name === 'upper-tooth-4' || child.name === 'upper-tooth-5') {
      child.position.x += 0.8;
    }
    if (child.name === 'upper-tooth-12') {
      child.position.y += 0.3;
    }
  });

  lowerJaw.traverse((child) => {
    if (child.name === 'lower-tooth-2') {
      child.position.y -= 0.4;
    }
  });
}

export function applyGrinding(
  upperJaw: THREE.Group,
  lowerJaw: THREE.Group,
  isComplex: boolean
) {
  if (!isComplex) return;

  upperJaw.traverse((child) => {
    if (child instanceof THREE.Mesh && child.name === 'upper-tooth-10') {
      child.scale.y *= 0.85;
      child.position.y -= 0.15;
      
      const material = child.material as THREE.MeshStandardMaterial;
      material.color.setHex(0xE8E8E0);
    }
  });

  lowerJaw.traverse((child) => {
    if (child instanceof THREE.Mesh && child.name === 'lower-tooth-5') {
      child.scale.y *= 0.92;
      child.position.y -= 0.08;
    }
  });
}

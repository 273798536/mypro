import * as THREE from 'three';
import { Particle, DecayEvent, MagneticField, PARTICLE_INFO } from '../types/particle';
import { generateTrajectoryWithBField, vector3ToData } from '../utils/trajectoryGenerator';

function createSampleParticle(
  type: keyof typeof PARTICLE_INFO,
  id: string,
  startPos: THREE.Vector3,
  startVel: THREE.Vector3,
  magneticField: MagneticField
): Particle {
  const info = PARTICLE_INFO[type];
  const trajectoryPoints = generateTrajectoryWithBField(
    startPos,
    startVel,
    info.charge,
    Math.max(info.mass / 100, 0.5),
    magneticField,
    150,
    0.015
  );

  return {
    id,
    type,
    charge: info.charge,
    mass: info.mass,
    velocity: vector3ToData(startVel),
    color: info.color,
    trajectoryPoints,
    source: 'default_demo',
    version: '1.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isVisible: true,
  };
}

export function generateSampleData(): { particles: Particle[]; decayEvents: DecayEvent[] } {
  const magneticField = {
    strength: 1.5,
    direction: { x: 0, y: 1, z: 0 },
    isVisible: true,
  };

  const particles: Particle[] = [
    createSampleParticle(
      'electron',
      'demo-electron-1',
      new THREE.Vector3(-8, 0, 0),
      new THREE.Vector3(8, 0.5, 2),
      magneticField
    ),
    createSampleParticle(
      'electron',
      'demo-electron-2',
      new THREE.Vector3(8, 2, 3),
      new THREE.Vector3(-6, -1, -2),
      magneticField
    ),
    createSampleParticle(
      'proton',
      'demo-proton-1',
      new THREE.Vector3(0, -5, 0),
      new THREE.Vector3(3, 4, 1),
      magneticField
    ),
    createSampleParticle(
      'proton',
      'demo-proton-2',
      new THREE.Vector3(-5, 3, -3),
      new THREE.Vector3(5, -2, 2),
      magneticField
    ),
    createSampleParticle(
      'muon',
      'demo-muon-1',
      new THREE.Vector3(5, 0, 5),
      new THREE.Vector3(-4, 3, -3),
      magneticField
    ),
    createSampleParticle(
      'pion',
      'demo-pion-1',
      new THREE.Vector3(-3, 4, -5),
      new THREE.Vector3(4, -2, 3),
      magneticField
    ),
    createSampleParticle(
      'kaon',
      'demo-kaon-1',
      new THREE.Vector3(0, 5, 5),
      new THREE.Vector3(2, -5, -3),
      magneticField
    ),
    createSampleParticle(
      'neutron',
      'demo-neutron-1',
      new THREE.Vector3(-6, -3, 2),
      new THREE.Vector3(4, 2, -1),
      magneticField
    ),
  ];

  const decayEvents: DecayEvent[] = [
    {
      id: 'decay-1',
      particleId: 'demo-pion-1',
      position: particles.find((p) => p.id === 'demo-pion-1')?.trajectoryPoints[60] || {
        x: 0,
        y: 0,
        z: 0,
      },
      decayProducts: ['muon', 'neutrino'],
      timestamp: 60,
      isActive: true,
    },
    {
      id: 'decay-2',
      particleId: 'demo-kaon-1',
      position: particles.find((p) => p.id === 'demo-kaon-1')?.trajectoryPoints[80] || {
        x: 0,
        y: 0,
        z: 0,
      },
      decayProducts: ['pion', 'pion'],
      timestamp: 80,
      isActive: true,
    },
  ];

  return { particles, decayEvents };
}

export const sampleExportData = `[
  {
    "id": "export-electron-1",
    "type": "electron",
    "charge": -1,
    "mass": 0.511,
    "velocity": {"x": 5, "y": 1, "z": 0},
    "color": "#10b981",
    "trajectoryPoints": [
      {"x": -10, "y": 0, "z": 0},
      {"x": -9.5, "y": 0.2, "z": 0.1},
      {"x": -9, "y": 0.5, "z": 0.3},
      {"x": -8.5, "y": 0.9, "z": 0.6},
      {"x": -8, "y": 1.4, "z": 1},
      {"x": -7.5, "y": 2, "z": 1.5},
      {"x": -7, "y": 2.7, "z": 2.1},
      {"x": -6.5, "y": 3.5, "z": 2.8}
    ],
    "source": "manual_export",
    "version": "1.0",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    "isVisible": true
  },
  {
    "id": "export-proton-1",
    "type": "proton",
    "charge": 1,
    "mass": 938.27,
    "velocity": {"x": -3, "y": 2, "z": 1},
    "color": "#ef4444",
    "trajectoryPoints": [
      {"x": 8, "y": -3, "z": 2},
      {"x": 7.5, "y": -2.5, "z": 1.8},
      {"x": 7, "y": -1.9, "z": 1.5},
      {"x": 6.5, "y": -1.2, "z": 1.1},
      {"x": 6, "y": -0.4, "z": 0.6},
      {"x": 5.5, "y": 0.5, "z": 0},
      {"x": 5, "y": 1.5, "z": -0.7},
      {"x": 4.5, "y": 2.6, "z": -1.5}
    ],
    "source": "manual_export",
    "version": "1.0",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    "isVisible": true
  }
]`;

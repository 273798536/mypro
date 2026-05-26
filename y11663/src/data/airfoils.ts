
import type { Airfoil } from '../types';
import { generateNACA4Digit } from '../utils/airfoilMath';

const chordLength = 1.0;

export const AIRFOILS: Airfoil[] = [
  {
    id: 'naca0012',
    name: 'NACA 0012',
    chordLength,
    thickness: 0.12,
    camber: 0,
    coordinates: generateNACA4Digit('NACA 0012'),
  },
  {
    id: 'naca2412',
    name: 'NACA 2412',
    chordLength,
    thickness: 0.12,
    camber: 0.02,
    coordinates: generateNACA4Digit('NACA 2412'),
  },
  {
    id: 'naca4412',
    name: 'NACA 4412',
    chordLength,
    thickness: 0.12,
    camber: 0.04,
    coordinates: generateNACA4Digit('NACA 4412'),
  },
  {
    id: 'naca0008',
    name: 'NACA 0008',
    chordLength,
    thickness: 0.08,
    camber: 0,
    coordinates: generateNACA4Digit('NACA 0008'),
  },
  {
    id: 'naca23012',
    name: 'NACA 23012',
    chordLength,
    thickness: 0.12,
    camber: 0.02,
    coordinates: generateNACA4Digit('NACA 23012'),
  },
];

export function getAirfoilById(id: string): Airfoil | undefined {
  return AIRFOILS.find((a) => a.id === id);
}

export function getDefaultAirfoil(): Airfoil {
  return AIRFOILS[0];
}

export interface ProteinAtom {
  id: string;
  element: 'C' | 'O' | 'N' | 'S' | 'H';
  position: { x: number; y: number; z: number };
  residueNumber: number;
  residueName: string;
  chain: string;
}

export interface ProteinSecondaryStructure {
  type: 'helix' | 'sheet' | 'coil';
  start: number;
  end: number;
}

const ELEMENT_COLORS: Record<string, string> = {
  C: '#9099A3',
  O: '#FF5D5D',
  N: '#4DABF7',
  S: '#FCC419',
  H: '#FFFFFF',
};

export { ELEMENT_COLORS };

const generateBackboneAtoms = (): ProteinAtom[] => {
  const atoms: ProteinAtom[] = [];
  const residueNames = ['LYS', 'GLU', 'ALA', 'VAL', 'LEU', 'ILE', 'MET', 'PHE', 'TRP', 'SER', 'THR', 'CYS', 'TYR', 'ASN', 'GLN', 'ASP', 'GLU', 'HIS', 'LYS', 'ARG'];
  
  for (let i = 1; i <= 280; i++) {
    const t = i * 0.12;
    const helixRadius = 2.3;
    const helixRise = 1.5;
    
    const x = Math.cos(t) * helixRadius + Math.sin(i * 0.05) * 0.5;
    const y = i * helixRise * 0.03 - 10;
    const z = Math.sin(t) * helixRadius + Math.cos(i * 0.07) * 0.3;
    
    atoms.push({
      id: `CA-${i}`,
      element: 'C',
      position: { x, y, z },
      residueNumber: i,
      residueName: residueNames[i % residueNames.length],
      chain: 'A',
    });
    
    if (i % 3 === 0) {
      atoms.push({
        id: `O-${i}`,
        element: 'O',
        position: { x: x + 1.2, y: y + 0.3, z: z + 0.5 },
        residueNumber: i,
        residueName: residueNames[i % residueNames.length],
        chain: 'A',
      });
    }
    
    if (i % 4 === 0) {
      atoms.push({
        id: `N-${i}`,
        element: 'N',
        position: { x: x - 0.8, y: y - 0.4, z: z - 0.3 },
        residueNumber: i,
        residueName: residueNames[i % residueNames.length],
        chain: 'A',
      });
    }
    
    if (i === 41 || i === 115 || i === 227) {
      atoms.push({
        id: `CB-${i}`,
        element: 'C',
        position: { x: x - 1.0, y: y + 0.2, z: z + 1.0 },
        residueNumber: i,
        residueName: i === 41 ? 'ALA' : i === 115 ? 'ASN' : 'STP',
        chain: 'A',
      });
    }
  }
  
  return atoms;
};

export const proteinAtoms: ProteinAtom[] = generateBackboneAtoms();

export const secondaryStructure: ProteinSecondaryStructure[] = [
  { type: 'helix', start: 15, end: 45 },
  { type: 'sheet', start: 50, end: 60 },
  { type: 'helix', start: 70, end: 100 },
  { type: 'sheet', start: 105, end: 115 },
  { type: 'coil', start: 120, end: 140 },
  { type: 'helix', start: 145, end: 175 },
  { type: 'sheet', start: 180, end: 190 },
  { type: 'helix', start: 200, end: 230 },
  { type: 'sheet', start: 235, end: 250 },
  { type: 'coil', start: 255, end: 280 },
];

export const proteinInfo = {
  name: 'TaGW2',
  fullName: '小麦籽粒重量调控基因 TaGW2',
  organism: 'Triticum aestivum (普通小麦)',
  function: 'E3泛素连接酶，负调控籽粒大小和重量',
  length: 280,
  molecularWeight: '31.2 kDa',
  theoreticalPI: '5.8',
  pdbId: '预测模型（基于同源建模）',
  template: '水稻OsGW2 (PDB: 5XXK)',
  sequenceIdentity: '78%',
};

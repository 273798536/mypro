export const sampleMaterials = {
    diamond: {
        id: 'diamond',
        name: '金刚石 (Diamond)',
        formula: 'C',
        description: '面心立方结构，每个原子配位数为4',
        unitCell: {
            a: 3.567,
            b: 3.567,
            c: 3.567,
            alpha: 90,
            beta: 90,
            gamma: 90
        },
        atoms: [
            { element: 'C', x: 0.0, y: 0.0, z: 0.0 },
            { element: 'C', x: 0.0, y: 0.5, z: 0.5 },
            { element: 'C', x: 0.5, y: 0.0, z: 0.5 },
            { element: 'C', x: 0.5, y: 0.5, z: 0.0 },
            { element: 'C', x: 0.25, y: 0.25, z: 0.25 },
            { element: 'C', x: 0.25, y: 0.75, z: 0.75 },
            { element: 'C', x: 0.75, y: 0.25, z: 0.75 },
            { element: 'C', x: 0.75, y: 0.75, z: 0.25 }
        ],
        bondThreshold: 1.8
    },
    nacl: {
        id: 'nacl',
        name: '氯化钠 (NaCl)',
        formula: 'NaCl',
        description: '岩盐结构，面心立方，配位数6',
        unitCell: {
            a: 5.64,
            b: 5.64,
            c: 5.64,
            alpha: 90,
            beta: 90,
            gamma: 90
        },
        atoms: [
            { element: 'Na', x: 0.0, y: 0.0, z: 0.0 },
            { element: 'Na', x: 0.0, y: 0.5, z: 0.5 },
            { element: 'Na', x: 0.5, y: 0.0, z: 0.5 },
            { element: 'Na', x: 0.5, y: 0.5, z: 0.0 },
            { element: 'Cl', x: 0.5, y: 0.0, z: 0.0 },
            { element: 'Cl', x: 0.0, y: 0.5, z: 0.0 },
            { element: 'Cl', x: 0.0, y: 0.0, z: 0.5 },
            { element: 'Cl', x: 0.5, y: 0.5, z: 0.5 }
        ],
        bondThreshold: 3.0
    },
    cscl: {
        id: 'cscl',
        name: '氯化铯 (CsCl)',
        formula: 'CsCl',
        description: '简单立方结构，配位数8',
        unitCell: {
            a: 4.123,
            b: 4.123,
            c: 4.123,
            alpha: 90,
            beta: 90,
            gamma: 90
        },
        atoms: [
            { element: 'Cs', x: 0.0, y: 0.0, z: 0.0 },
            { element: 'Cl', x: 0.5, y: 0.5, z: 0.5 }
        ],
        bondThreshold: 3.7
    },
    zincblende: {
        id: 'zincblende',
        name: '闪锌矿 (ZnS)',
        formula: 'ZnS',
        description: '立方硫化锌结构，类似金刚石',
        unitCell: {
            a: 5.406,
            b: 5.406,
            c: 5.406,
            alpha: 90,
            beta: 90,
            gamma: 90
        },
        atoms: [
            { element: 'Zn', x: 0.0, y: 0.0, z: 0.0 },
            { element: 'Zn', x: 0.0, y: 0.5, z: 0.5 },
            { element: 'Zn', x: 0.5, y: 0.0, z: 0.5 },
            { element: 'Zn', x: 0.5, y: 0.5, z: 0.0 },
            { element: 'S', x: 0.25, y: 0.25, z: 0.25 },
            { element: 'S', x: 0.25, y: 0.75, z: 0.75 },
            { element: 'S', x: 0.75, y: 0.25, z: 0.75 },
            { element: 'S', x: 0.75, y: 0.75, z: 0.25 }
        ],
        bondThreshold: 2.4
    },
    fluorite: {
        id: 'fluorite',
        name: '萤石 (CaF2)',
        formula: 'CaF₂',
        description: 'CaF₂结构，面心立方',
        unitCell: {
            a: 5.463,
            b: 5.463,
            c: 5.463,
            alpha: 90,
            beta: 90,
            gamma: 90
        },
        atoms: [
            { element: 'Ca', x: 0.0, y: 0.0, z: 0.0 },
            { element: 'Ca', x: 0.0, y: 0.5, z: 0.5 },
            { element: 'Ca', x: 0.5, y: 0.0, z: 0.5 },
            { element: 'Ca', x: 0.5, y: 0.5, z: 0.0 },
            { element: 'F', x: 0.25, y: 0.25, z: 0.25 },
            { element: 'F', x: 0.25, y: 0.75, z: 0.75 },
            { element: 'F', x: 0.75, y: 0.25, z: 0.75 },
            { element: 'F', x: 0.75, y: 0.75, z: 0.25 },
            { element: 'F', x: 0.75, y: 0.25, z: 0.25 },
            { element: 'F', x: 0.25, y: 0.75, z: 0.25 },
            { element: 'F', x: 0.25, y: 0.25, z: 0.75 },
            { element: 'F', x: 0.75, y: 0.75, z: 0.75 }
        ],
        bondThreshold: 2.6
    }
};

export const elementColors = {
    H: '#ffffff',
    C: '#808080',
    N: '#3050f8',
    O: '#ff0d0d',
    F: '#90e050',
    Na: '#ab5cf2',
    Mg: '#8aff00',
    Al: '#bfa6a6',
    Si: '#f0c8a0',
    P: '#ff8000',
    S: '#ffff30',
    Cl: '#1ff01f',
    K: '#8f40d4',
    Ca: '#3dff00',
    Fe: '#e06633',
    Cu: '#c88033',
    Zn: '#7d80b0',
    Br: '#a62929',
    Ag: '#c0c0c0',
    I: '#940094',
    Cs: '#57178f',
    Au: '#ffd123',
    Pb: '#575961',
    default: '#ff69b4'
};

export const elementRadii = {
    H: 0.25,
    C: 0.7,
    N: 0.65,
    O: 0.6,
    F: 0.5,
    Na: 1.8,
    Mg: 1.5,
    Al: 1.4,
    Si: 1.3,
    P: 1.0,
    S: 1.0,
    Cl: 1.0,
    K: 2.2,
    Ca: 1.97,
    Fe: 1.4,
    Cu: 1.35,
    Zn: 1.35,
    Br: 1.15,
    Ag: 1.6,
    I: 1.4,
    Cs: 2.65,
    Au: 1.55,
    Pb: 1.8,
    default: 1.0
};
import type { Microbe } from '../types';

export const microbes: Microbe[] = [
  {
    id: 'mb-001',
    name: '大肠杆菌',
    scientificName: 'Escherichia coli',
    category: 'bacteria',
    gramStain: 'negative',
    description: '革兰氏阴性杆菌，常见于肠道，部分菌株致病',
    pathogenicity: 'opportunistic'
  },
  {
    id: 'mb-002',
    name: '金黄色葡萄球菌',
    scientificName: 'Staphylococcus aureus',
    category: 'bacteria',
    gramStain: 'positive',
    description: '革兰氏阳性球菌，常见于皮肤和鼻腔，可引起多种感染',
    pathogenicity: 'pathogenic'
  },
  {
    id: 'mb-003',
    name: '肺炎克雷伯菌',
    scientificName: 'Klebsiella pneumoniae',
    category: 'bacteria',
    gramStain: 'negative',
    description: '革兰氏阴性杆菌，可引起肺炎和尿路感染',
    pathogenicity: 'opportunistic'
  },
  {
    id: 'mb-004',
    name: '铜绿假单胞菌',
    scientificName: 'Pseudomonas aeruginosa',
    category: 'bacteria',
    gramStain: 'negative',
    description: '革兰氏阴性杆菌，常见于环境，是医院感染的重要病原菌',
    pathogenicity: 'opportunistic'
  },
  {
    id: 'mb-005',
    name: '粪肠球菌',
    scientificName: 'Enterococcus faecalis',
    category: 'bacteria',
    gramStain: 'positive',
    description: '革兰氏阳性球菌，肠道正常菌群，可引起尿路感染',
    pathogenicity: 'opportunistic'
  },
  {
    id: 'mb-006',
    name: '链球菌属',
    scientificName: 'Streptococcus spp.',
    category: 'bacteria',
    gramStain: 'positive',
    description: '革兰氏阳性球菌，包括多种致病菌和共生菌',
    pathogenicity: 'pathogenic'
  },
  {
    id: 'mb-007',
    name: '乳酸杆菌',
    scientificName: 'Lactobacillus spp.',
    category: 'bacteria',
    gramStain: 'positive',
    description: '革兰氏阳性杆菌，益生菌，常见于肠道和阴道',
    pathogenicity: 'non-pathogenic'
  },
  {
    id: 'mb-008',
    name: '双歧杆菌',
    scientificName: 'Bifidobacterium spp.',
    category: 'bacteria',
    gramStain: 'positive',
    description: '革兰氏阳性杆菌，益生菌，肠道正常菌群',
    pathogenicity: 'non-pathogenic'
  },
  {
    id: 'mb-009',
    name: '梭菌属',
    scientificName: 'Clostridium spp.',
    category: 'bacteria',
    gramStain: 'positive',
    description: '革兰氏阳性芽孢杆菌，包括致病菌如艰难梭菌',
    pathogenicity: 'pathogenic'
  },
  {
    id: 'mb-010',
    name: '志贺氏菌',
    scientificName: 'Shigella spp.',
    category: 'bacteria',
    gramStain: 'negative',
    description: '革兰氏阴性杆菌，引起细菌性痢疾',
    pathogenicity: 'pathogenic'
  },
  {
    id: 'mb-011',
    name: '沙门氏菌',
    scientificName: 'Salmonella spp.',
    category: 'bacteria',
    gramStain: 'negative',
    description: '革兰氏阴性杆菌，引起食物中毒和伤寒',
    pathogenicity: 'pathogenic'
  },
  {
    id: 'mb-012',
    name: '白色念珠菌',
    scientificName: 'Candida albicans',
    category: 'fungi',
    gramStain: 'not-applicable',
    description: '酵母菌，机会致病菌，可引起鹅口疮和阴道炎',
    pathogenicity: 'opportunistic'
  },
  {
    id: 'mb-013',
    name: '曲霉菌',
    scientificName: 'Aspergillus spp.',
    category: 'fungi',
    gramStain: 'not-applicable',
    description: '丝状真菌，常见于环境，可引起肺部感染',
    pathogenicity: 'opportunistic'
  },
  {
    id: 'mb-014',
    name: '隐球菌',
    scientificName: 'Cryptococcus neoformans',
    category: 'fungi',
    gramStain: 'not-applicable',
    description: '酵母菌，可引起隐球菌性脑膜炎',
    pathogenicity: 'pathogenic'
  },
  {
    id: 'mb-015',
    name: '毛霉菌',
    scientificName: 'Mucor spp.',
    category: 'fungi',
    gramStain: 'not-applicable',
    description: '丝状真菌，可引起毛霉菌病',
    pathogenicity: 'pathogenic'
  },
  {
    id: 'mb-016',
    name: '支原体',
    scientificName: 'Mycoplasma spp.',
    category: 'bacteria',
    gramStain: 'not-applicable',
    description: '无细胞壁的细菌，可引起肺炎和尿路感染',
    pathogenicity: 'pathogenic'
  },
  {
    id: 'mb-017',
    name: '衣原体',
    scientificName: 'Chlamydia spp.',
    category: 'bacteria',
    gramStain: 'negative',
    description: '专性细胞内寄生菌，可引起多种疾病',
    pathogenicity: 'pathogenic'
  },
  {
    id: 'mb-018',
    name: '螺旋体',
    scientificName: 'Spirochaetes',
    category: 'bacteria',
    gramStain: 'negative',
    description: '螺旋形细菌，包括梅毒螺旋体等',
    pathogenicity: 'pathogenic'
  },
  {
    id: 'mb-019',
    name: '古菌',
    scientificName: 'Archaea',
    category: 'archaea',
    gramStain: 'variable',
    description: '古菌域微生物，常见于极端环境和肠道',
    pathogenicity: 'non-pathogenic'
  },
  {
    id: 'mb-020',
    name: '噬菌体',
    scientificName: 'Bacteriophage',
    category: 'virus',
    gramStain: 'not-applicable',
    description: '感染细菌的病毒，在微生物组中起调节作用',
    pathogenicity: 'non-pathogenic'
  }
];

export const getMicrobeById = (id: string): Microbe | undefined => {
  return microbes.find(m => m.id === id);
};

export const getMicrobesByCategory = (category: Microbe['category']): Microbe[] => {
  return microbes.filter(m => m.category === category);
};

export const getMicrobesByGramStain = (gramStain: Microbe['gramStain']): Microbe[] => {
  return microbes.filter(m => m.gramStain === gramStain);
};

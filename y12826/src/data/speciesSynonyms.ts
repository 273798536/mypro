import type { SpeciesSynonym } from '@/types';

export const speciesSynonyms: SpeciesSynonym[] = [
  {
    canonical: 'Mus musculus',
    synonyms: ['小鼠', '小家鼠', 'Mouse', 'house mouse', 'M. musculus'],
  },
  {
    canonical: 'Homo sapiens',
    synonyms: ['人类', '人', 'Human', 'man', 'H. sapiens'],
  },
  {
    canonical: 'Rattus norvegicus',
    synonyms: ['大鼠', '褐家鼠', 'Rat', 'Norway rat', 'R. norvegicus'],
  },
  {
    canonical: 'Saccharomyces cerevisiae',
    synonyms: ['酿酒酵母', '酵母', 'Yeast', 'baker yeast', 'S. cerevisiae'],
  },
  {
    canonical: 'Escherichia coli',
    synonyms: ['大肠杆菌', '大肠埃希氏菌', 'E. coli', 'Ecoli'],
  },
  {
    canonical: 'Drosophila melanogaster',
    synonyms: ['果蝇', '黑腹果蝇', 'Fruit fly', 'D. melanogaster'],
  },
  {
    canonical: 'Caenorhabditis elegans',
    synonyms: ['秀丽隐杆线虫', '线虫', 'C. elegans', 'worm'],
  },
  {
    canonical: 'Danio rerio',
    synonyms: ['斑马鱼', 'zebrafish', 'D. rerio'],
  },
];

export function getCanonicalSpecies(speciesName: string): string {
  const lowerName = speciesName.toLowerCase().trim();
  for (const entry of speciesSynonyms) {
    if (entry.canonical.toLowerCase() === lowerName) {
      return entry.canonical;
    }
    for (const syn of entry.synonyms) {
      if (syn.toLowerCase() === lowerName) {
        return entry.canonical;
      }
    }
  }
  return speciesName;
}

export function hasSynonymIssue(speciesName: string, batchSpecies: string): boolean {
  const canonicalInput = getCanonicalSpecies(speciesName);
  const canonicalBatch = getCanonicalSpecies(batchSpecies);
  return canonicalInput !== canonicalBatch;
}

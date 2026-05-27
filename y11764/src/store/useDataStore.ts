import { create } from 'zustand';
import type { Asset, Portfolio, DataSource, VersionHistory, ImportMode } from '../types/portfolio';
import type { Constraint } from '../types/constraints';
import { mockAssets, mockPortfolios, mockConstraints, mockVersionHistory } from '../mock/sampleData';
import { generateFileHash, findDuplicatePortfolios, resolveDuplicates, validateAndFixPortfolio } from '../engine/validation';

interface DataStoreState {
  assets: Asset[];
  portfolios: Portfolio[];
  constraints: Constraint[];
  dataSources: DataSource[];
  versionHistory: VersionHistory[];
  selectedPortfolioId: string | null;
  comparisonPortfolioIds: string[];
  isLoading: boolean;
  error: string | null;
  
  setAssets: (assets: Asset[]) => void;
  setPortfolios: (portfolios: Portfolio[]) => void;
  setConstraints: (constraints: Constraint[]) => void;
  selectPortfolio: (id: string | null) => void;
  toggleComparison: (id: string) => void;
  clearComparison: () => void;
  
  addPortfolio: (portfolio: Portfolio) => void;
  updatePortfolio: (id: string, updates: Partial<Portfolio>) => void;
  deletePortfolio: (id: string) => void;
  savePortfolioVersion: (id: string, description: string, modifiedBy: string) => void;
  
  importData: (
    data: Partial<Portfolio>[],
    fileName: string,
    fileType: 'xlsx' | 'csv' | 'json',
    mode: ImportMode,
    source: string
  ) => Promise<{
    success: boolean;
    imported: number;
    duplicates: number;
    errors: string[];
    warnings: string[];
  }>;
  
  toggleConstraint: (id: string) => void;
  updateConstraint: (id: string, updates: Partial<Constraint>) => void;
  addConstraint: (constraint: Omit<Constraint, 'id'>) => void;
  deleteConstraint: (id: string) => void;
  
  loadMockData: () => void;
  clearAll: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 10);

export const useDataStore = create<DataStoreState>((set, get) => ({
  assets: [],
  portfolios: [],
  constraints: [],
  dataSources: [],
  versionHistory: [],
  selectedPortfolioId: null,
  comparisonPortfolioIds: [],
  isLoading: false,
  error: null,

  setAssets: (assets) => set({ assets }),
  setPortfolios: (portfolios) => set({ portfolios }),
  setConstraints: (constraints) => set({ constraints }),
  
  selectPortfolio: (id) => set({ selectedPortfolioId: id }),
  
  toggleComparison: (id) => {
    const { comparisonPortfolioIds } = get();
    if (comparisonPortfolioIds.includes(id)) {
      set({ comparisonPortfolioIds: comparisonPortfolioIds.filter(pid => pid !== id) });
    } else if (comparisonPortfolioIds.length < 3) {
      set({ comparisonPortfolioIds: [...comparisonPortfolioIds, id] });
    }
  },
  
  clearComparison: () => set({ comparisonPortfolioIds: [] }),

  addPortfolio: (portfolio) => {
    const { portfolios } = get();
    set({ portfolios: [...portfolios, portfolio] });
  },

  updatePortfolio: (id, updates) => {
    const { portfolios } = get();
    set({
      portfolios: portfolios.map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
      )
    });
  },

  deletePortfolio: (id) => {
    const { portfolios, selectedPortfolioId, comparisonPortfolioIds } = get();
    set({
      portfolios: portfolios.filter(p => p.id !== id),
      selectedPortfolioId: selectedPortfolioId === id ? null : selectedPortfolioId,
      comparisonPortfolioIds: comparisonPortfolioIds.filter(pid => pid !== id)
    });
  },

  savePortfolioVersion: (id, description, modifiedBy) => {
    const { portfolios, versionHistory } = get();
    const portfolio = portfolios.find(p => p.id === id);
    if (!portfolio) return;

    const parentVersion = versionHistory.find(v => v.portfolioId === id);
    
    const newVersion: VersionHistory = {
      id: generateId(),
      portfolioId: id,
      parentId: parentVersion?.id,
      changeDescription: description,
      modifiedBy,
      timestamp: new Date(),
      diff: {}
    };

    set({ versionHistory: [newVersion, ...versionHistory] });
  },

  importData: async (data, fileName, fileType, mode, source) => {
    const { assets, constraints, portfolios: existingPortfolios } = get();
    const errors: string[] = [];
    const warnings: string[] = [];
    const importedPortfolios: Portfolio[] = [];

    set({ isLoading: true, error: null });

    try {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row.weights) {
          errors.push(`第${i + 1}行：缺少weights字段`);
          continue;
        }

        const weights = row.weights as Record<string, number>;
        const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
        
        let normalizedWeights = weights;
        if (Math.abs(weightSum - 1) > 0.001) {
          warnings.push(`第${i + 1}行：权重和${weightSum.toFixed(4)}已自动归一化`);
          const sum = Object.values(weights).reduce((a, b) => a + b, 0);
          normalizedWeights = Object.fromEntries(
            Object.entries(weights).map(([k, v]) => [k, v / sum])
          );
        }

        const assetIds = Object.keys(normalizedWeights);
        const validAssets = assetIds.filter(id => assets.some(a => a.id === id));
        
        if (validAssets.length === 0) {
          errors.push(`第${i + 1}行：无有效资产`);
          continue;
        }

        const usedAssets = assets.filter(a => validAssets.includes(a.id));
        const expectedReturn = usedAssets.reduce((sum, a) => 
          sum + (normalizedWeights[a.id] || 0) * a.expectedReturn, 0
        );
        const volatility = Math.sqrt(usedAssets.reduce((sum, a, i) => 
          sum + usedAssets.reduce((inner, a2, j) => {
            const w1 = normalizedWeights[a.id] || 0;
            const w2 = normalizedWeights[a2.id] || 0;
            const corr = i === j ? 1 : 0.5;
            return inner + w1 * w2 * a.volatility * a2.volatility * corr;
          }, 0), 0)
        );
        const maxDrawdown = usedAssets.reduce((sum, a) => 
          sum + (normalizedWeights[a.id] || 0) * a.maxDrawdown, 0
        );
        const sharpeRatio = volatility > 0 ? (expectedReturn - 0.02) / volatility : 0;

        const portfolio: Portfolio = {
          id: generateId(),
          name: row.name || `导入组合 #${i + 1}`,
          source,
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
          weights: normalizedWeights,
          expectedReturn: row.expectedReturn ?? expectedReturn,
          volatility: row.volatility ?? volatility,
          maxDrawdown: row.maxDrawdown ?? maxDrawdown,
          sharpeRatio: row.sharpeRatio ?? sharpeRatio,
          status: 'normal',
          anomalies: [],
          riskContributions: {}
        };

        const { portfolio: validatedPortfolio, fixes } = validateAndFixPortfolio(
          portfolio,
          assets,
          constraints
        );
        
        warnings.push(...fixes);
        importedPortfolios.push(validatedPortfolio);
      }

      const duplicates = findDuplicatePortfolios(importedPortfolios, existingPortfolios);
      const resolvedPortfolios = resolveDuplicates(
        importedPortfolios,
        existingPortfolios,
        mode
      );

      const dataSource: DataSource = {
        id: generateId(),
        fileName,
        fileType,
        importDate: new Date(),
        importMode: mode,
        hash: generateFileHash(JSON.stringify(data)),
        portfolioIds: importedPortfolios.map(p => p.id)
      };

      set(state => ({
        portfolios: resolvedPortfolios,
        dataSources: [...state.dataSources, dataSource],
        isLoading: false
      }));

      return {
        success: errors.length === 0,
        imported: importedPortfolios.length,
        duplicates: duplicates.length,
        errors,
        warnings
      };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '导入失败';
      set({ isLoading: false, error: errorMessage });
      return {
        success: false,
        imported: 0,
        duplicates: 0,
        errors: [errorMessage],
        warnings: []
      };
    }
  },

  toggleConstraint: (id) => {
    const { constraints } = get();
    set({
      constraints: constraints.map(c =>
        c.id === id ? { ...c, enabled: !c.enabled } : c
      )
    });
  },

  updateConstraint: (id, updates) => {
    const { constraints } = get();
    set({
      constraints: constraints.map(c =>
        c.id === id ? { ...c, ...updates } : c
      )
    });
  },

  addConstraint: (constraint) => {
    const { constraints } = get();
    set({
      constraints: [...constraints, { ...constraint, id: generateId() }]
    });
  },

  deleteConstraint: (id) => {
    const { constraints } = get();
    set({
      constraints: constraints.filter(c => c.id !== id)
    });
  },

  loadMockData: () => {
    set({
      assets: mockAssets,
      portfolios: mockPortfolios,
      constraints: mockConstraints,
      versionHistory: mockVersionHistory,
      selectedPortfolioId: mockPortfolios[0]?.id || null
    });
  },

  clearAll: () => {
    set({
      assets: [],
      portfolios: [],
      constraints: [],
      dataSources: [],
      versionHistory: [],
      selectedPortfolioId: null,
      comparisonPortfolioIds: [],
      error: null
    });
  }
}));

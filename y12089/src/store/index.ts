import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DataPackage,
  AnalysisResult,
  AnalysisState,
  ViewMode,
  CameraMode,
  PackageFile
} from '@/types';
import { db } from '@/db';
import { analyzeOcclusion } from '@/algorithms/analysis';

interface AppState {
  packages: DataPackage[];
  currentPackage: DataPackage | null;
  currentResult: AnalysisResult | null;
  analysisState: AnalysisState;
  isLoading: boolean;
  error: string | null;
  demoMode: boolean;

  loadPackages: () => Promise<void>;
  createPackage: (name: string, patientName: string, files?: PackageFile[]) => Promise<string>;
  setCurrentPackage: (id: string | null) => Promise<void>;
  deletePackage: (id: string) => Promise<void>;
  
  runAnalysis: (packageId: string, isComplexCase: boolean) => Promise<string>;
  setCurrentResult: (id: string | null) => Promise<void>;
  
  setShowContactPoints: (show: boolean) => void;
  setShowMalocclusions: (show: boolean) => void;
  setShowGrindingAreas: (show: boolean) => void;
  setShowAnnotations: (show: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setCameraMode: (mode: CameraMode) => void;
  setSelectedItemId: (id: string | undefined) => void;
  
  setDemoMode: (enabled: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      packages: [],
      currentPackage: null,
      currentResult: null,
      analysisState: {
        showContactPoints: true,
        showMalocclusions: true,
        showGrindingAreas: true,
        showAnnotations: true,
        viewMode: 'combined',
        cameraMode: 'orthographic',
        selectedItemId: undefined
      },
      isLoading: false,
      error: null,
      demoMode: false,

      loadPackages: async () => {
        set({ isLoading: true });
        try {
          const packages = await db.getAllPackages();
          set({ packages, isLoading: false });
        } catch (error) {
          set({ error: '加载数据包失败', isLoading: false });
        }
      },

      createPackage: async (name: string, patientName: string, files: PackageFile[] = []) => {
        const newPackage: DataPackage = {
          id: `pkg-${Date.now()}`,
          name,
          patientId: `pat-${Date.now()}`,
          patientName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          files,
          status: 'pending'
        };
        
        await db.savePackage(newPackage);
        await get().loadPackages();
        return newPackage.id;
      },

      setCurrentPackage: async (id: string | null) => {
        if (!id) {
          set({ currentPackage: null, currentResult: null });
          return;
        }
        
        const pkg = await db.getPackage(id);
        set({ currentPackage: pkg || null });
        
        if (pkg) {
          const results = await db.getResultsByPackage(id);
          if (results.length > 0) {
            set({ currentResult: results[0] });
          }
        }
      },

      deletePackage: async (id: string) => {
        await db.deletePackage(id);
        await get().loadPackages();
        if (get().currentPackage?.id === id) {
          set({ currentPackage: null, currentResult: null });
        }
      },

      runAnalysis: async (packageId: string, isComplexCase: boolean) => {
        const pkg = await db.getPackage(packageId);
        if (!pkg) throw new Error('数据包不存在');

        set({ isLoading: true });
        
        await db.packages.update(packageId, { 
          status: 'analyzing',
          updatedAt: Date.now()
        });

        await new Promise(resolve => setTimeout(resolve, 1500));

        const result = analyzeOcclusion(packageId, pkg.name, isComplexCase);
        const resultId = await db.saveAnalysisResult(result);

        await db.packages.update(packageId, { 
          status: 'completed',
          updatedAt: Date.now()
        });

        await get().loadPackages();
        await get().setCurrentPackage(packageId);
        set({ isLoading: false });

        return resultId;
      },

      setCurrentResult: async (id: string | null) => {
        if (!id) {
          set({ currentResult: null });
          return;
        }
        
        const result = await db.getAnalysisResult(id);
        set({ currentResult: result || null });
      },

      setShowContactPoints: (show: boolean) => {
        set(state => ({
          analysisState: { ...state.analysisState, showContactPoints: show }
        }));
      },

      setShowMalocclusions: (show: boolean) => {
        set(state => ({
          analysisState: { ...state.analysisState, showMalocclusions: show }
        }));
      },

      setShowGrindingAreas: (show: boolean) => {
        set(state => ({
          analysisState: { ...state.analysisState, showGrindingAreas: show }
        }));
      },

      setShowAnnotations: (show: boolean) => {
        set(state => ({
          analysisState: { ...state.analysisState, showAnnotations: show }
        }));
      },

      setViewMode: (mode: ViewMode) => {
        set(state => ({
          analysisState: { ...state.analysisState, viewMode: mode }
        }));
      },

      setCameraMode: (mode: CameraMode) => {
        set(state => ({
          analysisState: { ...state.analysisState, cameraMode: mode }
        }));
      },

      setSelectedItemId: (id: string | undefined) => {
        set(state => ({
          analysisState: { ...state.analysisState, selectedItemId: id }
        }));
      },

      setDemoMode: (enabled: boolean) => {
        set({ demoMode: enabled });
      },

      setError: (error: string | null) => {
        set({ error });
      }
    }),
    {
      name: 'occlusal-analysis-store',
      partialize: (state) => ({
        analysisState: state.analysisState
      })
    }
  )
);

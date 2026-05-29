import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import { useDataStore } from '../store/useDataStore';
import { traceAllSources, checkAllSeatOcclusions } from '../engine/rayTracer';
import { generateFanHallGeometry, generateSeatPositions } from '../engine/geometry';
import { createSeatFromPosition, validateAllData, validateHallModel, validateSoundSources, validateSeats } from '../engine/validation';
import { generateHallRT60, calculateSeatAcoustics } from '../engine/acoustics';
import type { HallModel, SoundSource, Seat, FrequencyBand, ImportMeta } from '../types/acoustics';
import hallSampleData from '../data/samples/hall-model.json';
import sourcesSampleData from '../data/samples/sound-sources.json';

export const useAcousticCalc = () => {
  const {
    setHallModel,
    setSoundSources,
    setSeats,
    setSoundRays,
    setValidationResult,
    setCalculating,
    addImportRecord,
    getMaterialById,
  } = useDataStore();

  const geometryCache = useRef<Record<string, THREE.BufferGeometry> | null>(null);

  const loadSampleData = useCallback(async () => {
    setCalculating(true, 0);

    try {
      await new Promise((resolve) => setTimeout(resolve, 200));

      const hallResult = validateHallModel(hallSampleData);
      if (hallResult.data) {
        setHallModel(hallResult.data);
        addImportRecord(hallResult.data.importMeta);
      }

      setCalculating(false, 30);

      await new Promise((resolve) => setTimeout(resolve, 200));

      const sourcesResult = validateSoundSources(sourcesSampleData);
      setSoundSources(sourcesResult.data);
      addImportRecord({
        batch: 2,
        timestamp: Date.now(),
        fileName: 'sound-sources.json',
      });

      setCalculating(false, 50);

      await new Promise((resolve) => setTimeout(resolve, 200));

      if (hallResult.data) {
        const params = (hallSampleData as { params: { width: number; depth: number; height: number; stageDepth: number; curvature: number } }).params;
        const seatPositions = generateSeatPositions({
          rows: 15,
          cols: 20,
          width: params.width,
          depth: params.depth,
          stageDepth: params.stageDepth,
          curvature: params.curvature,
          startRow: 1,
        });

        const hallGeometries = generateFanHallGeometry(params);
        geometryCache.current = hallGeometries;

        const occlusions = checkAllSeatOcclusions(
          sourcesResult.data,
          seatPositions.map((pos, idx) => ({
            id: `seat_${Math.floor(idx / 20)}_${idx % 20}`,
            row: Math.floor(idx / 20),
            col: idx % 20,
            position: pos,
            isOccluded: false,
            issues: [],
            acoustics: {
              low: { rt60: null, spl: null, c80: null, hasError: false },
              mid: { rt60: null, spl: null, c80: null, hasError: false },
              high: { rt60: null, spl: null, c80: null, hasError: false },
            },
          })),
          hallGeometries,
          getMaterialById
        );

        const seats: Seat[] = seatPositions.map((pos, idx) => {
          const row = Math.floor(idx / 20);
          const col = idx % 20;
          const hasOcclusion = occlusions[idx] || (row > 8 && col > 15 && Math.random() < 0.3);
          return createSeatFromPosition(pos, row, col, hasOcclusion);
        });

        const seatsResult = validateSeats(seats);
        setSeats(seatsResult.data);
        addImportRecord({
          batch: 3,
          timestamp: Date.now(),
          fileName: 'seats-generated',
        });
      }

      setCalculating(false, 80);

      const allIssues = [...hallResult.issues, ...sourcesResult.issues];
      const finalValidation = validateAllData(hallResult.data, sourcesResult.data, useDataStore.getState().seats);
      setValidationResult({
        isValid: finalValidation.isValid,
        issues: [...allIssues, ...finalValidation.issues],
      });

      setCalculating(false, 100);
    } catch (error) {
      console.error('加载样例数据失败:', error);
      setCalculating(false, 0);
    }
  }, [setHallModel, setSoundSources, setSeats, setValidationResult, setCalculating, addImportRecord, getMaterialById]);

  const runRayTracing = useCallback(async () => {
    const state = useDataStore.getState();
    const { hallModel, soundSources, seats, validationResult } = state;

    if (!hallModel || soundSources.length === 0 || seats.length === 0) {
      return;
    }

    if (validationResult && !validationResult.isValid) {
      const missingMat = validationResult.issues.filter((i) => i.type === 'material_missing');
      if (missingMat.length > 0) {
        const proceed = confirm(
          `存在 ${missingMat.length} 个材料缺失问题，计算结果可能不准确。是否继续？`
        );
        if (!proceed) return;
      }
    }

    setCalculating(true, 0);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const params = (hallSampleData as { params: { width: number; depth: number; height: number; stageDepth: number; curvature: number } }).params;
      const hallGeometries = geometryCache.current || generateFanHallGeometry(params);
      geometryCache.current = hallGeometries;

      setCalculating(true, 10);

      const hallRT60 = generateHallRT60(hallModel.bounds, (meshName) => {
        const assignment = hallModel.materials.find((m) => m.meshName === meshName);
        return getMaterialById(assignment?.materialId || null);
      });

      const updatedSeats = seats.map((seat) => ({
        ...seat,
        acoustics: calculateSeatAcoustics(seat, soundSources, hallRT60),
      }));
      setSeats(updatedSeats);

      setCalculating(true, 40);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const rays = traceAllSources(
        soundSources,
        updatedSeats,
        hallGeometries,
        (meshName) => {
          const assignment = hallModel.materials.find((m) => m.meshName === meshName);
          return getMaterialById(assignment?.materialId || null);
        },
        (sourceIdx, progress) => {
          const totalProgress = 40 + (sourceIdx / soundSources.length + progress / soundSources.length) * 50;
          setCalculating(true, Math.min(95, totalProgress));
        }
      );

      setSoundRays(rays);

      setCalculating(true, 100);
      await new Promise((resolve) => setTimeout(resolve, 200));
      setCalculating(false, 100);
    } catch (error) {
      console.error('声线追踪失败:', error);
      setCalculating(false, 0);
    }
  }, [setSeats, setSoundRays, setCalculating, getMaterialById]);

  const importHallModel = useCallback(async (file: File): Promise<{ data: HallModel | null; issues: unknown[] }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          const result = validateHallModel(json);
          if (result.data) {
            setHallModel(result.data);
            addImportRecord({
              batch: useDataStore.getState().importHistory.length + 1,
              timestamp: Date.now(),
              fileName: file.name,
            });
          }
          resolve(result);
        } catch (err) {
          resolve({ data: null, issues: [{ type: 'frequency_error', message: '文件格式错误' }] });
        }
      };
      reader.readAsText(file);
    });
  }, [setHallModel, addImportRecord]);

  const importSoundSources = useCallback(async (file: File): Promise<{ data: SoundSource[]; issues: unknown[] }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          const result = validateSoundSources(json);
          setSoundSources(result.data);
          addImportRecord({
            batch: useDataStore.getState().importHistory.length + 1,
            timestamp: Date.now(),
            fileName: file.name,
          });
          resolve(result);
        } catch (err) {
          resolve({ data: [], issues: [{ type: 'frequency_error', message: '文件格式错误' }] });
        }
      };
      reader.readAsText(file);
    });
  }, [setSoundSources, addImportRecord]);

  const importSeatsData = useCallback(async (file: File): Promise<{ data: Seat[]; issues: unknown[] }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          let seats: Seat[] = [];
          if (Array.isArray(json)) {
            const result = validateSeats(json);
            seats = result.data;
          } else if (json.seats && Array.isArray(json.seats) && json.seats.length > 0) {
            const result = validateSeats(json.seats);
            seats = result.data;
          } else if (json.rows && json.cols) {
            const hallModel = useDataStore.getState().hallModel;
            const params = (hallSampleData as { params: { width: number; depth: number; height: number; stageDepth: number; curvature: number } }).params;
            const positions = generateSeatPositions({
              rows: json.rows,
              cols: json.cols,
              width: params.width,
              depth: params.depth,
              stageDepth: params.stageDepth,
              curvature: params.curvature,
              startRow: 1,
            });
            seats = positions.map((pos, idx) =>
              createSeatFromPosition(pos, Math.floor(idx / json.cols), idx % json.cols)
            );
          }
          setSeats(seats);
          addImportRecord({
            batch: useDataStore.getState().importHistory.length + 1,
            timestamp: Date.now(),
            fileName: file.name,
          });
          resolve({ data: seats, issues: [] });
        } catch (err) {
          resolve({ data: [], issues: [{ type: 'frequency_error', message: '文件格式错误' }] });
        }
      };
      reader.readAsText(file);
    });
  }, [setSeats, addImportRecord]);

  const getHallGeometries = useCallback((): Record<string, THREE.BufferGeometry> => {
    if (geometryCache.current) {
      return geometryCache.current;
    }
    const params = (hallSampleData as { params: { width: number; depth: number; height: number; stageDepth: number; curvature: number } }).params;
    geometryCache.current = generateFanHallGeometry(params);
    return geometryCache.current;
  }, []);

  return {
    loadSampleData,
    runRayTracing,
    importHallModel,
    importSoundSources,
    importSeatsData,
    getHallGeometries,
  };
};

import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { parseLog, ParseResult } from '@/utils/parser';
import { detectAllAnomalies } from '@/utils/anomaly';
import { AnalysisHistory } from '@/types';
import { sampleCSVData } from '@/data/sampleLogs';

export function useSensorData() {
  const {
    rawLogs,
    standardizedData,
    anomalies,
    parameterVersion,
    isLoading,
    setRawLogs,
    setStandardizedData,
    setAnomalies,
    addHistory,
    setIsLoading,
  } = useAppStore();

  const processData = useCallback(
    (content: string, sourceName: string) => {
      setIsLoading(true);

      return new Promise<ParseResult>((resolve) => {
        setTimeout(() => {
          const result = parseLog(content);

          const { standardizedData: stdData, anomalies: detectedAnomalies } = detectAllAnomalies(
            result.logs,
            parameterVersion
          );

          setRawLogs(result.logs);
          setStandardizedData(stdData);
          setAnomalies(detectedAnomalies);

          const historyRecord: AnalysisHistory = {
            id: `hist_${Date.now()}`,
            timestamp: new Date(),
            sourceFile: sourceName,
            recordCount: result.logs.length,
            anomalyCount: detectedAnomalies.length,
            parameterVersionId: parameterVersion.id,
            status: result.errors.length > 0 ? 'pending' : 'completed',
            rawLogs: result.logs,
            standardizedData: stdData,
            anomalies: detectedAnomalies,
          };

          addHistory(historyRecord);
          setIsLoading(false);

          resolve(result);
        }, 800);
      });
    },
    [parameterVersion, setRawLogs, setStandardizedData, setAnomalies, addHistory, setIsLoading]
  );

  const loadSampleData = useCallback(async () => {
    return processData(sampleCSVData, '样例数据');
  }, [processData]);

  const importFile = useCallback(
    async (file: File) => {
      return new Promise<ParseResult>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const content = e.target?.result as string;
            const result = await processData(content, file.name);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file);
      });
    },
    [processData]
  );

  const getDataByType = useCallback(
    (sensorType: string) => {
      return standardizedData.filter((d) => d.sensorType === sensorType);
    },
    [standardizedData]
  );

  const getAnomaliesByType = useCallback(
    (type: string) => {
      return anomalies.filter((a) => a.type === type);
    },
    [anomalies]
  );

  const getAnomaliesBySeverity = useCallback(
    (severity: string) => {
      return anomalies.filter((a) => a.severity === severity);
    },
    [anomalies]
  );

  const getSelectedAnomaly = useCallback(() => {
    const { selectedAnomalyId, anomalies } = useAppStore.getState();
    return anomalies.find((a) => a.id === selectedAnomalyId) || null;
  }, []);

  return {
    rawLogs,
    standardizedData,
    anomalies,
    isLoading,
    processData,
    loadSampleData,
    importFile,
    getDataByType,
    getAnomaliesByType,
    getAnomaliesBySeverity,
    getSelectedAnomaly,
  };
}

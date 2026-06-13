import { useState, useCallback, useEffect } from 'react';
import { FieldMapping, ParsedFileData } from '@/types/experiment';
import { findBestFieldMatch, TARGET_FIELDS } from '@/constants/fieldMapping';
import { generateId } from '@/utils/storage';

export const useFieldMapping = (parsedData?: ParsedFileData | null) => {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);

  useEffect(() => {
    if (parsedData) {
      generateMappings(parsedData);
    }
  }, [parsedData]);
  
  const generateMappings = useCallback((parsedData: ParsedFileData) => {
    const newMappings: FieldMapping[] = parsedData.headers.map(header => {
      const { targetField, confidence } = findBestFieldMatch(header);
      return {
        id: generateId(),
        sourceFieldName: header,
        targetFieldName: targetField,
        fieldSource: confidence > 0.8 ? 'auto-detected' : 'auto-detected',
        processStatus: targetField ? 'processed' : 'pending',
        matchConfidence: confidence,
      };
    });
    setMappings(newMappings);
    return newMappings;
  }, []);
  
  const updateMapping = useCallback((mappingId: string, targetField: string) => {
    setMappings(prev => prev.map(m => {
      if (m.id === mappingId) {
        return {
          ...m,
          targetFieldName: targetField,
          fieldSource: 'manual-mapped' as const,
          processStatus: targetField ? 'processed' : 'pending',
        };
      }
      return m;
    }));
  }, []);
  
  const lockMapping = useCallback((mappingId: string) => {
    setMappings(prev => prev.map(m => {
      if (m.id === mappingId) {
        return { ...m, processStatus: 'locked' as const };
      }
      return m;
    }));
  }, []);

  const autoMatchAll = useCallback(() => {
    setMappings(prev => prev.map(m => {
      const { targetField, confidence } = findBestFieldMatch(m.sourceFieldName);
      return {
        ...m,
        targetFieldName: targetField,
        fieldSource: 'auto-detected' as const,
        processStatus: targetField ? 'processed' : 'pending',
        matchConfidence: confidence,
      };
    }));
  }, []);
  
  const getUnmappedFields = useCallback(() => {
    return mappings.filter(m => !m.targetFieldName || m.processStatus === 'pending');
  }, [mappings]);

  const getMappingsByStatus = useCallback(() => {
    const processed = mappings.filter(m => m.processStatus === 'processed' || m.processStatus === 'locked').length;
    const pending = mappings.filter(m => m.processStatus === 'pending').length;
    return { processed, pending };
  }, [mappings]);
  
  const getAvailableTargetFields = useCallback(() => {
    const usedTargets = new Set(mappings.filter(m => m.targetFieldName).map(m => m.targetFieldName));
    return TARGET_FIELDS.filter(f => !usedTargets.has(f.key));
  }, [mappings]);
  
  const getMappingConfidenceSummary = useCallback(() => {
    const total = mappings.length;
    const auto = mappings.filter(m => m.fieldSource === 'auto-detected').length;
    const manual = mappings.filter(m => m.fieldSource === 'manual-mapped').length;
    const pending = mappings.filter(m => m.processStatus === 'pending').length;
    const highConfidence = mappings.filter(m => m.matchConfidence >= 0.8).length;
    
    return {
      total,
      auto,
      manual,
      pending,
      highConfidence,
      autoRate: total > 0 ? (auto / total * 100).toFixed(1) : '0',
    };
  }, [mappings]);
  
  return {
    mappings,
    setMappings,
    generateMappings,
    updateMapping,
    lockMapping,
    autoMatchAll,
    getUnmappedFields,
    getMappingsByStatus,
    getAvailableTargetFields,
    getMappingConfidenceSummary,
  };
};

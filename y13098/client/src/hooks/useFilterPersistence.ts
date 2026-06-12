import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FilterCriteria } from '@shared/types';
import { 
  filterCriteriaToSearchParams, 
  searchParamsToFilterCriteria 
} from '@shared/utils';
import { STORAGE_KEYS } from '@shared/constants';

export function useFilterPersistence(initialFilter: FilterCriteria = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<FilterCriteria>(() => {
    const urlFilter = searchParamsToFilterCriteria(searchParams);
    if (Object.keys(urlFilter).length > 0) {
      return urlFilter;
    }
    
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FILTER_CRITERIA);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse stored filter:', e);
    }
    
    return initialFilter;
  });

  useEffect(() => {
    const urlFilter = searchParamsToFilterCriteria(searchParams);
    if (Object.keys(urlFilter).length > 0) {
      setFilter(urlFilter);
    }
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FILTER_CRITERIA, JSON.stringify(filter));
  }, [filter]);

  const updateFilter = useCallback((newFilter: Partial<FilterCriteria>) => {
    setFilter(prev => {
      const updated = { ...prev, ...newFilter };
      
      const params = filterCriteriaToSearchParams(updated);
      setSearchParams(params, { replace: false });
      
      return updated;
    });
  }, [setSearchParams]);

  const resetFilter = useCallback(() => {
    setFilter({});
    setSearchParams({}, { replace: false });
    localStorage.removeItem(STORAGE_KEYS.FILTER_CRITERIA);
  }, [setSearchParams]);

  const setFilterDirect = useCallback((newFilter: FilterCriteria) => {
    setFilter(newFilter);
    const params = filterCriteriaToSearchParams(newFilter);
    setSearchParams(params, { replace: false });
  }, [setSearchParams]);

  return {
    filter,
    updateFilter,
    resetFilter,
    setFilter: setFilterDirect
  };
}

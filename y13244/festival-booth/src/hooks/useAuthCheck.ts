import { useState, useEffect, useCallback } from 'react';
import type { AuthCheckResult } from '../services/authService';
import { checkAuthorization } from '../services/authService';
import { festivalStore } from '../services/storage';

export function useAuthCheck(): AuthCheckResult & { refresh: () => void } {
  const festival = festivalStore.get();
  const [result, setResult] = useState<AuthCheckResult>(() => checkAuthorization(festival.id));

  const refresh = useCallback(() => {
    setResult(checkAuthorization(festival.id));
  }, [festival.id]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 60000);
    return () => clearInterval(timer);
  }, [refresh]);

  return { ...result, refresh };
}

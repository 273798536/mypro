import { useCallback } from 'react';
import { useGame } from '../store/gameContext';
import { calculateMarginToAdd } from '../utils/marginCalculator';


export const useGameEngine = () => {
  const { state, dispatch } = useGame();

  const startGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
  }, [dispatch]);

  const pauseGame = useCallback(() => {
    dispatch({ type: 'PAUSE_GAME' });
  }, [dispatch]);

  const resumeGame = useCallback(() => {
    dispatch({ type: 'RESUME_GAME' });
  }, [dispatch]);

  const restartGame = useCallback(() => {
    dispatch({ type: 'RESTART_GAME' });
  }, [dispatch]);

  const settleGame = useCallback(() => {
    dispatch({ type: 'SETTLE_GAME' });
  }, [dispatch]);

  const nextRound = useCallback(() => {
    dispatch({ type: 'NEXT_ROUND' });
  }, [dispatch]);

  const selectAccount = useCallback((accountId: string | null) => {
    dispatch({ type: 'SELECT_ACCOUNT', payload: accountId });
  }, [dispatch]);

  const addMargin = useCallback((accountId: string, amount: number) => {
    dispatch({ type: 'ADD_MARGIN', payload: { accountId, amount } });
  }, [dispatch]);

  const addMarginToSafe = useCallback((accountId: string) => {
    const account = state.accounts.find(a => a.id === accountId);
    if (!account) return;
    
    const targetRisk = Math.min(account.riskLevel * 0.7, 80);
    const amount = calculateMarginToAdd(account, targetRisk);
    const finalAmount = Math.min(amount, account.availableCapital);
    
    if (finalAmount > 0) {
      dispatch({ type: 'ADD_MARGIN', payload: { accountId, amount: Math.round(finalAmount) } });
    }
  }, [state.accounts, dispatch]);

  const partialClose = useCallback((accountId: string, volume: number) => {
    dispatch({ type: 'PARTIAL_CLOSE', payload: { accountId, volume } });
  }, [dispatch]);

  const partialCloseHalf = useCallback((accountId: string) => {
    const account = state.accounts.find(a => a.id === accountId);
    if (!account || account.positions.length === 0) return;
    
    const volume = Math.ceil(account.positions[0].volume / 2);
    dispatch({ type: 'PARTIAL_CLOSE', payload: { accountId, volume } });
  }, [state.accounts, dispatch]);

  const fullClose = useCallback((accountId: string) => {
    dispatch({ type: 'FULL_CLOSE', payload: { accountId } });
  }, [dispatch]);

  const skipOperation = useCallback(() => {
    dispatch({ type: 'SKIP_OPERATION' });
    dispatch({ type: 'NEXT_ROUND' });
  }, [dispatch]);

  const getSelectedAccount = useCallback(() => {
    return state.accounts.find(a => a.id === state.selectedAccountId) || null;
  }, [state.accounts, state.selectedAccountId]);

  const getAccountById = useCallback((accountId: string) => {
    return state.accounts.find(a => a.id === accountId) || null;
  }, [state.accounts]);

  const hasDangerAccounts = useCallback(() => {
    return state.forceCloseQueue.length > 0;
  }, [state.forceCloseQueue]);

  const isGameOver = useCallback(() => {
    return state.status === 'settled' || 
           state.currentRound >= state.totalRounds ||
           state.accounts.every(a => a.status === 'liquidated');
  }, [state.status, state.currentRound, state.totalRounds, state.accounts]);

  return {
    state,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    settleGame,
    nextRound,
    selectAccount,
    addMargin,
    addMarginToSafe,
    partialClose,
    partialCloseHalf,
    fullClose,
    skipOperation,
    getSelectedAccount,
    getAccountById,
    hasDangerAccounts,
    isGameOver,
  };
};

import React, { createContext, useContext, useReducer, useCallback } from 'react'
import type {
  AppState, Command, StratumProfile, OperationRecord
} from '../types'
import { generateId } from '../types'
import { autoDetectAnomalies } from '../engine/stratumEngine'

const initialSettings = {
  theme: 'light' as const,
  unit: 'meter' as const,
  operatorName: '操作员'
}

const initialState: AppState = {
  currentProfile: null,
  operationHistory: [],
  undoStack: [],
  redoStack: [],
  settings: initialSettings,
  selectedLayerId: null,
  selectedBoundaryId: null,
  selectedAnomalyId: null
}

type Action =
  | { type: 'LOAD_PROFILE'; payload: StratumProfile }
  | { type: 'RESET_PROFILE' }
  | { type: 'SET_SELECTED_LAYER'; payload: string | null }
  | { type: 'SET_SELECTED_BOUNDARY'; payload: string | null }
  | { type: 'SET_SELECTED_ANOMALY'; payload: string | null }
  | { type: 'ADD_LAYER'; payload: any }
  | { type: 'UPDATE_LAYER'; payload: any }
  | { type: 'DELETE_LAYER'; payload: string }
  | { type: 'ADD_BOUNDARY'; payload: any }
  | { type: 'UPDATE_BOUNDARY'; payload: any }
  | { type: 'DELETE_BOUNDARY'; payload: string }
  | { type: 'RESOLVE_ANOMALY'; payload: { anomalyId: string; notes?: string } }
  | { type: 'IGNORE_ANOMALY'; payload: { anomalyId: string; notes?: string } }
  | { type: 'UPDATE_ANOMALY_EXPLANATION'; payload: { anomalyId: string; explanation: string; suggestion: string } }
  | { type: 'REFRESH_ANOMALIES' }
  | { type: 'PUSH_COMMAND'; payload: { command: Command; record: OperationRecord } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'EXECUTE_COMMAND'; payload: OperationRecord }

function runAutoDetect(state: AppState): AppState {
  if (!state.currentProfile) return state
  const detected = autoDetectAnomalies(
    state.currentProfile.layers,
    state.currentProfile.boundaries,
    state.operationHistory
  )
  const existingPendingIds = new Set(
    state.currentProfile.anomalies.filter(a => a.status === 'pending').map(a => a.description)
  )
  const newAnomalies = detected.filter(a => !existingPendingIds.has(a.description))
  const existingAnomalies = state.currentProfile.anomalies.filter(a => a.status !== 'pending')
  return {
    ...state,
    currentProfile: {
      ...state.currentProfile,
      anomalies: [...existingAnomalies, ...state.currentProfile.anomalies.filter(a => a.status === 'pending'), ...newAnomalies],
      updatedAt: new Date()
    }
  }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_PROFILE':
      return {
        ...state,
        currentProfile: action.payload,
        operationHistory: [],
        undoStack: [],
        redoStack: [],
        selectedLayerId: null,
        selectedBoundaryId: null,
        selectedAnomalyId: null
      }

    case 'RESET_PROFILE':
      if (!state.currentProfile) return state
      return {
        ...state,
        currentProfile: {
          ...state.currentProfile,
          layers: [],
          boundaries: [],
          anomalies: [],
          updatedAt: new Date()
        },
        operationHistory: [],
        undoStack: [],
        redoStack: [],
        selectedLayerId: null,
        selectedBoundaryId: null,
        selectedAnomalyId: null
      }

    case 'SET_SELECTED_LAYER':
      return { ...state, selectedLayerId: action.payload }

    case 'SET_SELECTED_BOUNDARY':
      return { ...state, selectedBoundaryId: action.payload }

    case 'SET_SELECTED_ANOMALY':
      return { ...state, selectedAnomalyId: action.payload }

    case 'ADD_LAYER': {
      if (!state.currentProfile) return state
      const newLayers = [...state.currentProfile.layers, action.payload]
      const newState = {
        ...state,
        currentProfile: {
          ...state.currentProfile,
          layers: newLayers,
          updatedAt: new Date()
        }
      }
      return runAutoDetect(newState)
    }

    case 'UPDATE_LAYER': {
      if (!state.currentProfile) return state
      const newLayers = state.currentProfile.layers.map(l =>
        l.id === action.payload.id ? action.payload : l
      )
      const newState = {
        ...state,
        currentProfile: {
          ...state.currentProfile,
          layers: newLayers,
          updatedAt: new Date()
        }
      }
      return runAutoDetect(newState)
    }

    case 'DELETE_LAYER': {
      if (!state.currentProfile) return state
      const newLayers = state.currentProfile.layers.filter(l => l.id !== action.payload)
      const newBoundaries = state.currentProfile.boundaries.filter(
        b => b.relatedLayerId !== action.payload
      )
      const newState = {
        ...state,
        currentProfile: {
          ...state.currentProfile,
          layers: newLayers,
          boundaries: newBoundaries,
          updatedAt: new Date()
        },
        selectedLayerId: state.selectedLayerId === action.payload ? null : state.selectedLayerId
      }
      return runAutoDetect(newState)
    }

    case 'ADD_BOUNDARY': {
      if (!state.currentProfile) return state
      const newBoundaries = [...state.currentProfile.boundaries, action.payload]
      const newState = {
        ...state,
        currentProfile: {
          ...state.currentProfile,
          boundaries: newBoundaries,
          updatedAt: new Date()
        }
      }
      return runAutoDetect(newState)
    }

    case 'UPDATE_BOUNDARY': {
      if (!state.currentProfile) return state
      const newBoundaries = state.currentProfile.boundaries.map(b =>
        b.id === action.payload.id ? action.payload : b
      )
      const newState = {
        ...state,
        currentProfile: {
          ...state.currentProfile,
          boundaries: newBoundaries,
          updatedAt: new Date()
        }
      }
      return runAutoDetect(newState)
    }

    case 'DELETE_BOUNDARY': {
      if (!state.currentProfile) return state
      const newBoundaries = state.currentProfile.boundaries.filter(b => b.id !== action.payload)
      const newState = {
        ...state,
        currentProfile: {
          ...state.currentProfile,
          boundaries: newBoundaries,
          updatedAt: new Date()
        },
        selectedBoundaryId: state.selectedBoundaryId === action.payload ? null : state.selectedBoundaryId
      }
      return runAutoDetect(newState)
    }

    case 'RESOLVE_ANOMALY': {
      if (!state.currentProfile) return state
      const newAnomalies = state.currentProfile.anomalies.map(a =>
        a.id === action.payload.anomalyId
          ? {
              ...a,
              status: 'resolved' as const,
              resolvedAt: new Date(),
              traceChain: a.traceChain
                ? {
                    ...a.traceChain,
                    finalResolution: {
                      status: 'resolved' as const,
                      conclusion: action.payload.notes || '已修正'
                    },
                    processingHistory: [
                      ...a.traceChain.processingHistory,
                      {
                        step: a.traceChain.processingHistory.length + 1,
                        action: '标记已处理',
                        operator: state.settings.operatorName,
                        timestamp: new Date(),
                        notes: action.payload.notes
                      }
                    ]
                  }
                : a.traceChain
            }
          : a
      )
      return {
        ...state,
        currentProfile: {
          ...state.currentProfile,
          anomalies: newAnomalies,
          updatedAt: new Date()
        }
      }
    }

    case 'IGNORE_ANOMALY': {
      if (!state.currentProfile) return state
      const newAnomalies = state.currentProfile.anomalies.map(a =>
        a.id === action.payload.anomalyId
          ? {
              ...a,
              status: 'ignored' as const,
              resolvedAt: new Date(),
              traceChain: a.traceChain
                ? {
                    ...a.traceChain,
                    finalResolution: {
                      status: 'ignored' as const,
                      conclusion: action.payload.notes || '经核实无影响，忽略'
                    },
                    processingHistory: [
                      ...a.traceChain.processingHistory,
                      {
                        step: a.traceChain.processingHistory.length + 1,
                        action: '标记忽略',
                        operator: state.settings.operatorName,
                        timestamp: new Date(),
                        notes: action.payload.notes
                      }
                    ]
                  }
                : a.traceChain
            }
          : a
      )
      return {
        ...state,
        currentProfile: {
          ...state.currentProfile,
          anomalies: newAnomalies,
          updatedAt: new Date()
        }
      }
    }

    case 'UPDATE_ANOMALY_EXPLANATION': {
      if (!state.currentProfile) return state
      const newAnomalies = state.currentProfile.anomalies.map(a =>
        a.id === action.payload.anomalyId
          ? {
              ...a,
              explanation: action.payload.explanation,
              suggestion: action.payload.suggestion
            }
          : a
      )
      return {
        ...state,
        currentProfile: {
          ...state.currentProfile,
          anomalies: newAnomalies,
          updatedAt: new Date()
        }
      }
    }

    case 'REFRESH_ANOMALIES':
      return runAutoDetect(state)

    case 'PUSH_COMMAND':
      return {
        ...state,
        undoStack: [...state.undoStack, action.payload.command],
        redoStack: [],
        operationHistory: [...state.operationHistory, action.payload.record]
      }

    case 'UNDO': {
      if (state.undoStack.length === 0) return state
      const cmd = state.undoStack[state.undoStack.length - 1]
      cmd.undo()
      return {
        ...state,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, cmd]
      }
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state
      const cmd = state.redoStack[state.redoStack.length - 1]
      cmd.execute()
      return {
        ...state,
        undoStack: [...state.undoStack, cmd],
        redoStack: state.redoStack.slice(0, -1)
      }
    }

    case 'EXECUTE_COMMAND':
      return {
        ...state,
        operationHistory: [...state.operationHistory, action.payload]
      }

    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<Action>
  loadProfile: (profile: StratumProfile) => void
  resetProfile: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  undo: () => void
  redo: () => void
  executeWithUndoable: <T>(
    execute: () => T,
    undoFn: () => void,
    operationType: OperationRecord['type'],
    description: string
  ) => T | undefined
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const loadProfile = useCallback((profile: StratumProfile) => {
    dispatch({ type: 'LOAD_PROFILE', payload: profile })
  }, [])

  const resetProfile = useCallback(() => {
    dispatch({ type: 'RESET_PROFILE' })
  }, [])

  const canUndo = useCallback(() => state.undoStack.length > 0, [state.undoStack])
  const canRedo = useCallback(() => state.redoStack.length > 0, [state.redoStack])
  const undo = useCallback(() => { dispatch({ type: 'UNDO' }) }, [])
  const redo = useCallback(() => { dispatch({ type: 'REDO' }) }, [])

  const executeWithUndoable = useCallback(
    <T,>(
      execute: () => T,
      undoFn: () => void,
      operationType: OperationRecord['type'],
      description: string
    ): T | undefined => {
      const result = execute()
      const record: OperationRecord = {
        id: generateId('op'),
        type: operationType,
        timestamp: new Date(),
        data: result,
        reversible: true,
        description
      }
      const command = {
        id: record.id,
        execute: () => execute(),
        undo: undoFn,
        getDescription: () => description,
        getTimestamp: () => record.timestamp,
        getOperationRecord: () => record
      }
      dispatch({ type: 'PUSH_COMMAND', payload: { command, record } })
      return result
    },
    []
  )

  return (
    <AppContext.Provider
      value={{ state, dispatch, loadProfile, resetProfile, canUndo, canRedo, undo, redo, executeWithUndoable }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

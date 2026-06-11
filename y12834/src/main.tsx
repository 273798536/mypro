import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { useFeedingStore } from './store/useFeedingStore';
import { useSampleStore } from './store/useSampleStore';
import { useWorkflowStore } from './store/useWorkflowStore';
import { useReviewStore } from './store/useReviewStore';

/**
 * 初始化所有 Zustand store
 * 从 localStorage 加载数据或初始化 mock 数据
 */
useFeedingStore.getState().init();
useSampleStore.getState().init();
useWorkflowStore.getState().init();
useReviewStore.getState().init();

/**
 * 应用入口
 * 挂载 React 根组件
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

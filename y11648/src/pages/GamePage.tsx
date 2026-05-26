import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import PortMap from '../components/game/PortMap';
import TimeAxis from '../components/ui/TimeAxis';
import ResourcePanel from '../components/ui/ResourcePanel';
import ControlBar from '../components/ui/ControlBar';
import AlertToast from '../components/ui/AlertToast';
import { motion } from 'framer-motion';

const GamePage = () => {
  const navigate = useNavigate();
  const { status, tick, id } = useGameStore();
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }
  }, [id, navigate]);

  useEffect(() => {
    if (status !== 'playing') {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      tick(deltaTime);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [status, tick]);

  useEffect(() => {
    if (status === 'finished') {
      setTimeout(() => {
        navigate('/result');
      }, 1000);
    }
  }, [status, navigate]);

  if (!id) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4"
    >
      <AlertToast />

      <div className="max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <motion.h1
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="text-2xl font-bold text-white"
          >
            <span className="text-cyan-400">🌊</span> 港口拖轮潮汐局
          </motion.h1>
        </header>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <ControlBar />
        </motion.div>

        <div className="flex-1 flex gap-4 min-h-0">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex-1 min-w-0"
          >
            <PortMap />
          </motion.div>

          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-72 flex-shrink-0"
          >
            <ResourcePanel />
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <TimeAxis />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default GamePage;

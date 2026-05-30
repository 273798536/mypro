import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { generateConnectionPath } from '@/utils/svg';
import type { Connection } from '@/types/game';

interface ConnectionLineProps {
  connection: Connection;
  fromElement: HTMLElement | null;
  toElement: HTMLElement | null;
}

export default function ConnectionLine({ connection, fromElement, toElement }: ConnectionLineProps) {
  const [isHovered, setIsHovered] = useState(false);

  const pathData = useMemo(() => {
    if (!fromElement || !toElement) return null;
    return generateConnectionPath(fromElement, toElement, 0.3);
  }, [fromElement, toElement]);

  const strokeColor = useMemo(() => {
    if (connection.color) return connection.color;
    return connection.isCorrect ? '#10b981' : '#ef4444';
  }, [connection]);

  const pathLength = useMemo(() => {
    if (!pathData) return 1000;
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.setAttribute('d', pathData);
    return tempPath.getTotalLength() || 1000;
  }, [pathData]);

  if (!pathData || !fromElement || !toElement) return null;

  const fromRect = fromElement.getBoundingClientRect();
  const toRect = toElement.getBoundingClientRect();

  const minX = Math.min(fromRect.left, toRect.left) - 50;
  const minY = Math.min(fromRect.top, toRect.top) - 50;
  const maxX = Math.max(fromRect.right, toRect.right) + 50;
  const maxY = Math.max(fromRect.bottom, toRect.bottom) + 50;
  const width = maxX - minX;
  const height = maxY - minY;

  const adjustedPath = pathData.replace(/([0-9.]+) ([0-9.]+)/g, (match, x, y) => {
    return `${parseFloat(x) - minX} ${parseFloat(y) - minY}`;
  });

  const midX = (fromRect.left + fromRect.width / 2 + toRect.left + toRect.width / 2) / 2 - minX;
  const midY = (fromRect.top + fromRect.height / 2 + toRect.top + toRect.height / 2) / 2 - minY;

  return (
    <>
      <svg
        className="absolute top-0 left-0 pointer-events-none z-10"
        style={{
          left: minX,
          top: minY,
          width,
          height,
        }}
      >
        <defs>
          <filter id={`glow-${connection.id}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <motion.path
          d={adjustedPath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={isHovered ? 4 : 2}
          strokeLinecap="round"
          strokeDasharray={pathLength}
          initial={{ strokeDashoffset: pathLength }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          filter={isHovered ? `url(#glow-${connection.id})` : undefined}
          style={{
            pointerEvents: 'stroke',
            cursor: 'pointer',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            'transition-all duration-200',
            connection.isCorrect ? 'opacity-80' : 'opacity-60'
          )}
        />

        <motion.circle
          cx={midX}
          cy={midY}
          r={isHovered ? 8 : 5}
          fill={strokeColor}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="drop-shadow-md"
        />
      </svg>

      {isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'absolute z-50 px-3 py-2 rounded-lg shadow-lg text-xs font-medium max-w-xs',
            connection.isCorrect
              ? 'bg-accent-emerald text-white'
              : 'bg-accent-rose text-white'
          )}
          style={{
            left: minX + midX,
            top: minY + midY - 40,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-semibold mb-1">
            {connection.isCorrect ? '✓ 正确连接' : '✗ 错误连接'}
          </div>
          <div className="opacity-90">
            从 {connection.fromType} 到 {connection.toType}
          </div>
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45"
            style={{ backgroundColor: connection.isCorrect ? '#10b981' : '#ef4444' }}
          />
        </motion.div>
      )}
    </>
  );
}

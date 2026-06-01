import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface DataCardProps {
  title: string;
  value: string | number;
  trend?: number;
  subtitle?: string;
  color?: string;
  children?: React.ReactNode;
}

const generateSparklineData = (trend: number, points: number = 7) => {
  const data = [];
  let value = 50;
  const step = trend / points;

  for (let i = 0; i < points; i++) {
    value += step + (Math.random() - 0.5) * 5;
    value = Math.max(10, Math.min(90, value));
    data.push({ value });
  }

  return data;
};

export const DataCard: React.FC<DataCardProps> = ({
  title,
  value,
  trend,
  subtitle,
  color = '#3B82F6',
  children,
}) => {
  const sparklineData = trend !== undefined ? generateSparklineData(trend) : null;
  const isPositive = trend !== undefined && trend >= 0;

  const gradientStyle = {
    background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
    borderColor: `${color}30`,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border p-6',
        'transition-shadow duration-300',
        'hover:shadow-xl'
      )}
      style={{
        ...gradientStyle,
        boxShadow: `0 4px 20px ${color}10`,
      }}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{value}</span>
              {trend !== undefined && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-sm font-medium',
                    isPositive ? 'text-emerald-600' : 'text-red-600'
                  )}
                >
                  {isPositive ? (
                    <TrendingUp size={16} />
                  ) : (
                    <TrendingDown size={16} />
                  )}
                  <span>{Math.abs(trend).toFixed(1)}%</span>
                </div>
              )}
            </div>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          {children}
        </div>

        {sparklineData && (
          <div className="mt-4 h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={isPositive ? '#10B981' : '#EF4444'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div
        className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-2xl"
        style={{ backgroundColor: color }}
      />
    </motion.div>
  );
};

export default DataCard;

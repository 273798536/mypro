interface ResultCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: 'cyan' | 'pink' | 'green' | 'orange' | 'red';
}

const colorClasses: Record<string, { border: string; text: string; bg: string }> = {
  cyan: {
    border: 'neon-border-cyan',
    text: 'text-neon-cyan',
    bg: 'bg-space-cyan/10',
  },
  pink: {
    border: 'neon-border-pink',
    text: 'text-neon-pink',
    bg: 'bg-space-pink/10',
  },
  green: {
    border: 'neon-border-green',
    text: 'text-neon-green',
    bg: 'bg-space-green/10',
  },
  orange: {
    border: 'border-space-orange',
    text: 'text-space-orange',
    bg: 'bg-space-orange/10',
  },
  red: {
    border: 'border-space-red',
    text: 'text-space-red',
    bg: 'bg-space-red/10',
  },
};

export const ResultCard = ({ label, value, icon, color }: ResultCardProps) => {
  const classes = colorClasses[color];

  return (
    <div className={`glass rounded-lg p-4 ${classes.border} ${classes.bg}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${classes.text} font-orbitron`}>
        {value}
      </div>
    </div>
  );
};

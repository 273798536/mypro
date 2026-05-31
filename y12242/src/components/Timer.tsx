import { Clock } from "lucide-react";

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
}

export default function Timer({ timeRemaining, totalTime }: TimerProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const isUrgent = timeRemaining <= 30;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? timeRemaining / totalTime : 0;
  const dashOffset = circumference * (1 - progress);
  const ringColor = isUrgent ? "#ef4444" : "#d4a843";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg className="absolute" width="140" height="140" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#2a2f3e"
          strokeWidth="6"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 70 70)"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="flex flex-col items-center justify-center z-10">
        <Clock
          size={18}
          className={isUrgent ? "text-red-500 mb-1" : "mb-1"}
          style={{ color: isUrgent ? undefined : "#d4a843" }}
        />
        <span
          className={`text-2xl font-mono font-bold tracking-wider ${
            isUrgent ? "text-red-500 animate-pulse" : ""
          }`}
          style={isUrgent ? undefined : { color: "#d4a843" }}
        >
          {display}
        </span>
      </div>
    </div>
  );
}

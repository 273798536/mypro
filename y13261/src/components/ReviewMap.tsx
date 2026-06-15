import { Camera, MapPin, AlertTriangle } from 'lucide-react';
import type { Review, Photo } from '@/types';

interface ReviewMapProps {
  review: Review;
  photos: Photo[];
  onPointClick?: (pointId: string) => void;
}

export default function ReviewMap({ review, photos, onPointClick }: ReviewMapProps) {
  const mapWidth = 600;
  const mapHeight = 400;

  const toMapCoord = (x: number, y: number) => ({
    cx: (x / 100) * mapWidth,
    cy: (y / 100) * mapHeight,
  });

  const mainPoint = toMapCoord(review.point.x, review.point.y);

  return (
    <div className="relative bg-gradient-to-br from-primary-50/50 to-steel-50 rounded-lg border border-steel-100 overflow-hidden">
      <svg
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        className="w-full h-auto"
        style={{ minHeight: '300px' }}
      >
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke="#E5E6EB"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid)" />

        <line
          x1="0"
          y1={mapHeight * 0.4}
          x2={mapWidth}
          y2={mapHeight * 0.4}
          stroke="#C9CDD4"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <line
          x1={mapWidth * 0.45}
          y1="0"
          x2={mapWidth * 0.45}
          y2={mapHeight}
          stroke="#C9CDD4"
          strokeWidth="8"
          strokeLinecap="round"
        />

        <line
          x1="0"
          y1={mapHeight * 0.4}
          x2={mapWidth}
          y2={mapHeight * 0.4}
          stroke="#F2F3F5"
          strokeWidth="2"
          strokeDasharray="10,10"
        />
        <line
          x1={mapWidth * 0.45}
          y1="0"
          x2={mapWidth * 0.45}
          y2={mapHeight}
          stroke="#F2F3F5"
          strokeWidth="2"
          strokeDasharray="10,10"
        />

        {review.adjacentPoints.map((adj) => {
          const adjPoint = toMapCoord(adj.x, adj.y);
          const isMismatch = adj.status === 'mismatch';
          return (
            <g key={adj.id}>
              <line
                x1={mainPoint.cx}
                y1={mainPoint.cy}
                x2={adjPoint.cx}
                y2={adjPoint.cy}
                stroke={isMismatch ? '#FF7D00' : '#8ABEFF'}
                strokeWidth="2"
                strokeDasharray={isMismatch ? '6,4' : '4,4'}
              />
              <circle
                cx={adjPoint.cx}
                cy={adjPoint.cy}
                r={isMismatch ? 10 : 8}
                fill={isMismatch ? '#FF7D00' : '#5CA3FF'}
                className="cursor-pointer transition-all hover:r-10"
                onClick={() => onPointClick?.(adj.id)}
              />
              <circle
                cx={adjPoint.cx}
                cy={adjPoint.cy}
                r={isMismatch ? 14 : 12}
                fill="none"
                stroke={isMismatch ? '#FF7D00' : '#5CA3FF'}
                strokeWidth="2"
                opacity="0.3"
              />
              {isMismatch && (
                <circle
                  cx={adjPoint.cx}
                  cy={adjPoint.cy}
                  r={18}
                  fill="none"
                  stroke="#FF7D00"
                  strokeWidth="1"
                  opacity="0.2"
                />
              )}
              <text
                x={adjPoint.cx}
                y={adjPoint.cy + 28}
                textAnchor="middle"
                fontSize="11"
                fill="#4E5969"
              >
                {adj.name}
              </text>
            </g>
          );
        })}

        {photos.map((photo) => {
          const photoPoint = toMapCoord(photo.point.x, photo.point.y);
          return (
            <g key={photo.id} className="cursor-pointer">
              <circle
                cx={photoPoint.cx}
                cy={photoPoint.cy}
                r={12}
                fill="#00B42A"
                stroke="white"
                strokeWidth="2"
              />
              <image
                href="#"
                x={photoPoint.cx - 8}
                y={photoPoint.cy - 8}
                width="16"
                height="16"
              />
              <text
                x={photoPoint.cx}
                y={photoPoint.cy + 4}
                textAnchor="middle"
                fontSize="10"
                fill="white"
                fontWeight="bold"
              >
                📷
              </text>
            </g>
          );
        })}

        <g>
          <circle
            cx={mainPoint.cx}
            cy={mainPoint.cy}
            r={16}
            fill="#165DFF"
            stroke="white"
            strokeWidth="3"
          />
          <circle
            cx={mainPoint.cx}
            cy={mainPoint.cy}
            r={24}
            fill="none"
            stroke="#165DFF"
            strokeWidth="2"
            opacity="0.3"
          />
          <circle
            cx={mainPoint.cx}
            cy={mainPoint.cy}
            r={32}
            fill="none"
            stroke="#165DFF"
            strokeWidth="1"
            opacity="0.15"
          />
          <text
            x={mainPoint.cx}
            y={mainPoint.cy + 4}
            textAnchor="middle"
            fontSize="12"
            fill="white"
            fontWeight="bold"
          >
            主
          </text>
        </g>
      </svg>

      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-md px-3 py-2 text-xs text-steel-500 shadow-sm">
        <div className="font-medium text-steel-700 mb-1">{review.location}</div>
        <div className="text-steel-400">共 {review.adjacentPoints.length + 1} 处点位</div>
      </div>

      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-md px-3 py-2 shadow-sm">
        <div className="flex items-center gap-3 text-xs text-steel-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-primary-500" />
            <span>主复核点</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-primary-300" />
            <span>相邻路口</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-warning-500" />
            <span>异常</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-success-500" />
            <span>照片</span>
          </div>
        </div>
      </div>
    </div>
  );
}

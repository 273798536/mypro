import type { LabRecord } from "@/types";

interface TLCPlateProps {
  record: LabRecord;
  width?: number;
  height?: number;
}

export default function TLCPlate({ record, width = 320, height = 480 }: TLCPlateProps) {
  const paddingX = 48;
  const paddingY = 56;
  const originY = height - paddingY;
  const solventFrontY = paddingY + 8;
  const plateWidth = width - paddingX * 2;
  const plateHeight = originY - solventFrontY;
  const centerX = width / 2;

  const laneX = centerX;
  const laneWidth = Math.min(60, plateWidth * 0.5);

  return (
    <div className="inline-block">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="paper-texture rounded border border-lab-paper-dark shadow-paper"
      >
        <defs>
          <filter id="bandBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" />
          </filter>
          <pattern id="paperGrain" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="transparent" />
            <circle cx="1" cy="1" r="0.3" fill="rgba(120,100,60,0.08)" />
            <circle cx="3" cy="2.5" r="0.25" fill="rgba(120,100,60,0.06)" />
          </pattern>
        </defs>

        <rect width={width} height={height} fill="url(#paperGrain)" />

        <rect
          x={paddingX - 1}
          y={solventFrontY - 1}
          width={plateWidth + 2}
          height={plateHeight + 2}
          fill="none"
          stroke="#C7BFA6"
          strokeWidth="1"
        />

        <line
          x1={paddingX}
          y1={originY}
          x2={width - paddingX}
          y2={originY}
          stroke="#6B5B3D"
          strokeWidth="1.2"
          strokeDasharray="none"
        />
        <text
          x={paddingX - 8}
          y={originY + 4}
          textAnchor="end"
          fontSize="11"
          fill="#6B5B3D"
          fontFamily="Noto Serif SC, serif"
        >
          原点
        </text>

        <line
          x1={paddingX}
          y1={solventFrontY}
          x2={width - paddingX}
          y2={solventFrontY}
          stroke="#6B5B3D"
          strokeWidth="1.2"
          strokeDasharray="4 3"
        />
        <text
          x={paddingX - 8}
          y={solventFrontY + 4}
          textAnchor="end"
          fontSize="11"
          fill="#6B5B3D"
          fontFamily="Noto Serif SC, serif"
        >
          前沿
        </text>

        <text
          x={centerX}
          y={solventFrontY - 18}
          textAnchor="middle"
          fontSize="11"
          fill="#6B5B3D"
          fontFamily="Noto Sans SC, sans-serif"
        >
          展开距离：{record.developmentDistance}
        </text>

        <line
          x1={laneX}
          y1={originY + 2}
          x2={laneX}
          y2={originY + 8}
          stroke="#4B3F28"
          strokeWidth="1.5"
        />

        {record.components.map((c, idx) => {
          const bandY = originY - c.rf * plateHeight;
          const bandHeight = 6 + c.intensity * 1.5;
          const bandWidth = laneWidth * (0.5 + c.intensity * 0.1);
          const opacity = 0.35 + c.intensity * 0.13;
          const isIrregular = record.status === "bad";

          return (
            <g key={idx}>
              {isIrregular ? (
                <>
                  <ellipse
                    cx={laneX}
                    cy={bandY}
                    rx={bandWidth * 0.7}
                    ry={bandHeight * 1.2}
                    fill={c.color}
                    opacity={opacity * 0.7}
                    filter="url(#bandBlur)"
                  />
                  <ellipse
                    cx={laneX}
                    cy={bandY + bandHeight * 1.8}
                    rx={bandWidth * 0.35}
                    ry={bandHeight * 0.8}
                    fill={c.color}
                    opacity={opacity * 0.35}
                    filter="url(#bandBlur)"
                  />
                </>
              ) : (
                <rect
                  x={laneX - bandWidth / 2}
                  y={bandY - bandHeight / 2}
                  width={bandWidth}
                  height={bandHeight}
                  rx="2"
                  fill={c.color}
                  opacity={opacity}
                  filter="url(#bandBlur)"
                />
              )}
              <line
                x1={laneX + laneWidth / 2 + 16}
                y1={bandY}
                x2={laneX + laneWidth / 2 + 36}
                y2={bandY}
                stroke={c.color}
                strokeWidth="0.8"
                opacity="0.6"
              />
              <text
                x={laneX + laneWidth / 2 + 40}
                y={bandY + 3}
                fontSize="10.5"
                fill={c.color}
                fontFamily="Noto Sans SC, sans-serif"
                fontWeight="500"
              >
                {c.name} Rf={c.rf.toFixed(2)}
              </text>
            </g>
          );
        })}

        <text
          x={centerX}
          y={height - 18}
          textAnchor="middle"
          fontSize="12"
          fill="#4B3F28"
          fontFamily="Noto Serif SC, serif"
          fontWeight="600"
        >
          {record.batchNo} · {record.plateType}
        </text>
      </svg>
    </div>
  );
}

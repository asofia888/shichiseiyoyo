import React from 'react';
import { CelestialPosition, ChartAngles } from '../../domain/astronomy/types';
import { MVP_HOUSES, SIDEREAL_MANSIONS } from '../../domain/qizhengsiyu/constants';
import { cn } from '../../lib/utils';

interface Props {
  positions: CelestialPosition[];
  angles: ChartAngles;
}

export function CelestialChart({ positions, angles }: Props) {
  const size = 500;
  const center = size / 2;
  const rOuter = 240;
  const rMansionsInner = 220;
  const rHousesInner = 160;
  const rZodiacInner = 100;

  // Helper to get coordinates on a circle
  const getCoords = (radius: number, degree: number) => {
    // 0 degrees is typically at 3 o'clock, but in traditional QZSY, 
    // the layout can vary. Let's use standard polar coords for MVP.
    const rad = (degree - 90) * (Math.PI / 180);
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = getCoords(radius, startAngle);
    const end = getCoords(radius, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y, 
      "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y
    ].join(" ");
  };

  // We rotate the whole SVG so that Ascendant is on the left (or whatever layout is standard).
  // Often Ascendant is on the left (9 o'clock), so if Ascendant is 'asc', 
  // we rotate the chart by -asc - 90.
  const chartRotation = -angles.ascendant - 90;

  return (
    <div className="relative w-full aspect-square max-w-[500px]">
      <svg 
        viewBox={`0 0 ${size} ${size}`} 
        className="w-full h-full shadow-2xl shadow-blue-900/20"
        style={{ transform: `rotate(${chartRotation}deg)` }}
      >
        {/* Outer Circle: 28 Mansions */}
        <circle cx={center} cy={center} r={rOuter} fill="none" stroke="#D4AF37" strokeWidth="0.5" opacity="0.3" />
        <circle cx={center} cy={center} r={rMansionsInner} fill="none" stroke="#D4AF37" strokeWidth="1" opacity="0.5" />
        
        {SIDEREAL_MANSIONS.map((mansion, i) => {
          // 宿境界はLahiriサイデリアル固定値なので、命盤座標系へ mansionOffset 分ずらして描画する
          const start = mansion.startLongitude + angles.mansionOffset;
          const end = start + mansion.width;
          const mid = start + (mansion.width / 2);
          const pStart1 = getCoords(rOuter, start);
          const pStart2 = getCoords(rMansionsInner, start);
          const pText = getCoords(rOuter - 10, mid);
          
          return (
            <g key={mansion.id}>
              <line x1={pStart1.x} y1={pStart1.y} x2={pStart2.x} y2={pStart2.y} stroke="#D4AF37" strokeWidth="0.5" opacity="0.5" />
              <text 
                x={pText.x} y={pText.y} 
                fill="#F5F2ED" fontSize="8" textAnchor="middle" dominantBaseline="middle"
                transform={`rotate(${mid}, ${pText.x}, ${pText.y})`}
                opacity="0.8"
              >
                {mansion.name}
              </text>
            </g>
          );
        })}

        {/* 12 Houses */}
        <circle cx={center} cy={center} r={rHousesInner} fill="none" stroke="#D4AF37" strokeWidth="1" />
        {MVP_HOUSES.map((house) => {
          const start = house.startLongitude;
          const mid = start + (house.width / 2);
          const pStart1 = getCoords(rMansionsInner, start);
          const pStart2 = getCoords(rHousesInner, start);
          const pText = getCoords(rMansionsInner - 25, mid);

          return (
            <g key={house.id}>
              <line x1={pStart1.x} y1={pStart1.y} x2={pStart2.x} y2={pStart2.y} stroke="#D4AF37" strokeWidth="0.5" opacity="0.4" />
              <text 
                x={pText.x} y={pText.y} 
                fill="#D4AF37" fontSize="12" textAnchor="middle" dominantBaseline="middle"
                transform={`rotate(${mid}, ${pText.x}, ${pText.y})`}
              >
                {house.branch}
              </text>
              <text 
                x={pText.x} y={pText.y + 15} 
                fill="#F5F2ED" fontSize="8" textAnchor="middle" dominantBaseline="middle" opacity="0.6"
                transform={`rotate(${mid}, ${pText.x}, ${pText.y})`}
              >
                {house.name}
              </text>
            </g>
          );
        })}

        {/* Inner Rings */}
        <circle cx={center} cy={center} r={rZodiacInner} fill="none" stroke="#D4AF37" strokeWidth="0.5" opacity="0.5" />

        {/* Ascendant Marker */}
        <line 
          x1={center} y1={center} 
          x2={getCoords(rOuter, angles.ascendant).x} 
          y2={getCoords(rOuter, angles.ascendant).y} 
          stroke="#E34234" strokeWidth="2" strokeDasharray="4 2" 
        />

        {/* Celestial Bodies */}
        {positions.map((pos) => {
          // Calculate radius based on typical QZSY display or distribute them so they don't overlap.
          // For MVP, place them randomly in the rHousesInner to rZodiacInner band, or staggered.
          const r = rHousesInner - 30; 
          const coord = getCoords(r, pos.longitude);
          
          let color = "#F5F2ED";
          if (pos.id === 'Sun') color = "#E34234";
          if (pos.id === 'Moon') color = "#F5F2ED";
          if (pos.id === 'Jupiter') color = "#4A7C59";
          if (pos.id === 'Mars') color = "#E34234";
          if (pos.id === 'Venus') color = "#D4AF37";
          if (pos.id === 'Mercury') color = "#8A9A5B";
          if (pos.id === 'Saturn') color = "#8B7355";
          if (pos.id === 'Rahu' || pos.id === 'Ketu') color = "#5A2A27";

          return (
            <g key={pos.id} transform={`translate(${coord.x}, ${coord.y})`}>
              {/* Note: In SVG, rotating text back so it is upright for the user requires reversing the chartRotation and element rotation. */}
              {/* Alternatively, just rotate back by -chartRotation */}
              <g style={{ transform: `rotate(${-chartRotation}deg)` }}>
                <circle r="4" fill={color} />
                <text x="8" y="3" fill={color} fontSize="10" fontWeight="bold">
                  {pos.name}
                </text>
                {pos.isRetrograde && (
                  <text x="8" y="12" fill="#E34234" fontSize="8">逆</text>
                )}
              </g>
            </g>
          );
        })}
      </svg>

      {/* Center Label */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <div className="text-[10px] uppercase tracking-[0.2em] opacity-50">命宮</div>
        <div className="text-xl font-serif text-[#D4AF37]">
           {/* For MVP, we can derive the Ascendant house branch dynamically */}
           {(() => {
             const ascHouse = MVP_HOUSES.find(h => angles.ascendant >= h.startLongitude && angles.ascendant < h.startLongitude + h.width) || MVP_HOUSES[0];
             return ascHouse.branch;
           })()}
        </div>
      </div>
    </div>
  );
}

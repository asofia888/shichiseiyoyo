import { CelestialPosition, ChartAngles } from '../../domain/astronomy/types';
import { MVP_HOUSES, SIDEREAL_MANSIONS, getHouseAtLongitude, getPersonHouseAt } from '../../domain/qizhengsiyu/constants';
import { assignBodyLevels } from './body-layout';

// 星曜を置く半径 (外側から順に使う)。段の間隔は一文字ラベルの高さより広くとる。
export const BODY_LEVELS = [106, 85, 64, 43];
// 同じ段で一文字ラベル(日・月・羅…)が重ならないために必要な距離
export const LABEL_CLEARANCE_PX = 24;

interface Props {
  positions: CelestialPosition[];
  angles: ChartAngles;
}

// 命盤上の星曜は伝統的に一文字で書く (日月水金火木土・羅計孛氣)。
// 一文字にすることで近接した星曜同士のラベルが重なりにくくなる。正式名称は星曜位置表で示す。
const BODY_GLYPHS: Record<string, string> = {
  Sun: '日', Moon: '月', Mercury: '水', Venus: '金', Mars: '火', Jupiter: '木', Saturn: '土',
  Rahu: '羅', Ketu: '計', Yuebei: '孛', Ziqi: '氣',
};

// 星曜の色。四余(羅睺・計都・月孛・紫氣)も七政と区別できるよう個別に持たせる。
const BODY_COLORS: Record<string, string> = {
  Sun: '#E34234',
  Moon: '#F5F2ED',
  Mercury: '#8A9A5B',
  Venus: '#D4AF37',
  Mars: '#E34234',
  Jupiter: '#4A7C59',
  Saturn: '#8B7355',
  Rahu: '#8B5A5A',
  Ketu: '#7A6A8B',
  Yuebei: '#6A8BA8',
  Ziqi: '#B57EDC',
};

export function CelestialChart({ positions, angles }: Props) {
  const size = 500;
  const center = size / 2;
  const rOuter = 240;
  const rMansionsInner = 220;
  const rHousesInner = 165;
  const rPersonInner = 128; // 人事十二宮の輪の内側
  const rZodiacInner = 30;

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

  // We rotate the whole SVG so that Ascendant is on the left (or whatever layout is standard).
  // Often Ascendant is on the left (9 o'clock), so if Ascendant is 'asc',
  // we rotate the chart by -asc - 90.
  const chartRotation = -angles.ascendant - 90;

  const normalize = (deg: number) => ((deg % 360) + 360) % 360;

  // 輪の上の文字は盤ごと回るため、そのままだと下半円で上下逆になる。
  // 画面上の向きが真下寄り(90°〜270°)になる位置では180°反転させ、常に読める向きにする。
  // textAnchor/dominantBaseline が middle なので、自身の中心まわりの180°回転で位置は変わらない。
  const uprightRotation = (chartDegree: number) => {
    const onScreen = normalize(chartDegree + chartRotation);
    const flipped = onScreen > 90 && onScreen < 270;
    return { angle: flipped ? chartDegree + 180 : chartDegree, flipped };
  };

  // 星曜の段振り分け (詳細と根拠は body-layout.ts)。
  // 段の間隔(約21px)は一文字ラベルの高さより広いので、同じ方向に重なっても読める。
  const bodyPlacements = assignBodyLevels(positions, BODY_LEVELS, LABEL_CLEARANCE_PX);

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
        
        {SIDEREAL_MANSIONS.map((mansion) => {
          // 宿境界はLahiriサイデリアル固定値なので、命盤座標系へ mansionOffset 分ずらして描画する
          const start = mansion.startLongitude + angles.mansionOffset;
          const mid = start + (mansion.width / 2);
          const pStart1 = getCoords(rOuter, start);
          const pStart2 = getCoords(rMansionsInner, start);
          // 参宿(幅1.24°)のような極細の宿は中央だと隣とぶつかるので、幅に応じて外周寄りにずらす
          const isNarrow = mansion.width < 6;
          const pText = getCoords(rOuter - (isNarrow ? 4 : 10), mid);
          const { angle } = uprightRotation(mid);

          return (
            <g key={mansion.id}>
              <line x1={pStart1.x} y1={pStart1.y} x2={pStart2.x} y2={pStart2.y} stroke="#D4AF37" strokeWidth="0.5" opacity="0.5" />
              <text
                x={pText.x} y={pText.y}
                fill="#F5F2ED" fontSize={isNarrow ? 6 : 8} textAnchor="middle" dominantBaseline="middle"
                transform={`rotate(${angle}, ${pText.x}, ${pText.y})`}
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
          const { angle, flipped } = uprightRotation(mid);
          // 180°反転すると副題の上下も入れ替わるので、オフセットの符号を先に反転させておく
          const subtitleOffset = flipped ? -15 : 15;

          return (
            <g key={house.id}>
              <line x1={pStart1.x} y1={pStart1.y} x2={pStart2.x} y2={pStart2.y} stroke="#D4AF37" strokeWidth="0.5" opacity="0.4" />
              <text
                x={pText.x} y={pText.y}
                fill="#D4AF37" fontSize="12" textAnchor="middle" dominantBaseline="middle"
                transform={`rotate(${angle}, ${pText.x}, ${pText.y})`}
              >
                {house.branch}
              </text>
              <text
                x={pText.x} y={pText.y + subtitleOffset}
                fill="#F5F2ED" fontSize="8" textAnchor="middle" dominantBaseline="middle" opacity="0.6"
                transform={`rotate(${angle}, ${pText.x}, ${pText.y})`}
              >
                {house.name}
              </text>
            </g>
          );
        })}

        {/* 人事十二宮 (命宮・財帛宮…) — 命宮から黄経順行に整宮制で配当 */}
        <circle cx={center} cy={center} r={rPersonInner} fill="none" stroke="#D4AF37" strokeWidth="1" opacity="0.7" />
        {MVP_HOUSES.map((house) => {
          const mid = house.startLongitude + house.width / 2;
          const person = getPersonHouseAt(mid, angles.ascendant);
          const pStart1 = getCoords(rHousesInner, house.startLongitude);
          const pStart2 = getCoords(rPersonInner, house.startLongitude);
          const pText = getCoords((rHousesInner + rPersonInner) / 2, mid);
          const isMing = person.index === 0;

          return (
            <g key={`person-${house.id}`}>
              <line x1={pStart1.x} y1={pStart1.y} x2={pStart2.x} y2={pStart2.y} stroke="#D4AF37" strokeWidth="0.5" opacity="0.4" />
              <text
                x={pText.x} y={pText.y}
                fill={isMing ? '#E34234' : '#F5F2ED'}
                fontSize="10" fontWeight={isMing ? 'bold' : 'normal'}
                textAnchor="middle" dominantBaseline="middle"
                transform={`rotate(${uprightRotation(mid).angle}, ${pText.x}, ${pText.y})`}
                opacity={isMing ? 1 : 0.75}
              >
                {person.name}
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

        {/* Celestial Bodies — 位置は真の黄経のまま、重なるものだけ内側の段へ逃がす */}
        {bodyPlacements.map(({ body: pos, radius }) => {
          const coord = getCoords(radius, pos.longitude);
          const tick = getCoords(rPersonInner - 2, pos.longitude); // 落宮の輪ぎわ
          const color = BODY_COLORS[pos.id] ?? '#F5F2ED';

          return (
            <g key={pos.id}>
              {/* 落宮の輪から天体までの指し線。内側の段に逃がしても黄経が読み取れる */}
              <line
                x1={tick.x} y1={tick.y} x2={coord.x} y2={coord.y}
                stroke={color} strokeWidth="0.6" opacity="0.35"
              />
              <g transform={`translate(${coord.x}, ${coord.y})`}>
                {/* 盤全体の回転を打ち消し、星曜名は常に水平に読める向きにする。
                    CSSのtransformではなくSVGのtransform属性を使う (回転中心が要素原点で一意に決まる) */}
                <g transform={`rotate(${-chartRotation})`}>
                  <circle r="3.5" fill={color} />
                  <text x="7" y="3.5" fill={color} fontSize="11" fontWeight="bold">
                    {BODY_GLYPHS[pos.id] ?? pos.name}
                    {pos.isRetrograde && <tspan fill="#E34234" fontSize="8">逆</tspan>}
                  </text>
                </g>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Center Label */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <div className="text-[10px] uppercase tracking-[0.2em] opacity-50">命宮</div>
        <div className="text-xl font-serif text-[#D4AF37] leading-tight">
          {getHouseAtLongitude(angles.ascendant).branch}
        </div>
        <div className="text-[10px] text-[#F5F2ED]/60">
          {getHouseAtLongitude(angles.ascendant).name}
        </div>
      </div>
    </div>
  );
}

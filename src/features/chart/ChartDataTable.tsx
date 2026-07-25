import { CelestialPosition } from '../../domain/astronomy/types';
import { getHouseAtLongitude, getMansionPosition, getPersonHouseAt } from '../../domain/qizhengsiyu/constants';
import { getDignity, getStarMansionRelation, SEVEN_GOVERNORS } from '../../../api/_lib/rule-texts';

// 廟旺の色分け。強い(廟・旺)は金、弱い(陥・落)は赤で見分けられるようにする。
const DIGNITY_COLORS: Record<string, string> = {
  廟: 'text-[#D4AF37] font-bold',
  旺: 'text-[#D4AF37]',
  陥: 'text-[#E34234]',
  落: 'text-[#E34234]',
  平: 'text-[#F5F2ED]/50',
};

interface Props {
  positions: CelestialPosition[];
  mansionOffset: number;
  ascendant: number;
}

export function ChartDataTable({ positions, mansionOffset, ascendant }: Props) {
  return (
    // 印刷では横スクロールできないので、overflow を解除して文字を詰める
    <div className="w-full bg-[#1A1A1B] border border-[#D4AF37]/20 rounded overflow-x-auto print:overflow-visible print:bg-white print:border-gray-300">
      <table className="w-full text-left text-sm text-[#F5F2ED]/80 print:text-black print:text-[9px]">
        <thead className="bg-[#232326] text-[#D4AF37] border-b border-[#D4AF37]/20 text-xs uppercase tracking-wider print:bg-gray-100 print:text-black">
          <tr>
            <th className="px-3 py-2.5 print:px-1 print:py-1">星曜</th>
            <th className="px-3 py-2.5 print:px-1 print:py-1">黄経</th>
            <th className="px-3 py-2.5 print:px-1 print:py-1">十二次</th>
            <th className="px-3 py-2.5 print:px-1 print:py-1">宮内度数</th>
            <th className="px-3 py-2.5 print:px-1 print:py-1">人事宮</th>
            <th className="px-3 py-2.5 print:px-1 print:py-1">廟旺</th>
            <th className="px-3 py-2.5 print:px-1 print:py-1">入宿度</th>
            <th className="px-3 py-2.5 print:px-1 print:py-1">星宿</th>
            <th className="px-3 py-2.5 print:px-1 print:py-1">順逆</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#D4AF37]/10 print:divide-gray-200">
          {positions.map((pos) => {
            const house = getHouseAtLongitude(pos.longitude);
            const mansionPos = getMansionPosition(pos.longitude, mansionOffset);
            const personHouse = getPersonHouseAt(pos.longitude, ascendant);
            const houseDegree = pos.longitude - house.startLongitude;
            // 廟旺は七政のみ (四余は古典の廟旺表に載らない)
            const dignity = SEVEN_GOVERNORS.includes(pos.name) ? getDignity(pos.name, house.name) : null;
            const wuxing = getStarMansionRelation(pos.name, mansionPos.mansion.name);

            return (
              <tr key={pos.id} className="hover:bg-[#D4AF37]/5 transition-colors">
                <td className="px-3 py-2.5 print:px-1 print:py-1 font-medium text-[#F5F2ED] print:text-black">{pos.name}</td>
                <td className="px-3 py-2.5 print:px-1 print:py-1 font-mono text-xs">{pos.longitude.toFixed(2)}°</td>
                <td className="px-3 py-2.5 print:px-1 print:py-1 whitespace-nowrap">{house.name} ({house.branch})</td>
                <td className="px-3 py-2.5 print:px-1 print:py-1 font-mono text-xs">{houseDegree.toFixed(2)}°</td>
                <td className="px-3 py-2.5 print:px-1 print:py-1 whitespace-nowrap text-[#D4AF37] print:text-black">{personHouse.name}</td>
                <td className={`px-3 py-2.5 print:px-1 print:py-1 whitespace-nowrap print:text-black ${dignity ? DIGNITY_COLORS[dignity] : 'text-[#F5F2ED]/30'}`}>
                  {dignity ?? '—'}
                </td>
                <td className="px-3 py-2.5 print:px-1 print:py-1 whitespace-nowrap text-xs">{mansionPos.label}</td>
                <td className="px-3 py-2.5 print:px-1 print:py-1 whitespace-nowrap text-xs print:text-black" title={wuxing?.evidence}>
                  {wuxing ? `${wuxing.starWuxing}／${wuxing.mansionWuxing} ${wuxing.relation}` : '—'}
                </td>
                <td className="px-3 py-2.5 print:px-1 print:py-1">
                  {pos.isRetrograde ? (
                    <span className="text-[#E34234] print:text-black">逆行</span>
                  ) : (
                    <span className="text-[#4A7C59] print:text-black">順行</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

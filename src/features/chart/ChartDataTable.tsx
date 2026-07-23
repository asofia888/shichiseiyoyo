import React from 'react';
import { CelestialPosition } from '../../domain/astronomy/types';
import { MVP_HOUSES, getMansionAtLongitude } from '../../domain/qizhengsiyu/constants';

interface Props {
  positions: CelestialPosition[];
  mansionOffset: number;
}

export function ChartDataTable({ positions, mansionOffset }: Props) {
  const getHouse = (lon: number) => {
    return MVP_HOUSES.find(h => lon >= h.startLongitude && lon < h.startLongitude + h.width) || MVP_HOUSES[0];
  };

  const getMansion = (lon: number) => getMansionAtLongitude(lon, mansionOffset);

  return (
    <div className="w-full bg-[#1A1A1B] border border-[#D4AF37]/20 rounded overflow-hidden">
      <table className="w-full text-left text-sm text-[#F5F2ED]/80">
        <thead className="bg-[#232326] text-[#D4AF37] border-b border-[#D4AF37]/20 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3">星曜</th>
            <th className="px-4 py-3">黄経</th>
            <th className="px-4 py-3">十二宮</th>
            <th className="px-4 py-3">宮内度数</th>
            <th className="px-4 py-3">二十八宿</th>
            <th className="px-4 py-3">順逆</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#D4AF37]/10">
          {positions.map((pos) => {
            const house = getHouse(pos.longitude);
            const mansion = getMansion(pos.longitude);
            const houseDegree = pos.longitude - house.startLongitude;
            
            return (
              <tr key={pos.id} className="hover:bg-[#D4AF37]/5 transition-colors">
                <td className="px-4 py-3 font-medium text-[#F5F2ED]">{pos.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{pos.longitude.toFixed(2)}°</td>
                <td className="px-4 py-3">{house.name} ({house.branch})</td>
                <td className="px-4 py-3 font-mono text-xs">{houseDegree.toFixed(2)}°</td>
                <td className="px-4 py-3">{mansion.name}</td>
                <td className="px-4 py-3">
                  {pos.isRetrograde ? (
                    <span className="text-[#E34234]">逆行</span>
                  ) : (
                    <span className="text-[#4A7C59]">順行</span>
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

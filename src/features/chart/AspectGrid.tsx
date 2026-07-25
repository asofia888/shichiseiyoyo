import { CelestialPosition } from '../../domain/astronomy/types';
import { getAspect } from '../../domain/qizhengsiyu/aspects';
import { AspectKind } from '../../../api/_lib/rule-texts';

interface Props {
  positions: CelestialPosition[];
  ascendant: number;
}

// 会合の種別ごとの記号と色。表を一目で読めるようにする。
const ASPECT_STYLE: Record<AspectKind, { mark: string; className: string }> = {
  同宮: { mark: '同', className: 'text-[#E34234] font-bold' },
  三合: { mark: '三', className: 'text-[#4A7C59] font-bold' },
  対照: { mark: '対', className: 'text-[#D4AF37] font-bold' },
  方照: { mark: '方', className: 'text-[#8B7355]' },
  六合: { mark: '六', className: 'text-[#8A9A5B]' },
};

export function AspectGrid({ positions, ascendant }: Props) {
  // 命宮を先頭に加えて、命宮に対する会合も同じ表で読めるようにする
  const rows = [{ id: '__ming', name: '命宮', longitude: ascendant }, ...positions];

  return (
    <div className="space-y-4">
      <div className="text-xs text-[#F5F2ED]/60 print:text-gray-600 leading-relaxed">
        宮の差で会合を判定しています（同宮=0宮差 / 六合=2宮 / 方照=3宮 / 三合=4宮 / 対照=6宮）。
        丸で囲んだものは度数でもぴたりと合う会合（許容差5°以内）で、より強く働きます。
        <br />
        <span className="text-[#F5F2ED]/40">
          ※ここでの「六合」は2宮差＝60°の会合を指します。四柱・斗数でいう地支の六合（子丑・寅亥…）
          とは別のものです（盤上ではそちらは1宮差にあたります）。
        </span>
      </div>

      <div className="w-full overflow-x-auto print:overflow-visible">
        <table className="text-xs border-collapse print:text-[9px]">
          <thead>
            <tr>
              <th className="p-1.5 border border-[#D4AF37]/20 bg-[#232326] text-[#D4AF37] print:bg-gray-100 print:text-black sticky left-0"></th>
              {rows.map(c => (
                <th key={c.id} className="p-1.5 border border-[#D4AF37]/20 bg-[#232326] text-[#D4AF37] font-normal whitespace-nowrap print:bg-gray-100 print:text-black">
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <th className="p-1.5 border border-[#D4AF37]/20 bg-[#232326] text-[#D4AF37] font-normal whitespace-nowrap text-left print:bg-gray-100 print:text-black">
                  {r.name}
                </th>
                {rows.map((c, j) => {
                  if (i === j) {
                    return <td key={c.id} className="p-1.5 border border-[#D4AF37]/10 bg-[#1A1A1B] print:bg-gray-50"></td>;
                  }
                  const aspect = getAspect(r, c);
                  if (!aspect) {
                    return <td key={c.id} className="p-1.5 border border-[#D4AF37]/10 text-center text-[#F5F2ED]/20 print:text-gray-300">·</td>;
                  }
                  const style = ASPECT_STYLE[aspect.kind];
                  return (
                    <td
                      key={c.id}
                      className={`p-1.5 border border-[#D4AF37]/10 text-center whitespace-nowrap print:text-black ${style.className}`}
                      title={`${r.name}と${c.name}: ${aspect.kind}（離角 ${aspect.separation.toFixed(2)}°）${aspect.exact ? ' ぴたりと合う' : ''}`}
                    >
                      {aspect.exact ? `(${style.mark})` : style.mark}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#F5F2ED]/60 print:text-gray-600">
        {(Object.keys(ASPECT_STYLE) as AspectKind[]).map(kind => (
          <span key={kind}>
            <span className={ASPECT_STYLE[kind].className}>{ASPECT_STYLE[kind].mark}</span> = {kind}
          </span>
        ))}
        <span>( ) = 度数でも合う</span>
      </div>
    </div>
  );
}

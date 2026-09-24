import { BirthInput } from '../../domain/astronomy/types';
import { computeFortune, formatAge, formatAgeRange } from '../../domain/qizhengsiyu/fortune';
import { FortuneMethod } from '../../domain/qizhengsiyu/schoolConfig';

interface Props {
  input: BirthInput;
  ascendant: number;
  targetYear: number;
  method: FortuneMethod;
  /** 出生時刻が不明なら命宮が定まらないので、命宮を起点にする大限・小限・流年の宮は出さない */
  timeUnknown?: boolean;
  onChangeYear: (year: number) => void;
}

export function FortunePanel({ input, ascendant, targetYear, method, timeUnknown = false, onChangeYear }: Props) {
  const f = computeFortune(input, ascendant, targetYear, method);

  const yearInput = (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <label className="text-sm text-[#F5F2ED]/70">鑑定する年</label>
      <input
        type="number"
        value={targetYear}
        min={1800}
        max={2200}
        onChange={(e) => {
          const v = Number(e.target.value);
          // 極端な年だと大限の番号や年齢が桁あふれし、画面には出るのにAIへ渡らなくなる。
          // 入力時点で範囲に収めておく (キーボード入力には min/max が効かないため)。
          if (Number.isFinite(v) && e.target.value !== '') {
            onChangeYear(Math.min(2200, Math.max(1800, Math.trunc(v))));
          }
        }}
        className="w-28 bg-[#1A1A1B] border border-[#D4AF37]/20 rounded px-3 py-1.5 text-[#F5F2ED] focus:outline-none focus:border-[#D4AF37]"
      />
      {f && (
        <span className="text-xs text-[#F5F2ED]/50">
          {f.age}歳（誕生日基準）／生年干支 {f.ganzhi.stem}{f.ganzhi.branch}
        </span>
      )}
    </div>
  );

  if (!f) {
    return (
      <div className="space-y-6">
        {yearInput}
        <div className="bg-[#232326] border border-[#D4AF37]/20 p-6 text-sm text-[#F5F2ED]/70">
          この出生データでは大限・流年を計算できませんでした。
          生年月日・出生時刻が正しいか、鑑定する年が1800〜2200年の範囲かをご確認ください。
        </div>
      </div>
    );
  }

  if (timeUnknown) {
    return (
      <div className="space-y-6">
        {yearInput}
        <div className="bg-[#232326] border border-[#D4AF37]/20 p-6 text-sm text-[#F5F2ED]/70 leading-relaxed print:bg-white print:text-black">
          出生時刻が不明のため、大限・小限と流年の人事宮は算出しません（いずれも命宮を起点に数えるため）。
          <br />
          {f.targetYear}年は{f.liuNianGanzhi.stem}{f.liuNianGanzhi.branch}の年で、太歳{f.liuNianGanzhi.branch}は
          {f.liuNian.houseName}宮に入ります。
        </div>
      </div>
    );
  }

  const { daXian } = f;
  // 果老式は境界に端数が出るので、鑑定年の途中で次の大限に移ることがある
  const nextDaXian = daXian ? f.daXianList.find(d => d.index === daXian.index + 1) : undefined;
  const changesThisYear = !!daXian && !!nextDaXian && daXian.range[1] < f.age + 1;

  return (
    <div className="space-y-6">
      {yearInput}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#232326] p-4 border-l-2 border-[#D4AF37] print:bg-gray-100 print:text-black print:border-gray-800">
          {daXian ? (
            <>
              <div className="text-[10px] text-[#D4AF37]/70 tracking-wider print:text-gray-600">
                大限（第{daXian.index}／{formatAgeRange(daXian.range)}）
              </div>
              <div className="text-base font-medium mt-1">{daXian.personHouseName}</div>
              <div className="text-xs text-[#F5F2ED]/60 print:text-gray-600">
                {daXian.houseName}宮（{daXian.branch}）
              </div>
              {changesThisYear && (
                <div className="text-[10px] text-[#D4AF37]/80 print:text-gray-600 mt-1">
                  {formatAge(daXian.range[1])}歳で{nextDaXian!.personHouseName}の限に移ります
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-[10px] text-[#D4AF37]/70 tracking-wider print:text-gray-600">大限</div>
              <div className="text-xs text-[#F5F2ED]/60 print:text-gray-600 mt-1">
                十二宮年分歌の範囲（{formatAge(f.daXianList[11].range[1])}歳まで）を超えています
              </div>
            </>
          )}
        </div>
        <div className="bg-[#232326] p-4 border-l-2 border-[#D4AF37] print:bg-gray-100 print:text-black print:border-gray-800">
          <div className="text-[10px] text-[#D4AF37]/70 tracking-wider print:text-gray-600">小限（一年一宮）</div>
          <div className="text-base font-medium mt-1">{f.xiaoXian.personHouseName}</div>
          <div className="text-xs text-[#F5F2ED]/60 print:text-gray-600">
            {f.xiaoXian.houseName}宮（{f.xiaoXian.branch}）
          </div>
        </div>
        <div className="bg-[#232326] p-4 border-l-2 border-[#D4AF37] print:bg-gray-100 print:text-black print:border-gray-800">
          <div className="text-[10px] text-[#D4AF37]/70 tracking-wider print:text-gray-600">
            流年（{f.targetYear}年 {f.liuNianGanzhi.stem}{f.liuNianGanzhi.branch}）
          </div>
          <div className="text-base font-medium mt-1">{f.liuNian.personHouseName}</div>
          <div className="text-xs text-[#F5F2ED]/60 print:text-gray-600">
            太歳{f.liuNianGanzhi.branch} → {f.liuNian.houseName}宮
          </div>
        </div>
      </div>

      <div className="text-[11px] text-[#F5F2ED]/50 print:text-gray-600 leading-relaxed">
        {f.method === 'guolao' ? (
          <>
            大限は『果老星宗』の十二宮年分歌に従い、命宮から相貌宮・福徳宮・官禄宮…と
            <strong className="text-[#D4AF37]/80">逆行</strong>し、宮ごとに年数が異なります（男女共通）。
            命宮の年数は童限で決まり、この命盤では{formatAge(f.tongXianYears!)}年です
            （出生から直前の中氣までの日数を三日＝一年に換算し、十年を加える）。
            小限は一歳を命宮とし、財帛宮・兄弟宮…と一年一宮で進みます。
          </>
        ) : (
          <>
            大限は命宮を第1として一宮十年、方向は<strong className="text-[#D4AF37]/80">{f.direction}</strong>
            （陽男陰女＝順行）。生年干支 {f.ganzhi.stem}{f.ganzhi.branch}（
            {f.ganzhi.isYang ? '陽' : '陰'}干）と
            {input.gender === 'female' ? '女性' : input.gender === 'male' ? '男性' : '性別未指定'}
            から決めています。
            {f.directionAssumed && (
              <span className="text-[#E34234]">
                {' '}※この記録には性別がないため、順行と仮定しています。
              </span>
            )}
          </>
        )}
        <br />
        <span className="text-[#F5F2ED]/40">
          生年の干支は立春を境に判定しています（立春前の生まれは前年の干支）。
          流年はその暦年の干支をそのまま用いるため、立春前（おおむね2月上旬まで）の期間は
          前年の太歳で見るのが本来です。
        </span>
      </div>

      <div>
        <h3 className="text-sm font-serif text-[#D4AF37] mb-2 print:text-black">大限の一覧</h3>
        <div className="w-full overflow-x-auto print:overflow-visible">
          <table className="w-full text-left text-xs print:text-[9px] print:text-black">
            <thead className="bg-[#232326] text-[#D4AF37] print:bg-gray-100 print:text-black">
              <tr>
                <th className="px-3 py-2 print:px-1">年齢</th>
                <th className="px-3 py-2 print:px-1">年数</th>
                <th className="px-3 py-2 print:px-1">十二次</th>
                <th className="px-3 py-2 print:px-1">人事宮</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4AF37]/10 print:divide-gray-200">
              {f.daXianList.map((d) => {
                const current = d.index === daXian?.index;
                return (
                  <tr key={d.index} className={current ? 'bg-[#D4AF37]/10' : ''}>
                    <td className={`px-3 py-2 print:px-1 ${current ? 'text-[#D4AF37] font-bold print:text-black' : 'text-[#F5F2ED]/70 print:text-black'}`}>
                      {formatAgeRange(d.range)}{current ? '（現在）' : ''}
                    </td>
                    <td className="px-3 py-2 print:px-1 text-[#F5F2ED]/70 print:text-black">
                      {formatAge(d.range[1] - d.range[0])}年
                    </td>
                    <td className="px-3 py-2 print:px-1 text-[#F5F2ED]/70 print:text-black">
                      {d.houseName}（{d.branch}）
                    </td>
                    <td className="px-3 py-2 print:px-1 text-[#F5F2ED]/70 print:text-black">{d.personHouseName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

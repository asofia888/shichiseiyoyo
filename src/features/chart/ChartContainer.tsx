import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useReactToPrint } from 'react-to-print';
import { Save, Printer, Compass } from 'lucide-react';
import { BirthInput, CelestialPosition, ChartAngles, EphemerisProviderInfo } from '../../domain/astronomy/types';
import { AstronomyEngineProvider } from '../../domain/astronomy/astronomy-engine-provider';
import { CelestialChart } from './CelestialChart';
import { ChartDataTable } from './ChartDataTable';
import { AspectGrid } from './AspectGrid';
import { FortunePanel } from './FortunePanel';
import { RuleEngine } from '../../domain/rules/engine';
import { RuleHit } from '../../domain/rules/types';
import { saveAppraisal, updateAppraisalText, AppraisalRecord } from '../../domain/storage/appraisalStore';
import { SchoolConfig } from '../../domain/qizhengsiyu/schoolConfig';
import { getHouseAtLongitude, getMansionPosition, getMingZhu, getMingDuZhu } from '../../domain/qizhengsiyu/constants';
import { Disclaimer } from '../common/Disclaimer';
import { RULE_SET_VERSION, getEnNanStars } from '../../../api/_lib/rule-texts';
import {
  isBirthTimeUnknown, findDayUncertainBodies, describeDayUncertainBody, DayUncertainBody,
} from '../../domain/qizhengsiyu/birth-time';

interface Props {
  input: BirthInput;
  schoolConfig: SchoolConfig;
  /** 履歴から開いた場合のレコード。保存済みの鑑定文をそのまま表示する。 */
  restoredRecord?: AppraisalRecord | null;
  onOpenSettings?: () => void;
}

export function ChartContainer({ input, schoolConfig, restoredRecord, onOpenSettings }: Props) {
  const [positions, setPositions] = useState<CelestialPosition[]>([]);
  const [angles, setAngles] = useState<ChartAngles | null>(null);
  const [providerInfo, setProviderInfo] = useState<EphemerisProviderInfo | null>(null);
  const [ruleHits, setRuleHits] = useState<RuleHit[]>([]);
  // 時刻不明の命盤で、出生日のうちに落宮・落宿が変わる星曜 (位置が確定しない)
  const [uncertainBodies, setUncertainBodies] = useState<DayUncertainBody[]>([]);
  // 出生時刻が不明なら命宮が定まらないので、命宮から導く項目は出さない
  const timeUnknown = isBirthTimeUnknown(input);
  const [loading, setLoading] = useState(true);
  // 天文計算の失敗。握りつぶすと「計算中」の表示のまま止まり、利用者には原因も打つ手も分からない
  const [calcError, setCalcError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'table' | 'appraisal' | 'aspects' | 'fortune'>('appraisal');
  // 大限・流年を見る年。既定は今年。
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());
  
  const [appraisalText, setAppraisalText] = useState<string | null>(null);
  // 生成失敗の文面は鑑定文と分けて持つ。同じ state に入れると生成ボタンが消えて再試行できず、
  // 「履歴に保存」でエラー文が鑑定文として保存されてしまう。
  const [appraisalError, setAppraisalError] = useState<string | null>(null);
  const [generatingAppraisal, setGeneratingAppraisal] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  // 履歴への保存に失敗したか (保存領域の容量超過・保存が禁止されたブラウザ設定など)
  const [saveFailed, setSaveFailed] = useState(false);
  const SAVE_FAILED_MESSAGE = '履歴に保存できませんでした。ブラウザの保存領域がいっぱいか、保存が許可されていません。';

  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `七政四余命盤_${input.name}`,
  });

  useEffect(() => {
    // 入力が切り替わった後に古い計算が終わっても、その結果で画面を上書きしない
    let cancelled = false;
    async function calculate() {
      setLoading(true);
      setCalcError(false);
      try {
        const provider = new AstronomyEngineProvider();
        setProviderInfo(provider.getProviderInfo());

        const pos = await provider.calculateBodies(input, schoolConfig);
        const ang = await provider.calculateAngles(input, schoolConfig);
        const uncertain = isBirthTimeUnknown(input)
          ? await findDayUncertainBodies(provider, input, schoolConfig)
          : [];
        if (cancelled) return;
        // 日付や座標が壊れていると例外にならず NaN が返ることがある。命盤として描けないので失敗として扱う
        if (![ang.ascendant, ang.midheaven, ...pos.map(p => p.longitude)].every(Number.isFinite)) {
          throw new Error('計算結果に数値でない値が含まれています');
        }

        setUncertainBodies(uncertain);
        setPositions(pos);
        setAngles(ang);

        // 履歴から開いた場合は保存済みの鑑定文をそのまま復元する (新規なら空にする)。
        // 鑑定年も復元しないと、本文の流年と画面の流年がずれる。
        setAppraisalText(restoredRecord?.appraisalText ?? null);
        setAppraisalError(null);
        setRecordId(restoredRecord?.id ?? null);
        if (restoredRecord?.targetYear) setTargetYear(restoredRecord.targetYear);
        setSaveStatus(null);
        setSaveFailed(false);

      } catch (err) {
        console.error("Calculation failed", err);
        if (!cancelled) setCalcError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    calculate();
    return () => { cancelled = true; };
  }, [input, schoolConfig, restoredRecord, retryCount]);

  // 判定は天文計算とは別の効果にする。鑑定年を変えるたびに再計算すると
  // ローディング表示に戻ってしまい、年の入力欄からフォーカスが外れる。
  useEffect(() => {
    if (!angles) return;
    const engine = new RuleEngine();
    setRuleHits(engine.evaluateAll(positions, angles, {
      input,
      targetYear,
      fortuneMethod: schoolConfig.fortuneMethod,
      ageReckoning: schoolConfig.ageReckoning,
      ziqiOption: schoolConfig.ziqiOption,
      uncertainBodyIds: uncertainBodies.map(b => b.id),
    }));
  }, [positions, angles, input, targetYear, schoolConfig.fortuneMethod, schoolConfig.ageReckoning, schoolConfig.ziqiOption, uncertainBodies]);


  const handleSaveToHistory = () => {
    if (!recordId) {
      const record = saveAppraisal({
        input,
        ruleHits,
        appraisalText,
        schoolConfig,
        targetYear,
      });
      reportSaveResult(record?.id ?? null);
    }
  };

  // 保存の成否を画面に出す。失敗は消さずに残す (利用者が気づかないまま閉じると鑑定文を失う)
  const reportSaveResult = (savedId: string | null) => {
    if (savedId) {
      setRecordId(savedId);
      setSaveFailed(false);
      setSaveStatus('履歴に保存しました');
      setTimeout(() => setSaveStatus(null), 3000);
    } else {
      setSaveFailed(true);
      setSaveStatus(null);
    }
  };

  const handleGenerateAppraisal = async () => {
    setGeneratingAppraisal(true);
    setAppraisalError(null);
    try {
      // APIには文章ではなくルールIDと限定パラメータのみを送る (サーバー側で正規テーブルから再構成)
      const response = await fetch('/api/appraisal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hits: ruleHits.map(h => ({
            ruleId: h.ruleId,
            ...(h.params ? { params: h.params } : {})
          }))
        })
      });
      if (response.ok) {
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          setAppraisalError('サーバーからの応答が不正です。しばらくしてから再度お試しください。');
          setGeneratingAppraisal(false);
          return;
        }

        // 本文が文字列でない応答は成功扱いにしない (空の鑑定文を保存しないため)
        if (data.error || typeof data.text !== 'string' || !data.text) {
          setAppraisalError(data.error || '鑑定文を生成できませんでした。時間をおいてから再度お試しください。');
        } else {
          setAppraisalText(data.text);
          // 鑑定文は画面に出したうえで保存を試みる。保存に失敗しても本文は読める
          if (recordId) {
            setSaveFailed(!updateAppraisalText(recordId, data.text));
          } else {
            const record = saveAppraisal({
              input,
              ruleHits,
              appraisalText: data.text,
              schoolConfig,
              targetYear,
            });
            reportSaveResult(record?.id ?? null);
          }
        }
      } else {
        const errData = await response.json().catch(() => null);
        setAppraisalError(errData?.error || '鑑定文の生成に失敗しました。(APIエラー)');
      }
    } catch (err) {
      console.error(err);
      setAppraisalError('鑑定文の生成中にエラーが発生しました。ネットワーク接続を確認してください。');
    } finally {
      setGeneratingAppraisal(false);
    }
  };

  const moon = positions.find(p => p.id === 'Moon');
  const enNan = angles
    ? getEnNanStars(getMingDuZhu(angles.ascendant, angles.mansionOffset).mansionName)
    : null;

  if (calcError) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div role="alert" className="max-w-md bg-[#232326] border border-red-400/30 p-6 text-sm text-[#F5F2ED]/80 leading-relaxed">
          <p className="text-red-400 font-bold mb-2">命盤を計算できませんでした</p>
          <p>
            生年月日・出生時刻・出生地（緯度・経度）・タイムゾーンに誤りがないかをご確認ください。
            入力に問題がなければ、もう一度お試しください。
          </p>
          <button
            onClick={() => setRetryCount(n => n + 1)}
            className="mt-4 px-6 py-2 bg-[#232326] border border-[#D4AF37]/30 text-[#D4AF37] text-sm hover:bg-[#D4AF37]/10 transition-colors"
          >
            もう一度計算する
          </button>
        </div>
      </div>
    );
  }

  if (loading || !angles) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-[#D4AF37] animate-pulse">天文計算を実行中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden print:overflow-visible print:block print:h-auto" ref={componentRef}>
      {/* 狭い画面では命盤と鑑定結果を縦に積み、全体を1本のスクロールにする */}
      <main className="flex-1 flex flex-col overflow-y-auto lg:flex-row lg:overflow-hidden print:overflow-visible print:flex-col print:h-auto">
        {/* Left: Celestial Chart (SVG) */}
        <section className="w-full lg:w-[540px] flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1c2c] to-[#121214] border-b lg:border-b-0 lg:border-r border-[#D4AF37]/10 p-4 shrink-0 lg:overflow-y-auto print:w-full print:border-none print:bg-white print:h-auto print:overflow-visible print:py-8">
          <div className="hidden print:block mb-6 text-center text-black">
            <h1 className="text-2xl font-serif font-bold mb-2">七政四余 命盤鑑定書</h1>
            <p className="text-lg">{input.name} 様</p>
            <p className="text-sm text-gray-600 mt-2">
              {input.birthDate} {timeUnknown ? '時刻不明' : input.birthTime} / 緯度: {input.latitude.toFixed(2)} 経度: {input.longitude.toFixed(2)}
            </p>
            {/* 印刷物だけを見ても、どの流派設定で立てた命盤かが分かるようにする */}
            <p className="text-sm text-gray-600">流派: {schoolConfig.name}</p>
          </div>

          {/* 出生時刻の精度によって、どこまでが確かな結果かを命盤の上で断っておく (印刷にも載せる) */}
          {timeUnknown && (
            <div className="w-full mb-4 px-4 py-3 text-[11px] leading-relaxed bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#F5F2ED]/80 print:bg-white print:text-black print:border-gray-400">
              出生時刻が不明のため、星曜の位置は正午で計算しています。
              命宮・命度・命主・命度主・人事十二宮・昼夜・恩星と難星・大限・小限は出生時刻で決まるため表示せず、AI鑑定にも渡しません。
              {uncertainBodies.map(b => (
                <div key={b.id} className="mt-1 text-[#E34234] print:text-black">
                  {describeDayUncertainBody(b)}。落宮・落宿が確定しないため、判定から外しています。
                </div>
              ))}
            </div>
          )}
          {input.timeAccuracy === 'approximate' && (
            <div className="w-full mb-4 px-4 py-2 text-[11px] leading-relaxed bg-[#232326] border border-[#D4AF37]/20 text-[#F5F2ED]/70 print:bg-white print:text-black print:border-gray-400">
              出生時刻がおおよそのため、時辰の境目に近いと命宮が変わります。命宮・命度・大限は参考としてご覧ください。
            </div>
          )}
          
          <CelestialChart
            positions={positions}
            angles={angles}
            timeUnknown={timeUnknown}
            uncertainBodyIds={uncertainBodies.map(b => b.id)}
          />
          
          {/* 命盤は星曜を一文字で書くため、正式名称の対応を添える */}
          <div className="mt-6 w-full px-6 print:px-20 text-[10px] text-[#F5F2ED]/50 print:text-gray-600 text-center leading-relaxed">
            日=太陽 / 月=太陰 / 水=水星 / 金=金星 / 火=火星 / 木=木星 / 土=土星
            <br />
            羅=羅睺 / 計=計都 / 孛=月孛 / 氣=紫氣（逆=逆行）
            {/* 但し書きは旧試験式のときだけ。大統暦法の紫氣には出典がある */}
            {schoolConfig.ziqiOption === 'cycle_28' && positions.some(p => p.id === 'Ziqi') && (
              <>
                <br />
                <span className="text-[#E34234]/80 print:text-gray-600">
                  ※紫氣の位置は、起点の出典を確認できていない試験的な計算によります
                </span>
              </>
            )}
          </div>

          {/* Legend / Mini Metrics */}
          {timeUnknown ? (
            <div className="mt-4 w-full px-6 print:px-20">
              <div className="bg-[#232326] p-3 border-l-2 border-[#D4AF37]/40 print:bg-gray-100 print:text-black print:border-gray-800">
                <div className="text-[9px] text-[#D4AF37]/70 uppercase tracking-tighter print:text-gray-600">命宮 / 命度 / MC / 命主 / 命度主</div>
                <div className="text-xs text-[#F5F2ED]/60 print:text-gray-600 mt-1">出生時刻が不明のため算出しません</div>
              </div>
            </div>
          ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 w-full px-6 print:px-20">
            <div className="bg-[#232326] p-3 border-l-2 border-[#D4AF37] print:bg-gray-100 print:text-black print:border-gray-800">
              <div className="text-[9px] text-[#D4AF37]/70 uppercase tracking-tighter print:text-gray-600">命宮 / 命度</div>
              <div className="text-sm font-medium">
                {getHouseAtLongitude(angles.ascendant).name}（{getHouseAtLongitude(angles.ascendant).branch}）
                {' '}{angles.ascendant.toFixed(2)}°
              </div>
              {/* 命度がどの宿の何度に落ちるかは実務で最も見るところなので命盤の脇に出す */}
              <div className="text-[10px] text-[#F5F2ED]/60 print:text-gray-600 mt-0.5">
                {getMansionPosition(angles.ascendant, angles.mansionOffset).label}
              </div>
              {schoolConfig.mingGongMethod === 'sun_mao_traditional' && (
                // 伝統安命法では命度が太陽の宮内度数を引き継ぐ (同絡)。実測ASCのような
                // 独立した観測値ではないので、そのことを画面に明示する。
                <div className="text-[9px] text-[#F5F2ED]/40 print:text-gray-500 mt-1 leading-snug">
                  ※太陽安命法では、太陽の宮内度数をそのまま命宮に写して命度とします（同絡）。同じ日の同じ時辰に生まれれば、命宮も命度も同じになります
                </div>
              )}
            </div>
            <div className="bg-[#232326] p-3 border-l-2 border-[#D4AF37] print:bg-gray-100 print:text-black print:border-gray-800">
              <div className="text-[9px] text-[#D4AF37]/70 uppercase tracking-tighter print:text-gray-600">MC（天頂）</div>
              <div className="text-sm font-medium">{angles.midheaven.toFixed(2)}°</div>
              <div className="text-[10px] text-[#F5F2ED]/60 print:text-gray-600 mt-0.5">
                {getHouseAtLongitude(angles.midheaven).name}（{getHouseAtLongitude(angles.midheaven).branch}）
              </div>
            </div>
            {/* 命主(命宮の宮主星)と命度主(命度が落ちる宿の宿主星)。実務で最初に押さえるところ */}
            <div className="bg-[#232326] p-3 border-l-2 border-[#D4AF37] print:bg-gray-100 print:text-black print:border-gray-800">
              <div className="text-[9px] text-[#D4AF37]/70 uppercase tracking-tighter print:text-gray-600">命主 / 命度主</div>
              <div className="text-sm font-medium">
                {getMingZhu(angles.ascendant)} / {getMingDuZhu(angles.ascendant, angles.mansionOffset).star}
              </div>
              <div className="text-[10px] text-[#F5F2ED]/60 print:text-gray-600 mt-0.5">
                {getHouseAtLongitude(angles.ascendant).name}宮の宮主 /{' '}
                {getMingDuZhu(angles.ascendant, angles.mansionOffset).mansionName}宿（
                {getMingDuZhu(angles.ascendant, angles.mansionOffset).luminary}曜）
              </div>
            </div>
            {/* 身主(月)の在る宮＝身宮と、月の宿の宿主＝身度主。命の側と並べて見る */}
            {moon && (
              <div className="bg-[#232326] p-3 border-l-2 border-[#D4AF37] print:bg-gray-100 print:text-black print:border-gray-800">
                <div className="text-[9px] text-[#D4AF37]/70 uppercase tracking-tighter print:text-gray-600">身宮 / 身度主</div>
                <div className="text-sm font-medium">
                  {getHouseAtLongitude(moon.longitude).name}（{getHouseAtLongitude(moon.longitude).branch}） /{' '}
                  {getMingDuZhu(moon.longitude, angles.mansionOffset).star}
                </div>
                <div className="text-[10px] text-[#F5F2ED]/60 print:text-gray-600 mt-0.5">
                  身主＝月の在る宮 / {getMingDuZhu(moon.longitude, angles.mansionOffset).mansionName}宿（
                  {getMingDuZhu(moon.longitude, angles.mansionOffset).luminary}曜）
                </div>
              </div>
            )}
            <div className="bg-[#232326] p-3 border-l-2 border-[#D4AF37] col-span-2 print:bg-gray-100 print:text-black print:border-gray-800">
              <div className="text-[9px] text-[#D4AF37]/70 uppercase tracking-tighter print:text-gray-600">昼夜 / 恩星・難星</div>
              <div className="text-sm font-medium">
                {angles.isDaytime ? '昼生（忌：火星・羅睺）' : '夜生（忌：土星・計都）'}
              </div>
              {enNan && (
                <div className="text-[10px] text-[#F5F2ED]/60 print:text-gray-600 mt-0.5">
                  命度主（{enNan.lordWuxing}）に対し、恩星＝{enNan.en.join('・')} / 難星＝{enNan.nan.join('・')}
                </div>
              )}
            </div>
          </div>
          )}
        </section>

        {/* Right: Tabs/Content */}
        <section className="flex-1 flex flex-col bg-[#1A1A1B] lg:overflow-hidden print:overflow-visible print:bg-white print:text-black print:h-auto">
          {/* Tab Switcher / Actions */}
          <div className="flex flex-wrap gap-y-2 justify-between items-center border-b border-[#D4AF37]/10 shrink-0 print:hidden px-2 lg:pr-4 lg:pl-0">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('appraisal')}
                className={`px-3 lg:px-5 py-4 text-xs font-bold tracking-wider whitespace-nowrap border-b-2 transition-colors ${activeTab === 'appraisal' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-[#F5F2ED] opacity-50 hover:opacity-100'}`}
              >鑑定結果</button>
              <button
                onClick={() => setActiveTab('table')}
                className={`px-3 lg:px-5 py-4 text-xs font-bold tracking-wider whitespace-nowrap border-b-2 transition-colors ${activeTab === 'table' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-[#F5F2ED] opacity-50 hover:opacity-100'}`}
              >星曜位置</button>
              <button
                onClick={() => setActiveTab('aspects')}
                className={`px-3 lg:px-5 py-4 text-xs font-bold tracking-wider whitespace-nowrap border-b-2 transition-colors ${activeTab === 'aspects' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-[#F5F2ED] opacity-50 hover:opacity-100'}`}
              >会合表</button>
              <button
                onClick={() => setActiveTab('fortune')}
                className={`px-3 lg:px-5 py-4 text-xs font-bold tracking-wider whitespace-nowrap border-b-2 transition-colors ${activeTab === 'fortune' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-[#F5F2ED] opacity-50 hover:opacity-100'}`}
              >大限・流年</button>
            </div>
            <div className="flex items-center gap-3">
              {saveStatus && <span className="text-xs text-[#D4AF37]">{saveStatus}</span>}
              {saveFailed && <span role="alert" className="text-xs text-red-400">{SAVE_FAILED_MESSAGE}</span>}
              <button 
                onClick={handleSaveToHistory}
                disabled={!!recordId}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-[#232326] border border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                <span>{recordId ? '保存済み' : '履歴に保存'}</span>
              </button>
              <button 
                onClick={() => handlePrint()}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-[#232326] border border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
              >
                <Printer size={14} />
                <span>PDF / 印刷</span>
              </button>
            </div>
          </div>

          {/* 画面では選択中のタブだけを見せ、印刷では星曜位置表・根拠・鑑定文をすべて出す。
              (以前は print:hidden により、鑑定書に位置表も根拠も載らなかった) */}
          <div className="flex-1 p-4 md:p-8 lg:overflow-y-auto scrollbar-hide print:overflow-visible print:p-8">
            <div className={activeTab === 'table' ? '' : 'hidden print:block'}>
              <h2 className="hidden print:block text-xl font-serif mb-4 text-black">星曜位置詳細</h2>
              <ChartDataTable
                positions={positions}
                mansionOffset={angles.mansionOffset}
                ascendant={angles.ascendant}
                timeUnknown={timeUnknown}
                uncertainBodyIds={uncertainBodies.map(b => b.id)}
              />
            </div>

            <div className={activeTab === 'aspects' ? '' : 'hidden print:block print:mt-8'}>
              <h2 className="hidden print:block text-xl font-serif mb-4 text-black">三方四正の会合</h2>
              <AspectGrid positions={positions} ascendant={angles.ascendant} timeUnknown={timeUnknown} />
            </div>

            <div className={activeTab === 'fortune' ? 'print:break-after-page' : 'hidden print:block print:mt-8 print:break-after-page'}>
              <h2 className="hidden print:block text-xl font-serif mb-4 text-black">大限・小限・流年</h2>
              <FortunePanel
                input={input}
                ascendant={angles.ascendant}
                targetYear={targetYear}
                method={schoolConfig.fortuneMethod}
                ageReckoning={schoolConfig.ageReckoning}
                timeUnknown={timeUnknown}
                onChangeYear={setTargetYear}
              />
            </div>

            <div className={activeTab === 'appraisal' ? 'space-y-8' : 'hidden print:block'}>
              {/* Rule Hits List */}
              <div>
                <h2 className="hidden print:block text-xl font-serif mb-4 text-black">判定された配置と根拠</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 print:mb-8">
                  {ruleHits.map((hit, idx) => (
                    <div key={idx} className="bg-[#232326] border border-[#D4AF37]/10 p-5 group relative hover:border-[#D4AF37]/30 transition-colors print:bg-white print:border-gray-300 print:text-black">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 bg-[#D4AF37] rounded-full print:bg-gray-800"></span>
                        <h3 className="text-sm font-bold text-[#D4AF37] print:text-black">{hit.title}</h3>
                      </div>
                      <p className="text-xs text-[#F5F2ED]/70 leading-relaxed mb-3 print:text-gray-700">
                        {hit.interpretation}
                      </p>
                      <div className="pt-3 border-t border-[#D4AF37]/5 text-[10px] italic text-[#D4AF37]/50 print:border-gray-200 print:text-gray-500">
                        根拠: {hit.evidence.join(' / ')} (出典: {hit.sourceId})
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Text Generation */}
              <div className="relative mt-8 print:mt-0">
                <span className="absolute -left-4 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#D4AF37] to-transparent print:hidden"></span>
                <h2 className="text-xl font-serif text-[#D4AF37] mb-3 print:text-2xl print:text-black print:mb-6">AI総合鑑定</h2>
                {!appraisalText && !generatingAppraisal && (
                  <div className="print:hidden">
                    <p className="text-sm leading-relaxed text-[#F5F2ED]/80 mb-4">
                      上記の確定した構造化データ(RuleHit)のみをAIに渡し、吉凶を断定しない自然な日本語で総合鑑定文を生成します。
                    </p>
                    {appraisalError && (
                      <p role="alert" className="text-sm text-red-400 bg-red-400/10 border border-red-400/30 px-4 py-3 mb-4">
                        {appraisalError}
                      </p>
                    )}
                    <button
                      onClick={handleGenerateAppraisal}
                      className="px-6 py-2 bg-[#232326] border border-[#D4AF37]/30 text-[#D4AF37] text-sm hover:bg-[#D4AF37]/10 transition-colors"
                    >
                      {appraisalError ? 'もう一度生成する' : '鑑定文を生成する'}
                    </button>
                  </div>
                )}
                {generatingAppraisal && (
                  <div className="text-[#D4AF37] text-sm animate-pulse flex items-center gap-2 print:hidden">
                    <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce"></span>
                    鑑定文を生成中...
                  </div>
                )}
                {appraisalText && (
                  <div className="bg-[#232326]/50 border border-[#D4AF37]/20 p-6 rounded prose prose-invert prose-slate max-w-none
                      prose-headings:font-serif prose-headings:text-[#D4AF37] prose-headings:font-normal
                      prose-h1:text-xl prose-h2:text-lg prose-h2:border-b prose-h2:border-[#D4AF37]/10 prose-h2:pb-2
                      prose-p:text-[#F5F2ED]/80 prose-p:leading-relaxed prose-p:text-sm
                      prose-strong:text-[#D4AF37] prose-strong:font-medium
                      print:bg-white print:border-none print:p-0 print:prose-slate print:prose-headings:text-black print:prose-p:text-black print:prose-strong:text-black">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {appraisalText}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {/* 鑑定書として配る印刷物にも免責とプライバシーを載せる */}
              <Disclaimer className="hidden print:block mt-10 pt-4 border-t border-gray-300" />
            </div>
          </div>
        </section>
      </main>

      {/* Footer / Status Bar */}
      <footer className="h-10 bg-[#121214] border-t border-[#D4AF37]/10 px-8 flex items-center justify-between text-[10px] text-[#F5F2ED]/40 shrink-0 print:hidden">
        <div className="flex items-center gap-6">
          <span>計算エンジン: {providerInfo?.name}</span>
          <button 
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 text-[#D4AF37] hover:underline cursor-pointer bg-[#232326] px-2 py-0.5 border border-[#D4AF37]/20 rounded"
          >
            <Compass size={12} />
            <span>流派: {schoolConfig.name}</span>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-[#4A7C59] rounded-full"></span>
            判定ルール v{RULE_SET_VERSION}
          </span>
        </div>
      </footer>

    </div>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useReactToPrint } from 'react-to-print';
import { Save, Printer, Compass } from 'lucide-react';
import { BirthInput, CelestialPosition, ChartAngles, EphemerisProviderInfo } from '../../domain/astronomy/types';
import { AstronomyEngineProvider } from '../../domain/astronomy/astronomy-engine-provider';
import { CelestialChart } from './CelestialChart';
import { ChartDataTable } from './ChartDataTable';
import { RuleEngine } from '../../domain/rules/engine';
import { RuleHit } from '../../domain/rules/types';
import { saveAppraisal, updateAppraisalText } from '../../domain/storage/appraisalStore';
import { SchoolConfig } from '../../domain/qizhengsiyu/schoolConfig';

interface Props {
  input: BirthInput;
  schoolConfig: SchoolConfig;
  onOpenSettings?: () => void;
}

export function ChartContainer({ input, schoolConfig, onOpenSettings }: Props) {
  const [positions, setPositions] = useState<CelestialPosition[]>([]);
  const [angles, setAngles] = useState<ChartAngles | null>(null);
  const [providerInfo, setProviderInfo] = useState<EphemerisProviderInfo | null>(null);
  const [ruleHits, setRuleHits] = useState<RuleHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'table' | 'appraisal'>('appraisal');
  
  const [appraisalText, setAppraisalText] = useState<string | null>(null);
  const [generatingAppraisal, setGeneratingAppraisal] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `七政四余命盤_${input.name}`,
  });

  useEffect(() => {
    async function calculate() {
      setLoading(true);
      try {
        const provider = new AstronomyEngineProvider();
        setProviderInfo(provider.getProviderInfo());
        
        const pos = await provider.calculateBodies(input, schoolConfig);
        const ang = await provider.calculateAngles(input, schoolConfig);
        
        setPositions(pos);
        setAngles(ang);
        
        const engine = new RuleEngine();
        const hits = engine.evaluateAll(pos, ang);
        setRuleHits(hits);
        setAppraisalText(null);
        setRecordId(null);
        setSaveStatus(null);
        
      } catch (err) {
        console.error("Calculation failed", err);
      } finally {
        setLoading(false);
      }
    }
    calculate();
  }, [input, schoolConfig]);


  const handleSaveToHistory = () => {
    if (!recordId) {
      const record = saveAppraisal({
        input,
        ruleHits,
        appraisalText,
      });
      setRecordId(record.id);
      setSaveStatus('履歴に保存しました');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleGenerateAppraisal = async () => {
    setGeneratingAppraisal(true);
    try {
      const response = await fetch('/api/appraisal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ruleHits })
      });
      if (response.ok) {
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          setAppraisalText('サーバーからの応答が不正です。しばらくしてから再度お試しください。');
          setGeneratingAppraisal(false);
          return;
        }

        if (data.error) {
          setAppraisalText(data.error);
        } else {
          setAppraisalText(data.text);
          if (recordId) {
            updateAppraisalText(recordId, data.text);
          } else {
            const record = saveAppraisal({
              input,
              ruleHits,
              appraisalText: data.text,
            });
            setRecordId(record.id);
            setSaveStatus('履歴に保存しました');
            setTimeout(() => setSaveStatus(null), 3000);
          }
        }
      } else {
        const errData = await response.json().catch(() => null);
        setAppraisalText(errData?.error || '鑑定文の生成に失敗しました。(APIエラー)');
      }
    } catch (err) {
      console.error(err);
      setAppraisalText('鑑定文の生成中にエラーが発生しました。ネットワーク接続を確認してください。');
    } finally {
      setGeneratingAppraisal(false);
    }
  };

  if (loading || !angles) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-[#D4AF37] animate-pulse">天文計算を実行中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden print:overflow-visible print:block print:h-auto" ref={componentRef}>
      <main className="flex-1 flex overflow-hidden print:overflow-visible print:flex-col print:h-auto">
        {/* Left: Celestial Chart (SVG) */}
        <section className="w-[540px] flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1c2c] to-[#121214] border-r border-[#D4AF37]/10 p-4 shrink-0 overflow-y-auto print:w-full print:border-none print:bg-white print:h-auto print:overflow-visible print:py-8">
          <div className="hidden print:block mb-6 text-center text-black">
            <h1 className="text-2xl font-serif font-bold mb-2">七政四余 命盤鑑定書</h1>
            <p className="text-lg">{input.name} 様</p>
            <p className="text-sm text-gray-600 mt-2">
              {input.birthDate} {input.birthTime} / 緯度: {input.latitude.toFixed(2)} 経度: {input.longitude.toFixed(2)}
            </p>
          </div>
          
          <CelestialChart positions={positions} angles={angles} />
          
          {/* Legend / Mini Metrics */}
          <div className="mt-8 grid grid-cols-2 gap-4 w-full px-6 print:px-20">
            <div className="bg-[#232326] p-3 border-l-2 border-[#D4AF37] print:bg-gray-100 print:text-black print:border-gray-800">
              <div className="text-[9px] text-[#D4AF37]/70 uppercase tracking-tighter print:text-gray-600">命宮</div>
              <div className="text-sm font-medium">{angles.ascendant.toFixed(2)}°</div>
            </div>
            <div className="bg-[#232326] p-3 border-l-2 border-[#D4AF37] print:bg-gray-100 print:text-black print:border-gray-800">
              <div className="text-[9px] text-[#D4AF37]/70 uppercase tracking-tighter print:text-gray-600">MC</div>
              <div className="text-sm font-medium">{angles.midheaven.toFixed(2)}°</div>
            </div>
          </div>
        </section>

        {/* Right: Tabs/Content */}
        <section className="flex-1 flex flex-col bg-[#1A1A1B] overflow-hidden print:overflow-visible print:bg-white print:text-black print:h-auto">
          {/* Tab Switcher / Actions */}
          <div className="flex justify-between items-center border-b border-[#D4AF37]/10 shrink-0 print:hidden pr-4">
            <div className="flex">
              <button 
                onClick={() => setActiveTab('appraisal')}
                className={`px-8 py-4 text-xs font-bold tracking-widest border-b-2 transition-colors ${activeTab === 'appraisal' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-[#F5F2ED] opacity-50 hover:opacity-100'}`}
              >
                鑑定結果
              </button>
              <button 
                onClick={() => setActiveTab('table')}
                className={`px-8 py-4 text-xs font-bold tracking-widest border-b-2 transition-colors ${activeTab === 'table' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-[#F5F2ED] opacity-50 hover:opacity-100'}`}
              >
                星曜位置詳細
              </button>
            </div>
            <div className="flex items-center gap-3">
              {saveStatus && <span className="text-xs text-[#D4AF37]">{saveStatus}</span>}
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

          <div className="flex-1 p-8 overflow-y-auto scrollbar-hide print:overflow-visible print:p-8">
            {(activeTab === 'table' || (typeof window !== 'undefined' && window.matchMedia('print').matches)) && (
              <div className="print:hidden">
                <ChartDataTable positions={positions} mansionOffset={angles.mansionOffset} />
              </div>
            )}
            
            {(activeTab === 'appraisal' || (typeof window !== 'undefined' && window.matchMedia('print').matches)) && (
              <div className="space-y-8">
                {/* Rule Hits List */}
                <div className="grid grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 print:mb-8 print:hidden">
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

                {/* AI Text Generation */}
                <div className="relative mt-8 print:mt-0">
                  <span className="absolute -left-4 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#D4AF37] to-transparent print:hidden"></span>
                  <h2 className="text-xl font-serif text-[#D4AF37] mb-3 print:text-2xl print:text-black print:mb-6">AI総合鑑定</h2>
                  {!appraisalText && !generatingAppraisal && (
                    <div className="print:hidden">
                      <p className="text-sm leading-relaxed text-[#F5F2ED]/80 mb-4">
                        上記の確定した構造化データ(RuleHit)のみをAIに渡し、吉凶を断定しない自然な日本語で総合鑑定文を生成します。
                      </p>
                      <button 
                        onClick={handleGenerateAppraisal}
                        className="px-6 py-2 bg-[#232326] border border-[#D4AF37]/30 text-[#D4AF37] text-sm hover:bg-[#D4AF37]/10 transition-colors"
                      >
                        鑑定文を生成する
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
              </div>
            )}
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
            Rule Engine Active (v1.0.0)
          </span>
        </div>
      </footer>

    </div>
  );
}

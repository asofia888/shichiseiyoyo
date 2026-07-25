/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { BookOpen, Map, Settings, History, HelpCircle, Menu, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import systemDesignMd from '../docs/system-design.md?raw';
import { BirthInputForm } from './features/birth-input/BirthInputForm';
import { ChartContainer } from './features/chart/ChartContainer';
import { HistoryView } from './features/history/HistoryView';
import { SchoolSettingsView } from './features/settings/SchoolSettingsView';
import { BirthInput } from './domain/astronomy/types';
import { SchoolConfig } from './domain/qizhengsiyu/schoolConfig';
import { getStoredSchoolConfig, normalizeSchoolConfig, isSameCalculation } from './domain/storage/schoolConfigStore';
import { AppraisalRecord } from './domain/storage/appraisalStore';
import { Disclaimer } from './features/common/Disclaimer';

type ViewState = 'docs' | 'input' | 'chart' | 'history' | 'settings';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('input');
  const [birthInput, setBirthInput] = useState<BirthInput | null>(null);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>(getStoredSchoolConfig());
  // 履歴から開いたレコード。命盤を再計算しつつ、保存済みの鑑定文をそのまま復元するために使う。
  const [restoredRecord, setRestoredRecord] = useState<AppraisalRecord | null>(null);
  // 狭い画面ではサイドバーを引き出し式にする (常設だと画面の大半を占めてしまうため)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const goTo = (view: ViewState) => {
    setCurrentView(view);
    setSidebarOpen(false);
  };

  const handleFormSubmit = (data: BirthInput) => {
    setBirthInput(data);
    setRestoredRecord(null); // 新規作成なので復元状態は解除する
    setCurrentView('chart');
  };

  // 履歴から開くときは、保存時の流派設定と鑑定文をまとめて復元する
  // (流派設定が違うと同じレコードから別の命盤が出てしまうため)。
  // ただし利用者自身の設定 (schoolConfig) は書き換えない。書き換えると、
  // 履歴を見たあとに新規作成すると別流派で計算され、設定画面で保存すると
  // 元の設定が上書きされてしまう。
  const handleSelectHistory = (record: AppraisalRecord) => {
    setBirthInput(record.input);
    setRestoredRecord(record);
    setCurrentView('chart');
  };

  // 命盤を描くのに使う設定。履歴を開いている間だけ、そのレコードの設定が優先される。
  // 保存済みレコードにも欠損項目の補完をかける (保存後に設定項目が増えた場合に備える)。
  // useMemo で包まないと毎レンダー別オブジェクトになり、命盤が無駄に再計算される。
  const activeSchoolConfig = useMemo(
    () => (restoredRecord ? normalizeSchoolConfig(restoredRecord.schoolConfig) : schoolConfig),
    [restoredRecord, schoolConfig]
  );
  // 告知は id ではなく計算に効く項目で比べる (カスタム設定同士は id がどちらも 'custom')
  const isViewingRestoredConfig = !!restoredRecord && !isSameCalculation(activeSchoolConfig, schoolConfig);
  // 流派を記録していない古いレコードは、既定で開いていることを正直に書く
  const restoredConfigIsAssumed = !!restoredRecord && !restoredRecord.schoolConfig;

  return (
    <div className="flex h-screen bg-[#121214] text-[#F5F2ED] font-sans overflow-hidden">
      {/* 狭い画面用の開閉ボタン。サイドバーが引き出しになるので常に押せる位置に置く */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-3 left-3 z-40 p-2 bg-[#1A1A1B] border border-[#D4AF37]/30 text-[#D4AF37] print:hidden"
        aria-label={sidebarOpen ? 'メニューを閉じる' : 'メニューを開く'}
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 z-20 print:hidden"
        />
      )}

      {/* Sidebar - hidden when printing */}
      <aside className={`w-64 bg-[#1A1A1B] flex flex-col border-r border-[#D4AF37]/20 z-30 shrink-0 print:hidden
        fixed inset-y-0 left-0 transition-transform md:static md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-[#D4AF37]/20">
          <h1 className="text-xl font-serif italic text-[#D4AF37] tracking-widest uppercase">七政四余 命盤</h1>
          <p className="text-[10px] text-[#F5F2ED]/50 mt-2 tracking-widest uppercase">天文学と伝統の融合</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => goTo('docs')}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm font-medium tracking-wider ${currentView === 'docs' ? 'bg-[#232326] border-l-2 border-[#D4AF37] text-[#D4AF37]' : 'hover:bg-[#232326] text-[#F5F2ED]/50 hover:text-[#F5F2ED]/80'}`}
          >
            <BookOpen size={16} />
            <span>設計ドキュメント</span>
          </button>
          <button 
            onClick={() => goTo('input')}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm font-medium tracking-wider ${currentView === 'input' || currentView === 'chart' ? 'bg-[#232326] border-l-2 border-[#D4AF37] text-[#D4AF37]' : 'hover:bg-[#232326] text-[#F5F2ED]/50 hover:text-[#F5F2ED]/80'}`}
          >
            <Map size={16} />
            <span>命盤作成</span>
          </button>
          <button 
            onClick={() => goTo('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm font-medium tracking-wider ${currentView === 'history' ? 'bg-[#232326] border-l-2 border-[#D4AF37] text-[#D4AF37]' : 'hover:bg-[#232326] text-[#F5F2ED]/50 hover:text-[#F5F2ED]/80'}`}
          >
            <History size={16} />
            <span>鑑定履歴 / 管理</span>
          </button>
          <button 
            onClick={() => goTo('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-sm font-medium tracking-wider ${currentView === 'settings' ? 'bg-[#232326] border-l-2 border-[#D4AF37] text-[#D4AF37]' : 'hover:bg-[#232326] text-[#F5F2ED]/50 hover:text-[#F5F2ED]/80'}`}
          >
            <Settings size={16} />
            <span>流派設定</span>
          </button>
        </nav>
        <div className="p-4 border-t border-[#D4AF37]/20 space-y-3">
          <button
            onClick={() => goTo('docs')}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#232326] text-[#F5F2ED]/50 hover:text-[#F5F2ED]/80 transition-colors text-sm font-medium tracking-wider"
          >
            <HelpCircle size={16} />
            <span>基礎知識</span>
          </button>
          <Disclaimer className="px-1" />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col print:overflow-visible print:block">
        {currentView === 'docs' && (
          <main className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1c2c] to-[#121214] relative">
            <header className="bg-[#1A1A1B]/90 backdrop-blur-sm border-b border-[#D4AF37]/20 pl-16 pr-4 md:px-8 py-5 sticky top-0 z-10 flex items-center justify-between">
              <h2 className="text-lg font-serif text-[#D4AF37] tracking-wider">フェーズ1: 要件整理と設計</h2>
            </header>
            <div className="p-4 md:p-8 max-w-4xl mx-auto">
              <div className="relative bg-[#232326]/80 backdrop-blur-sm border border-[#D4AF37]/10 p-5 md:p-10 shadow-2xl shadow-black/50 prose prose-invert prose-slate max-w-none 
                  prose-headings:font-serif prose-headings:text-[#D4AF37] prose-headings:font-normal prose-headings:tracking-wide
                  prose-h1:text-2xl prose-h2:text-xl prose-h2:border-b prose-h2:border-[#D4AF37]/10 prose-h2:pb-2 prose-h2:mt-8
                  prose-p:text-[#F5F2ED]/70 prose-p:leading-relaxed prose-p:text-sm
                  prose-li:text-[#F5F2ED]/70 prose-li:text-sm
                  prose-strong:text-[#D4AF37] prose-strong:font-medium
                  prose-a:text-[#D4AF37] prose-a:no-underline hover:prose-a:underline
                  prose-code:text-[#D4AF37] prose-code:bg-[#1A1A1B] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-[#1A1A1B] prose-pre:border prose-pre:border-[#D4AF37]/10">
                <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[#D4AF37] opacity-50"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#D4AF37] opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[#D4AF37] opacity-50"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[#D4AF37] opacity-50"></div>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {systemDesignMd}
                </ReactMarkdown>
              </div>
            </div>
          </main>
        )}

        {currentView === 'history' && (
          <HistoryView onSelectAppraisal={handleSelectHistory} />
        )}

        {currentView === 'settings' && (
          <SchoolSettingsView
            config={schoolConfig}
            onUpdateConfig={(newConfig) => setSchoolConfig(newConfig)}
          />
        )}

        {currentView === 'input' && (
           <main className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1c2c] to-[#121214] relative">
            <header className="bg-[#1A1A1B]/90 backdrop-blur-sm border-b border-[#D4AF37]/20 pl-16 pr-4 md:px-8 py-5 sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-serif text-[#D4AF37] tracking-wider">フェーズ2: 命盤作成</h2>
              <div className="text-xs text-[#D4AF37]/80 bg-[#232326] px-3 py-1 border border-[#D4AF37]/20 rounded flex items-center gap-2">
                <span>流派: {schoolConfig.name}</span>
                <button
                  onClick={() => goTo('settings')}
                  className="underline text-[#D4AF37] hover:text-white ml-1"
                >
                  変更
                </button>
              </div>
            </header>
            <div className="p-4 md:p-8 max-w-4xl mx-auto">
              <div className="w-full max-w-2xl mx-auto relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[#D4AF37] opacity-50"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#D4AF37] opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[#D4AF37] opacity-50"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[#D4AF37] opacity-50"></div>
                <BirthInputForm onSubmit={handleFormSubmit} defaultValues={birthInput || undefined} />
              </div>
              {/* 生年月日を入力する画面なので、免責とプライバシーはここにも明示する */}
              <Disclaimer className="max-w-2xl mx-auto mt-6" />
            </div>
          </main>
        )}

        {currentView === 'chart' && birthInput && (
          <div className="flex-1 flex flex-col overflow-hidden relative print:block print:overflow-visible print:h-auto">
             <header className="bg-[#1A1A1B]/90 backdrop-blur-sm border-b border-[#D4AF37]/20 pl-16 pr-4 md:px-8 py-4 z-10 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
              <div className="flex items-center gap-3">
                <span className="text-sm opacity-60">鑑定者:</span>
                <span className="text-lg font-medium">{birthInput.name} 様</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs tracking-tighter text-[#F5F2ED]/70">
                <div className="px-3 py-1 bg-[#232326] border border-[#D4AF37]/10 rounded">
                  {birthInput.birthDate} {birthInput.birthTime} (UTC{birthInput.timezoneOffset >= 0 ? '+' : ''}{birthInput.timezoneOffset})
                </div>
                <div className="px-3 py-1 bg-[#232326] border border-[#D4AF37]/10 rounded">
                  {birthInput.latitude}°, {birthInput.longitude}°
                </div>
                <button
                  onClick={() => setCurrentView('input')}
                  className="px-3 py-1 bg-[#D4AF37]/20 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/30 transition-colors cursor-pointer"
                >
                  条件変更
                </button>
              </div>
              {isViewingRestoredConfig && (
                <div className="w-full text-[11px] text-[#D4AF37]/80 bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-3 py-1.5">
                  {restoredConfigIsAssumed
                    ? `この履歴には流派設定が記録されていないため、既定の「${activeSchoolConfig.name}」で表示しています。`
                    : `保存時の流派設定「${activeSchoolConfig.name}」で表示しています。`}
                  お使いの設定「{schoolConfig.name}」は変更していません。
                </div>
              )}
            </header>
            <div className="flex-1 overflow-hidden print:overflow-visible print:block print:h-auto">
              <ChartContainer
                input={birthInput}
                schoolConfig={activeSchoolConfig}
                restoredRecord={restoredRecord}
                onOpenSettings={() => setCurrentView('settings')}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


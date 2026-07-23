import React, { useState } from 'react';
import { Settings, Check, RotateCcw, Shield, Sparkles, Compass, Sun, Moon } from 'lucide-react';
import { SchoolConfig, SCHOOL_PRESETS, ZodiacSystem, NodeCalculation, ApogeeCalculation, ZiqiOption, MingGongMethod, RahuKetuAssignment, ShichenBasis } from '../../domain/qizhengsiyu/schoolConfig';
import { saveStoredSchoolConfig, resetStoredSchoolConfig } from '../../domain/storage/schoolConfigStore';

interface Props {
  config: SchoolConfig;
  onUpdateConfig: (newConfig: SchoolConfig) => void;
}

export function SchoolSettingsView({ config, onUpdateConfig }: Props) {
  const [currentConfig, setCurrentConfig] = useState<SchoolConfig>(config);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleSelectPreset = (presetKey: string) => {
    const preset = SCHOOL_PRESETS[presetKey];
    if (preset) {
      const updated = { ...preset };
      setCurrentConfig(updated);
    }
  };

  const handleCustomChange = <K extends keyof SchoolConfig>(key: K, value: SchoolConfig[K]) => {
    setCurrentConfig((prev) => {
      const updated = { ...prev, [key]: value, id: 'custom', name: 'カスタム設定' };
      return updated;
    });
  };

  const handleSave = () => {
    saveStoredSchoolConfig(currentConfig);
    onUpdateConfig(currentConfig);
    setSavedMessage('流派設定を保存しました');
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const handleReset = () => {
    const resetVal = resetStoredSchoolConfig();
    setCurrentConfig(resetVal);
    onUpdateConfig(resetVal);
    setSavedMessage('初期設定（伝統古法）に復元しました');
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const activePresetKey = Object.keys(SCHOOL_PRESETS).find(
    (key) =>
      SCHOOL_PRESETS[key].zodiacSystem === currentConfig.zodiacSystem &&
      SCHOOL_PRESETS[key].nodeCalc === currentConfig.nodeCalc &&
      SCHOOL_PRESETS[key].apogeeCalc === currentConfig.apogeeCalc &&
      SCHOOL_PRESETS[key].ziqiOption === currentConfig.ziqiOption &&
      SCHOOL_PRESETS[key].mingGongMethod === currentConfig.mingGongMethod &&
      SCHOOL_PRESETS[key].rahuKetuAssignment === currentConfig.rahuKetuAssignment &&
      SCHOOL_PRESETS[key].shichenBasis === currentConfig.shichenBasis
  ) || 'custom';

  return (
    <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1c2c] to-[#121214] relative text-[#F5F2ED] p-8">
      {/* Header */}
      <header className="max-w-5xl mx-auto mb-8 border-b border-[#D4AF37]/20 pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#232326] border border-[#D4AF37]/30 text-[#D4AF37] rounded">
              <Compass size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-serif text-[#D4AF37] tracking-wider">七政四余 流派・計算設定</h1>
              <p className="text-xs text-[#F5F2ED]/60 mt-1">
                天文計算方式・黄道体系・四余の算出ロジック・安命法をカスタマイズできます
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {savedMessage && (
            <span className="text-xs text-[#D4AF37] font-medium bg-[#232326] px-3 py-1.5 border border-[#D4AF37]/30 rounded animate-fade-in">
              {savedMessage}
            </span>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-[#232326] border border-[#D4AF37]/20 text-xs text-[#F5F2ED]/70 hover:text-[#F5F2ED] hover:border-[#D4AF37]/40 transition-colors"
          >
            <RotateCcw size={14} />
            <span>初期値に戻す</span>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-[#D4AF37] text-[#121214] font-medium text-xs hover:bg-[#c49f27] transition-colors shadow-lg shadow-[#D4AF37]/20"
          >
            <Check size={16} />
            <span>設定を保存</span>
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto space-y-10">
        {/* Section 1: Presets */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#D4AF37]" />
            <h2 className="text-lg font-serif text-[#D4AF37]">流派プリセットの一括選択</h2>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {Object.entries(SCHOOL_PRESETS).map(([key, preset]) => {
              const isSelected = activePresetKey === key;
              return (
                <div
                  key={key}
                  onClick={() => handleSelectPreset(key)}
                  className={`cursor-pointer relative p-6 border transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#232326] border-[#D4AF37] shadow-xl shadow-[#D4AF37]/10'
                      : 'bg-[#1A1A1B]/80 border-[#D4AF37]/10 hover:border-[#D4AF37]/40 hover:bg-[#232326]/60'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-[#D4AF37] text-[#121214] rounded-full flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                  )}
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#D4AF37] mb-2">{preset.name}</h3>
                    <p className="text-xs text-[#F5F2ED]/70 leading-relaxed">{preset.description}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#D4AF37]/10 text-[10px] space-y-1 text-[#F5F2ED]/50">
                    <div>• 黄道: {preset.zodiacSystem.includes('sidereal') ? '恒星黄道 (Sidereal)' : '移動黄道 (Tropical)'}</div>
                    <div>• 安命: {preset.mingGongMethod === 'sun_mao_traditional' ? '太陽安命法 (伝統卯時)' : 'アセンダント法 (ASC)'}</div>
                    <div>• 四余: 紫氣{preset.ziqiOption === 'cycle_28' ? 'あり' : 'なし'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Custom Parameters */}
        <section className="space-y-6 pt-4 border-t border-[#D4AF37]/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-[#D4AF37]" />
              <h2 className="text-lg font-serif text-[#D4AF37]">個別パラメータ詳細設定</h2>
            </div>
            {activePresetKey === 'custom' && (
              <span className="text-xs bg-[#D4AF37]/20 border border-[#D4AF37] text-[#D4AF37] px-2.5 py-0.5 rounded">
                カスタム構成適用中
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* 1. Zodiac System */}
            <div className="bg-[#1A1A1B] border border-[#D4AF37]/20 p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#D4AF37]/10 pb-3">
                <Compass size={16} className="text-[#D4AF37]" />
                <h3 className="font-serif font-bold text-sm text-[#D4AF37]">黄道体系 (Zodiac System)</h3>
              </div>
              <p className="text-xs text-[#F5F2ED]/60 leading-relaxed">
                歳差運動を考慮する「恒星黄道(サイデリアル)」か、現代西洋占星術で使われる春分点基準の「移動黄道(トロピカル)」を選択します。
              </p>

              <div className="space-y-2">
                {[
                  { value: 'sidereal_lahiri', label: '恒星黄道 (Sidereal - Lahiri)', desc: '伝統的なインド・東洋占星術の標準アヤナムシャ（約24度補正）。明清古法推奨。' },
                  { value: 'tropical', label: '移動黄道 (Tropical)', desc: '現代西洋天文学の標準。春分点を0度とする度数体系。' },
                  { value: 'sidereal_fagan', label: '恒星黄道 (Sidereal - Fagan/Bradley)', desc: '西洋恒星占星術で採用される度数体系。' },
                ].map((item) => (
                  <label
                    key={item.value}
                    className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                      currentConfig.zodiacSystem === item.value
                        ? 'bg-[#232326] border-[#D4AF37] text-[#D4AF37]'
                        : 'border-[#D4AF37]/10 hover:bg-[#232326]/50 text-[#F5F2ED]/80'
                    }`}
                  >
                    <input
                      type="radio"
                      name="zodiacSystem"
                      value={item.value}
                      checked={currentConfig.zodiacSystem === item.value}
                      onChange={() => handleCustomChange('zodiacSystem', item.value as ZodiacSystem)}
                      className="mt-1 accent-[#D4AF37]"
                    />
                    <div>
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[11px] text-[#F5F2ED]/50 mt-0.5">{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 2. Ming Gong Method */}
            <div className="bg-[#1A1A1B] border border-[#D4AF37]/20 p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#D4AF37]/10 pb-3">
                <Sun size={16} className="text-[#D4AF37]" />
                <h3 className="font-serif font-bold text-sm text-[#D4AF37]">命宮算出法 (Ming Gong Method)</h3>
              </div>
              <p className="text-xs text-[#F5F2ED]/60 leading-relaxed">
                命盤の中核となる「命宮」の位置を古法伝統の「太陽入宮＋卯時起算」で定めるか、現代の実測アセンダント(ASC)にするかを決めます。
              </p>

              <div className="space-y-2">
                {[
                  {
                    value: 'sun_mao_traditional',
                    label: '太陽安命法 (伝統古法)',
                    desc: '『星学大成』伝統。出生日時の太陽が入る宮から出生時辰をもとに「卯時」が重なる宮を命宮と定め、人生の根本運命とします。',
                  },
                  {
                    value: 'ascendant',
                    label: '実測アセンダント法 (ASC直結)',
                    desc: '出生地・出生時刻における東の地平線と黄道の交点(ASC)をそのまま命宮とするモダンな算出法。',
                  },
                ].map((item) => (
                  <label
                    key={item.value}
                    className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                      currentConfig.mingGongMethod === item.value
                        ? 'bg-[#232326] border-[#D4AF37] text-[#D4AF37]'
                        : 'border-[#D4AF37]/10 hover:bg-[#232326]/50 text-[#F5F2ED]/80'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mingGongMethod"
                      value={item.value}
                      checked={currentConfig.mingGongMethod === item.value}
                      onChange={() => handleCustomChange('mingGongMethod', item.value as MingGongMethod)}
                      className="mt-1 accent-[#D4AF37]"
                    />
                    <div>
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[11px] text-[#F5F2ED]/50 mt-0.5">{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 3. Four Rest Planets (四余) */}
            <div className="bg-[#1A1A1B] border border-[#D4AF37]/20 p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#D4AF37]/10 pb-3">
                <Moon size={16} className="text-[#D4AF37]" />
                <h3 className="font-serif font-bold text-sm text-[#D4AF37]">四余の計算モデル (Four Rest Planets)</h3>
              </div>
              <p className="text-xs text-[#F5F2ED]/60 leading-relaxed">
                羅睺・計都(月の交点)・月孛(月の遠地点)について、平均位置か真位置(接触軌道・実イベント補間)かを選択し、紫氣の有無を設定します。
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#D4AF37] block mb-1">羅睺・計都 (Lunar Nodes)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCustomChange('nodeCalc', 'mean')}
                      className={`py-2 px-3 text-xs border transition-colors ${
                        currentConfig.nodeCalc === 'mean' ? 'bg-[#232326] border-[#D4AF37] text-[#D4AF37]' : 'border-[#D4AF37]/10 text-[#F5F2ED]/60'
                      }`}
                    >
                      平均ノード (Mean Node)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCustomChange('nodeCalc', 'true')}
                      className={`py-2 px-3 text-xs border transition-colors ${
                        currentConfig.nodeCalc === 'true' ? 'bg-[#232326] border-[#D4AF37] text-[#D4AF37]' : 'border-[#D4AF37]/10 text-[#F5F2ED]/60'
                      }`}
                    >
                      真ノード (True Node)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#D4AF37] block mb-1">月孛 (Lunar Apogee)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCustomChange('apogeeCalc', 'mean')}
                      className={`py-2 px-3 text-xs border transition-colors ${
                        currentConfig.apogeeCalc === 'mean' ? 'bg-[#232326] border-[#D4AF37] text-[#D4AF37]' : 'border-[#D4AF37]/10 text-[#F5F2ED]/60'
                      }`}
                    >
                      平均遠地点 (Mean Apogee)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCustomChange('apogeeCalc', 'true')}
                      className={`py-2 px-3 text-xs border transition-colors ${
                        currentConfig.apogeeCalc === 'true' ? 'bg-[#232326] border-[#D4AF37] text-[#D4AF37]' : 'border-[#D4AF37]/10 text-[#F5F2ED]/60'
                      }`}
                    >
                      真遠地点 (True Apogee)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#D4AF37] block mb-1">紫氣 (Zi Qi)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCustomChange('ziqiOption', 'cycle_28')}
                      className={`py-2 px-3 text-xs border transition-colors ${
                        currentConfig.ziqiOption === 'cycle_28' ? 'bg-[#232326] border-[#D4AF37] text-[#D4AF37]' : 'border-[#D4AF37]/10 text-[#F5F2ED]/60'
                      }`}
                    >
                      算入する (28年周期伝統説)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCustomChange('ziqiOption', 'none')}
                      className={`py-2 px-3 text-xs border transition-colors ${
                        currentConfig.ziqiOption === 'none' ? 'bg-[#232326] border-[#D4AF37] text-[#D4AF37]' : 'border-[#D4AF37]/10 text-[#F5F2ED]/60'
                      }`}
                    >
                      表示しない
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Rahu-Ketu Assignment (羅計の割当) */}
            <div className="bg-[#1A1A1B] border border-[#D4AF37]/20 p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#D4AF37]/10 pb-3">
                <Shield size={16} className="text-[#D4AF37]" />
                <h3 className="font-serif font-bold text-sm text-[#D4AF37]">羅計の割当 (Rahu / Ketu)</h3>
              </div>
              <p className="text-xs text-[#F5F2ED]/60 leading-relaxed">
                羅睺・計都と月の昇交点・降交点の対応は、暦の系統により歴史的に逆転しています。依拠する文献系統に合わせて選択します。
              </p>

              <div className="space-y-2">
                {[
                  {
                    value: 'rahu_descending',
                    label: '宋明式 (羅睺=降交点・計都=昇交点)',
                    desc: '唐末〜宋(沈括)〜明の暦書系統。星命家は清代以降も多くこの旧法を踏襲。『星学大成』等の明代古籍に依拠する場合はこちら。',
                  },
                  {
                    value: 'rahu_ascending',
                    label: '印度・時憲式 (羅睺=昇交点・計都=降交点)',
                    desc: '清・時憲暦(湯若望以降)が採用した系統で、現行インド占星術と同じ対応。',
                  },
                ].map((item) => (
                  <label
                    key={item.value}
                    className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                      currentConfig.rahuKetuAssignment === item.value
                        ? 'bg-[#232326] border-[#D4AF37] text-[#D4AF37]'
                        : 'border-[#D4AF37]/10 hover:bg-[#232326]/50 text-[#F5F2ED]/80'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rahuKetuAssignment"
                      value={item.value}
                      checked={currentConfig.rahuKetuAssignment === item.value}
                      onChange={() => handleCustomChange('rahuKetuAssignment', item.value as RahuKetuAssignment)}
                      className="mt-1 accent-[#D4AF37]"
                    />
                    <div>
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[11px] text-[#F5F2ED]/50 mt-0.5">{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 5. Shichen Basis (時辰の基準) */}
            <div className="bg-[#1A1A1B] border border-[#D4AF37]/20 p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#D4AF37]/10 pb-3">
                <Sun size={16} className="text-[#D4AF37]" />
                <h3 className="font-serif font-bold text-sm text-[#D4AF37]">時辰の基準 (Shichen Basis)</h3>
              </div>
              <p className="text-xs text-[#F5F2ED]/60 leading-relaxed">
                太陽安命法で用いる時辰(子・丑・寅…)を、どの時刻基準で決めるかを設定します。伝統的には出生地の真太陽時を用います。
              </p>

              <div className="space-y-2">
                {[
                  {
                    value: 'apparent_solar',
                    label: '真太陽時 (伝統)',
                    desc: '出生地で実際に太陽が南中する時刻を正午(午の刻の中心)とする基準。均時差と経度差を天文計算で自動補正します。',
                  },
                  {
                    value: 'standard',
                    label: '標準時 (時計時刻)',
                    desc: '出生証明等に記録された時計の時刻をそのまま用います。時辰境界付近では真太陽時と最大±1時間程度ずれることがあります。',
                  },
                ].map((item) => (
                  <label
                    key={item.value}
                    className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                      currentConfig.shichenBasis === item.value
                        ? 'bg-[#232326] border-[#D4AF37] text-[#D4AF37]'
                        : 'border-[#D4AF37]/10 hover:bg-[#232326]/50 text-[#F5F2ED]/80'
                    }`}
                  >
                    <input
                      type="radio"
                      name="shichenBasis"
                      value={item.value}
                      checked={currentConfig.shichenBasis === item.value}
                      onChange={() => handleCustomChange('shichenBasis', item.value as ShichenBasis)}
                      className="mt-1 accent-[#D4AF37]"
                    />
                    <div>
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[11px] text-[#F5F2ED]/50 mt-0.5">{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

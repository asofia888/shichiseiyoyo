import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAppraisals, deleteAppraisal, AppraisalRecord } from '../../domain/storage/appraisalStore';
import { Trash2, Eye, Calendar, User, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  onSelectAppraisal: (record: AppraisalRecord) => void;
}

export function HistoryView({ onSelectAppraisal }: Props) {
  const [appraisals, setAppraisals] = useState<AppraisalRecord[]>(getAppraisals());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (confirm('この鑑定履歴を削除しますか？')) {
      deleteAppraisal(id);
      setAppraisals(getAppraisals());
      if (expandedId === id) setExpandedId(null);
    }
  };

  return (
    <main className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1c2c] to-[#121214] relative p-4 sm:p-8">
      {/* pl-16: 狭い画面ではメニューボタンが左上に固定表示されるので、その分だけ空ける */}
      <header className="bg-[#1A1A1B]/90 backdrop-blur-sm border-b border-[#D4AF37]/20 pl-16 pr-4 md:px-8 py-5 sticky top-0 z-10 flex items-center justify-between -mx-4 sm:-mx-8 -mt-4 sm:-mt-8 mb-8">
        <h2 className="text-lg font-serif text-[#D4AF37] tracking-wider">鑑定履歴 / 管理</h2>
      </header>

      <div className="max-w-5xl mx-auto">
        <p className="text-[11px] text-[#F5F2ED]/40 mb-6 leading-relaxed">
          履歴はこのブラウザの中（localStorage）にのみ保存され、外部には送信されません。
          ブラウザのデータを消去すると履歴も消えます。
        </p>

        {appraisals.length === 0 ? (
          <div className="bg-[#232326]/80 border border-[#D4AF37]/10 p-12 text-center text-[#F5F2ED]/50 flex flex-col items-center">
            <Calendar size={48} className="mb-4 opacity-20" />
            <p>保存された鑑定履歴はありません。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
            {appraisals.map((record) => {
              const isExpanded = expandedId === record.id;
              return (
                <div key={record.id} className="bg-[#232326]/80 border border-[#D4AF37]/20 flex flex-col group hover:border-[#D4AF37]/50 transition-colors">
                  <div className="p-5 flex-1">
                    <div className="flex items-center justify-between mb-4 gap-2">
                      <div className="flex items-center gap-2 text-[#D4AF37] min-w-0">
                        <User size={16} className="shrink-0" />
                        <h3 className="font-medium truncate">{record.input.name}</h3>
                      </div>
                      <span className="text-[10px] text-[#F5F2ED]/40 shrink-0">
                        {new Date(record.date).toLocaleDateString('ja-JP')}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-[#F5F2ED]/60 mb-4">
                      <p>日時: {record.input.birthDate} {record.input.birthTime}</p>
                      <p>場所: 緯度 {record.input.latitude.toFixed(2)}°, 経度 {record.input.longitude.toFixed(2)}°</p>
                      <p>流派: {record.schoolConfig?.name ?? '（未記録・既定で開きます）'}</p>
                    </div>

                    <div className="text-xs text-[#D4AF37]/70 italic border-l-2 border-[#D4AF37]/30 pl-2">
                      RuleHits: {record.ruleHits.length}件
                      {record.appraisalText ? ' / AI鑑定済' : ' / AI未鑑定'}
                    </div>

                    {record.appraisalText && (
                      <>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : record.id)}
                          className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/10 transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          <span>{isExpanded ? '鑑定文を閉じる' : '鑑定文を読む'}</span>
                        </button>
                        {isExpanded && (
                          <div className="mt-3 max-h-80 overflow-y-auto bg-[#1A1A1B] border border-[#D4AF37]/10 p-4 prose prose-invert prose-slate max-w-none
                              prose-headings:font-serif prose-headings:text-[#D4AF37] prose-headings:font-normal prose-headings:text-sm
                              prose-p:text-[#F5F2ED]/75 prose-p:text-xs prose-p:leading-relaxed
                              prose-li:text-[#F5F2ED]/75 prose-li:text-xs
                              prose-strong:text-[#D4AF37] prose-strong:font-medium">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {record.appraisalText}
                            </ReactMarkdown>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex border-t border-[#D4AF37]/10">
                    <button
                      onClick={() => onSelectAppraisal(record)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
                    >
                      <Eye size={14} />
                      <span>命盤を開く</span>
                    </button>
                    <div className="w-[1px] bg-[#D4AF37]/10"></div>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 text-xs text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <Trash2 size={14} />
                      <span>削除</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

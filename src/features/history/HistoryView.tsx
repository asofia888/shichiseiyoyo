import React, { useState } from 'react';
import { getAppraisals, deleteAppraisal, AppraisalRecord } from '../../domain/storage/appraisalStore';
import { Trash2, Eye, Calendar, User } from 'lucide-react';
import { BirthInput } from '../../domain/astronomy/types';

interface Props {
  onSelectAppraisal: (input: BirthInput) => void;
}

export function HistoryView({ onSelectAppraisal }: Props) {
  const [appraisals, setAppraisals] = useState<AppraisalRecord[]>(getAppraisals());

  const handleDelete = (id: string) => {
    if (confirm('この鑑定履歴を削除しますか？')) {
      deleteAppraisal(id);
      setAppraisals(getAppraisals());
    }
  };

  return (
    <main className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1c2c] to-[#121214] relative p-8">
      <header className="bg-[#1A1A1B]/90 backdrop-blur-sm border-b border-[#D4AF37]/20 px-8 py-5 sticky top-0 z-10 flex items-center justify-between -mx-8 -mt-8 mb-8">
        <div className="flex items-center gap-6">
          <h2 className="text-lg font-serif text-[#D4AF37] tracking-wider">鑑定履歴 / 管理</h2>
        </div>
      </header>

      <div className="max-w-5xl mx-auto">
        {appraisals.length === 0 ? (
          <div className="bg-[#232326]/80 border border-[#D4AF37]/10 p-12 text-center text-[#F5F2ED]/50 flex flex-col items-center">
            <Calendar size={48} className="mb-4 opacity-20" />
            <p>保存された鑑定履歴はありません。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appraisals.map((record) => (
              <div key={record.id} className="bg-[#232326]/80 border border-[#D4AF37]/20 flex flex-col group hover:border-[#D4AF37]/50 transition-colors">
                <div className="p-5 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-[#D4AF37]">
                      <User size={16} />
                      <h3 className="font-medium truncate">{record.input.name}</h3>
                    </div>
                    <span className="text-[10px] text-[#F5F2ED]/40">
                      {new Date(record.date).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-xs text-[#F5F2ED]/60 mb-4">
                    <p>日時: {record.input.birthDate} {record.input.birthTime}</p>
                    <p>場所: 緯度 {record.input.latitude.toFixed(2)}°, 経度 {record.input.longitude.toFixed(2)}°</p>
                  </div>
                  
                  <div className="text-xs text-[#D4AF37]/70 italic border-l-2 border-[#D4AF37]/30 pl-2">
                    RuleHits: {record.ruleHits.length}件 
                    {record.appraisalText ? ' / AI鑑定済' : ' / AI未鑑定'}
                  </div>
                </div>
                
                <div className="flex border-t border-[#D4AF37]/10">
                  <button 
                    onClick={() => onSelectAppraisal(record.input)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
                  >
                    <Eye size={14} />
                    <span>開く</span>
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
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

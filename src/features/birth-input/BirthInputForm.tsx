import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { BirthInput } from '../../domain/astronomy/types';

const formSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD形式で入力してください'),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM形式で入力してください'),
  timeAccuracy: z.enum(['exact', 'approximate', 'unknown']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezoneOffset: z.number().min(-12).max(14),
  isDaylightSaving: z.boolean().optional(),
});

interface Props {
  onSubmit: (data: BirthInput) => void;
  defaultValues?: Partial<BirthInput>;
}

export function BirthInputForm({ onSubmit, defaultValues }: Props) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<BirthInput>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      name: '佐藤 拓也',
      birthDate: '1988-08-15',
      birthTime: '14:30',
      timeAccuracy: 'exact',
      latitude: 35.6581,
      longitude: 139.7414,
      timezoneOffset: 9,
      isDaylightSaving: false,
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const handleSearchLocation = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    setSearchError('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`, {
        headers: {
          'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
        }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setValue('latitude', lat);
        setValue('longitude', lon);
        
        // 簡易的なタイムゾーン推測 (経度15度で1時間)
        // 日本(135度付近)なら+9になる
        const tz = Math.round(lon / 15);
        setValue('timezoneOffset', tz);
      } else {
        setSearchError('地名が見つかりませんでした。別の名前で試してください。');
      }
    } catch (err) {
      setSearchError('検索中にエラーが発生しました。');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="bg-[#232326]/80 backdrop-blur-sm border border-[#D4AF37]/10 p-8 shadow-2xl">
      <h2 className="text-xl font-serif text-[#D4AF37] mb-6 border-b border-[#D4AF37]/20 pb-3">出生情報の入力</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-[#F5F2ED]/70 block">鑑定名</label>
            <input 
              {...register('name')} 
              className="w-full bg-[#1A1A1B] border border-[#D4AF37]/20 rounded px-3 py-2 text-[#F5F2ED] focus:outline-none focus:border-[#D4AF37]"
            />
            {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#F5F2ED]/70 block">生年月日 (YYYY-MM-DD)</label>
            <input 
              type="date"
              {...register('birthDate')} 
              className="w-full bg-[#1A1A1B] border border-[#D4AF37]/20 rounded px-3 py-2 text-[#F5F2ED] focus:outline-none focus:border-[#D4AF37]"
            />
            {errors.birthDate && <p className="text-red-400 text-xs">{errors.birthDate.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#F5F2ED]/70 block">出生時刻 (HH:MM)</label>
            <input 
              type="time"
              {...register('birthTime')} 
              className="w-full bg-[#1A1A1B] border border-[#D4AF37]/20 rounded px-3 py-2 text-[#F5F2ED] focus:outline-none focus:border-[#D4AF37]"
            />
            {errors.birthTime && <p className="text-red-400 text-xs">{errors.birthTime.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-[#F5F2ED]/70 block">時刻の精度</label>
            <select 
              {...register('timeAccuracy')}
              className="w-full bg-[#1A1A1B] border border-[#D4AF37]/20 rounded px-3 py-2 text-[#F5F2ED] focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="exact">正確</option>
              <option value="approximate">おおよそ</option>
              <option value="unknown">不明</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-2 p-4 bg-[#1A1A1B] border border-[#D4AF37]/30 rounded">
            <label className="text-sm text-[#F5F2ED]/70 block mb-1">市区町村名から緯度経度を検索 (例: 東京都港区)</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchLocation())}
                className="flex-1 bg-[#232326] border border-[#D4AF37]/20 rounded px-3 py-2 text-[#F5F2ED] focus:outline-none focus:border-[#D4AF37]"
                placeholder="市・区などの名前を入力してEnter"
              />
              <button 
                type="button" 
                onClick={handleSearchLocation}
                disabled={isSearching}
                className="px-4 py-2 bg-[#232326] border border-[#D4AF37]/50 text-[#D4AF37] rounded hover:bg-[#D4AF37]/10 disabled:opacity-50 transition-colors"
              >
                {isSearching ? '検索中...' : '検索'}
              </button>
            </div>
            {searchError && <p className="text-red-400 text-xs mt-1">{searchError}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#F5F2ED]/70 block">緯度 (-90 ~ 90)</label>
            <input 
              type="number" step="any"
              {...register('latitude', { valueAsNumber: true })} 
              className="w-full bg-[#1A1A1B] border border-[#D4AF37]/20 rounded px-3 py-2 text-[#F5F2ED] focus:outline-none focus:border-[#D4AF37]"
            />
            {errors.latitude && <p className="text-red-400 text-xs">{errors.latitude.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#F5F2ED]/70 block">経度 (-180 ~ 180)</label>
            <input 
              type="number" step="any"
              {...register('longitude', { valueAsNumber: true })} 
              className="w-full bg-[#1A1A1B] border border-[#D4AF37]/20 rounded px-3 py-2 text-[#F5F2ED] focus:outline-none focus:border-[#D4AF37]"
            />
            {errors.longitude && <p className="text-red-400 text-xs">{errors.longitude.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-[#F5F2ED]/70 block">タイムゾーン (UTCオフセット)</label>
            <input
              type="number" step="0.25"
              {...register('timezoneOffset', { valueAsNumber: true })}
              className="w-full bg-[#1A1A1B] border border-[#D4AF37]/20 rounded px-3 py-2 text-[#F5F2ED] focus:outline-none focus:border-[#D4AF37]"
            />
            {errors.timezoneOffset && <p className="text-red-400 text-xs">{errors.timezoneOffset.message}</p>}
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="flex items-center gap-3 text-sm text-[#F5F2ED]/70 cursor-pointer">
              <input
                type="checkbox"
                {...register('isDaylightSaving')}
                className="accent-[#D4AF37] w-4 h-4"
              />
              <span>出生時刻はサマータイム(夏時刻)表示</span>
            </label>
            <p className="text-[11px] text-[#F5F2ED]/40 pl-7">日本では1948〜51年の夏期に実施。該当する場合のみチェックしてください(+1時間として扱います)。</p>
          </div>
        </div>

        <div className="pt-6 border-t border-[#D4AF37]/20 flex justify-end">
          <button 
            type="submit"
            className="px-6 py-2 bg-[#D4AF37] text-[#121214] font-bold tracking-wider rounded hover:bg-[#E5C158] transition-colors"
          >
            命盤を作成する
          </button>
        </div>
      </form>
    </div>
  );
}


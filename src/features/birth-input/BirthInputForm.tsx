import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { BirthInput } from '../../domain/astronomy/types';
import { UNKNOWN_BIRTH_TIME } from '../../domain/qizhengsiyu/birth-time';
import { resolveBirthTimezone, formatUtcOffset } from '../../domain/astronomy/timezone';

const formSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD形式で入力してください'),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM形式で入力してください'),
  timeAccuracy: z.enum(['exact', 'approximate', 'unknown']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezoneOffset: z.number().min(-12).max(14),
  isDaylightSaving: z.boolean().optional(),
  gender: z.enum(['male', 'female']),
});

// 地名検索は OpenStreetMap の Nominatim を使う。利用規約
// (https://operations.osmfoundation.org/policies/nominatim/) により、
// 結果はこちらでキャッシュし、問い合わせは1秒に1回までにし、出典を表示する。
const geocodeCache = new Map<string, { lat: number; lon: number } | null>();
let lastGeocodeAt = 0;

async function geocode(query: string): Promise<{ lat: number; lon: number } | null> {
  if (geocodeCache.has(query)) return geocodeCache.get(query)!;
  const wait = lastGeocodeAt + 1000 - Date.now();
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
  lastGeocodeAt = Date.now();
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, {
    headers: {
      'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
    }
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  const found = data && data.length > 0 ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
  geocodeCache.set(query, found);
  return found;
}

// フォームでは性別を必須にする (BirthInput 側は、性別欄を設ける前に保存された
// 履歴レコードを読めるようにするため任意項目のままにしてある)。
type FormValues = z.infer<typeof formSchema>;

interface Props {
  onSubmit: (data: BirthInput) => void;
  defaultValues?: Partial<BirthInput>;
}

export function BirthInputForm({ onSubmit, defaultValues }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
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
      gender: 'male',
    },
  });

  // 時刻不明なら正午で計算する (命宮から導く項目は命盤側で伏せる)
  const timeUnknown = watch('timeAccuracy') === 'unknown';

  // タイムゾーンは出生地の座標と出生日時から自動判定する (夏時刻・歴史的な時差の変更も含む)。
  // 手動で入れた過去の入力を開き直したときは、手動のままにする。
  const [autoTimezone, setAutoTimezone] = useState(defaultValues ? !!defaultValues.timeZone : true);
  const [timezoneError, setTimezoneError] = useState('');
  const [latitude, longitude, birthDate, birthTime] = watch(['latitude', 'longitude', 'birthDate', 'birthTime']);
  const resolvedTimezone = useMemo(
    () => (autoTimezone ? resolveBirthTimezone(latitude, longitude, birthDate, birthTime) : null),
    [autoTimezone, latitude, longitude, birthDate, birthTime]
  );
  useEffect(() => {
    if (!resolvedTimezone) return;
    // 地方平均時 (UTC+9:18:59 など) は端数が長いので、表示は1万分の1時間 (0.36秒) で丸める
    setValue('timezoneOffset', Math.round(resolvedTimezone.timezoneOffset * 1e4) / 1e4);
    setValue('isDaylightSaving', resolvedTimezone.isDaylightSaving);
    setTimezoneError('');
  }, [resolvedTimezone, setValue]);

  const submit = (data: FormValues) => {
    const withTime = data.timeAccuracy === 'unknown' ? { ...data, birthTime: UNKNOWN_BIRTH_TIME } : data;
    if (!autoTimezone) {
      onSubmit(withTime);
      return;
    }
    // 送信する値は、画面の表示に頼らず送信時の入力から判定し直す
    const tz = resolveBirthTimezone(withTime.latitude, withTime.longitude, withTime.birthDate, withTime.birthTime);
    if (!tz) {
      setTimezoneError('タイムゾーンを判定できませんでした。緯度・経度と日時を確認するか、自動判定を外して手動で入力してください。');
      return;
    }
    onSubmit({ ...withTime, timezoneOffset: tz.timezoneOffset, isDaylightSaving: tz.isDaylightSaving, timeZone: tz.timeZone });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const handleSearchLocation = async () => {
    const query = searchQuery.trim();
    if (!query) return;
    setIsSearching(true);
    setSearchError('');
    try {
      const found = await geocode(query);
      if (found) {
        const { lat, lon } = found;
        // タイムゾーンは自動判定がオンなら座標の変化を受けて判定し直される
        setValue('latitude', lat);
        setValue('longitude', lon);
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
    <div className="bg-[#232326]/80 backdrop-blur-sm border border-[#D4AF37]/10 p-5 md:p-8 shadow-2xl">
      <h2 className="text-xl font-serif text-[#D4AF37] mb-6 border-b border-[#D4AF37]/20 pb-3">出生情報の入力</h2>
      
      <form onSubmit={handleSubmit(submit)} className="space-y-6">
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
            {/* disabled にすると react-hook-form が値を捨てるので readOnly で固定する */}
            <input 
              type="time"
              {...register('birthTime')} 
              readOnly={timeUnknown}
              className="w-full bg-[#1A1A1B] border border-[#D4AF37]/20 rounded px-3 py-2 text-[#F5F2ED] focus:outline-none focus:border-[#D4AF37] read-only:opacity-40"
            />
            {errors.birthTime && <p className="text-red-400 text-xs">{errors.birthTime.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#F5F2ED]/70 block">時刻の精度</label>
            <select
              {...register('timeAccuracy', {
                onChange: (e) => {
                  if (e.target.value === 'unknown') setValue('birthTime', UNKNOWN_BIRTH_TIME);
                },
              })}
              className="w-full bg-[#1A1A1B] border border-[#D4AF37]/20 rounded px-3 py-2 text-[#F5F2ED] focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="exact">正確</option>
              <option value="approximate">おおよそ</option>
              <option value="unknown">不明</option>
            </select>
            {timeUnknown && (
              <p className="text-[11px] text-[#F5F2ED]/40">
                正午で計算します。命宮・命度・命主・人事十二宮・大限など、出生時刻で決まる項目は表示しません。
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#F5F2ED]/70 block">性別</label>
            <select
              {...register('gender')}
              className="w-full bg-[#1A1A1B] border border-[#D4AF37]/20 rounded px-3 py-2 text-[#F5F2ED] focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="male">男性</option>
              <option value="female">女性</option>
            </select>
            <p className="text-[11px] text-[#F5F2ED]/40">
              流派設定で大限を「陽男陰女・一宮十年」にしたときの順逆の判定にのみ使用します（既定の果老星宗式は男女共通）。
            </p>
            {errors.gender && <p className="text-red-400 text-xs">{errors.gender.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2 p-4 bg-[#1A1A1B] border border-[#D4AF37]/30 rounded">
            <label className="text-sm text-[#F5F2ED]/70 block mb-1">市区町村名から緯度経度を検索 (例: 東京都港区)</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchLocation())}
                // min-w-0 がないと placeholder の幅がそのまま最小幅になり、狭い画面で横にはみ出す
                className="flex-1 min-w-0 bg-[#232326] border border-[#D4AF37]/20 rounded px-3 py-2 text-[#F5F2ED] focus:outline-none focus:border-[#D4AF37]"
                placeholder="市・区などの名前を入力"
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
            <p className="text-[10px] text-[#F5F2ED]/40 mt-2 leading-relaxed">
              入力した地名は OpenStreetMap（Nominatim）に送られます。番地までの住所は入れず、市区町村名で検索してください。
              地図データ:{' '}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#D4AF37]"
              >
                © OpenStreetMap contributors
              </a>
            </p>
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
            <label className="flex items-center gap-3 text-sm text-[#F5F2ED]/70 cursor-pointer">
              <input
                type="checkbox"
                checked={autoTimezone}
                onChange={(e) => setAutoTimezone(e.target.checked)}
                className="accent-[#D4AF37] w-4 h-4"
              />
              <span>出生地と出生日時からタイムゾーンを自動で判定する（推奨）</span>
            </label>
            {autoTimezone && resolvedTimezone && (
              <p className="text-xs text-[#D4AF37] pl-7">
                {resolvedTimezone.timeZone}（
                {formatUtcOffset(resolvedTimezone.timezoneOffset + (resolvedTimezone.isDaylightSaving ? 1 : 0))}
                {resolvedTimezone.isDaylightSaving ? '・夏時刻' : ''}）
              </p>
            )}
            {autoTimezone && !resolvedTimezone && (
              <p className="text-xs text-red-400 pl-7">
                この緯度・経度と日時ではタイムゾーンを判定できません。入力を確認するか、自動判定を外してください。
              </p>
            )}
            {timezoneError && <p className="text-xs text-red-400 pl-7">{timezoneError}</p>}
            <p className="text-[11px] text-[#F5F2ED]/40 pl-7">
              夏時刻や、時差の歴史的な変更（日本の1948〜51年の夏時刻、1888年以前の地方時など）も含めて判定します。
              出生記録の時刻が現地の公式時刻と違う基準で書かれている場合は、自動判定を外して手動で入力してください。
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-[#F5F2ED]/70 block">タイムゾーン (標準時のUTCオフセット)</label>
            {/* 自動判定中は判定結果を表示するだけにする (disabled にすると react-hook-form が値を捨てるので readOnly) */}
            <input
              type="number" step="any"
              {...register('timezoneOffset', { valueAsNumber: true })}
              readOnly={autoTimezone}
              className="w-full bg-[#1A1A1B] border border-[#D4AF37]/20 rounded px-3 py-2 text-[#F5F2ED] focus:outline-none focus:border-[#D4AF37] read-only:opacity-40"
            />
            {errors.timezoneOffset && <p className="text-red-400 text-xs">{errors.timezoneOffset.message}</p>}
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className={`flex items-center gap-3 text-sm text-[#F5F2ED]/70 ${autoTimezone ? 'opacity-40' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                {...register('isDaylightSaving')}
                // 自動判定中は判定結果で固定する (disabled だと値が送られない)
                onClick={(e) => autoTimezone && e.preventDefault()}
                aria-disabled={autoTimezone}
                className="accent-[#D4AF37] w-4 h-4"
              />
              <span>出生時刻はサマータイム(夏時刻)表示</span>
            </label>
            <p className="text-[11px] text-[#F5F2ED]/40 pl-7">
              {autoTimezone
                ? '自動判定では、夏時刻かどうかも出生日時から判定します。'
                : '日本では1948〜51年の夏期に実施。該当する場合のみチェックしてください(+1時間として扱います)。'}
            </p>
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


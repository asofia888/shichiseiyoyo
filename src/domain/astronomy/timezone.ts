import tzLookup from '@photostructure/tz-lookup';

// 出生地の座標から IANA タイムゾーン (例: Asia/Tokyo) を引き、出生時点の UTC オフセットを求める。
// 夏時刻や時差の歴史的な変更 (日本の1948〜51年の夏時刻、1888年以前の地方平均時など) は、
// ブラウザ/Node が持つ IANA タイムゾーンデータベースから Intl 経由で得る。

/** 座標から IANA タイムゾーン名を引く。座標が不正なら null */
export function lookupTimeZone(latitude: number, longitude: number): string | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  try {
    return tzLookup(latitude, longitude);
  } catch {
    return null;
  }
}

/** ある瞬間における、そのタイムゾーンの UTC オフセット (時間単位。例: +5.5) */
export function getUtcOffsetHours(timeZone: string, instant: Date): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(instant)
    .find(p => p.type === 'timeZoneName')?.value ?? 'GMT';
  // "GMT" / "GMT+09:00" / "GMT+09:18:59" (地方平均時)。マイナスは環境により U+2212 になる
  const m = /^GMT(?:([+\-−])(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(name);
  if (!m) throw new Error(`UTCオフセットを読み取れません: ${name}`);
  if (!m[1]) return 0;
  const sign = m[1] === '+' ? 1 : -1;
  return sign * (Number(m[2]) + Number(m[3]) / 60 + Number(m[4] ?? 0) / 3600);
}

export interface BirthTimezone {
  /** IANA タイムゾーン名 */
  timeZone: string;
  /** 入力欄「タイムゾーン」に入れる値 (標準時の UTC オフセット、時間単位) */
  timezoneOffset: number;
  /** 出生時刻が夏時刻 (+1時間) だったか */
  isDaylightSaving: boolean;
}

/**
 * 出生地・出生日時から、その時点のタイムゾーンを判定する。座標や日時が不正なら null。
 *
 * このアプリの入力は「標準時のオフセット＋夏時刻なら+1時間」の形なので、それに分解して返す。
 * 標準時の区別が要るのは、時辰を標準時で取る流派設定があるため (夏時刻の1時間を除いて時辰を決める)。
 */
export function resolveBirthTimezone(
  latitude: number,
  longitude: number,
  birthDate: string,
  birthTime: string
): BirthTimezone | null {
  const timeZone = lookupTimeZone(latitude, longitude);
  if (!timeZone) return null;
  const [y, mo, d] = (birthDate ?? '').split('-').map(Number);
  const [hh, mm] = (birthTime ?? '').split(':').map(Number);
  if (![y, mo, d, hh, mm].every(Number.isFinite)) return null;

  // 現地時刻を UTC に直すには、その瞬間のオフセットが要る。現地時刻をそのまま UTC とみなして
  // 一度オフセットを引き、得た瞬間でもう一度引き直す (夏時刻の切り替わり前後でも正しくなる)
  const localAsUtc = Date.UTC(y, mo - 1, d, hh, mm);
  if (Number.isNaN(localAsUtc)) return null;
  let offset = getUtcOffsetHours(timeZone, new Date(localAsUtc));
  offset = getUtcOffsetHours(timeZone, new Date(localAsUtc - offset * 3600 * 1000));

  // 標準時 = その年の1月と7月のオフセットのうち小さい方 (夏時刻は標準時に足される。南半球でも同じ)
  const standard = Math.min(
    getUtcOffsetHours(timeZone, new Date(Date.UTC(y, 0, 1, 12))),
    getUtcOffsetHours(timeZone, new Date(Date.UTC(y, 6, 1, 12)))
  );
  const daylight = offset - standard;
  if (Math.abs(daylight - 1) < 1e-9) {
    return { timeZone, timezoneOffset: standard, isDaylightSaving: true };
  }
  // 夏時刻でない、または +1時間以外の夏時刻 (30分・2時間など) は、その瞬間のオフセットをそのまま使う。
  // UTC への換算はどちらでも正しい
  return { timeZone, timezoneOffset: offset, isDaylightSaving: false };
}

/** 「UTC+9」「UTC+5:30」形式の表示 */
export function formatUtcOffset(hours: number): string {
  const sign = hours < 0 ? '-' : '+';
  const totalMinutes = Math.round(Math.abs(hours) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

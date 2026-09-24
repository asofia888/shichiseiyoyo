import { describe, it, expect } from 'vitest';
import { lookupTimeZone, getUtcOffsetHours, resolveBirthTimezone, formatUtcOffset } from './timezone';

const TOKYO = [35.6581, 139.7414] as const;

describe('出生地・出生日時からのタイムゾーン判定', () => {
  it('座標から IANA タイムゾーンを引く', () => {
    expect(lookupTimeZone(...TOKYO)).toBe('Asia/Tokyo');
    expect(lookupTimeZone(28.6139, 77.209)).toBe('Asia/Kolkata'); // ニューデリー
    expect(lookupTimeZone(40.7128, -74.006)).toBe('America/New_York');
    expect(lookupTimeZone(NaN, 0)).toBeNull();
    expect(lookupTimeZone(200, 0)).toBeNull();
  });

  it('日本の通常の日付は UTC+9・夏時刻なし', () => {
    expect(resolveBirthTimezone(...TOKYO, '1988-08-15', '14:30')).toEqual({
      timeZone: 'Asia/Tokyo', timezoneOffset: 9, isDaylightSaving: false,
    });
  });

  it('日本の1948〜51年の夏時刻を自動で判定する', () => {
    // IANA tzdb の Japan ルールでは1949年7月は夏時刻の期間中、12月は期間外
    expect(resolveBirthTimezone(...TOKYO, '1949-07-01', '10:00')).toEqual({
      timeZone: 'Asia/Tokyo', timezoneOffset: 9, isDaylightSaving: true,
    });
    expect(resolveBirthTimezone(...TOKYO, '1949-12-01', '10:00')!.isDaylightSaving).toBe(false);
  });

  it('30分単位の時差と、南半球の夏時刻', () => {
    expect(resolveBirthTimezone(28.6139, 77.209, '1990-05-01', '12:00')!.timezoneOffset).toBe(5.5);
    // シドニーの1月は夏時刻 (標準時 UTC+10)
    expect(resolveBirthTimezone(-33.8688, 151.2093, '1990-01-15', '12:00')).toEqual({
      timeZone: 'Australia/Sydney', timezoneOffset: 10, isDaylightSaving: true,
    });
    // ニューヨークの7月は夏時刻 (標準時 UTC-5)
    expect(resolveBirthTimezone(40.7128, -74.006, '1990-07-01', '12:00')).toEqual({
      timeZone: 'America/New_York', timezoneOffset: -5, isDaylightSaving: true,
    });
  });

  it('標準時が制定される前は地方平均時になる (東京1880年 = UTC+9:18:59)', () => {
    const r = resolveBirthTimezone(...TOKYO, '1880-01-01', '12:00')!;
    expect(r.timezoneOffset).toBeCloseTo(9 + 18 / 60 + 59 / 3600, 6);
    expect(r.isDaylightSaving).toBe(false);
  });

  it('日時が壊れていれば null', () => {
    expect(resolveBirthTimezone(...TOKYO, '', '12:00')).toBeNull();
    expect(resolveBirthTimezone(...TOKYO, '1988-08-15', '')).toBeNull();
  });

  it('オフセットを時間単位で読み取り、表示用に整形する', () => {
    expect(getUtcOffsetHours('UTC', new Date())).toBe(0);
    expect(getUtcOffsetHours('America/St_Johns', new Date(Date.UTC(2020, 0, 15)))).toBe(-3.5);
    expect(formatUtcOffset(9)).toBe('UTC+9');
    expect(formatUtcOffset(5.5)).toBe('UTC+5:30');
    expect(formatUtcOffset(-3.5)).toBe('UTC-3:30');
  });
});
